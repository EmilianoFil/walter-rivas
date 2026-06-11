import { useState } from 'react'
import { ChevronLeft, X, Plus, Trash2, Edit2, Gauge, Shield, FileText, Check } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Vehiculo } from '@/types'
import { useGastosVehiculo } from '@/hooks/useFlota'
import { useCategorias } from '@/hooks/useCategorias'
import { GraficoGastos } from '@/components/GraficoGastos'
import { cn } from '@/lib/cn'

interface Props {
  vehiculo: Vehiculo
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onUpdateKm: (km: number) => Promise<void>
}

const gastoSchema = z.object({
  categoria: z.string().min(1, 'Requerido'),
  descripcion: z.string().min(1),
  monto: z.coerce.number().min(1),
  fecha: z.string().min(1),
  km: z.coerce.number().optional(),
})
type GastoForm = z.infer<typeof gastoSchema>

const kmSchema = z.object({ km: z.coerce.number().min(0) })
type KmForm = z.infer<typeof kmSchema>

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}
function diasHasta(t: Timestamp | Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = toDate(t); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

type Tab = 'info' | 'gastos'

export function VehiculoDetalle({ vehiculo, onClose, onEdit, onDelete, onUpdateKm }: Props) {
  const { gastos, addGasto, updateGasto, deleteGasto } = useGastosVehiculo(vehiculo.id)
  const { categorias } = useCategorias('flota')
  const [tab, setTab] = useState<Tab>('info')
  const [showGastoForm, setShowGastoForm] = useState(false)
  const [showKmForm, setShowKmForm] = useState(false)
  const [editingGastoId, setEditingGastoId] = useState<string | null>(null)

  const gastoForm = useForm<GastoForm>({
    resolver: zodResolver(gastoSchema) as Resolver<GastoForm>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })
  const editGastoForm = useForm<GastoForm>({
    resolver: zodResolver(gastoSchema) as Resolver<GastoForm>,
  })
  const kmForm = useForm<KmForm>({
    resolver: zodResolver(kmSchema) as Resolver<KmForm>,
    defaultValues: { km: vehiculo.kmActual },
  })

  const submitGasto = async (data: GastoForm) => {
    await addGasto({ vehiculoId: vehiculo.id, categoria: data.categoria, descripcion: data.descripcion, monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), km: data.km })
    gastoForm.reset({ fecha: new Date().toISOString().split('T')[0] })
    setShowGastoForm(false)
  }

  const openEditGasto = (g: typeof gastos[0]) => {
    setEditingGastoId(g.id)
    setShowGastoForm(false)
    editGastoForm.reset({ categoria: g.categoria, descripcion: g.descripcion, monto: g.monto, fecha: g.fecha instanceof Date ? g.fecha.toISOString().split('T')[0] : g.fecha.toDate().toISOString().split('T')[0], km: g.km })
  }

  const submitEditGasto = async (data: GastoForm) => {
    if (!editingGastoId) return
    await updateGasto(editingGastoId, { categoria: data.categoria, descripcion: data.descripcion, monto: data.monto, fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')), km: data.km })
    setEditingGastoId(null)
  }

  const submitKm = async (data: KmForm) => {
    await onUpdateKm(data.km)
    setShowKmForm(false)
  }

  const kmParaService = Math.max(0, vehiculo.kmUltimoService + vehiculo.kmServiceCada - vehiculo.kmActual)
  const progresoService = Math.min(
    ((vehiculo.kmActual - vehiculo.kmUltimoService) / vehiculo.kmServiceCada) * 100, 100
  )
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)

  const diasSeguro = diasHasta(vehiculo.seguro.vencimiento)
  const diasPatente = diasHasta(vehiculo.patente_vto)
  const diasVtv = vehiculo.vtv_vto ? diasHasta(vehiculo.vtv_vto) : null

  const vtoColor = (dias: number) =>
    dias < 0 ? 'text-red-500' : dias <= 30 ? 'text-amber-600' : 'text-slate-600'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'gastos', label: `Gastos (${gastos.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col sm:bg-black/50 sm:flex-row sm:items-center sm:justify-center sm:p-4">
      <div className="hidden sm:block absolute inset-0" onClick={onClose} />

      <div className="flex-1 flex flex-col min-h-0 sm:flex-none sm:relative sm:w-full sm:max-w-md sm:max-h-[90dvh] sm:rounded-2xl sm:bg-white sm:shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 border-b border-slate-100 flex-shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '1rem' }}
        >
          <button onClick={onClose} className="sm:hidden p-1 -ml-1 text-slate-500">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-slate-900 truncate">{vehiculo.marca} {vehiculo.modelo}</p>
            <p className="text-xs text-slate-500">{vehiculo.patente} · {vehiculo.anio} · {vehiculo.color}</p>
          </div>
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-700">
            <Edit2 size={18} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="hidden sm:block p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setShowGastoForm(false); setShowKmForm(false) }}
              className={cn(
                'flex-1 py-3 text-xs font-semibold transition-colors',
                tab === t.key
                  ? 'text-red-500 border-b-2 border-red-500 -mb-px'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4" style={{ touchAction: 'pan-y' }}>
          {tab === 'info' && (
            <>
              {/* KM */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Gauge size={15} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-800">
                    {vehiculo.kmActual.toLocaleString('es-AR')} km
                  </span>
                </div>

                {showKmForm && (
                  <form id="km-form" onSubmit={kmForm.handleSubmit(submitKm)}>
                    <input {...kmForm.register('km')} type="number" inputMode="numeric" className={inputCls} />
                  </form>
                )}

                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Próximo service</span>
                    <span className={kmParaService <= 2000 ? 'text-amber-600 font-medium' : ''}>
                      {kmParaService > 0 ? `${kmParaService.toLocaleString('es-AR')} km` : 'Requiere service'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', progresoService >= 90 ? 'bg-red-400' : progresoService >= 70 ? 'bg-amber-400' : 'bg-emerald-500')}
                      style={{ width: `${progresoService}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Seguro */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600">Seguro · {vehiculo.seguro.compania}</p>
                </div>
                {vehiculo.seguro.nroPoliza && (
                  <p className="text-xs text-slate-500">Póliza: {vehiculo.seguro.nroPoliza}</p>
                )}
                {vehiculo.seguro.monto > 0 && (
                  <p className="text-xs text-slate-500">Cuota: {formatMoney(vehiculo.seguro.monto)}/mes</p>
                )}
                <p className={cn('text-xs font-medium', vtoColor(diasSeguro))}>
                  Vence: {formatFecha(vehiculo.seguro.vencimiento)}
                  {diasSeguro < 0 ? ' (VENCIDO)' : diasSeguro <= 30 ? ` (${diasSeguro}d)` : ''}
                </p>
              </div>

              {/* Vencimientos */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600">Vencimientos</p>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Patente</span>
                  <span className={cn('font-medium', vtoColor(diasPatente))}>
                    {formatFecha(vehiculo.patente_vto)}
                    {diasPatente <= 30 ? ` (${diasPatente}d)` : ''}
                  </span>
                </div>
                {vehiculo.vtv_vto && diasVtv !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">VTV</span>
                    <span className={cn('font-medium', vtoColor(diasVtv))}>
                      {formatFecha(vehiculo.vtv_vto)}
                      {diasVtv <= 30 ? ` (${diasVtv}d)` : ''}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'gastos' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Total: <span className="font-semibold text-slate-700">{formatMoney(totalGastos)}</span>
              </p>

              {showGastoForm && (
                <form id="gasto-form" onSubmit={gastoForm.handleSubmit(submitGasto)} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                      <select {...gastoForm.register('categoria')} className={inputCls}>
                        <option value="">Seleccionar...</option>
                        {categorias
                          .filter((c) => c.tipo === 'egreso' || c.tipo === 'ambos')
                          .map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                      </select>
                      {categorias.length === 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">Sin categorías. Creá en Configuración.</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                      <input {...gastoForm.register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                    <input {...gastoForm.register('descripcion')} placeholder="Detalles..." className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                      <input {...gastoForm.register('fecha')} type="date" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">KM (opcional)</label>
                      <input {...gastoForm.register('km')} type="number" inputMode="numeric" className={inputCls} />
                    </div>
                  </div>
                </form>
              )}

              {gastos.length === 0 && !showGastoForm && (
                <p className="text-xs text-slate-400 text-center py-6">Sin gastos registrados</p>
              )}

              {gastos.length > 1 && (
                <GraficoGastos gastos={gastos.map((g) => ({ categoria: g.categoria, monto: g.monto }))} />
              )}

              {gastos.map((g) => editingGastoId === g.id ? (
                <form key={g.id} onSubmit={editGastoForm.handleSubmit(submitEditGasto)} className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 my-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                      <select {...editGastoForm.register('categoria')} className={inputCls}>
                        <option value="">Sin categoría</option>
                        {categorias.filter((c) => c.tipo === 'egreso' || c.tipo === 'ambos').map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
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
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                      <input {...editGastoForm.register('fecha')} type="date" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">KM (opcional)</label>
                      <input {...editGastoForm.register('km')} type="number" inputMode="numeric" className={inputCls} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingGastoId(null)} className="flex items-center justify-center gap-1 flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                      <X size={13} /> Cancelar
                    </button>
                    <button type="submit" disabled={editGastoForm.formState.isSubmitting} className="flex items-center justify-center gap-1 flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50">
                      <Check size={13} /> Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm text-slate-700">{g.descripcion}</p>
                    <p className="text-xs text-slate-400 capitalize">
                      {g.categoria} · {formatFecha(g.fecha)}{g.km ? ` · ${g.km.toLocaleString('es-AR')} km` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-slate-700 mr-1">{formatMoney(g.monto)}</p>
                    <button onClick={() => openEditGasto(g)} className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteGasto(g.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div
          className="px-4 pt-3 border-t border-slate-100 flex-shrink-0"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {tab === 'info' && (
            showKmForm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowKmForm(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="km-form"
                  disabled={kmForm.formState.isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-800 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {kmForm.formState.isSubmitting ? 'Guardando…' : 'Guardar KM'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowKmForm(true)}
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Gauge size={18} />
                Actualizar KM
              </button>
            )
          )}

          {tab === 'gastos' && (
            showGastoForm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGastoForm(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="gasto-form"
                  disabled={gastoForm.formState.isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {gastoForm.formState.isSubmitting ? 'Guardando…' : 'Guardar gasto'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowGastoForm(true)}
                className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Plus size={18} />
                Agregar gasto
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
