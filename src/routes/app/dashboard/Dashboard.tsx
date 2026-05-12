import { useAuth } from '@/context/AuthContext'
import { TrendingUp, TrendingDown, AlertCircle, Home, Building2, HardHat, Briefcase } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// Datos de ejemplo — se reemplazarán con Firestore
const MOCK_VERTICALES = [
  { nombre: 'Casa quinta', ingresos: 1450000, egresos: 280000, icon: Home, color: 'bg-emerald-500' },
  { nombre: 'Deptos / Local', ingresos: 1720000, egresos: 180000, icon: Building2, color: 'bg-blue-500' },
  { nombre: 'Obras', ingresos: 760000, egresos: 410000, icon: HardHat, color: 'bg-amber-500' },
  { nombre: 'Empresa', ingresos: 890000, egresos: 1240000, icon: Briefcase, color: 'bg-purple-500' },
]

const MOCK_GRAFICO = [
  { mes: 'Ene', ingresos: 3800000, egresos: 1100000 },
  { mes: 'Feb', ingresos: 4200000, egresos: 1300000 },
  { mes: 'Mar', ingresos: 3600000, egresos: 980000 },
  { mes: 'Abr', ingresos: 4820000, egresos: 1240000 },
  { mes: 'May', ingresos: 4100000, egresos: 1500000 },
]

const MOCK_ALERTAS = [
  { id: '1', texto: 'Vto. expensas Depto 2', subtexto: 'Vence mañana', urgente: true },
  { id: '2', texto: 'Service Honda Civic', subtexto: 'En 15 días', urgente: false },
  { id: '3', texto: 'Póliza seguro Kangoo', subtexto: 'Vence en 20 días', urgente: false },
]

function formatMoney(n: number) {
  return '$' + (n / 1000).toFixed(0) + 'k'
}

function formatMoneyFull(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

export function Dashboard() {
  const { user } = useAuth()

  const horaActual = new Date().getHours()
  const saludo =
    horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches'

  const totalIngresos = MOCK_VERTICALES.reduce((s, v) => s + v.ingresos, 0)
  const totalEgresos = MOCK_VERTICALES.reduce((s, v) => s + v.egresos, 0)
  const utilidad = totalIngresos - totalEgresos
  const margen = Math.round((utilidad / totalIngresos) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {saludo}, {user?.displayName?.split(' ')[0] ?? 'Walter'} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Ingresos</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatMoney(totalIngresos)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">+12%</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Egresos</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatMoney(totalEgresos)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown size={12} className="text-red-500" />
            <span className="text-xs text-red-500 font-medium">-8%</span>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-slate-400 font-medium">Utilidad</p>
          <p className="text-lg font-bold text-white mt-1">{formatMoney(utilidad)}</p>
          <p className="text-xs text-slate-400 mt-1">{margen}% margen</p>
        </div>
      </div>

      {/* Utilidad neta destacada */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-sm">
        <p className="text-red-100 text-sm font-medium">Utilidad neta del mes</p>
        <p className="text-3xl font-bold mt-1">{formatMoneyFull(utilidad)}</p>
        <p className="text-red-200 text-sm mt-1">{margen}% de margen sobre ingresos</p>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Evolución mensual</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={MOCK_GRAFICO} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              width={40}
            />
            <Tooltip
              formatter={(v) => formatMoneyFull(Number(v))}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
            <Bar dataKey="egresos" fill="#e63946" radius={[4, 4, 0, 0]} name="Egresos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Verticales */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Por vertical</h2>
        <div className="space-y-2">
          {MOCK_VERTICALES.map(({ nombre, ingresos, egresos, icon: Icon, color }) => {
            const util = ingresos - egresos
            const positivo = util >= 0
            return (
              <div
                key={nombre}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatMoney(ingresos)} ing · {formatMoney(egresos)} eg
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn('text-sm font-semibold', positivo ? 'text-emerald-600' : 'text-red-500')}>
                    {positivo ? '+' : ''}{formatMoney(util)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alertas */}
      {MOCK_ALERTAS.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Alertas activas</h2>
          <div className="space-y-2">
            {MOCK_ALERTAS.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'rounded-2xl p-4 flex items-start gap-3 border',
                  a.urgente
                    ? 'bg-red-50 border-red-100'
                    : 'bg-white border-slate-100 shadow-sm'
                )}
              >
                <AlertCircle
                  size={16}
                  className={cn('mt-0.5 flex-shrink-0', a.urgente ? 'text-red-500' : 'text-amber-500')}
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.texto}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.subtexto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
