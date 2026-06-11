import * as admin from 'firebase-admin'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as nodemailer from 'nodemailer'

admin.initializeApp()
const db = admin.firestore()
const messaging = admin.messaging()

// ─── Push helpers ─────────────────────────────────────────────────────────────

/** Lee los tokens FCM guardados en app_settings/notifications */
async function getPushTokens(): Promise<string[]> {
  const snap = await db.doc('app_settings/notifications').get()
  if (!snap.exists) return []
  const tokens: string[] = snap.data()?.tokens ?? []
  return tokens.filter(Boolean)
}

/**
 * Envía un push a todos los dispositivos registrados.
 * Limpia automáticamente los tokens inválidos.
 */
async function sendPush(title: string, body: string, data?: Record<string, string>) {
  const tokens = await getPushTokens()
  console.log(`[push] tokens en Firestore: ${tokens.length}`)
  if (!tokens.length) return

  try {
    // Mensaje solo-datos (sin campo notification): evita que FCM muestre la notificación
    // automáticamente mientras el SW también la muestra → double push.
    // webpush.data es necesario para que el payload llegue al service worker web.
    const msgData = { title, body, ...(data ?? {}) }
    const response = await messaging.sendEachForMulticast({
      tokens,
      data: msgData,
      webpush: {
        headers: { Urgency: 'high' },
        data: msgData,   // explícito para web push — sin esto el SW no recibe los datos
      },
    })

    console.log(`[push] successCount=${response.successCount} failureCount=${response.failureCount}`)

    // Conservar solo los tokens que respondieron bien — elimina duplicados y tokens inválidos
    const validTokens = tokens.filter((_, i) => response.responses[i].success)
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.log(`[push] error token[${i}]: ${r.error?.code} — ${r.error?.message}`)
      }
    })
    // Reemplaza el array completo con solo los tokens válidos
    await db.doc('app_settings/notifications').set(
      { tokens: validTokens },
      { merge: true }
    )
  } catch (err) {
    console.error('[push] sendEachForMulticast error:', err)
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EmailConfig {
  remitente: string
  appPassword: string
  destinatarios: string[]
  emailsActivos?: boolean           // toggle maestro de envío
  emailsActivadoDesde?: admin.firestore.Timestamp  // cuando se activó por última vez
}

interface QuintaConfig {
  nombre?: string
  whatsapp?: string
  ubicacion?: string
  googleMapsUrl?: string
  horaCheckin?: string
  horaCheckout?: string
  instruccionesCheckin?: string
  normativaCheckout?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getEmailConfig(): Promise<EmailConfig | null> {
  const snap = await db.doc('app_settings/email').get()
  if (!snap.exists) return null
  return snap.data() as EmailConfig
}

async function getQuintaConfig(): Promise<QuintaConfig> {
  const snap = await db.doc('quinta_config/main').get()
  return (snap.data() ?? {}) as QuintaConfig
}

function createTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.remitente, pass: config.appPassword },
  })
}

