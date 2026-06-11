import { ChevronRight, User, Calendar, Clock, Star } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Reserva, Resena } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  reserva: Reserva
  resena?: Resena
  lateCheckoutDisponible?: boolean
  onClick: () => void
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

// Calcula si la reserva ya terminó comparando en UTC-3
function esFinalizada(reserva: Reserva): boolean {
  if (reserva.estado === 'finalizada') return true
  // fallback visual: si el checkout ya pasó aunque el cron aún no actualizó Firestore
  const checkout = toDate(reserva.fechaHasta)
  const hoyArg = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return checkout < new Date(Date.UTC(hoyArg.getUTCFullYear(), hoyArg.getUTCMonth(), hoyArg.getUTCDate()))
}

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  libre:      { label: 'Sin seña',   cls: 'bg-slate-100 text-slate-500' },
  señado:     { label: 'Señado',     cls: 'bg-amber-100 text-amber-700' },
  reservado:  { label: 'Confirmado', cls: 'bg-emerald-100 text-emerald-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-500' },
}

function StarRow({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </span>
  )
}

export function ReservaCard({ reserva, resena, lateCheckoutDisponible, onClick }: Props) {
  const finalizada = esFinalizada(reserva)
  const estadoKey = finalizada ? 'finalizada' : reserva.estado
  const config = ESTADO_CONFIG[estadoKey] ?? ESTADO_CONFIG['reservado']
  const totalPagado = reserva.pagos.reduce((s, p) => s + p.monto, 0)
  const saldoPendiente = Math.max(0, reserva.montoTotal - totalPagado)
  const porcentaje = reserva.montoTotal > 0 ? (totalPagado / reserva.montoTotal) * 100 : 0

  // Reseña pendiente: checkout pasó + se envió el email + no hay reseña
  const resenaPendiente = finalizada && reserva._emailsSent?.resena && !resena

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left hover:border-slate-200 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges de estado */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.cls)}>
              {config.label}
            </span>
            {!finalizada && lateCheckoutDisponible && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                <Clock size={9} />
                Late checkout disponible
              </span>
            )}
            {finalizada && resena && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                <StarRow n={resena.estrellas} />
              </span>
            )}
            {resenaPendiente && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                Reseña pendiente
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <User size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-800 truncate">
              {reserva.inquilino.nombre}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500">
              {formatFecha(reserva.fechaDesde)} → {formatFecha(reserva.fechaHasta)}
            </span>
          </div>

          {/* Preview de reseña */}
          {finalizada && resena?.loMejor && (
            <p className="mt-1.5 text-xs text-slate-400 italic line-clamp-1">
              "{resena.loMejor}"
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">{formatMoney(reserva.montoTotal)}</p>
            {saldoPendiente > 0 && (
              <p className="text-xs text-red-500 font-medium">
                Debe {formatMoney(saldoPendiente)}
              </p>
            )}
            {saldoPendiente === 0 && reserva.montoTotal > 0 && (
              <p className="text-xs text-emerald-600 font-medium">Pagado</p>
            )}
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>

      {/* Progress bar */}
      {reserva.montoTotal > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                porcentaje === 100 ? 'bg-emerald-500' : finalizada ? 'bg-slate-300' : 'bg-amber-400'
              )}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}
