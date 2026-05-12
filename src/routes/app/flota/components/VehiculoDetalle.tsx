import { useState } from 'react'
import { X, Plus, Trash2, Edit2, Gauge, Shield, FileText } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Vehiculo } from '@/types'
import { useGastosVehiculo } from '@/hooks/useFlota'
import { cn } from '@/lib/cn'

interface Props {
  vehiculo: Vehiculo
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onUpdateKm: (km: number) => Promise<void>
}

const CATEGORIAS_GASTO = [
  { value: 'combustible', label: 'Combustible' },
  { value: 'service', label: 'Service' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'neumaticos', label: 'Neumáticos' },
  { value: 'lavado', label: 'Lavado' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'patente', label: 'Patente' },
  { value: 'vtv', label: 'VTV' },
  { value: 'otro', label: 'Otro' },
] as const

const gastoSchema = z.object({
  categoria: z.enum(['combustible', 'service', 'reparacion', 'neumaticos', 'lavado', 'seguro', 'patente', 'vtv', 'otro']),
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
  const { gastos, addGasto, deleteGasto } = useGastosVehiculo(vehiculo.id)
  const [tab, setTab] = useState<Tab>('info')
  const [showGastoForm, setShowGastoForm] = useState(false)
  const [showKmForm, setShowKmForm] = useState(false)

  const gastoForm = useForm<GastoForm>({
    resolver: zodResolver(gastoSchema) as Resolver<GastoForm>,
    defaultValues: { categoria: 'combustible', fecha: new Date().toISOString().split('T')[0] },
  })
  const kmForm = useForm<KmForm>({
    resolver: zodResolver(kmSchema) as Resolver<KmForm>,
    defaultValues: { km: vehiculo.kmActual },
  })

  const submitGasto = async (data: GastoForm) => {
    await addGasto({
      vehiculoId: vehiculo.id,
      categoria: data.categoria,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
      km: data.km,
    })
    gastoForm.reset({ categoria: 'combustible', fecha: new Date().toISOString().split('T')[0] })
    setShowGastoForm(false)
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-base font-semibold text-slate-900">{vehiculo.marca} {vehiculo.modelo}</p>
            <p className="text-xs text-slate-500">{vehiculo.patente} · {vehiculo.anio} · {vehiculo.color}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-slate-700"><Edit2 size={16} /></button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700"><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 border-b border-slate-100 px-4 pt-3 gap-1 flex-shrink-0">
          {([{ key: 'info', label: 'Info' }, { key: 'gastos', label: `Gastos (${gastos.length})` }] as { key: Tab; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all',
                tab === t.key ? 'bg-white text-slate-900 border border-b-white border-slate-200 -mb-px' : 'text-slate-500')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {tab === 'info' && (
            <>
              {/* KM */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge size={15} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-800">
                      {vehiculo.kmActual.toLocaleString('es-AR')} km
                    </span>
                  </div>
                  <button onClick={() => setShowKmForm(!showKmForm)}
                    className="text-xs text-red-500 font-medium">Actualizar</button>
                </div>

                {showKmForm && (
                  <form onSubmit={kmForm.handleSubmit(submitKm)} className="flex gap-2">
                    <input {...kmForm.register('km')} type="number" inputMode="numeric" className={cn(inputCls, 'flex-1')} />
                    <button type="submit" disabled={kmForm.formState.isSubmitting}
                      className="px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-medium disabled:opacity-50">OK</button>
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
                    <div className={cn('h-full rounded-full', progresoService >= 90 ? 'bg-red-400' : progresoService >= 70 ? 'bg-amber-400' : 'bg-emerald-500')}
                      style={{ width: `${progresoService}%` }} />
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

              <button onClick={onDelete}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition">
                Eliminar vehículo
              </button>
            </>
          )}

          {tab === 'gastos' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Total: <span className="font-semibold text-slate-700">{formatMoney(totalGastos)}</span></p>
                <button onClick={() => setShowGastoForm(!showGastoForm)} className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <Plus size={14} /> Gasto
                </button>
              </div>

              {showGastoForm && (
                <form onSubmit={gastoForm.handleSubmit(submitGasto)} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                      <select {...gastoForm.register('categoria')} className={inputCls}>
                        {CATEGORIAS_GASTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
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
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowGastoForm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">Cancelar</button>
                    <button type="submit" disabled={gastoForm.formState.isSubmitting} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs disabled:opacity-50">Guardar</button>
                  </div>
                </form>
              )}

              {gastos.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sin gastos registrados</p>}

              {gastos.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm text-slate-700">{g.descripcion}</p>
                    <p className="text-xs text-slate-400 capitalize">
                      {g.categoria} · {formatFecha(g.fecha)}{g.km ? ` · ${g.km.toLocaleString('es-AR')} km` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700">{formatMoney(g.monto)}</p>
                    <button onClick={() => deleteGasto(g.id)} className="p-1 text-slate-300 hover:text-red-400"><Trash2 size={13} /></button>
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
