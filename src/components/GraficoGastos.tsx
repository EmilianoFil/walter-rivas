import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#f43f5e',
]

interface GastoItem {
  categoria: string
  monto: number
}

interface Props {
  gastos: GastoItem[]
  titulo?: string
}

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

export function GraficoGastos({ gastos, titulo = 'Por categoría' }: Props) {
  const agrupado = gastos.reduce<Record<string, number>>((acc, g) => {
    const cat = g.categoria || 'Sin categoría'
    acc[cat] = (acc[cat] ?? 0) + g.monto
    return acc
  }, {})

  const data = Object.entries(agrupado)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{titulo}</p>

      <div className="flex items-center gap-4">
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [formatMoney(Number(value)), '']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
            return (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-xs text-slate-600 truncate flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-slate-800 tabular-nums">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
          return (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-xs text-slate-600 truncate">{d.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 tabular-nums w-20 text-right">
                  {formatMoney(d.value)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
