import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Timestamp } from 'firebase/firestore'
import { X } from 'lucide-react'
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
  onSubmit: (data: Omit<Reserva, 'id' | 'creadoEn' | 'pagos' | 'adjuntos'>) => Promise<void>
  onClose: () => void
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

export function ReservaForm({ reserva, onSubmit, onClose }: Props) {
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
    await onSubmit({
      inquilino: {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email || undefined,
        dni: data.dni || undefined,
      },
      fechaDesde: Timestamp.fromDate(desde),
      fechaHasta: Timestamp.fromDate(hasta),
      montoTotal: data.montoTotal,
      seña: reserva?.seña ?? 0,
      saldoPendiente: reserva
        ? reserva.saldoPendiente
        : data.montoTotal,
      estado: reserva?.estado ?? 'libre',
      notas: data.notas || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {reserva ? 'Editar reserva' : 'Nueva reserva'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(submit)} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">
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
          </div>

          <div className="px-5 pb-5 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition"
            >
              {isSubmitting ? 'Guardando...' : reserva ? 'Guardar' : 'Crear reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
