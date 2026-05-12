import { useState } from 'react'
import { X, Plus, Trash2, TrendingUp, TrendingDown, Edit2 } from 'lucide-react'
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

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

type Tab = 'resumen' | 'cobros' | 'gastos'

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-base font-semibold text-slate-900 truncate">{obra.nombre}</p>
            <p className="text-xs text-slate-500 mt-0.5">{obra.cliente}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-700"><Edit2 size={16} /></button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 border-b border-slate-100 px-4 pt-3 gap-1 flex-shrink-0">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all',
                tab === t.key ? 'bg-white text-slate-900 border border-b-white border-slate-200 -mb-px' : 'text-slate-500'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <div className="space-y-4">
              {obra.descripcion && (
                <p className="text-sm text-slate-500">{obra.descripcion}</p>
              )}

              {/* Presupuesto vs cobrado */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Presupuesto</span>
                  <span className="font-semibold text-slate-800">{formatMoney(obra.presupuesto)}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="flex items-center gap-1"><TrendingUp size={11} className="text-emerald-500" /> Cobrado</span>
                    <span className="font-medium text-emerald-600">{formatMoney(totalCobrado)} ({progresoCobro.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progresoCobro}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="flex items-center gap-1"><TrendingDown size={11} className="text-red-400" /> Gastado</span>
                    <span className="font-medium text-red-500">{formatMoney(totalGastado)} ({progresoGasto.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${progresoGasto}%` }} />
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-slate-500">Saldo a cobrar</p>
                  <p className={cn('text-base font-bold mt-0.5', saldoACobrar > 0 ? 'text-red-500' : 'text-emerald-600')}>
                    {formatMoney(saldoACobrar)}
                  </p>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-slate-500">Utilidad</p>
                  <p className={cn('text-base font-bold mt-0.5', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {utilidad >= 0 ? '+' : ''}{formatMoney(utilidad)}
                  </p>
                </div>
              </div>

              <button onClick={onDelete} className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition">
                Eliminar obra
              </button>
            </div>
          )}

          {/* ── COBROS ── */}
          {tab === 'cobros' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Total cobrado: <span className="font-semibold text-emerald-600">{formatMoney(totalCobrado)}</span></p>
                <button onClick={() => setShowCobroForm(!showCobroForm)} className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <Plus size={14} /> Cobro
                </button>
              </div>

              {showCobroForm && (
                <form onSubmit={cobroForm.handleSubmit(submitCobro)} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
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
                    <button type="button" onClick={() => setShowCobroForm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">Cancelar</button>
                    <button type="submit" disabled={cobroForm.formState.isSubmitting} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs disabled:opacity-50">Guardar</button>
                  </div>
                </form>
              )}

              {obra.cobros.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sin cobros registrados</p>}

              {[...obra.cobros].sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime()).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">{formatMoney(c.monto)}</p>
                    <p className="text-xs text-slate-400">{formatFecha(c.fecha)}{c.notas ? ` · ${c.notas}` : ''}</p>
                  </div>
                  <button onClick={() => onDeleteCobro(c.id)} className="p-1.5 text-slate-300 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}

          {/* ── GASTOS ── */}
          {tab === 'gastos' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Total gastado: <span className="font-semibold text-red-500">{formatMoney(totalGastado)}</span></p>
                <button onClick={() => setShowGastoForm(!showGastoForm)} className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <Plus size={14} /> Gasto
                </button>
              </div>

              {showGastoForm && (
                <form onSubmit={gastoForm.handleSubmit(submitGasto)} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                    <input {...gastoForm.register('descripcion')} placeholder="Materiales, mano de obra..." className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                    <button type="button" onClick={() => setShowGastoForm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">Cancelar</button>
                    <button type="submit" disabled={gastoForm.formState.isSubmitting} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs disabled:opacity-50">Guardar</button>
                  </div>
                </form>
              )}

              {obra.gastos.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sin gastos registrados</p>}

              {[...obra.gastos].sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime()).map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm text-slate-700">{g.descripcion}</p>
                    <p className="text-xs text-slate-400">{formatFecha(g.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-red-500">{formatMoney(g.monto)}</p>
                    <button onClick={() => onDeleteGasto(g.id)} className="p-1.5 text-slate-300 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
