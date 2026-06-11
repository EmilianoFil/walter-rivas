import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Timestamp } from 'firebase/firestore'
import { ChevronLeft, X, AlertTriangle } from 'lucide-react'
import type { Reserva } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  telefono: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dni: z.string().optional(),
  fechaDesde: z.string().min(1, 'Requerido'),
  fechaHasta: z.string().min(1, 'Requerido'),
  montoTotal: z.coerce.number().min(0, 'Requerido'),
  notas: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  reserva?: Reserva
  reservasExistentes?: Reserva[]
  onSubmit: (data: Omit<Reserva, 'id' | 'creadoEn' | 'pagos' | 'adjuntos'>) => Promise<void>
  onClose: () => void
}

function toMs(t: Timestamp | Date) {
  return t instanceof Date ? t.getTime() : t.toDate().getTime()
}

function conflicto(desde: Date, hasta: Date, reservas: Reserva[], excludeId?: string): Reserva | null {
  for (const r of reservas) {
    if (r.id === excludeId) continue
    const rDesde = toMs(r.fechaDesde)
    const rHasta = toMs(r.fechaHasta)
    // [desde, hasta) overlap — checkout day libre
    if (desde.getTime() < rHasta && hasta.getTime() > rDesde) return r
  }
  return null
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function ReservaForm({ reserva, reservasExistentes = [], onSubmit, onClose }: Props) {
  const [conflictoDetectado, setConflictoDetectado] = useState<Reserva | null>(null)

  const toInputDate = (t?: Timestamp | Date) => {
    if (!t) return ''
    const d = t instanceof Date ? t : t.toDate()
    return d.toISOString().split('T')[0]
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: reserva
      ? {
          nombre: reserva.inquilino.nombre,
          telefono: reserva.inquilino.telefono,
          email: reserva.inquilino.email ?? '',
          dni: reserva.inquilino.dni ?? '',
          fechaDesde: toInputDate(reserva.fechaDesde),
          fechaHasta: toInputDate(reserva.fechaHasta),
          montoTotal: reserva.montoTotal,
          notas: reserva.notas ?? '',
        }
      : {},
  })

  const submit = async (data: FormData) => {
    const desde = new Date(data.fechaDesde + 'T12:00:00')
    const hasta = new Date(data.fechaHasta + 'T12:00:00')

    const overlap = conflicto(desde, hasta, reservasExistentes, reserva?.id)
    if (overlap) {
      setConflictoDetectado(overlap)
      return
    }
    setConflictoDetectado(null)

    await onSubmit({
      inquilino: {
        nombre: data.nombre,
        telefono: data.telefono,
        ...(data.email ? { email: data.email } : {}),
        ...(data.dni ? { dni: data.dni } : {}),
      },
      fechaDesde: Timestamp.fromDate(desde),
      fechaHasta: Timestamp.fromDate(hasta),
      montoTotal: data.montoTotal,
      seña: reserva?.seña ?? 0,
      // Siempre recalcula: montoTotal - sum(pagos ya registrados)
      saldoPendiente: Math.max(
        0,
        data.montoTotal - (reserva?.pagos.reduce((s, p) => s + p.monto, 0) ?? 0)
      ),
      estado: reserva?.estado ?? 'reservado',
      ...(data.notas ? { notas: data.notas } : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col sm:bg-black/50 sm:flex-row sm:items-center sm:justify-center sm:p-4">
      <div className="hidden sm:block absolute inset-0" onClick={onClose} />

      <div className="flex-1 flex flex-col min-h-0 sm:flex-none sm:relative sm:w-full sm:max-w-md sm:max-h-[90dvh] sm:rounded-2xl sm:bg-white sm:shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 border-b border-slate-100 flex-shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}
        >
          <button onClick={onClose} className="sm:hidden p-1 -ml-1 text-slate-500">
            <ChevronLeft size={22} />
          </button>
          <h2 className="text-base font-semibold text-slate-900 flex-1">
            {reserva ? 'Editar reserva' : 'Nueva reserva'}
          </h2>
          <button onClick={onClose} className="hidden sm:block p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form id="reserva-form" onSubmit={handleSubmit(submit)} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4" style={{ touchAction: 'pan-y' }}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inquilino</p>

          <Field label="Nombre completo" error={errors.nombre?.message}>
            <input {...register('nombre')} className={inputCls} placeholder="Juan Pérez" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono" error={errors.telefono?.message}>
              <input {...register('telefono')} type="tel" className={inputCls} placeholder="11 1234-5678" />
            </Field>
            <Field label="DNI" error={errors.dni?.message}>
              <input {...register('dni')} className={inputCls} placeholder="Opcional" />
            </Field>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" className={inputCls} placeholder="Opcional" />
          </Field>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Estadía</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" error={errors.fechaDesde?.message}>
              <input {...register('fechaDesde')} type="date" className={inputCls} />
            </Field>
            <Field label="Hasta" error={errors.fechaHasta?.message}>
              <input {...register('fechaHasta')} type="date" className={inputCls} />
            </Field>
          </div>

          <Field label="Monto total ($)" error={errors.montoTotal?.message}>
            <input
              {...register('montoTotal')}
              type="number"
              inputMode="numeric"
              className={inputCls}
              placeholder="0"
            />
          </Field>

          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register('notas')}
              rows={2}
              className={cn(inputCls, 'resize-none')}
              placeholder="Observaciones..."
            />
          </Field>
        </form>

        {/* Conflicto de fechas */}
        {conflictoDetectado && (
          <div className="mx-4 mb-2 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Fechas no disponibles</p>
              <p className="text-xs text-red-500 mt-0.5">
                Se superpone con la reserva de <strong>{conflictoDetectado.inquilino.nombre}</strong>{' '}
                ({toInputDate(conflictoDetectado.fechaDesde)} → {toInputDate(conflictoDetectado.fechaHasta)})
              </p>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div
          className="px-4 pt-3 border-t border-slate-100 flex-shrink-0 flex gap-2"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="reserva-form"
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            {isSubmitting ? 'Guardando…' : reserva ? 'Guardar' : 'Crear reserva'}
          </button>
        </div>
      </div>
    </div>
  )
}
