import { useState } from 'react'
import { ChevronLeft, Plus, Trash2, TrendingUp, TrendingDown, Edit2 } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Obra, CobroObra, GastoObra } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  obra: Obra
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAddCobro: (cobro: Omit<CobroObra, 'id'>) => Promise<void>
  onDeleteCobro: (cobroId: string) => Promise<void>
  onAddGasto: (gasto: Omit<GastoObra, 'id' | 'adjuntos'>) => Promise<void>
  onDeleteGasto: (gastoId: string) => Promise<void>
}

const movSchema = z.object({
  monto: z.coerce.number().min(1),
  descripcion: z.string().optional(),
  fecha: z.string().min(1),
})
type MovForm = z.infer<typeof movSchema>

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

type Tab = 'resumen' | 'cobros' | 'gastos'

const ESTADO_CONFIG = {
  activa: { label: 'Activa', cls: 'bg-emerald-100 text-emerald-700' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-600' },
}

export function ObraDetalle({ obra, onClose, onEdit, onDelete, onAddCobro, onDeleteCobro, onAddGasto, onDeleteGasto }: Props) {
  const [tab, setTab] = useState<Tab>('resumen')
  const [showCobroForm, setShowCobroForm] = useState(false)
  const [showGastoForm, setShowGastoForm] = useState(false)

  const cobroForm = useForm<MovForm>({
    resolver: zodResolver(movSchema) as Resolver<MovForm>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })
  const gastoForm = useForm<MovForm>({
    resolver: zodResolver(movSchema) as Resolver<MovForm>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })

  const totalCobrado = obra.cobros.reduce((s, c) => s + c.monto, 0)
  const totalGastado = obra.gastos.reduce((s, g) => s + g.monto, 0)
  const utilidad = totalCobrado - totalGastado
  const saldoACobrar = Math.max(0, obra.presupuesto - totalCobrado)
  const progresoCobro = obra.presupuesto > 0 ? Math.min((totalCobrado / obra.presupuesto) * 100, 100) : 0
  const progresoGasto = obra.presupuesto > 0 ? Math.min((totalGastado / obra.presupuesto) * 100, 100) : 0

  const submitCobro = async (data: MovForm) => {
    await onAddCobro({ monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), notas: data.descripcion })
    cobroForm.reset({ fecha: new Date().toISOString().split('T')[0] })
    setShowCobroForm(false)
  }

  const submitGasto = async (data: MovForm) => {
    await onAddGasto({ descripcion: data.descripcion ?? '', monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')) })
    gastoForm.reset({ fecha: new Date().toISOString().split('T')[0] })
    setShowGastoForm(false)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'cobros', label: `Cobros (${obra.cobros.length})` },
    { key: 'gastos', label: `Gastos (${obra.gastos.length})` },
  ]

  const estadoCfg = ESTADO_CONFIG[obra.estado]

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 h-14 border-b border-slate-100 bg-white">
        <button onClick={onClose} className="p-2 text-slate-600 hover:text-slate-900 transition">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', estadoCfg.cls)}>
              {estadoCfg.label}
            </span>
            <h1 className="text-base font-semibold text-slate-900 truncate">{obra.nombre}</h1>
          </div>
          <p className="text-xs text-slate-500 truncate">{obra.cliente}</p>
        </div>
        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-700 transition">
          <Edit2 size={18} />
        </button>
        <button onClick={onDelete} className="p-2 text-slate-300 hover:text-red-400 transition">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-slate-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition border-b-2',
              tab === t.key
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            {obra.descripcion && (
              <p className="text-sm text-slate-500">{obra.descripcion}</p>
            )}

            <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Presupuesto total</span>
                <span className="font-bold text-slate-800">{formatMoney(obra.presupuesto)}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1"><TrendingUp size={11} className="text-emerald-500" /> Cobrado</span>
                  <span className="font-semibold text-emerald-600">{formatMoney(totalCobrado)} ({progresoCobro.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progresoCobro}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1"><TrendingDown size={11} className="text-red-400" /> Gastado</span>
                  <span className="font-semibold text-red-500">{formatMoney(totalGastado)} ({progresoGasto.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${progresoGasto}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Saldo a cobrar</p>
                <p className={cn('text-xl font-bold mt-1', saldoACobrar > 0 ? 'text-red-500' : 'text-emerald-600')}>
                  {formatMoney(saldoACobrar)}
                </p>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Utilidad</p>
                <p className={cn('text-xl font-bold mt-1', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {utilidad >= 0 ? '+' : ''}{formatMoney(utilidad)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── COBROS ── */}
        {tab === 'cobros' && (
          <div className="space-y-3">
            {totalCobrado > 0 && (
              <p className="text-xs text-slate-500">
                Total cobrado: <span className="font-semibold text-emerald-600">{formatMoney(totalCobrado)}</span>
              </p>
            )}

            {showCobroForm && (
              <form onSubmit={cobroForm.handleSubmit(submitCobro)} className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo cobro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                    <input {...cobroForm.register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                    <input {...cobroForm.register('fecha')} type="date" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Notas (opcional)</label>
                  <input {...cobroForm.register('descripcion')} placeholder="Ej: 1er pago" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCobroForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancelar</button>
                  <button type="submit" disabled={cobroForm.formState.isSubmitting} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">Guardar</button>
                </div>
              </form>
            )}

            {obra.cobros.length === 0 && !showCobroForm && (
              <p className="text-sm text-slate-400 text-center py-12">Sin cobros registrados</p>
            )}

            {[...obra.cobros].sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime()).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-emerald-600">{formatMoney(c.monto)}</p>
                  <p className="text-xs text-slate-400">{formatFecha(c.fecha)}{c.notas ? ` · ${c.notas}` : ''}</p>
                </div>
                <button onClick={() => onDeleteCobro(c.id)} className="p-1.5 text-slate-300 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── GASTOS ── */}
        {tab === 'gastos' && (
          <div className="space-y-3">
            {totalGastado > 0 && (
              <p className="text-xs text-slate-500">
                Total gastado: <span className="font-semibold text-red-500">{formatMoney(totalGastado)}</span>
              </p>
            )}

            {showGastoForm && (
              <form onSubmit={gastoForm.handleSubmit(submitGasto)} className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo gasto</p>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                  <input {...gastoForm.register('descripcion')} placeholder="Materiales, mano de obra..." className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                    <input {...gastoForm.register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                    <input {...gastoForm.register('fecha')} type="date" className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowGastoForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancelar</button>
                  <button type="submit" disabled={gastoForm.formState.isSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">Guardar</button>
                </div>
              </form>
            )}

            {obra.gastos.length === 0 && !showGastoForm && (
              <p className="text-sm text-slate-400 text-center py-12">Sin gastos registrados</p>
            )}

            {[...obra.gastos].sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime()).map((g) => (
              <div key={g.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm text-slate-700">{g.descripcion}</p>
                  <p className="text-xs text-slate-400">{formatFecha(g.fecha)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-red-500">{formatMoney(g.monto)}</p>
                  <button onClick={() => onDeleteGasto(g.id)} className="p-1.5 text-slate-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {tab === 'resumen' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setTab('cobros'); setShowCobroForm(true) }}
              className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold transition"
            >
              <Plus size={17} />
              Cobro
            </button>
            <button
              onClick={() => { setTab('gastos'); setShowGastoForm(true) }}
              className="flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-semibold transition"
            >
              <Plus size={17} />
              Gasto
            </button>
          </div>
        )}
        {tab === 'cobros' && (
          <button
            onClick={() => setShowCobroForm((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[15px] font-semibold transition"
          >
            <Plus size={18} />
            {showCobroForm ? 'Cancelar' : 'Registrar cobro'}
          </button>
        )}
        {tab === 'gastos' && (
          <button
            onClick={() => setShowGastoForm((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[15px] font-semibold transition"
          >
            <Plus size={18} />
            {showGastoForm ? 'Cancelar' : 'Agregar gasto'}
          </button>
        )}
      </div>
    </div>
  )
}
