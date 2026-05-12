import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDashboard } from '@/hooks/useDashboard'
import { AlertCircle, Home, Building2, HardHat, Briefcase, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Timestamp } from 'firebase/firestore'
import { cn } from '@/lib/cn'

const VERTICAL_META = {
  quinta: { icon: Home, color: 'bg-emerald-500', path: '/casa-quinta' },
  deptos: { icon: Building2, color: 'bg-blue-500', path: '/departamentos' },
  obras: { icon: HardHat, color: 'bg-amber-500', path: '/obras' },
  empresa: { icon: Briefcase, color: 'bg-purple-500', path: '/empresa' },
}

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toLocaleString('es-AR')
}

function formatMoneyFull(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function diasHasta(t: Timestamp | Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = toDate(t); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

export function Dashboard() {
  const { user } = useAuth()
  const { verticales, grafico, alertasActivas, loading } = useDashboard()
  const navigate = useNavigate()

  const horaActual = new Date().getHours()
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches'

  const totalIngresos = verticales.reduce((s, v) => s + v.ingresos, 0)
  const totalEgresos = verticales.reduce((s, v) => s + v.egresos, 0)
  const utilidad = totalIngresos - totalEgresos
  const margen = totalIngresos > 0 ? Math.round((utilidad / totalIngresos) * 100) : 0

  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const mesActualData = grafico[grafico.length - 1]

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl" />)}
      </div>
    )
  }

  const sinDatos = totalIngresos === 0 && totalEgresos === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {saludo}, {user?.displayName?.split(' ')[0] ?? 'Walter'} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 capitalize">{mesActual}</p>
      </div>

      {sinDatos ? (
        /* Estado vacío */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium mb-1">El panel está listo</p>
          <p className="text-sm text-slate-400">
            Empezá registrando movimientos en cualquier módulo y los números aparecerán acá automáticamente.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Ingresos</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatMoney(totalIngresos)}</p>
              {mesActualData && mesActualData.ingresos > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={11} className="text-emerald-500" />
                  <span className="text-xs text-slate-400">este mes {formatMoney(mesActualData.ingresos)}</span>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Egresos</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatMoney(totalEgresos)}</p>
              {mesActualData && mesActualData.egresos > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown size={11} className="text-red-400" />
                  <span className="text-xs text-slate-400">este mes {formatMoney(mesActualData.egresos)}</span>
                </div>
              )}
            </div>
            <div className={cn(
              'rounded-2xl p-4 shadow-sm',
              utilidad >= 0 ? 'bg-slate-900' : 'bg-red-500'
            )}>
              <p className="text-xs text-slate-400 font-medium">Utilidad</p>
              <p className="text-lg font-bold text-white mt-1">{formatMoney(utilidad)}</p>
              <p className="text-xs text-slate-400 mt-1">{margen}% margen</p>
            </div>
          </div>

          {/* Utilidad destacada */}
          <div className={cn(
            'rounded-2xl p-5 text-white shadow-sm',
            utilidad >= 0
              ? 'bg-gradient-to-br from-red-500 to-red-600'
              : 'bg-gradient-to-br from-slate-700 to-slate-800'
          )}>
            <p className="text-red-100 text-sm font-medium">Utilidad neta acumulada</p>
            <p className="text-3xl font-bold mt-1">{formatMoneyFull(utilidad)}</p>
            <p className="text-red-200 text-sm mt-1">{margen}% de margen sobre ingresos totales</p>
          </div>

          {/* Gráfico */}
          {grafico.some(m => m.ingresos > 0 || m.egresos > 0) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Últimos 6 meses</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={grafico} barGap={3} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}k`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v) => formatMoneyFull(Number(v))}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
                  <Bar dataKey="egresos" fill="#f87171" radius={[4, 4, 0, 0]} name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Por vertical */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Por vertical</h2>
            <div className="space-y-2">
              {verticales.map((v) => {
                const meta = VERTICAL_META[v.key as keyof typeof VERTICAL_META]
                const Icon = meta.icon
                const util = v.ingresos - v.egresos
                const sinActividad = v.ingresos === 0 && v.egresos === 0

                return (
                  <button
                    key={v.key}
                    onClick={() => navigate(meta.path)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all active:scale-[0.99]"
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', meta.color)}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-slate-800">{v.nombre}</p>
                      {sinActividad ? (
                        <p className="text-xs text-slate-400">Sin movimientos</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatMoney(v.ingresos)} ing · {formatMoney(v.egresos)} eg
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      {!sinActividad && (
                        <p className={cn('text-sm font-semibold', util >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {util >= 0 ? '+' : ''}{formatMoney(util)}
                        </p>
                      )}
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Alertas urgentes */}
      {alertasActivas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Alertas</h2>
            <button onClick={() => navigate('/alertas')} className="text-xs text-red-500 font-medium">Ver todas</button>
          </div>
          <div className="space-y-2">
            {alertasActivas.map((a) => {
              const dias = diasHasta(a.fecha)
              const vencida = dias < 0
              return (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-2xl p-4 flex items-start gap-3 border',
                    vencida ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                  )}
                >
                  <AlertCircle size={15} className={cn('mt-0.5 flex-shrink-0', vencida ? 'text-red-500' : 'text-amber-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {vencida ? `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` :
                        dias === 0 ? 'Vence hoy' :
                        `Vence en ${dias} día${dias !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
