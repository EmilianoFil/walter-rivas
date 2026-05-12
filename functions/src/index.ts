import * as admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as nodemailer from 'nodemailer'

admin.initializeApp()
const db = admin.firestore()

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface EmailConfig {
  remitente: string
  appPassword: string
  destinatarios: string[]
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  const snap = await db.doc('app_settings/email').get()
  if (!snap.exists) return null
  return snap.data() as EmailConfig
}

function createTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.remitente,
      pass: config.appPassword,
    },
  })
}

async function sendEmail(
  config: EmailConfig,
  subject: string,
  html: string
) {
  const transporter = createTransport(config)
  await transporter.sendMail({
    from: `"Rivas App" <${config.remitente}>`,
    to: config.destinatarios.join(', '),
    subject,
    html,
  })
}

function formatFecha(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

// ─── 1. Nueva pre-reserva (Firestore trigger) ─────────────────────────────────

export const onNuevaPreReserva = onDocumentCreated(
  { document: 'pre_reservas/{id}', region: 'us-central1' },
  async (event) => {
    const config = await getEmailConfig()
    if (!config?.remitente || !config?.appPassword || !config?.destinatarios?.length) return

    const data = event.data?.data()
    if (!data) return

    const desde = formatFecha(data.fechaDesde)
    const hasta = formatFecha(data.fechaHasta)

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e63946;">Nueva solicitud de reserva — Casa Quinta</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #64748b;">Nombre</td><td style="padding: 8px; font-weight: 600;">${data.nombre}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding: 8px; color: #64748b;">Teléfono</td><td style="padding: 8px;">${data.telefono}</td></tr>
          ${data.email ? `<tr><td style="padding: 8px; color: #64748b;">Email</td><td style="padding: 8px;">${data.email}</td></tr>` : ''}
          <tr style="background:#f8fafc;"><td style="padding: 8px; color: #64748b;">Desde</td><td style="padding: 8px;">${desde}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Hasta</td><td style="padding: 8px;">${hasta}</td></tr>
          ${data.personas ? `<tr style="background:#f8fafc;"><td style="padding: 8px; color: #64748b;">Personas</td><td style="padding: 8px;">${data.personas}</td></tr>` : ''}
          ${data.mensaje ? `<tr><td style="padding: 8px; color: #64748b;">Mensaje</td><td style="padding: 8px;">${data.mensaje}</td></tr>` : ''}
        </table>
        <p style="margin-top: 24px; color: #64748b; font-size: 14px;">Entrá a la app para aceptar o rechazar la solicitud.</p>
      </div>
    `

    await sendEmail(config, `Nueva solicitud: ${data.nombre} (${desde})`, html)
  }
)

// ─── 2. Alertas diarias (9 AM Buenos Aires = 12 UTC) ─────────────────────────

export const alertasDiarias = onSchedule(
  { schedule: '0 12 * * *', timeZone: 'America/Argentina/Buenos_Aires', region: 'us-central1' },
  async () => {
    const config = await getEmailConfig()
    if (!config?.remitente || !config?.appPassword || !config?.destinatarios?.length) return

    const ahora = new Date()
    const snap = await db.collection('alertas').where('estado', '==', 'activa').get()

    const proximas: admin.firestore.DocumentSnapshot[] = []
    for (const doc of snap.docs) {
      const data = doc.data()
      const fechaAlerta = (data.fecha as admin.firestore.Timestamp).toDate()
      const diasHasta = Math.ceil((fechaAlerta.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      if (diasHasta >= 0 && diasHasta <= (data.anticipacionDias ?? 7)) {
        proximas.push(doc)
      }
    }

    if (proximas.length === 0) return

    const filas = proximas.map((docSnap) => {
      const d = docSnap.data() ?? {}
      const titulo = (d['titulo'] as string) ?? ''
      const vertical = (d['vertical'] as string) ?? 'general'
      const fecha = formatFecha(d['fecha'] as admin.firestore.Timestamp)
      return `
        <tr>
          <td style="padding: 8px; font-weight: 600;">${titulo}</td>
          <td style="padding: 8px; color: #64748b;">${fecha}</td>
          <td style="padding: 8px; color: #64748b;">${vertical}</td>
        </tr>
      `
    }).join('')

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e63946;">Alertas próximas — Rivas</h2>
        <table style="width:100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding: 8px; text-align:left;">Alerta</th>
              <th style="padding: 8px; text-align:left;">Fecha</th>
              <th style="padding: 8px; text-align:left;">Sección</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    `

    await sendEmail(config, `${proximas.length} alerta${proximas.length > 1 ? 's' : ''} próxima${proximas.length > 1 ? 's' : ''} — Rivas`, html)

    // Marcar como enviadas
    const batch = db.batch()
    for (const doc of proximas) {
      batch.update(doc.ref, { estado: 'enviada' })
    }
    await batch.commit()
  }
)

// ─── 3. Enviar email de prueba (callable) ─────────────────────────────────────

export const sendTestEmail = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado')

    const config = await getEmailConfig()
    if (!config?.remitente || !config?.appPassword || !config?.destinatarios?.length) {
      throw new HttpsError('failed-precondition', 'Configuración de email incompleta')
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e63946;">Email de prueba — Rivas App</h2>
        <p>Si recibiste este email, la configuración de correo está funcionando correctamente.</p>
        <p style="color: #64748b; font-size: 14px;">Remitente: ${config.remitente}</p>
      </div>
    `

    try {
      await sendEmail(config, 'Email de prueba — Rivas App', html)
      return { ok: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      throw new HttpsError('internal', `Error enviando email: ${msg}`)
    }
  }
)
