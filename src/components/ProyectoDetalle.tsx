import { useState } from 'react'
import { ChevronLeft, Plus, Trash2, TrendingUp, TrendingDown, Edit2, Check, X } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCategorias } from '@/hooks/useCategorias'
import { GraficoGastos } from '@/components/GraficoGastos'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { cn } from '@/lib/cn'
import type { VerticalCategoria } from '@/types'

// ─── Tipos genéricos ─────────────────────────────────────────────────────────
export interface MovimientoItem {
  id: string
  monto: number
  fecha: Timestamp | Date
  descripcion?: string
  categoria?: string
}

export interface ProyectoData {
  nombre: string
  descripcion?: string
  cliente?: string
  presupuesto?: number
  estado: string
  ingresos: MovimientoItem[]
  gastos: MovimientoItem[]
}

interface Labels {
  ingresos?: string   // default "Ingresos"
  gastos?: string     // default "Gastos"
  nuevoIngreso?: string
  nuevoGasto?: string
}

interface Props {
  proyecto: ProyectoData
  vertical: VerticalCategoria
  labels?: Labels
  estadoConfig: Record<string, { label: string; cls: string }>
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAddIngreso: (data: { monto: number; fecha: Timestamp; descripcion?: string; categoria?: string }) => Promise<void>
  onUpdateIngreso: (id: string, data: { monto: number; fecha: Timestamp; descripcion?: string; categoria?: string }) => Promise<void>
  onDeleteIngreso: (id: string) => Promise<void>
  onAddGasto: (data: { monto: number; fecha: Timestamp; descripcion: string; categoria?: string }) => Promise<void>
  onUpdateGasto: (id: string, data: { monto: number; fecha: Timestamp; descripcion: string; categoria?: string }) => Promise<void>
  onDeleteGasto: (id: string) => Promise<void>
}

// ─── Schemas ─────────────────────────────────────────────────────────────────
const ingresoSchema = z.object({
  monto: z.coerce.number().min(1, 'Requerido'),
  fecha: z.string().min(1),
  descripcion: z.string().optional(),
  categoria: z.string().optional(),
})
type IngresoForm = z.infer<typeof ingresoSchema>