/** Envía un mail. `to` puede ser email de cliente o lista de admins. */
async function sendEmail(config: EmailConfig, to: string | string[], subject: string, html: string) {
  const transporter = createTransport(config)
  await transporter.sendMail({
    from: `"${(await getQuintaConfig()).nombre ?? 'Casa Quinta'}" <${config.remitente}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  })
}

function formatFecha(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function formatFechaCorta(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function formatMoney(n: number): string {
  return '$' + n.toLocaleString('es-AR')
}

// ─── Helpers de timezone UTC-3 ────────────────────────────────────────────────
// Las funciones corren en UTC; necesitamos comparar fechas en horario argentino.

const ARG_OFFSET_MS = -3 * 60 * 60 * 1000

/** Retorna la medianoche UTC que representa el "hoy" en Argentina. */
function hoyArg(): Date {
  const now = new Date()
  const argNow = new Date(now.getTime() + ARG_OFFSET_MS)
  return new Date(Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate()))
}

/** Suma `n` días (enteros) a una fecha UTC-midnight. */
function addDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

/** True si `ts` (en hora argentina) es anterior a `hoy` (UTC-midnight del día arg). */
function esFechaAnteriorArg(ts: admin.firestore.Timestamp, hoy: Date): boolean {
  const argTs = new Date(ts.toMillis() + ARG_OFFSET_MS)
  const tsDay = Date.UTC(argTs.getUTCFullYear(), argTs.getUTCMonth(), argTs.getUTCDate())
  return tsDay < hoy.getTime()
}

/** True si el día argentino de `ts` cae dentro del rango [desde, hasta] (inclusive, UTC-midnight). */
function estaEnRangoArg(ts: admin.firestore.Timestamp, desde: Date, hasta: Date): boolean {
  const argTs = new Date(ts.toMillis() + ARG_OFFSET_MS)
  const tsDay = Date.UTC(argTs.getUTCFullYear(), argTs.getUTCMonth(), argTs.getUTCDate())
  return tsDay >= desde.getTime() && tsDay <= hasta.getTime()
}

// ─── Template base ────────────────────────────────────────────────────────────
// Un solo template para todos los emails. Cambiá colores/logo acá y afecta todo.

function renderEmail(contenido: string, quinta: QuintaConfig, waMensaje?: string): string {
  const nombre = quinta.nombre ?? 'Casa Quinta'
  const waBase = quinta.whatsapp ? `https://wa.me/${quinta.whatsapp}` : null
  const waLink = waBase
    ? waMensaje ? `${waBase}?text=${encodeURIComponent(waMensaje)}` : waBase
    : null

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${nombre}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background:#10b981;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">${nombre}</p>
              ${quinta.ubicacion ? `<p style="margin:6px 0 0;font-size:13px;color:#d1fae5;">${quinta.ubicacion}</p>` : ''}
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${contenido}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
              ${waLink ? `
              <a href="${waLink}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;margin-bottom:12px;">
                💬 Escribinos por WhatsApp
              </a><br/>` : ''}
              <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">${nombre}${quinta.ubicacion ? ` · ${quinta.ubicacion}` : ''}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Bloques de contenido reutilizables ───────────────────────────────────────

function bloqueFechas(desde: admin.firestore.Timestamp, hasta: admin.firestore.Timestamp): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;margin:20px 0;">
      <tr>
        <td style="padding:16px 20px;border-right:1px solid #bbf7d0;width:50%;">
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Check-in</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#065f46;">${formatFechaCorta(desde)}</p>
        </td>
        <td style="padding:16px 20px;width:50%;">
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Check-out</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#065f46;">${formatFechaCorta(hasta)}</p>
        </td>
      </tr>
    </table>`
}

// ─── 1. Notificación ADMIN — nueva pre-reserva ────────────────────────────────

export const onNuevaPreReserva = onDocumentCreated(
  { document: 'pre_reservas/{id}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    // ── Push al admin (siempre, independiente de la config de email) ──
    await sendPush(
      '📅 Nueva solicitud de reserva',
      `${data.nombre} — ${formatFechaCorta(data.fechaDesde)} al ${formatFechaCorta(data.fechaHasta)}`,
      { type: 'nueva_prereserva', url: 'https://walter-rivas.web.app/casa-quinta?tab=reservas' }
    )

    // ── Email (solo si está configurado) ──
    const cfg = await getEmailConfig()
    if (!cfg?.remitente || !cfg?.appPassword || !cfg?.destinatarios?.length) return

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e63946;">Nueva solicitud de reserva — Casa Quinta</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #64748b;">Nombre</td><td style="padding: 8px; font-weight: 600;">${data.nombre}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding: 8px; color: #64748b;">Teléfono</td><td style="padding: 8px;">${data.telefono}</td></tr>
          ${data.email ? `<tr><td style="padding: 8px; color: #64748b;">Email</td><td style="padding: 8px;">${data.email}</td></tr>` : ''}
          <tr style="background:#f8fafc;"><td style="padding: 8px; color: #64748b;">Desde</td><td style="padding: 8px;">${formatFecha(data.fechaDesde)}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Hasta</td><td style="padding: 8px;">${formatFecha(data.fechaHasta)}</td></tr>
          ${data.personas ? `<tr style="background:#f8fafc;"><td style="padding: 8px; color: #64748b;">Personas</td><td style="padding: 8px;">${data.personas}</td></tr>` : ''}
          ${data.mensaje ? `<tr><td style="padding: 8px; color: #64748b;">Mensaje</td><td style="padding: 8px;">${data.mensaje}</td></tr>` : ''}
        </table>
        <p style="margin-top: 24px; color: #64748b; font-size: 14px;">Entrá a la app para aceptar o rechazar la solicitud.</p>
      </div>`

    // Email al admin: siempre
    await sendEmail(cfg, cfg.destinatarios, `Nueva solicitud: ${data.nombre} (${formatFechaCorta(data.fechaDesde)})`, html)

    // Email al cliente: solo si los emails al cliente están activos
    if (data.email && cfg.emailsActivos) {
      await notificarClientePreReservaRecibida(cfg, data)
    }
  }
)

async function notificarClientePreReservaRecibida(cfg: EmailConfig, data: admin.firestore.DocumentData) {
  const quinta = await getQuintaConfig()
  const contenido = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">¡Recibimos tu solicitud, ${data.nombre}!</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">Estamos revisando tu pedido y te confirmaremos a la brevedad.</p>

    ${bloqueFechas(data.fechaDesde, data.fechaHasta)}

    <p style="font-size:14px;color:#64748b;margin:20px 0 0;">
      Ante cualquier consulta, podés contactarnos por WhatsApp y te atendemos al instante.
    </p>`

  const waMensaje = `Hola! Soy *${data.nombre}*.\nRealicé una pre-reserva desde el *${formatFechaCorta(data.fechaDesde)}* hasta el *${formatFechaCorta(data.fechaHasta)}*.\n\nNecesito preguntarte algo...`
  const html = renderEmail(contenido, quinta, waMensaje)
  await sendEmail(cfg, data.email, `Recibimos tu solicitud — ${quinta.nombre ?? 'Casa Quinta'}`, html)
}

// ─── 2. Notificaciones al cliente — pre-reserva aceptada o rechazada ──────────

export const onPreReservaActualizada = onDocumentUpdated(
  { document: 'pre_reservas/{id}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data()
    const after  = event.data?.after.data()
    if (!before || !after) return
    if (!after.email) return // sin email, nada que hacer

    const estadoAntes = before.estado as string
    const estadoDespues = after.estado as string
    if (estadoAntes === estadoDespues) return // no cambió estado

    const cfg = await getEmailConfig()
    if (!cfg?.remitente || !cfg?.appPassword) return
    if (!cfg.emailsActivos) return   // emails al cliente desactivados
    const quinta = await getQuintaConfig()

    if (estadoDespues === 'aceptada') {
      // reservaId se guarda en la pre-reserva al aceptar — lectura directa, sin índice
      let saldo = 0
      let montoTotal = 0
      if (after.reservaId) {
        const reservaSnap = await db.doc(`reservas/${after.reservaId}`).get()
        const reserva = reservaSnap.data()
        saldo = reserva?.saldoPendiente ?? 0
        montoTotal = reserva?.montoTotal ?? 0
      }

      const contenido = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">¡Tu reserva fue aprobada, ${after.nombre}! 🎉</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">Tu solicitud para las siguientes fechas fue aceptada.</p>

        ${bloqueFechas(after.fechaDesde, after.fechaHasta)}

        ${montoTotal > 0 ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;margin:20px 0;border:1px solid #fed7aa;">
          <tr>
            <td style="padding:16px 20px;border-right:1px solid #fed7aa;width:50%;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Monto total</p>
              <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#92400e;">${formatMoney(montoTotal)}</p>
            </td>
            <td style="padding:16px 20px;width:50%;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Saldo pendiente</p>
              <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#92400e;">${formatMoney(saldo)}</p>
            </td>
          </tr>
        </table>` : ''}

        <p style="font-size:14px;color:#64748b;margin:20px 0 0;">
          Para coordinar el pago o cualquier consulta, escribinos por WhatsApp.
        </p>`

      const html = renderEmail(contenido, quinta)
      await sendEmail(cfg, after.email, `¡Tu reserva fue aprobada! — ${quinta.nombre ?? 'Casa Quinta'}`, html)
    }

    if (estadoDespues === 'rechazada') {
      const contenido = `
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Hola, ${after.nombre}</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">
          Lamentablemente las fechas que solicitaste no están disponibles en este momento.
        </p>

        ${bloqueFechas(after.fechaDesde, after.fechaHasta)}

        <p style="font-size:14px;color:#64748b;margin:20px 0 0;">
          Si querés consultar otras fechas o tenés alguna pregunta, escribinos por WhatsApp y con gusto te ayudamos.
        </p>`

      const html = renderEmail(contenido, quinta)
      await sendEmail(cfg, after.email, `Sobre tu solicitud — ${quinta.nombre ?? 'Casa Quinta'}`, html)
    }
  }
)

// ─── 3. Notificaciones al cliente — pago registrado / reserva saldada ─────────

// ─── 3a. Nueva reserva creada por admin — confirmar al cliente ────────────────

export const onReservaCreada = onDocumentCreated(
  { document: 'reservas/{id}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    const email: string | undefined = data.inquilino?.email
    if (!email) return // sin email, nada que hacer

    const cfg = await getEmailConfig()
    if (!cfg?.remitente || !cfg?.appPassword) return
    if (!cfg.emailsActivos) return   // emails al cliente desactivados
    const quinta = await getQuintaConfig()

    const saldo: number = data.saldoPendiente ?? 0
    const montoTotal: number = data.montoTotal ?? 0

    const contenido = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">¡Tu reserva está confirmada, ${data.inquilino?.nombre}! 🎉</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#475569;">Quedaste anotado para las siguientes fechas.</p>

      ${bloqueFechas(data.fechaDesde, data.fechaHasta)}

      ${montoTotal > 0 ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;margin:20px 0;border:1px solid #fed7aa;">
        <tr>
          <td style="padding:16px 20px;border-right:1px solid #fed7aa;width:50%;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Monto total</p>
            <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#92400e;">${formatMoney(montoTotal)}</p>
          </td>
          <td style="padding:16px 20px;width:50%;">
            <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Saldo pendiente</p>
            <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#92400e;">${formatMoney(saldo)}</p>
          </td>
        </tr>
      </table>` : ''}

      <p style="font-size:14px;color:#64748b;margin:20px 0 0;">
        Para coordinar el pago o cualquier consulta, escribinos por WhatsApp.
      </p>`

    const html = renderEmail(contenido, quinta)
    await sendEmail(cfg, email, `¡Tu reserva está confirmada! — ${quinta.nombre ?? 'Casa Quinta'}`, html)

    // Marcar confirmación como enviada para que el cron no la reenvíe
    await event.data?.ref.update({ '_emailsSent.confirmacion': true })
  }
)

// ─── 3b. Reserva actualizada — pago registrado / saldada ─────────────────────

export const onReservaActualizada = onDocumentUpdated(
  { document: 'reservas/{id}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data()
    const after  = event.data?.after.data()
    if (!before || !after) return

    const email: string | undefined = after.inquilino?.email
    if (!email) return

    const cfg = await getEmailConfig()
    if (!cfg?.remitente || !cfg?.appPassword) return
    if (!cfg.emailsActivos) return   // emails al cliente desactivados
    const quinta = await getQuintaConfig()

    const pagosAntes: { id: string; monto: number; concepto?: string }[] = before.pagos ?? []
    const pagosDespues: { id: string; monto: number; concepto?: string }[] = after.pagos ?? []

    // Detectar nuevo pago comparando longitud
    if (pagosDespues.length > pagosAntes.length) {
      const nuevoPago = pagosDespues[pagosDespues.length - 1]
      const saldo: number = after.saldoPendiente ?? 0
      const saldada = saldo === 0

      const contenido = saldada ? `
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">¡Reserva completamente saldada! 🙌</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">
          Hola ${after.inquilino?.nombre ?? ''}! Registramos tu último pago. Tu reserva está 100% abonada.
        </p>

        ${bloqueFechas(after.fechaDesde, after.fechaHasta)}

        <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:13px;color:#6b7280;">Pago registrado</p>
          <p style="margin:4px 0;font-size:22px;font-weight:700;color:#065f46;">${formatMoney(nuevoPago.monto)}</p>
          ${nuevoPago.concepto ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${nuevoPago.concepto}</p>` : ''}
          <p style="margin:12px 0 0;font-size:15px;font-weight:600;color:#059669;">✓ Saldo: $0 — Todo pago</p>
        </div>

        <p style="font-size:14px;color:#64748b;">¡Te esperamos! Ante cualquier duda escribinos.</p>
      ` : `
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Pago registrado ✓</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">
          Hola ${after.inquilino?.nombre ?? ''}! Registramos tu pago correctamente.
        </p>

        ${bloqueFechas(after.fechaDesde, after.fechaHasta)}

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;margin:20px 0;border:1px solid #bbf7d0;">
          <tr>
            <td style="padding:16px 20px;border-right:1px solid #bbf7d0;width:50%;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Pago recibido</p>
              <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#065f46;">${formatMoney(nuevoPago.monto)}</p>
              ${nuevoPago.concepto ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${nuevoPago.concepto}</p>` : ''}
            </td>
            <td style="padding:16px 20px;width:50%;">
              <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Saldo pendiente</p>
              <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#b45309;">${formatMoney(saldo)}</p>
            </td>
          </tr>
        </table>

        <p style="font-size:14px;color:#64748b;">Para coordinar el saldo restante o cualquier consulta, escribinos.</p>
      `

      const html = renderEmail(contenido, quinta)
      const asunto = saldada
        ? `¡Reserva saldada! — ${quinta.nombre ?? 'Casa Quinta'}`
        : `Pago registrado — ${quinta.nombre ?? 'Casa Quinta'}`
      await sendEmail(cfg, email, asunto, html)
    }
  }
)

// ─── 4. Recordatorios programados ────────────────────────────────────────────
// Dos crons en horario argentino (UTC-3) para máxima cobertura:
//   • Mediodía  → entrega principal del día
//   • 23:00     → red de seguridad (cubre reservas creadas tarde en el día)
// Ambos llaman a procesarEmailsProgramados(), que usa flags _emailsSent en
// el documento de reserva para nunca enviar el mismo email dos veces.

async function procesarEmailsProgramados(): Promise<void> {
  const cfg = await getEmailConfig()
  if (!cfg?.remitente || !cfg?.appPassword) return

  // Las alertas al admin (próximas reservas) siempre se mandan
  await enviarAlertasAdmin(cfg)

  // ── Toggle maestro: si los emails al cliente están apagados, se detiene aquí ──
  if (!cfg.emailsActivos) {
    console.log('Emails al cliente desactivados — recordatorios cancelados.')
    return
  }

  // Fecha desde la que se activaron los emails (para evitar retroactividad en reseñas)
  const activadoDesdeMs = cfg.emailsActivadoDesde?.toMillis() ?? 0

  const quinta = await getQuintaConfig()

  const hoy = hoyArg()
  const d2  = addDias(hoy, 2)  // ventana check-in: hoy hasta hoy+2
  const d1  = addDias(hoy, 1)  // ventana checkout: hoy hasta hoy+1

  const reservasSnap = await db.collection('reservas').get()
  const reservas = reservasSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })) as any[]

  for (const r of reservas) {
    // ── ¿Ya finalizó? (checkout en día anterior según UTC-3) ─────────────────
    const yaFinalizo = r.estado === 'finalizada' || (r.fechaHasta && esFechaAnteriorArg(r.fechaHasta, hoy))

    // Actualizar estado en Firestore si aún no estaba marcado
    if (r.estado !== 'finalizada' && yaFinalizo) {
      try {
        await r.ref.update({ estado: 'finalizada' })
      } catch (e) { console.error(`finalizar reserva ${r.id}:`, e) }
    }

    const email: string | undefined = r.inquilino?.email
    if (!email) continue

    const flags: Record<string, boolean> = r._emailsSent ?? {}

    // Check-in: hoy ≤ fechaDesde ≤ hoy+2 (cubre D-2 y reservas de último momento)
    if (!flags.checkin && !yaFinalizo && estaEnRangoArg(r.fechaDesde, hoy, d2)) {
      try {
        await enviarRecordatorioCheckin(cfg, quinta, r, email)
        await r.ref.update({ '_emailsSent.checkin': true })
      } catch (e) { console.error(`checkin email error ${r.id}:`, e) }
    }

    // Checkout: hoy ≤ fechaHasta ≤ hoy+1 (cubre D-1 y checkouts del mismo día)
    if (!flags.checkout && !yaFinalizo && estaEnRangoArg(r.fechaHasta, hoy, d1)) {
      try {
        await enviarRecordatorioCheckout(cfg, quinta, r, email)
        await r.ref.update({ '_emailsSent.checkout': true })
      } catch (e) { console.error(`checkout email error ${r.id}:`, e) }
    }

    // Reseña: solo si finalizó Y el checkout fue DESPUÉS de que se activaron los emails.
    // Evita mandar retroactivamente a reservas que finalizaron mientras estaba apagado.
    const checkoutMs = r.fechaHasta?.toMillis() ?? 0
    if (!flags.resena && yaFinalizo && checkoutMs >= activadoDesdeMs) {
      try {
        await enviarSolicitudResena(cfg, quinta, r, email)
        await r.ref.update({ '_emailsSent.resena': true })
      } catch (e) { console.error(`resena email error ${r.id}:`, e) }
    }
  }

}

/** Cron principal — mediodía Argentina. */
export const scheduledEmailsMediodia = onSchedule(
  { schedule: '0 12 * * *', timeZone: 'America/Argentina/Buenos_Aires', region: 'us-central1' },
  async () => { await procesarEmailsProgramados() }
)

/** Red de seguridad — 23:00 Argentina. Cubre reservas ingresadas tarde en el día. */
export const scheduledEmailsSafetyNet = onSchedule(
  { schedule: '0 23 * * *', timeZone: 'America/Argentina/Buenos_Aires', region: 'us-central1' },
  async () => { await procesarEmailsProgramados() }
)

async function enviarRecordatorioCheckin(cfg: EmailConfig, quinta: QuintaConfig, r: any, email: string) {
  const checkin = quinta.horaCheckin ?? '15:00'

  const contenido = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">¡Te esperamos pasado mañana, ${r.inquilino?.nombre}! 🏡</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">Tu estadía está a la vuelta de la esquina. Acá van los detalles para que llegues sin problema.</p>

    ${bloqueFechas(r.fechaDesde, r.fechaHasta)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding:12px 16px;background:#f0fdf4;border-radius:10px;margin-bottom:8px;">
          <p style="margin:0;font-size:13px;color:#6b7280;">🕐 Horario de check-in</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#065f46;">${checkin} hs</p>
        </td>
      </tr>
    </table>

    ${quinta.ubicacion || quinta.googleMapsUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:12px;margin:16px 0;border:1px solid #bfdbfe;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#6b7280;">📍 Dirección</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#1e40af;">${quinta.ubicacion ?? ''}</p>
          ${quinta.googleMapsUrl ? `
          <a href="${quinta.googleMapsUrl}" style="display:inline-block;margin-top:10px;background:#1d4ed8;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;">
            📍 Abrir en Google Maps
          </a>` : ''}
        </td>
      </tr>
    </table>` : ''}

    ${quinta.instruccionesCheckin ? `
    <div style="background:#fafafa;border-left:4px solid #10b981;border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#065f46;">Instrucciones de acceso</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${quinta.instruccionesCheckin}</p>
    </div>` : ''}

    <p style="font-size:14px;color:#64748b;margin:20px 0 0;">¿Alguna pregunta antes de llegar? Escribinos por WhatsApp.</p>`

  const html = renderEmail(contenido, quinta)
  await sendEmail(cfg, email, `Te esperamos en 2 días — ${quinta.nombre ?? 'Casa Quinta'}`, html)
}

async function enviarRecordatorioCheckout(cfg: EmailConfig, quinta: QuintaConfig, r: any, email: string) {
  const checkout = quinta.horaCheckout ?? '11:00'

  const contenido = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Mañana es el día de salida, ${r.inquilino?.nombre}</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">
      Esperamos que hayas disfrutado tu estadía. Antes de irte, recordá:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="padding:12px 16px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa;">
          <p style="margin:0;font-size:13px;color:#6b7280;">🕐 Horario de check-out</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#92400e;">${checkout} hs</p>
        </td>
      </tr>
    </table>

    ${quinta.normativaCheckout ? `
    <div style="background:#fafafa;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#92400e;">Normativa de salida</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${quinta.normativaCheckout}</p>
    </div>` : ''}

    <p style="font-size:14px;color:#64748b;margin:20px 0 0;">
      ¡Fue un placer recibirlos! Si necesitás algo antes de irte, escribinos.
    </p>`

  const html = renderEmail(contenido, quinta)
  await sendEmail(cfg, email, `Recordatorio de checkout — ${quinta.nombre ?? 'Casa Quinta'}`, html)
}

