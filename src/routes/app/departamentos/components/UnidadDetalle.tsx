import { useState } from 'react'
import { X, Plus, Trash2, Phone, CheckCircle, AlertCircle, Clock, User } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Unidad, PagoAlquiler, GastoUnidad } from '@/types'
import { cn } from '@/lib/cn'
import { ConfirmSheet } from '@/components/ConfirmSheet'

interface Props {
  unidad: Unidad
  pagos: PagoAlquiler[]
  gastos: GastoUnidad[]
  onClose: () => void
  onUpdateInquilino: (data: Unidad['inquilino']) => Promise<void>
  onDelete: () => Promise<void>
  onAddPago: (data: Omit<PagoAlquiler, 'id' | 'adjuntos'>) => Promise<void>
  onMarkPagado: (id: string) => Promise<void>
  onDeletePago: (id: string) => Promise<void>
  onAddGasto: (data: Omit<GastoUnidad, 'id' | 'adjuntos'>) => Promise<void>
  onDeleteGasto: (id: string) => Promise<void>
}

const pagoSchema = z.object({
  monto: z.coerce.number().min(1),
  periodo: z.string().min(1, 'Ej: Mayo 2026'),
  vencimiento: z.string().min(1),
  notas: z.string().optional(),
})
type PagoForm = z.infer<typeof pagoSchema>

const gastoSchema = z.object({
  descripcion: z.string().min(1),
  monto: z.coerce.number().min(1),
  fecha: z.string().min(1),
})
type GastoForm = z.infer<typeof gastoSchema>

const inquilinoSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  telefono: z.string().min(1, 'Requerido'),
  email: z.string().optional(),
  dni: z.string().optional(),
})
type InquilinoForm = z.infer<typeof inquilinoSchema>

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}
function diasHasta(t: Timestamp | Date) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = toDate(t); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

type Tab = 'pagos' | 'gastos' | 'inquilino'

