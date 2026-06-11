import { useState } from 'react'
import { ChevronLeft, Plus, Trash2, Phone, Mail, CreditCard, Calendar, Edit2, Star } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Reserva, PagoReserva, Resena } from '@/types'
import { cn } from '@/lib/cn'
import { ConfirmSheet } from '@/components/ConfirmSheet'

interface Props {
  reserva: Reserva
  resena?: Resena
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

function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  libre:      { label: 'Libre',      cls: 'bg-slate-100 text-slate-500' },
  señado:     { label: 'Señado',     cls: 'bg-amber-100 text-amber-700' },
  reservado:  { label: 'Confirmado', cls: 'bg-emerald-100 text-emerald-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-500' },
}

function toDate(ts: Timestamp | Date): Date {
  return ts instanceof Date ? ts : ts.toDate()
}

function esFinalizada(reserva: Reserva): boolean {
  if (reserva.estado === 'finalizada') return true
  const checkout = toDate(reserva.fechaHasta)
  const hoyArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return checkout < new Date(Date.UTC(hoyArg.getUTCFullYear(), hoyArg.getUTCMonth(), hoyArg.getUTCDate()))
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function ReservaDetalle({ reserva, resena, onClose, onEdit, onDelete, onAddPago, onDeletePago }: Props) {
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const finalizada = esFinalizada(reserva)
  const estadoKey = finalizada ? 'finalizada' : reserva.estado
  const config = ESTADO_CONFIG[estadoKey] ?? ESTADO_CONFIG['reservado']
  const totalPagado = reserva.pagos.reduce((s, p) => s + p.monto, 0)
  const porcentaje = reserva.montoTotal > 0 ? Math.min((totalPagado / reserva.montoTotal) * 100, 100) : 0
  const saldoPendiente = reserva.saldoPendiente

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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

  const openPagoForm = () => {
    reset({ tipo: 'seña', fecha: new Date().toISOString().split('T')[0], monto: undefined as unknown as number })
    setShowPagoForm(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 border-b border-slate-100 flex-shrink-0 bg-white"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}
      >
        <button onClick={onClose} className="p-1 -ml-1 text-slate-500 hover:text-slate-800">
          <ChevronLeft size={22} />
        </button>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', config.cls)}>
          {config.label}
        </span>
        <h2 className="text-base font-semibold text-slate-900 flex-1 truncate">{reserva.inquilino.nombre}</h2>
        <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-700">
          <Edit2 size={18} />
        </button>
        <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-slate-400 hover:text-red-500">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 space-y-5" style={{ touchAction: 'pan-y' }}>
        {/* Fechas */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar size={15} className="text-slate-400 flex-shrink-0" />
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
          {saldoPendiente > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Pendiente</span>
              <span className="font-semibold text-red-500">{formatMoney(saldoPendiente)}</span>
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

        {/* Reseña */}
        {finalizada && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Star size={12} />
              Reseña del huésped
            </p>
            {resena ? (
              <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-100">
                {/* Estrellas */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i <= resena.estrellas ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                    />
                  ))}
                  <span className="text-sm font-semibold text-amber-700 ml-1">{resena.estrellas}/5</span>
                </div>
                {/* Comentario general */}
                {resena.comentarios && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Comentarios</p>
                    <p className="text-sm text-slate-700">{resena.comentarios}</p>
                  </div>
                )}
                {/* Lo mejor */}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Lo que más le gustó</p>
                  <p className="text-sm text-slate-700 italic">"{resena.loMejor}"</p>
                </div>
                {/* Mejoras — privado */}
                {resena.mejoras && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Qué mejoraría <span className="text-slate-300">(solo vos lo ves)</span></p>
                    <p className="text-sm text-slate-600 italic">"{resena.mejoras}"</p>
                  </div>
                )}
                <p className="text-xs text-slate-400">— {resena.nombre}</p>
              </div>
            ) : reserva._emailsSent?.resena ? (
              <div className="bg-orange-50 rounded-xl p-3.5 border border-orange-100 text-center">
                <p className="text-sm text-orange-600 font-medium">Reseña pendiente</p>
                <p className="text-xs text-orange-400 mt-0.5">El email fue enviado, aún no la completó.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Sin reseña</p>
            )}
          </div>
        )}

        {/* Pagos */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <CreditCard size={12} />
            Pagos registrados
          </p>

          {showPagoForm && (
            <form id="pago-form" onSubmit={handleSubmit(submitPago)} className="bg-slate-50 rounded-xl p-3 mb-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-500">Monto</label>
                  {saldoPendiente > 0 && (
                    <button
                      type="button"
                      onClick={() => setValue('monto', saldoPendiente)}
                      className="text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full transition"
                    >
                      Saldo {formatMoney(saldoPendiente)}
                    </button>
                  )}
                </div>
                <input
                  {...register('monto')}
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  className={cn(inputCls, 'py-2 text-xs')}
                />
                {errors.monto && <p className="text-red-500 text-xs mt-0.5">{errors.monto.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
                  <select {...register('tipo')} className={cn(inputCls, 'py-2 text-xs')}>
                    <option value="seña">Seña</option>
                    <option value="parcial">Parcial</option>
                    <option value="saldo">Saldo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                  <input {...register('fecha')} type="date" className={cn(inputCls, 'py-2 text-xs')} />
                </div>
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

      {/* Bottom CTA */}
      <div
        className="px-4 pt-3 bg-white border-t border-slate-100 flex-shrink-0"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {showPagoForm ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPagoForm(false)}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="pago-form"
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando…' : 'Guardar pago'}
            </button>
          </div>
        ) : (
          <button
            onClick={openPagoForm}
            className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            <Plus size={18} />
            Agregar pago
          </button>
        )}
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