async function enviarSolicitudResena(cfg: EmailConfig, quinta: QuintaConfig, r: any, email: string) {
  const resenaUrl = `https://quinta-rivas.web.app/resena?r=${r.id}`

  const contenido = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">¿Cómo estuvo tu estadía, ${r.inquilino?.nombre}? ⭐</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;">
      Esperamos que lo hayas pasado genial. Tu opinión nos ayuda a seguir mejorando — ¡nos lleva solo 1 minuto!
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${resenaUrl}"
        style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:-0.3px;">
        ⭐ Dejar mi calificación
      </a>
    </div>

    <p style="font-size:13px;color:#94a3b8;text-align:center;margin:0;">
      O copiá este link: <a href="${resenaUrl}" style="color:#10b981;">${resenaUrl}</a>
    </p>`

  const html = renderEmail(contenido, quinta)
  await sendEmail(cfg, email, `¿Cómo te fue? Contanos tu experiencia — ${quinta.nombre ?? 'Casa Quinta'}`, html)
}

// ─── 5. Alertas del admin (funcionalidad existente) ───────────────────────────

async function enviarAlertasAdmin(cfg: EmailConfig) {
  if (!cfg.destinatarios?.length) return

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
    return `
      <tr>
        <td style="padding: 8px; font-weight: 600;">${d['titulo'] ?? ''}</td>
        <td style="padding: 8px; color: #64748b;">${formatFecha(d['fecha'] as admin.firestore.Timestamp)}</td>
        <td style="padding: 8px; color: #64748b;">${d['vertical'] ?? ''}</td>
      </tr>`
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
    </div>`

  await sendEmail(cfg, cfg.destinatarios, `${proximas.length} alerta${proximas.length > 1 ? 's' : ''} próxima${proximas.length > 1 ? 's' : ''} — Rivas`, html)

  const batch = db.batch()
  for (const doc of proximas) batch.update(doc.ref, { estado: 'enviada' })
  await batch.commit()
}