export function UnidadDetalle({
  unidad, pagos, gastos, onClose,
  onUpdateInquilino, onDelete, onAddPago, onMarkPagado, onDeletePago,
  onAddGasto, onDeleteGasto,
}: Props) {
  const [tab, setTab] = useState<Tab>('pagos')
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [showGastoForm, setShowGastoForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pagoForm = useForm<PagoForm>({
    resolver: zodResolver(pagoSchema) as Resolver<PagoForm>,
    defaultValues: { vencimiento: new Date().toISOString().split('T')[0] },
  })
  const gastoForm = useForm<GastoForm>({
    resolver: zodResolver(gastoSchema) as Resolver<GastoForm>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })
  const inquilinoForm = useForm<InquilinoForm>({
    resolver: zodResolver(inquilinoSchema) as Resolver<InquilinoForm>,
    defaultValues: unidad.inquilino
      ? { nombre: unidad.inquilino.nombre, telefono: unidad.inquilino.telefono, email: unidad.inquilino.email ?? '', dni: unidad.inquilino.dni ?? '' }
      : {},
  })

  const submitPago = async (data: PagoForm) => {
    await onAddPago({
      unidadId: unidad.id,
      monto: data.monto,
      periodo: data.periodo,
      vencimiento: Timestamp.fromDate(new Date(data.vencimiento + 'T12:00:00')),
      estado: 'pendiente',
      notas: data.notas,
    })
    pagoForm.reset()
    setShowPagoForm(false)
  }

  const submitGasto = async (data: GastoForm) => {
    await onAddGasto({
      unidadId: unidad.id,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
    })
    gastoForm.reset()
    setShowGastoForm(false)
  }

  const submitInquilino = async (data: InquilinoForm) => {
    await onUpdateInquilino({ nombre: data.nombre, telefono: data.telefono, email: data.email, dni: data.dni })
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'pagos', label: `Pagos (${pagos.length})` },
    { key: 'gastos', label: `Gastos (${gastos.length})` },
    { key: 'inquilino', label: 'Inquilino' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                unidad.tipo === 'local' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              )}>
                {unidad.tipo === 'local' ? 'Local' : 'Depto'}
              </span>
              <h2 className="text-base font-semibold text-slate-900">{unidad.nombre}</h2>
            </div>
            {unidad.inquilino && (
              <p className="text-xs text-slate-500 mt-0.5">{unidad.inquilino.nombre}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 text-slate-300 hover:text-red-400 transition"
              title="Eliminar unidad"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 border-b border-slate-100 px-4 pt-3 gap-1 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all',
                tab === t.key ? 'bg-white text-slate-900 border border-b-white border-slate-200 -mb-px' : 'text-slate-500'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── PAGOS ── */}
          {tab === 'pagos' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  {pagos.filter(p => p.estado !== 'pagado').length} pendientes
                </p>
                <button onClick={() => setShowPagoForm(!showPagoForm)}
                  className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <Plus size={14} /> Registrar
                </button>
              </div>

              {showPagoForm && (
                <form onSubmit={pagoForm.handleSubmit(submitPago)} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                      <input {...pagoForm.register('monto')} type="number" inputMode="numeric" placeholder="0" className={cn(inputCls, 'py-2 text-xs')} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Período</label>
                      <input {...pagoForm.register('periodo')} placeholder="Mayo 2026" className={cn(inputCls, 'py-2 text-xs')} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Vencimiento</label>
                    <input {...pagoForm.register('vencimiento')} type="date" className={cn(inputCls, 'py-2 text-xs')} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowPagoForm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs text-slate-600">Cancelar</button>
                    <button type="submit" disabled={pagoForm.formState.isSubmitting} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs disabled:opacity-50">Guardar</button>
                  </div>
                </form>
              )}

              {pagos.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sin pagos registrados</p>}

              {pagos.map((p) => {
                const dias = diasHasta(p.vencimiento)
                return (
                  <div key={p.id} className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {p.estado === 'pagado'
                          ? <CheckCircle size={13} className="text-emerald-500" />
                          : dias < 0
                          ? <AlertCircle size={13} className="text-red-500" />
                          : <Clock size={13} className="text-amber-500" />
                        }
                        <span className="text-sm font-medium text-slate-700">{formatMoney(p.monto)}</span>
                        <span className="text-xs text-slate-400">· {p.periodo}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {p.estado === 'pagado' && p.fechaPago
                          ? `Pagado ${formatFecha(p.fechaPago)}`
                          : dias < 0
                          ? `Venció hace ${Math.abs(dias)} días`
                          : `Vence en ${dias} días`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {p.estado !== 'pagado' && (
                        <button
                          onClick={() => onMarkPagado(p.id)}
                          className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition"
                        >
                          Cobrado
                        </button>
                      )}
                      <button onClick={() => onDeletePago(p.id)} className="p-1 text-slate-300 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── GASTOS ── */}
          {tab === 'gastos' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Total: {formatMoney(gastos.reduce((s, g) => s + g.monto, 0))}
                </p>
                <button onClick={() => setShowGastoForm(!showGastoForm)}
                  className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {showGastoForm && (
                <form onSubmit={gastoForm.handleSubmit(submitGasto)} className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                    <input {...gastoForm.register('descripcion')} placeholder="Ej: Reparación llave de paso" className={cn(inputCls, 'py-2 text-xs')} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                      <input {...gastoForm.register('monto')} type="number" inputMode="numeric" className={cn(inputCls, 'py-2 text-xs')} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                      <input {...gastoForm.register('fecha')} type="date" className={cn(inputCls, 'py-2 text-xs')} />
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
                    <p className="text-xs text-slate-400">{formatFecha(g.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700">{formatMoney(g.monto)}</p>
                    <button onClick={() => onDeleteGasto(g.id)} className="p-1 text-slate-300 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── INQUILINO ── */}
          {tab === 'inquilino' && (
            <form onSubmit={inquilinoForm.handleSubmit(submitInquilino)} className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  {unidad.inquilino ? 'Datos del inquilino' : 'Sin inquilino asignado'}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nombre</label>
                <input {...inquilinoForm.register('nombre')} className={inputCls} placeholder="Juan Pérez" />
                {inquilinoForm.formState.errors.nombre && (
                  <p className="text-red-500 text-xs mt-0.5">{inquilinoForm.formState.errors.nombre.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Teléfono</label>
                  <input {...inquilinoForm.register('telefono')} type="tel" className={inputCls} placeholder="11 1234-5678" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">DNI</label>
                  <input {...inquilinoForm.register('dni')} className={inputCls} placeholder="Opcional" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Email</label>
                <input {...inquilinoForm.register('email')} type="email" className={inputCls} placeholder="Opcional" />
              </div>

              {unidad.inquilino?.telefono && (
                <a
                  href={`tel:${unidad.inquilino.telefono}`}
                  className="flex items-center gap-2 text-sm text-blue-600 font-medium"
                >
                  <Phone size={14} />
                  Llamar a {unidad.inquilino.nombre.split(' ')[0]}
                </a>
              )}

              <button
                type="submit"
                disabled={inquilinoForm.formState.isSubmitting}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50 mt-2"
              >
                {inquilinoForm.formState.isSubmitting ? 'Guardando...' : 'Guardar inquilino'}
              </button>

              {unidad.inquilino && (
                <button
                  type="button"
                  onClick={() => onUpdateInquilino(null)}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition"
                >
                  Quitar inquilino
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        title={`¿Eliminar "${unidad.nombre}"?`}
        subtitle="Se borrarán todos sus datos."
        confirmLabel="Eliminar unidad"
        onConfirm={async () => { setConfirmDelete(false); await onDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
