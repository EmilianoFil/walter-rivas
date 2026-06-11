import { useState, useRef, useEffect } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, Trash2, ExternalLink, Plus, X, GripVertical, Loader2, Ban, RefreshCw, Mail, MailX } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useQuintaConfig } from '@/hooks/useQuintaConfig'
import type { QuintaFoto, RangoBloqueado } from '@/types'
import { cn } from '@/lib/cn'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { RichTextEditor } from '@/components/RichTextEditor'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().min(1, 'Requerido'),
  contactoEmail: z.string().email('Email inválido'),
  whatsapp: z.string().optional(),
  ubicacion: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function SitioPublicoAdmin() {
  const { config, loading, saveConfig, uploadFoto, deleteFoto } = useQuintaConfig()
  const [nuevoAmenity, setNuevoAmenity] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Blocked dates form state
  const [bloqueoDesde, setBloqueoDesde] = useState('')
  const [bloqueoHasta, setBloqueoHasta] = useState('')
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')
  const [savingBloqueo, setSavingBloqueo] = useState(false)
  const [confirmDeleteFoto, setConfirmDeleteFoto] = useState<QuintaFoto | null>(null)

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    values: {
      nombre: config.nombre,
      descripcion: config.descripcion,
      contactoEmail: config.contactoEmail,
      whatsapp: config.whatsapp ?? '',
      ubicacion: config.ubicacion ?? '',
    },
  })

  const submit = async (data: FormData) => {
    await saveConfig(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddAmenity = () => {
    const val = nuevoAmenity.trim()
    if (!val || config.amenities.includes(val)) return
    saveConfig({ amenities: [...config.amenities, val] })
    setNuevoAmenity('')
  }

  const handleRemoveAmenity = (a: string) => {
    saveConfig({ amenities: config.amenities.filter((x) => x !== a) })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const nuevas: QuintaFoto[] = []
    for (let i = 0; i < files.length; i++) {
      const foto = await uploadFoto(files[i], (pct) => setUploadPct(pct))
      nuevas.push(foto)
    }
    // Un solo write atómico con todas las fotos nuevas
    const todasFotos = [
      ...config.fotos,
      ...nuevas.map((f, i) => ({ ...f, orden: config.fotos.length + i })),
    ]
    await saveConfig({ fotos: todasFotos })
    setUploading(false)
    setUploadPct(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteFoto = async (foto: QuintaFoto) => {
    setConfirmDeleteFoto(foto)
  }

  const handleAddBloqueo = async () => {
    if (!bloqueoDesde || !bloqueoHasta) return
    if (bloqueoHasta < bloqueoDesde) return
    setSavingBloqueo(true)
    const motivo = bloqueoMotivo.trim()
    const nuevo: RangoBloqueado = {
      id: Date.now().toString(),
      desde: bloqueoDesde,
      hasta: bloqueoHasta,
      ...(motivo ? { motivo } : {}),
    }
    await saveConfig({ diasBloqueados: [...(config.diasBloqueados ?? []), nuevo] })
    setBloqueoDesde('')
    setBloqueoHasta('')
    setBloqueoMotivo('')
    setSavingBloqueo(false)
  }

  const handleDeleteBloqueo = async (id: string) => {
    await saveConfig({ diasBloqueados: (config.diasBloqueados ?? []).filter((b) => b.id !== id) })
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" /></div>

  const urlPublico = 'https://quinta-rivas.web.app'

  return (
    <div className="space-y-6">
      {/* Link al sitio */}
      <a
        href={urlPublico}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-slate-900 rounded-2xl px-4 py-3 text-white hover:bg-slate-800 transition"
      >
        <div>
          <p className="text-sm font-medium">Ver sitio público</p>
          <p className="text-xs text-slate-400">quinta-rivas.web.app</p>
        </div>
        <ExternalLink size={16} className="text-slate-400" />
      </a>

      {/* Datos principales */}
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Información del sitio</p>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Nombre de la quinta</label>
          <input {...register('nombre')} className={inputCls} placeholder="Ej: La Quinta de los Rivas" />
          {errors.nombre && <p className="text-red-500 text-xs mt-0.5">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
          <Controller
            control={control}
            name="descripcion"
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="Contá algo sobre la quinta, su ambiente, qué la hace especial..."
              />
            )}
          />
          {errors.descripcion && <p className="text-red-500 text-xs mt-0.5">{errors.descripcion.message}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Ubicación</label>
          <input {...register('ubicacion')} className={inputCls} placeholder="Ej: Exaltación de la Cruz, Buenos Aires" />
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Contacto</p>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Email de contacto</label>
          <input {...register('contactoEmail')} type="email" className={inputCls} placeholder="walter@email.com" />
          {errors.contactoEmail && <p className="text-red-500 text-xs mt-0.5">{errors.contactoEmail.message}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">WhatsApp (con código de país)</label>
          <input {...register('whatsapp')} className={inputCls} placeholder="5491112345678" />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-medium transition',
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
          )}
        >
          {saved ? '✓ Guardado' : isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Amenities */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amenities</p>
        <div className="flex gap-2">
          <input
            value={nuevoAmenity}
            onChange={(e) => setNuevoAmenity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
            className={cn(inputCls, 'flex-1')}
            placeholder="Ej: Pileta, Quincho, Wi-Fi..."
          />
          <button onClick={handleAddAmenity}
            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition flex-shrink-0">
            <Plus size={16} />
          </button>
        </div>

        {config.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.amenities.map((a) => (
              <span key={a} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-full">
                {a}
                <button onClick={() => handleRemoveAmenity(a)} className="text-slate-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fotos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fotos</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="text-red-400 animate-spin" />
              <p className="text-xs text-slate-500">Subiendo... {uploadPct}%</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-400" />
              <p className="text-xs text-slate-500">Tocá para agregar fotos</p>
              <p className="text-xs text-slate-400">JPG, PNG · Podés seleccionar varias</p>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {config.fotos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {config.fotos.map((foto) => (
              <div key={foto.path} className="relative rounded-xl overflow-hidden aspect-video bg-slate-100 group">
                <img src={foto.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleDeleteFoto(foto)}
                    className="bg-red-500 text-white p-2 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="absolute top-1.5 left-1.5 bg-black/40 rounded-md p-1">
                  <GripVertical size={12} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información para emails automáticos */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Información para emails</p>
        <p className="text-xs text-slate-400">
          Se incluye en los mails automáticos al huésped (confirmación, recordatorio de check-in, etc).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hora de check-in</label>
            <input
              type="time"
              value={config.horaCheckin ?? ''}
              onChange={(e) => saveConfig({ horaCheckin: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hora de check-out</label>
            <input
              type="time"
              value={config.horaCheckout ?? ''}
              onChange={(e) => saveConfig({ horaCheckout: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Link Google Maps</label>
          <input
            value={config.googleMapsUrl ?? ''}
            onChange={(e) => saveConfig({ googleMapsUrl: e.target.value })}
            className={inputCls}
            placeholder="https://maps.google.com/..."
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Instrucciones de acceso (para email D-2)</label>
          <textarea
            value={config.instruccionesCheckin ?? ''}
            onChange={(e) => saveConfig({ instruccionesCheckin: e.target.value })}
            rows={4}
            className={cn(inputCls, 'resize-none')}
            placeholder="Ej: Al llegar al portón azul, tocar el timbre. El código de la caja chica es 1234..."
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Normativa de checkout (para email D-1)</label>
          <textarea
            value={config.normativaCheckout ?? ''}
            onChange={(e) => saveConfig({ normativaCheckout: e.target.value })}
            rows={4}
            className={cn(inputCls, 'resize-none')}
            placeholder="Ej: Dejar la pileta limpia, sacar la basura, dejar las llaves en la caja..."
          />
        </div>
      </div>

      {/* Hold — tiempo de reserva pendiente */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Solicitudes del sitio</p>
        <p className="text-xs text-slate-400">
          Cuánto tiempo bloquean el calendario las solicitudes recibidas mientras esperan tu respuesta.
        </p>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Tiempo de hold</label>
          <select
            value={config.holdHoras ?? 24}
            onChange={(e) => saveConfig({ holdHoras: Number(e.target.value) })}
            className={inputCls}
          >
            <option value={6}>6 horas</option>
            <option value={12}>12 horas</option>
            <option value={24}>24 horas (recomendado)</option>
            <option value={48}>48 horas</option>
            <option value={72}>72 horas</option>
          </select>
        </div>
      </div>

      {/* Días no disponibles */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Días no disponibles</p>
        <p className="text-xs text-slate-400">
          Bloqueá fechas para uso propio o mantenimiento, sin necesidad de crear una reserva.
        </p>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Desde</label>
              <input
                type="date"
                value={bloqueoDesde}
                onChange={(e) => setBloqueoDesde(e.target.value)}
                className={cn(inputCls, 'py-2')}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
              <input
                type="date"
                value={bloqueoHasta}
                min={bloqueoDesde}
                onChange={(e) => setBloqueoHasta(e.target.value)}
                className={cn(inputCls, 'py-2')}
              />
            </div>
          </div>
          <input
            value={bloqueoMotivo}
            onChange={(e) => setBloqueoMotivo(e.target.value)}
            className={inputCls}
            placeholder="Motivo (opcional): uso personal, mantenimiento..."
          />
          <button
            onClick={handleAddBloqueo}
            disabled={!bloqueoDesde || !bloqueoHasta || savingBloqueo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium disabled:opacity-40 transition"
          >
            <Ban size={14} />
            {savingBloqueo ? 'Guardando...' : 'Bloquear días'}
          </button>
        </div>

        {(config.diasBloqueados ?? []).length > 0 && (
          <div className="space-y-2">
            {(config.diasBloqueados ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm text-slate-700 font-medium">
                    {formatDateLabel(b.desde)}
                    {b.desde !== b.hasta && <> → {formatDateLabel(b.hasta)}</>}
                  </p>
                  {b.motivo && <p className="text-xs text-slate-400 mt-0.5">{b.motivo}</p>}
                </div>
                <button
                  onClick={() => handleDeleteBloqueo(b.id)}
                  className="p-1.5 text-slate-300 hover:text-red-400 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sistema */}
      <SistemaAcciones />

      <ConfirmSheet
        open={!!confirmDeleteFoto}
        title="¿Eliminar esta foto?"
        confirmLabel="Eliminar foto"
        onConfirm={async () => { if (confirmDeleteFoto) await deleteFoto(confirmDeleteFoto); setConfirmDeleteFoto(null) }}
        onCancel={() => setConfirmDeleteFoto(null)}
      />
    </div>
  )
}

function SistemaAcciones() {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [detalle, setDetalle] = useState('')
  const [emailsActivos, setEmailsActivos] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)

  // Suscripción en tiempo real al estado del toggle
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'email'), (snap) => {
      setEmailsActivos(snap.data()?.emailsActivos ?? false)
    })
    return unsub
  }, [])

  const handleToggle = async () => {
    if (toggling || emailsActivos === null) return
    setToggling(true)
    try {
      const nuevo = !emailsActivos
      const update: Record<string, unknown> = { emailsActivos: nuevo }
      // Al activar, registramos el momento para evitar envíos retroactivos
      if (nuevo) update.emailsActivadoDesde = serverTimestamp()
      await updateDoc(doc(db, 'app_settings', 'email'), update)
    } finally {
      setToggling(false)
    }
  }

  const forzar = async () => {
    setEstado('loading')
    setDetalle('')
    try {
      const fn = httpsCallable(getFunctions(app, 'us-central1'), 'forzarProcesarEmails')
      await fn()
      setEstado('ok')
      setDetalle('Procesamiento completado. Revisá tu email.')
    } catch (e: unknown) {
      setEstado('error')
      setDetalle(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistema</p>

      {/* Toggle de emails */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
            emailsActivos ? 'bg-emerald-100' : 'bg-slate-100'
          )}>
            {emailsActivos
              ? <Mail size={16} className="text-emerald-600" />
              : <MailX size={16} className="text-slate-400" />
            }
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Envío de emails</p>
            <p className="text-xs text-slate-400">
              {emailsActivos === null ? 'Cargando…' : emailsActivos ? 'Activo — se envían recordatorios y reseñas' : 'Inactivo — no sale ningún mail'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling || emailsActivos === null}
          className={cn(
            'relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50',
            emailsActivos ? 'bg-emerald-500' : 'bg-slate-200'
          )}
        >
          <span className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
            emailsActivos ? 'translate-x-6' : 'translate-x-0'
          )} />
        </button>
      </div>

      {/* Forzar procesamiento */}
      <div>
        <p className="text-xs text-slate-400 mb-2">
          Fuerza el procesamiento ahora: finaliza reservas vencidas y envía los emails pendientes.
          {!emailsActivos && <span className="text-amber-500"> (emails desactivados — no saldrá nada)</span>}
        </p>
        <button
          onClick={forzar}
          disabled={estado === 'loading'}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition',
            estado === 'ok'    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            estado === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
            'bg-slate-100 text-slate-700 hover:bg-slate-200'
          )}
        >
          <RefreshCw size={14} className={estado === 'loading' ? 'animate-spin' : ''} />
          {estado === 'loading' ? 'Procesando…' : 'Forzar emails programados'}
        </button>
        {detalle && (
          <p className={cn('text-xs mt-1.5', estado === 'ok' ? 'text-emerald-600' : 'text-red-500')}>{detalle}</p>
        )}
      </div>
    </div>
  )
}
