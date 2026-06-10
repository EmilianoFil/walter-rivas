import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDashboard, type RawData } from '@/hooks/useDashboard'
import { AlertCircle, Home, Building2, HardHat, Briefcase, Car, TrendingUp, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Timestamp } from 'firebase/firestore'
import { cn } from '@/lib/cn'

// ── Types ─────────────────────────────────────────────────────────────────────
type Periodo = 'semana' | 'mes' | 'año'
type Vertical = 'todas' | 'quinta' | 'deptos' | 'obras' | 'empresa' | 'flota'

// ── Static config ─────────────────────────────────────────────────────────────
const VERTICAL_META: Record<string, { icon: typeof Home; color: string; path: string; nombre: string }> = {
  quinta:  { icon: Home,      color: 'bg-emerald-500', path: '/casa-quinta',    nombre: 'Casa quinta'    },
  deptos:  { icon: Building2, color: 'bg-blue-500',    path: '/departamentos',  nombre: 'Deptos / Local' },
  obras:   { icon: HardHat,   color: 'bg-amber-500',   path: '/obras',          nombre: 'Obras'          },
  empresa: { icon: Briefcase, color: 'bg-purple-500',  path: '/empresa',        nombre: 'Empresa'        },
  flota:   { icon: Car,       color: 'bg-slate-500',   path: '/flota',          nombre: 'Flota'          },
}

const VERTICAL_CHIPS: { key: Vertical; label: string }[] = [
  { key: 'todas',   label: 'Todas'   },
  { key: 'quinta',  label: 'Quinta'  },
  { key: 'deptos',  label: 'Deptos'  },
  { key: 'obras',   label: 'Obras'   },
  { key: 'empresa', label: 'Empresa' },
  { key: 'flota',   label: 'Flota'   },
]

const PERIODO_CHIPS: { key: Periodo; label: string }[] = [
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes'    },
  { key: 'año',    label: 'Año'    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function isInRange(t: Timestamp | Date, start: Date, end: Date): boolean {
  const d = toDate(t)
  return d >= start && d <= end
}

function getPeriodRange(periodo: Periodo): { start: Date; end: Date } {
  const now = new Date()
  if (periodo === 'semana') {
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff + 6, 23, 59, 59, 999)
    return { start, end }
  }
  if (periodo === 'mes') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    }
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  }
}

function computeIngresos(raw: RawData, vertical: Vertical, start: Date, end: Date): number {
  const inr = (t: Timestamp | Date) => isInRange(t, start, end)
  let total = 0
  if (vertical === 'todas' || vertical === 'quinta')
    total += raw.reservas.reduce((s, r) => s + r.pagos.filter(p => inr(p.fecha)).reduce((ps, p) => ps + p.monto, 0), 0)
  if (vertical === 'todas' || vertical === 'deptos')
    total += raw.pagosAlquiler.filter(p => p.estado === 'pagado' && p.fechaPago && inr(p.fechaPago)).reduce((s, p) => s + p.monto, 0)
  if (vertical === 'todas' || vertical === 'obras')
    total += raw.obras.reduce((s, o) => s + o.cobros.filter(c => inr(c.fecha)).reduce((cs, c) => cs + c.monto, 0), 0)
  if (vertical === 'todas' || vertical === 'empresa')
    total += raw.empresaClientes.reduce((s, c) => s + c.ingresos.filter(i => inr(i.fecha)).reduce((cs, i) => cs + i.monto, 0), 0)
  return total
}