const gastoSchema = z.object({
  descripcion: z.string().min(1, 'Requerido'),
  monto: z.coerce.number().min(1, 'Requerido'),
  fecha: z.string().min(1),
  categoria: z.string().optional(),
})
type GastoForm = z.infer<typeof gastoSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDate(t: Timestamp | Date | { seconds: number; nanoseconds: number } | null | undefined): Date {
  if (!t) return new Date(0)
  if (t instanceof Date) return t
  if (typeof (t as Timestamp).toDate === 'function') return (t as Timestamp).toDate()
  return new Date((t as { seconds: number }).seconds * 1000)
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}
function toDateStr(t: Timestamp | Date): string {
  return toDate(t).toISOString().split('T')[0]
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

type Tab = 'resumen' | 'ingresos' | 'gastos'

// ─── Componente ──────────────────────────────────────────────────────────────
export function ProyectoDetalle({
  proyecto, vertical, labels = {}, estadoConfig,
  onClose, onEdit, onDelete,
  onAddIngreso, onUpdateIngreso, onDeleteIngreso,
  onAddGasto, onUpdateGasto, onDeleteGasto,
}: Props) {
  const [tab, setTab] = useState<Tab>('resumen')
  const [showIngresoForm, setShowIngresoForm] = useState(false)
  const [showGastoForm, setShowGastoForm] = useState(false)
  const [editingIngreso, setEditingIngreso] = useState<MovimientoItem | null>(null)
  const [editingGasto, setEditingGasto] = useState<MovimientoItem | null>(null)
  const [deleteIngreso, setDeleteIngreso] = useState<MovimientoItem | null>(null)
  const [deleteGasto, setDeleteGasto] = useState<MovimientoItem | null>(null)
  const [confirmDeleteProyecto, setConfirmDeleteProyecto] = useState(false)

  const { categorias } = useCategorias(vertical)
  const categoriasIngreso = categorias.filter((c) => c.tipo === 'ingreso' || c.tipo === 'ambos')
  const categoriasGasto = categorias.filter((c) => c.tipo === 'egreso' || c.tipo === 'ambos')

  const lbIngresos = labels.ingresos ?? 'Ingresos'
  const lbGastos = labels.gastos ?? 'Gastos'
  const lbNuevoIngreso = labels.nuevoIngreso ?? 'Nuevo ingreso'
  const lbNuevoGasto = labels.nuevoGasto ?? 'Nuevo gasto'

  const ingresoForm = useForm<IngresoForm>({
    resolver: zodResolver(ingresoSchema) as Resolver<IngresoForm>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })
  const editIngresoForm = useForm<IngresoForm>({
    resolver: zodResolver(ingresoSchema) as Resolver<IngresoForm>,
  })
  const gastoForm = useForm<GastoForm>({
    resolver: zodResolver(gastoSchema) as Resolver<GastoForm>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })
  const editGastoForm = useForm<GastoForm>({
    resolver: zodResolver(gastoSchema) as Resolver<GastoForm>,
  })

  const totalIngresos = proyecto.ingresos.reduce((s, i) => s + i.monto, 0)
  const totalGastos = proyecto.gastos.reduce((s, g) => s + g.monto, 0)
  const utilidad = totalIngresos - totalGastos
  const presupuesto = proyecto.presupuesto ?? 0
  const saldoACobrar = presupuesto > 0 ? Math.max(0, presupuesto - totalIngresos) : 0
  const progreso = presupuesto > 0 ? Math.min((totalIngresos / presupuesto) * 100, 100) : 0
  const progresoGasto = presupuesto > 0 ? Math.min((totalGastos / presupuesto) * 100, 100) : 0

  const submitIngreso = async (data: IngresoForm) => {
    await onAddIngreso({ monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), descripcion: data.descripcion, categoria: data.categoria })
    ingresoForm.reset({ fecha: new Date().toISOString().split('T')[0] })
    setShowIngresoForm(false)
  }

  const openEditIngreso = (item: MovimientoItem) => {
    setEditingIngreso(item)
    setShowIngresoForm(false)
    editIngresoForm.reset({ monto: item.monto, fecha: toDateStr(item.fecha), descripcion: item.descripcion, categoria: item.categoria })
  }

  const submitEditIngreso = async (data: IngresoForm) => {
    if (!editingIngreso) return
    await onUpdateIngreso(editingIngreso.id, { monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), descripcion: data.descripcion, categoria: data.categoria })
    setEditingIngreso(null)
  }

  const submitGasto = async (data: GastoForm) => {
    await onAddGasto({ descripcion: data.descripcion, monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), categoria: data.categoria })
    gastoForm.reset({ fecha: new Date().toISOString().split('T')[0] })
    setShowGastoForm(false)
  }

  const openEditGasto = (item: MovimientoItem) => {
    setEditingGasto(item)
    setShowGastoForm(false)
    editGastoForm.reset({ descripcion: item.descripcion ?? '', monto: item.monto, fecha: toDateStr(item.fecha), categoria: item.categoria })
  }

  const submitEditGasto = async (data: GastoForm) => {
    if (!editingGasto) return
    await onUpdateGasto(editingGasto.id, { descripcion: data.descripcion, monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), categoria: data.categoria })
    setEditingGasto(null)
  }

  const estadoCfg = estadoConfig[proyecto.estado] ?? { label: proyecto.estado, cls: 'bg-slate-100 text-slate-600' }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'ingresos', label: `${lbIngresos} (${proyecto.ingresos.length})` },
    { key: 'gastos', label: `${lbGastos} (${proyecto.gastos.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-100 bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2 px-3 h-14">
          <button onClick={onClose} className="p-2 text-slate-600 hover:text-slate-900 transition">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', estadoCfg.cls)}>
                {estadoCfg.label}
              </span>
              <h1 className="text-base font-semibold text-slate-900 truncate">{proyecto.nombre}</h1>
            </div>
            {proyecto.cliente && <p className="text-xs text-slate-500 truncate">{proyecto.cliente}</p>}
          </div>
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-700 transition">
            <Edit2 size={18} />
          </button>
          <button onClick={() => setConfirmDeleteProyecto(true)} className="p-2 text-slate-300 hover:text-red-400 transition">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-slate-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition border-b-2',
              tab === t.key ? 'border-red-500 text-red-500' : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4" style={{ touchAction: 'pan-y' }}>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            {proyecto.descripcion && <p className="text-sm text-slate-500">{proyecto.descripcion}</p>}

            <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
              {presupuesto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Presupuesto</span>
                  <span className="font-bold text-slate-800">{formatMoney(presupuesto)}</span>
                </div>
              )}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1"><TrendingUp size={11} className="text-emerald-500" /> {lbIngresos}</span>
                  <span className="font-semibold text-emerald-600">
                    {formatMoney(totalIngresos)}{presupuesto > 0 ? ` (${progreso.toFixed(0)}%)` : ''}
                  </span>
                </div>
                {presupuesto > 0 && (
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1"><TrendingDown size={11} className="text-red-400" /> {lbGastos}</span>
                  <span className="font-semibold text-red-500">
                    {formatMoney(totalGastos)}{presupuesto > 0 ? ` (${progresoGasto.toFixed(0)}%)` : ''}
                  </span>
                </div>
                {presupuesto > 0 && (
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${progresoGasto}%` }} />
                  </div>
                )}
              </div>
            </div>

            <div className={cn('grid gap-3', presupuesto > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
              {presupuesto > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Saldo a cobrar</p>
                  <p className={cn('text-xl font-bold mt-1', saldoACobrar > 0 ? 'text-red-500' : 'text-emerald-600')}>
                    {formatMoney(saldoACobrar)}
                  </p>
                </div>
              )}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Utilidad</p>
                <p className={cn('text-xl font-bold mt-1', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {utilidad >= 0 ? '+' : ''}{formatMoney(utilidad)}
                </p>
              </div>
            </div>

            {/* Gráficos resumen */}
            {proyecto.gastos.length > 1 && (
              <GraficoGastos
                gastos={proyecto.gastos.map((g) => ({ categoria: g.categoria ?? 'Sin categoría', monto: g.monto }))}
                titulo={`${lbGastos} por categoría`}
              />
            )}
            {proyecto.ingresos.length > 1 && (
              <GraficoGastos
                gastos={proyecto.ingresos.map((i) => ({ categoria: i.categoria ?? 'Sin categoría', monto: i.monto }))}
                titulo={`${lbIngresos} por categoría`}
              />
            )}
          </div>
        )}

        {/* INGRESOS */}
        {tab === 'ingresos' && (
          <div className="space-y-3">
            {totalIngresos > 0 && (
              <p className="text-xs text-slate-500">
                Total: <span className="font-semibold text-emerald-600">{formatMoney(totalIngresos)}</span>
              </p>
            )}

            {showIngresoForm && (
              <form onSubmit={ingresoForm.handleSubmit(submitIngreso)} className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lbNuevoIngreso}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                    <select {...ingresoForm.register('categoria')} className={inputCls}>
                      <option value="">Sin categoría</option>
                      {categoriasIngreso.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                    <input {...ingresoForm.register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                    {ingresoForm.formState.errors.monto && <p className="text-red-500 text-xs mt-0.5">Requerido</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Descripción (opcional)</label>
                  <input {...ingresoForm.register('descripcion')} placeholder="Ej: 1er pago, anticipo..." className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                  <input {...ingresoForm.register('fecha')} type="date" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowIngresoForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancelar</button>
                  <button type="submit" disabled={ingresoForm.formState.isSubmitting} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">Guardar</button>
                </div>
              </form>
            )}

            {proyecto.ingresos.length === 0 && !showIngresoForm && (
              <p className="text-sm text-slate-400 text-center py-12">Sin {lbIngresos.toLowerCase()} registrados</p>
            )}

            {[...proyecto.ingresos]
              .sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime())
              .map((i) => editingIngreso?.id === i.id ? (
                <form key={i.id} onSubmit={editIngresoForm.handleSubmit(submitEditIngreso)} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Editar {lbIngresos.slice(0, -1).toLowerCase()}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                      <select {...editIngresoForm.register('categoria')} className={inputCls}>
                        <option value="">Sin categoría</option>
                        {categoriasIngreso.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                      <input {...editIngresoForm.register('monto')} type="number" inputMode="numeric" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Descripción (opcional)</label>
                    <input {...editIngresoForm.register('descripcion')} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                    <input {...editIngresoForm.register('fecha')} type="date" className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingIngreso(null)} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">
                      <X size={14} /> Cancelar
                    </button>
                    <button type="submit" disabled={editIngresoForm.formState.isSubmitting} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">
                      <Check size={14} /> {editIngresoForm.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              ) : (
                <div key={i.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-emerald-600">{formatMoney(i.monto)}</p>
                      {i.categoria && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{i.categoria}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{formatFecha(i.fecha)}{i.descripcion ? ` · ${i.descripcion}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditIngreso(i)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteIngreso(i)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* GASTOS */}
        {tab === 'gastos' && (
          <div className="space-y-3">
            {totalGastos > 0 && (
              <p className="text-xs text-slate-500">
                Total: <span className="font-semibold text-red-500">{formatMoney(totalGastos)}</span>
              </p>
            )}

            {showGastoForm && (
              <form onSubmit={gastoForm.handleSubmit(submitGasto)} className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lbNuevoGasto}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                    <select {...gastoForm.register('categoria')} className={inputCls}>
                      <option value="">Sin categoría</option>
                      {categoriasGasto.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                    <input {...gastoForm.register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                    {gastoForm.formState.errors.monto && <p className="text-red-500 text-xs mt-0.5">Requerido</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                  <input {...gastoForm.register('descripcion')} placeholder="Materiales, mano de obra..." className={inputCls} />
                  {gastoForm.formState.errors.descripcion && <p className="text-red-500 text-xs mt-0.5">Requerido</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                  <input {...gastoForm.register('fecha')} type="date" className={inputCls} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowGastoForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancelar</button>
                  <button type="submit" disabled={gastoForm.formState.isSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">Guardar</button>
                </div>
              </form>
            )}

            {proyecto.gastos.length === 0 && !showGastoForm && (
              <p className="text-sm text-slate-400 text-center py-12">Sin {lbGastos.toLowerCase()} registrados</p>
            )}

            {proyecto.gastos.length > 1 && (
              <GraficoGastos
                gastos={proyecto.gastos.map((g) => ({ categoria: g.categoria ?? 'Sin categoría', monto: g.monto }))}
                titulo={`${lbGastos} por categoría`}
              />
            )}

            {[...proyecto.gastos]
              .sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime())
              .map((g) => editingGasto?.id === g.id ? (
                <form key={g.id} onSubmit={editGastoForm.handleSubmit(submitEditGasto)} className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Editar gasto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                      <select {...editGastoForm.register('categoria')} className={inputCls}>
                        <option value="">Sin categoría</option>
                        {categoriasGasto.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                      <input {...editGastoForm.register('monto')} type="number" inputMode="numeric" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                    <input {...editGastoForm.register('descripcion')} className={inputCls} />
                    {editGastoForm.formState.errors.descripcion && <p className="text-red-500 text-xs mt-0.5">Requerido</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                    <input {...editGastoForm.register('fecha')} type="date" className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingGasto(null)} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">
                      <X size={14} /> Cancelar
                    </button>
                    <button type="submit" disabled={editGastoForm.formState.isSubmitting} className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">
                      <Check size={14} /> {editGastoForm.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              ) : (
                <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{g.descripcion}</p>
                      {g.categoria && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex-shrink-0">{g.categoria}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-base font-bold text-red-500">{formatMoney(g.monto)}</p>
                      <p className="text-xs text-slate-400">{formatFecha(g.fecha)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditGasto(g)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteGasto(g)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
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
              onClick={() => { setTab('ingresos'); setShowIngresoForm(true) }}
              className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold transition"
            >
              <Plus size={17} /> {lbIngresos.slice(0, -1) || 'Ingreso'}
            </button>
            <button
              onClick={() => { setTab('gastos'); setShowGastoForm(true) }}
              className="flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-semibold transition"
            >
              <Plus size={17} /> Gasto
            </button>
          </div>
        )}
        {tab === 'ingresos' && (
          <button
            onClick={() => setShowIngresoForm((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[15px] font-semibold transition"
          >
            <Plus size={18} /> {showIngresoForm ? 'Cancelar' : lbNuevoIngreso}
          </button>
        )}
        {tab === 'gastos' && (
          <button
            onClick={() => setShowGastoForm((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[15px] font-semibold transition"
          >
            <Plus size={18} /> {showGastoForm ? 'Cancelar' : lbNuevoGasto}
          </button>
        )}
      </div>

      {/* Confirm delete ingreso */}
      <ConfirmSheet
        open={!!deleteIngreso}
        title={`¿Eliminar ${lbIngresos.toLowerCase().slice(0, -1)}?`}
        subtitle={deleteIngreso ? formatMoney(deleteIngreso.monto) : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => { if (deleteIngreso) await onDeleteIngreso(deleteIngreso.id); setDeleteIngreso(null) }}
        onCancel={() => setDeleteIngreso(null)}
      />

      {/* Confirm delete gasto */}
      <ConfirmSheet
        open={!!deleteGasto}
        title="¿Eliminar gasto?"
        subtitle={deleteGasto ? `${deleteGasto.descripcion} — ${formatMoney(deleteGasto.monto)}` : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => { if (deleteGasto) await onDeleteGasto(deleteGasto.id); setDeleteGasto(null) }}
        onCancel={() => setDeleteGasto(null)}
      />

      {/* Confirm delete proyecto */}
      <ConfirmSheet
        open={confirmDeleteProyecto}
        title="¿Eliminar este registro?"
        subtitle={`"${proyecto.nombre}" y todos sus movimientos`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => { setConfirmDeleteProyecto(false); onDelete() }}
        onCancel={() => setConfirmDeleteProyecto(false)}
      />
    </div>
  )
}
