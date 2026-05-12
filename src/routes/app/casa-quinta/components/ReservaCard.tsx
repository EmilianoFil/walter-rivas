import { ChevronRight, User, Calendar } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Reserva } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  reserva: Reserva
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

const ESTADO_CONFIG = {
  libre: { label: 'Libre', cls: 'bg-slate-100 text-slate-600' },
  señado: { label: 'Señado', cls: 'bg-amber-100 text-amber-700' },
  reservado: { label: 'Reservado', cls: 'bg-emerald-100 text-emerald-700' },
}

export function ReservaCard({ reserva, onClick }: Props) {
  const config = ESTADO_CONFIG[reserva.estado]
  const totalPagado = reserva.pagos.reduce((s, p) => s + p.monto, 0)
  const porcentaje = reserva.montoTotal > 0 ? (totalPagado / reserva.montoTotal) * 100 : 0

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left hover:border-slate-200 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.cls)}>
              {config.label}
            </span>
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
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">{formatMoney(reserva.montoTotal)}</p>
            {reserva.saldoPendiente > 0 && (
              <p className="text-xs text-red-500 font-medium">
                Debe {formatMoney(reserva.saldoPendiente)}
              </p>
            )}
            {reserva.saldoPendiente === 0 && (
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
                porcentaje === 100 ? 'bg-emerald-500' : 'bg-amber-400'
              )}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      )}
    </button>
  )
}
