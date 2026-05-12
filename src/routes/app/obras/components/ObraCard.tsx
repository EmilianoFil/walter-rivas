import { ChevronRight, User } from 'lucide-react'
import type { Obra } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  obra: Obra
  onClick: () => void
}

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const ESTADO_CONFIG = {
  activa: { label: 'Activa', cls: 'bg-emerald-100 text-emerald-700' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-600' },
}

export function ObraCard({ obra, onClick }: Props) {
  const totalCobrado = obra.cobros.reduce((s, c) => s + c.monto, 0)
  const totalGastado = obra.gastos.reduce((s, g) => s + g.monto, 0)
  const utilidad = totalCobrado - totalGastado
  const progresoCobro = obra.presupuesto > 0
    ? Math.min((totalCobrado / obra.presupuesto) * 100, 100)
    : 0
  const saldoACobrar = Math.max(0, obra.presupuesto - totalCobrado)

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left hover:border-slate-200 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ESTADO_CONFIG[obra.estado].cls)}>
              {ESTADO_CONFIG[obra.estado].label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{obra.nombre}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <User size={12} className="text-slate-400" />
            <p className="text-xs text-slate-500 truncate">{obra.cliente}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">Presupuesto</p>
          <p className="text-sm font-semibold text-slate-800">{formatMoney(obra.presupuesto)}</p>
        </div>
      </div>

      {/* Barra progreso cobro */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Cobrado: {formatMoney(totalCobrado)}</span>
          {saldoACobrar > 0 && <span className="text-red-500">Resta: {formatMoney(saldoACobrar)}</span>}
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', progresoCobro === 100 ? 'bg-emerald-500' : 'bg-blue-400')}
            style={{ width: `${progresoCobro}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-slate-500">
          <span>Gastos: {formatMoney(totalGastado)}</span>
          <span className={cn('font-medium', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            Utilidad: {utilidad >= 0 ? '+' : ''}{formatMoney(utilidad)}
          </span>
        </div>
        <ChevronRight size={16} className="text-slate-300" />
      </div>
    </button>
  )
}