function computeEgresos(raw: RawData, vertical: Vertical, start: Date, end: Date): number {
  const inr = (t: Timestamp | Date) => isInRange(t, start, end)
  let total = 0
  if (vertical === 'todas' || vertical === 'quinta')
    total += raw.gastosQuinta.filter(g => inr(g.fecha)).reduce((s, g) => s + g.monto, 0)
  if (vertical === 'todas' || vertical === 'deptos')
    total += raw.gastosUnidad.filter(g => inr(g.fecha)).reduce((s, g) => s + g.monto, 0)
  if (vertical === 'todas' || vertical === 'obras')
    total += raw.obras.reduce((s, o) => s + o.gastos.filter(g => inr(g.fecha)).reduce((gs, g) => gs + g.monto, 0), 0)
  if (vertical === 'todas' || vertical === 'empresa')
    total += raw.empresaClientes.reduce((s, c) => s + c.gastos.filter(g => inr(g.fecha)).reduce((cs, g) => cs + g.monto, 0), 0)
  if (vertical === 'todas' || vertical === 'flota')
    total += raw.gastosVehiculo.filter(g => inr(g.fecha)).reduce((s, g) => s + g.monto, 0)
  return total
}

function buildGrafico(raw: RawData, vertical: Vertical, periodo: Periodo): { mes: string; ingresos: number; egresos: number }[] {
  const compute = (start: Date, end: Date) => ({
    ingresos: computeIngresos(raw, vertical, start, end),
    egresos:  computeEgresos(raw, vertical, start, end),
  })

  if (periodo === 'semana') {
    const day = new Date().getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + diff)
    return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((mes, i) => {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      const end   = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 23, 59, 59, 999)
      return { mes, ...compute(start, end) }
    })
  }

  if (periodo === 'mes') {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const weeks: { mes: string; ingresos: number; egresos: number }[] = []
    let cur = new Date(firstDay)
    let n = 1
    while (cur <= lastDay) {
      const start = new Date(cur)
      const endDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 6)
      const end = new Date(Math.min(endDate.getTime(), lastDay.getTime()))
      end.setHours(23, 59, 59, 999)
      weeks.push({ mes: `Sem ${n}`, ...compute(start, end) })
      cur.setDate(cur.getDate() + 7)
      n++
    }
    return weeks
  }

  // año
  const year = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(year, i, 1)
    const end   = new Date(year, i + 1, 0, 23, 59, 59, 999)
    const mes   = start.toLocaleDateString('es-AR', { month: 'short' })
    return { mes, ...compute(start, end) }
  })
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toLocaleString('es-AR')
}
function fmtFull(n: number) { return '$' + Math.round(n).toLocaleString('es-AR') }
function diasHasta(t: Timestamp | Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = toDate(t); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

// ── Component ──────────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user, puedeVer, loading: authLoading } = useAuth()
  const { verticales, rawData, alertasActivas, loading } = useDashboard(puedeVer, authLoading)
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [vertical, setVertical] = useState<Vertical>('todas')

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  // Chips filtrados según permisos del usuario
  const visibleChips = VERTICAL_CHIPS.filter(chip =>
    chip.key === 'todas' || puedeVer(chip.key as 'quinta' | 'deptos' | 'obras' | 'empresa')
  )

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-7 bg-slate-100 rounded-xl w-44" />
        <div className="flex gap-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-slate-100 rounded-full w-16 flex-shrink-0" />)}
        </div>
        <div className="h-36 bg-slate-100 rounded-2xl" />
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="h-10 bg-slate-100 rounded-2xl" />
        <div className="h-36 bg-slate-100 rounded-2xl" />
        <div className="h-44 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  // ── All-time KPIs ────────────────────────────────────────────────────────
  const filteredVerts = vertical === 'todas' ? verticales : verticales.filter(v => v.key === vertical)
  const totalIng  = filteredVerts.reduce((s, v) => s + v.ingresos, 0)
  const totalEg   = filteredVerts.reduce((s, v) => s + v.egresos, 0)
  const totalUtil = totalIng - totalEg
  const margenTotal = totalIng > 0 ? Math.round((totalUtil / totalIng) * 100) : 0
  const sinDatos = totalIng === 0 && totalEg === 0

  // ── Period KPIs ──────────────────────────────────────────────────────────
  const { start, end } = getPeriodRange(periodo)
  const perIng  = computeIngresos(rawData, vertical, start, end)
  const perEg   = computeEgresos(rawData, vertical, start, end)
  const perUtil = perIng - perEg
  const margenPer = perIng > 0 ? Math.round((perUtil / perIng) * 100) : 0

  // ── Mes anterior (solo cuando periodo === 'mes') ──────────────────────────
  const prevRange = (() => {
    if (periodo !== 'mes') return null
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return {
      start: new Date(prevYear, prevMonth, 1),
      end:   new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999),
    }
  })()
  const prevIng  = prevRange ? computeIngresos(rawData, vertical, prevRange.start, prevRange.end) : 0
  const prevEg   = prevRange ? computeEgresos(rawData, vertical, prevRange.start, prevRange.end)  : 0
  const prevUtil = prevIng - prevEg

  const deltaIng  = prevRange && prevIng  > 0 ? Math.round(((perIng  - prevIng)  / prevIng)  * 100) : null
  const deltaEg   = prevRange && prevEg   > 0 ? Math.round(((perEg   - prevEg)   / prevEg)   * 100) : null
  const deltaUtil = prevRange && prevUtil !== 0 ? Math.round(((perUtil - prevUtil) / Math.abs(prevUtil)) * 100) : null

  const grafico = buildGrafico(rawData, vertical, periodo)
  const graficoHasDatos = grafico.some(d => d.ingresos > 0 || d.egresos > 0)

  // Per-vertical breakdown for period (only when todas)
  const periodoByVertical = (['quinta', 'deptos', 'obras', 'empresa', 'flota'] as const).filter(puedeVer).map(key => ({
    key,
    ingresos: computeIngresos(rawData, key, start, end),
    egresos:  computeEgresos(rawData, key, start, end),
  })).filter(v => v.ingresos > 0 || v.egresos > 0)

  const periodoLabel = periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'este año'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {saludo}, {user?.displayName?.split(' ')[0] ?? 'Walter'} 👋
        </h1>
      </div>

      {/* Vertical filter */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 no-scrollbar">
        {visibleChips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setVertical(chip.key)}
            className={cn(
              'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
              vertical === chip.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {sinDatos ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium mb-1">El panel está listo</p>
          <p className="text-sm text-slate-400">
            Empezá registrando movimientos en cualquier módulo.
          </p>
        </div>
      ) : (
        <>
          {/* ── SECCIÓN: Acumulado ─────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Acumulado {vertical !== 'todas' && `· ${VERTICAL_META[vertical]?.nombre}`}
            </p>

            {/* Ledger card — reemplaza el grid de 3 cards + banner degradado */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Ingresos</span>
                  <span className="text-sm font-semibold text-slate-700 nums">{fmt(totalIng)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Egresos</span>
                  <span className="text-sm font-semibold text-slate-700 nums">{fmt(totalEg)}</span>
                </div>
              </div>
              <div className="h-px bg-slate-100 mx-5" />
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Utilidad neta</p>
                  <p className={cn(
                    'text-2xl font-bold tracking-tight nums',
                    totalUtil >= 0 ? 'text-slate-900' : 'text-red-500'
                  )}>
                    {fmtFull(totalUtil)}
                  </p>
                </div>
                {totalIng > 0 && (
                  <span className={cn(
                    'text-sm font-semibold px-3 py-1.5 rounded-xl',
                    totalUtil >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  )}>
                    {margenTotal}%
                  </span>
                )}
              </div>
            </div>

            {/* Per-vertical all-time cards (solo cuando todas) */}
            {vertical === 'todas' && (
              <div className="space-y-2">
                {verticales.map(v => {
                  const meta = VERTICAL_META[v.key]
                  const Icon = meta.icon
                  const util = v.ingresos - v.egresos
                  const sinActividad = v.ingresos === 0 && v.egresos === 0
                  return (
                    <button
                      key={v.key}
                      onClick={() => navigate(meta.path)}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:border-slate-200 transition-all active:scale-[0.99]"
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', meta.color)}>
                        <Icon size={15} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-slate-800">{v.nombre}</p>
                        {sinActividad ? (
                          <p className="text-xs text-slate-400">Sin movimientos</p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-0.5 nums">{fmt(v.ingresos)} ing · {fmt(v.egresos)} eg</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!sinActividad && (
                          <p className={cn('text-sm font-semibold nums', util >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {util >= 0 ? '+' : ''}{fmt(util)}
                          </p>
                        )}
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── SECCIÓN: Por período ───────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Por período</p>
            </div>

            {/* Period chips */}
            <div className="flex gap-2">
              {PERIODO_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setPeriodo(chip.key)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                    periodo === chip.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Period ledger */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Ingresos</span>
                  <div className="flex items-baseline gap-2">
                    {deltaIng !== null && (
                      <span className={cn('text-xs font-medium', deltaIng >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {deltaIng >= 0 ? '+' : ''}{deltaIng}% vs mes ant.
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-700 nums">{fmt(perIng)}</span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Egresos</span>
                  <div className="flex items-baseline gap-2">
                    {deltaEg !== null && (
                      <span className={cn('text-xs font-medium', deltaEg <= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {deltaEg >= 0 ? '+' : ''}{deltaEg}% vs mes ant.
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-700 nums">{fmt(perEg)}</span>
                  </div>
                </div>
              </div>
              <div className="h-px bg-slate-100 mx-5" />
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1 capitalize">{periodoLabel}</p>
                  {perIng === 0 && perEg === 0 ? (
                    <p className="text-base font-medium text-slate-400">Sin movimientos</p>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <p className={cn('text-2xl font-bold tracking-tight nums', perUtil >= 0 ? 'text-slate-900' : 'text-red-500')}>
                        {fmtFull(perUtil)}
                      </p>
                      {deltaUtil !== null && (
                        <span className={cn('text-xs font-medium', deltaUtil >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {deltaUtil >= 0 ? '+' : ''}{deltaUtil}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {(perIng > 0 || perEg > 0) && (
                  <span className={cn(
                    'text-sm font-semibold px-3 py-1.5 rounded-xl',
                    perUtil >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  )}>
                    {margenPer}%
                  </span>
                )}
              </div>
            </div>

            {/* Chart */}
            {graficoHasDatos ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={grafico} barGap={2} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false} width={40}
                      tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v/1_000).toFixed(0)}k` : `$${v}`}
                    />
                    <Tooltip
                      formatter={(v) => fmtFull(Number(v))}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="ingresos" fill="#10b981" radius={[4,4,0,0]} name="Ingresos" />
                    <Bar dataKey="egresos"  fill="#f87171" radius={[4,4,0,0]} name="Egresos"  />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
                <p className="text-sm text-slate-400">Sin movimientos {periodoLabel}</p>
              </div>
            )}

            {/* Per-vertical breakdown for period (only when todas) */}
            {vertical === 'todas' && periodoByVertical.length > 0 && (
              <div className="space-y-2">
                {periodoByVertical.map(v => {
                  const meta = VERTICAL_META[v.key]
                  const Icon = meta.icon
                  const util = v.ingresos - v.egresos
                  return (
                    <button
                      key={v.key}
                      onClick={() => navigate(meta.path)}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:border-slate-200 transition-all active:scale-[0.99]"
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                        <Icon size={13} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-slate-700">{meta.nombre}</p>
                        <p className="text-xs text-slate-400 nums">{fmt(v.ingresos)} ing · {fmt(v.egresos)} eg</p>
                      </div>
                      <p className={cn('text-sm font-semibold flex-shrink-0 nums', util >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {util >= 0 ? '+' : ''}{fmt(util)}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Alertas */}
      {alertasActivas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas</p>
            <button onClick={() => navigate('/alertas')} className="text-xs text-red-500 font-medium">Ver todas</button>
          </div>
          <div className="space-y-2">
            {alertasActivas.map(a => {
              const dias = diasHasta(a.fecha)
              const vencida = dias < 0
              return (
                <div
                  key={a.id}
                  className={cn('rounded-2xl p-4 flex items-start gap-3 border',
                    vencida ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100')}
                >
                  <AlertCircle size={15} className={cn('mt-0.5 flex-shrink-0', vencida ? 'text-red-500' : 'text-amber-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {vencida
                        ? `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
                        : dias === 0 ? 'Vence hoy'
                        : `Vence en ${dias} día${dias !== 1 ? 's' : ''}`}
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
