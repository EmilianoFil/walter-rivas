import { ChevronRight, User, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Unidad, PagoAlquiler } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  unidad: Unidad
  ultimoPago?: PagoAlquiler
  pagosPendientes: number
  onClick: () => void
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function diasHastaVencimiento(vto: Timestamp | Date): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const v = toDate(vto)
  v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export function UnidadCard({ unidad, ultimoPago, pagosPendientes, onClick }: Props) {
  const vencido = ultimoPago?.estado !== 'pagado' && ultimoPago?.vencimiento
    ? diasHastaVencimiento(ultimoPago.vencimiento) < 0
    : false

  const proxVencer = ultimoPago?.estado !== 'pagado' && ultimoPago?.vencimiento
    ? diasHastaVencimiento(ultimoPago.vencimiento)
    : null

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left hover:border-slate-200 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3 justify-between">
        <div className="flex-1 min-w-0">
          {/* Tipo + nombre */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              unidad.tipo === 'local' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            )}>
              {unidad.tipo === 'local' ? 'Local' : 'Depto'}
            </span>
            <span className="text-sm font-semibold text-slate-800">{unidad.nombre}</span>
          </div>

          {/* Inquilino */}
          {unidad.inquilino ? (
            <div className="flex items-center gap-1.5 mb-2">
              <User size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600 truncate">{unidad.inquilino.nombre}</span>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic mb-2">Sin inquilino</p>
          )}

          {/* Estado de pago */}
          {ultimoPago && (
            <div className="flex items-center gap-1.5">
              {ultimoPago.estado === 'pagado' ? (
                <>
                  <CheckCircle size={13} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Al día · {ultimoPago.periodo}</span>
                </>
              ) : vencido ? (
                <>
                  <AlertCircle size={13} className="text-red-500" />
                  <span className="text-xs text-red-500 font-medium">
                    Vencido {Math.abs(proxVencer ?? 0)}d · {formatMoney(ultimoPago.monto)}
                  </span>
                </>
              ) : (
                <>
                  <Clock size={13} className="text-amber-500" />
                  <span className="text-xs text-amber-600 font-medium">
                    Vence en {proxVencer}d · {formatMoney(ultimoPago.monto)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {pagosPendientes > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {pagosPendientes}
            </span>
          )}
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </button>
  )
}
