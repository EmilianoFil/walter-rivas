import { useState } from 'react'
import { X, Plus, Trash2, Phone, Mail, CreditCard, Calendar } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Reserva, PagoReserva } from '@/types'
import { cn } from '@/lib/cn'
import { ConfirmSheet } from '@/components/ConfirmSheet'

interface Props {
  reserva: Reserva
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAddPago: (pago: Omit<PagoReserva, 'id'>) => Promise<void>
  onDeletePago: (pagoId: string) => Promise<void>
}

const pagoSchema = z.object({
  monto: z.coerce.number().min(1, 'Ingresá un monto'),
  tipo: z.enum(['seña', 'saldo', 'parcial']),
  fecha: z.string().min(1, 'Requerido'),
  notas: z.string().optional(),
})
type PagoForm = z.infer<typeof pagoSchema>

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const ESTADO_CONFIG = {
  libre: { label: 'Libre', cls: 'bg-slate-100 text-slate-600' },
  señado: { label: 'Señado', cls: 'bg-amber-100 text-amber-700' },
  reservado: { label: 'Reservado', cls: 'bg-emerald-100 text-emerald-700' },
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function ReservaDetalle({ reserva, onClose, onEdit, onDelete, onAddPago, onDeletePago }: Props) {
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const config = ESTADO_CONFIG[reserva.estado]
  const totalPagado = reserva.pagos.reduce((s, p) => s + p.monto, 0)
  const porcentaje = reserva.montoTotal > 0 ? Math.min((totalPagado / reserva.montoTotal) * 100, 100) : 0

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema) as Resolver<PagoForm>,
    defaultValues: { tipo: 'seña', fecha: new Date().toISOString().split('T')[0] },
  })

  const submitPago = async (data: PagoForm) => {
    await onAddPago({
      monto: data.monto,
      tipo: data.tipo,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
      ...(data.notas ? { notas: data.notas } : {}),
    })
    reset()
    setShowPagoForm(false)
  }

  const handleDeletePago = async (id: string) => {
    setDeletingId(id)
    await onDeletePago(id)
    setDeletingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.cls)}>
              {config.label}
            </span>
            <h2 className="text-base font-semibold text-slate-900">{reserva.inquilino.nombre}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Fechas */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar size={15} className="text-slate-400" />
            <span>{formatFecha(reserva.fechaDesde)}</span>
            <span className="text-slate-300">→</span>
            <span>{formatFecha(reserva.fechaHasta)}</span>
          </div>

          {/* Contacto */}
          <div className="space-y-1.5">
            {reserva.inquilino.telefono && (
              <a
                href={`tel:${reserva.inquilino.telefono}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <Phone size={14} className="text-slate-400" />
                {reserva.inquilino.telefono}
              </a>
            )}
            {reserva.inquilino.email && (
              <a
                href={`mailto:${reserva.inquilino.email}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <Mail size={14} className="text-slate-400" />
                {reserva.inquilino.email}
              </a>
            )}
          </div>

          {/* Monto y progreso */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total</span>
              <span className="font-semibold text-slate-800">{formatMoney(reserva.montoTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Pagado</span>
              <span className="font-semibold text-emerald-600">{formatMoney(totalPagado)}</span>
            </div>
            {reserva.saldoPendiente > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pendiente</span>
                <span className="font-semibold text-red-500">{formatMoney(reserva.saldoPendiente)}</span>
              </div>
            )}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', porcentaje === 100 ? 'bg-emerald-500' : 'bg-amber-400')}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          {/* Notas */}
          {reserva.notas && (
            <p className="text-sm text-slate-500 italic">{reserva.notas}</p>
          )}

          {/* Pagos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={12} />
                Pagos registrados
              </p>
              <button
                onClick={() => setShowPagoForm(!showPagoForm)}
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
              >
                <Plus size={14} />
                Agregar
              </button>
            </div>

            {showPagoForm && (
              <form onSubmit={handleSubmit(submitPago)} className="bg-slate-50 rounded-xl p-3 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                    <input
                      {...register('monto')}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      className={cn(inputCls, 'py-2 text-xs')}
                    />
                    {errors.monto && <p className="text-red-500 text-xs mt-0.5">{errors.monto.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
                    <select {...register('tipo')} className={cn(inputCls, 'py-2 text-xs')}>
                      <option value="seña">Seña</option>
                      <option value="parcial">Parcial</option>
                      <option value="saldo">Saldo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                  <input {...register('fecha')} type="date" className={cn(inputCls, 'py-2 text-xs')} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPagoForm(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {reserva.pagos.length === 0 && !showPagoForm && (
              <p className="text-xs text-slate-400 text-center py-3">Sin pagos registrados</p>
            )}

            <div className="space-y-2">
              {reserva.pagos.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{formatMoney(p.monto)}</p>
                    <p className="text-xs text-slate-400 capitalize">{p.tipo} · {formatFecha(p.fecha)}</p>
                  </div>
                  <button
                    onClick={() => handleDeletePago(p.id)}
                    disabled={deletingId === p.id}
                    className="p-1.5 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex gap-2 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
          >
            Editar
          </button>
        </div>
      </div>
      <ConfirmSheet
        open={confirmDelete}
        title={`¿Eliminar reserva de ${reserva.inquilino.nombre}?`}
        subtitle="Esta acción no se puede deshacer."
        confirmLabel="Eliminar reserva"
        onConfirm={() => { setConfirmDelete(false); onDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