// ─── 6. Forzar procesamiento de emails programados (callable) ─────────────────
// Útil para testing o para catchear reservas que quedaron sin procesar.

export const forzarProcesarEmails = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado')
    await procesarEmailsProgramados()
    return { ok: true }
  }
)

// ─── 7. Push: nueva reseña ────────────────────────────────────────────────────

export const onNuevaResena = onDocumentCreated(
  { document: 'resenas/{id}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    const estrellas = '⭐'.repeat(Math.min(Math.max(data.rating ?? 0, 1), 5))
    const nombre = data.nombre ?? 'Huésped'
    const bodyText = data.comentario
      ? `"${String(data.comentario).slice(0, 80)}${data.comentario.length > 80 ? '...' : ''}"`
      : `${nombre} dejó una reseña`

    await sendPush(
      `${estrellas} Nueva reseña de ${nombre}`,
      bodyText,
      { type: 'nueva_resena', url: 'https://walter-rivas.web.app/casa-quinta?tab=reservas' }
    )
  }
)

// ─── 8. Email de prueba (callable) ───────────────────────────────────────────

export const sendTestEmail = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado')

    const cfg = await getEmailConfig()
    if (!cfg?.remitente || !cfg?.appPassword || !cfg?.destinatarios?.length) {
      throw new HttpsError('failed-precondition', 'Configuración de email incompleta')
    }

    const quinta = await getQuintaConfig()
    const contenido = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Email de prueba ✓</h2>
      <p style="font-size:15px;color:#475569;">Si ves este email, la configuración está funcionando correctamente.</p>
      <p style="font-size:13px;color:#94a3b8;">Remitente: ${cfg.remitente}</p>`

    const html = renderEmail(contenido, quinta)

    try {
      await sendEmail(cfg, cfg.destinatarios, 'Email de prueba — Rivas App', html)
      return { ok: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      throw new HttpsError('internal', `Error enviando email: ${msg}`)
    }
  }
)
