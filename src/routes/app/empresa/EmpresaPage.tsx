import { useState, useMemo } from 'react'
import { Briefcase, Plus, TrendingUp, TrendingDown, ChevronRight, X, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEmpresaClientes, GASTOS_GENERALES_NOMBRE } from '@/hooks/useEmpresaClientes'
import { ProyectoDetalle } from '@/components/ProyectoDetalle'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { GastosFijosSection } from './GastosFijosSection'
import type { EmpresaCliente } from '@/types'
import { cn } from '@/lib/cn'
import { SkPage } from '@/components/Skeleton'

// ─── Form schemas ─────────────────────────────────────────────────────────────
const clienteSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  presupuesto: z.coerce.number().optional(),
})
type ClienteForm = z.infer<typeof clienteSchema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const ESTADO_CONFIG = {
  activo: { label: 'Activo', cls: 'bg-emerald-100 text-emerald-700' },
  pausado: { label: 'Pausado', cls: 'bg-amber-100 text-amber-700' },
  finalizado: { label: 'Finalizado', cls: 'bg-slate-100 text-slate-600' },
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function EmpresaPage() {
  const { clientes, loading, addCliente, updateCliente, deleteCliente, addIngreso, updateIngreso, deleteIngreso, addGasto, updateGasto, deleteGasto, registrarGastosFijos } = useEmpresaClientes()
  const [selected, setSelected] = useState<EmpresaCliente | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<EmpresaCliente | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<EmpresaCliente | null>(null)
  const [showAllGastos, setShowAllGastos] = useState(false)
  const [showAllIngresos, setShowAllIngresos] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema) as Resolver<ClienteForm>,
  })

  const openEdit = (c: EmpresaCliente) => {
    setEditTarget(c)
    reset({ nombre: c.nombre, descripcion: c.descripcion, presupuesto: c.presupuesto })
    setShowForm(true)
  }

  const submit = async (data: ClienteForm) => {
    if (editTarget) {
      await updateCliente(editTarget.id, { nombre: data.nombre, descripcion: data.descripcion, presupuesto: data.presupuesto })
      if (selected?.id === editTarget.id) {
        setSelected((prev) => prev ? { ...prev, nombre: data.nombre, descripcion: data.descripcion, presupuesto: data.presupuesto } : prev)
      }
      setEditTarget(null)
    } else {
      await addCliente({ nombre: data.nombre, descripcion: data.descripcion, presupuesto: data.presupuesto })
    }
    reset()
    setShowForm(false)
  }

  const handleDelete = async (c: EmpresaCliente) => {
    await deleteCliente(c.id)
    if (selected?.id === c.id) setSelected(null)
    setConfirmDelete(null)
  }

  // Separar cliente especial "Gastos Generales" del resto
  const gastosGeneralesCliente = clientes.find((c) => c.nombre === GASTOS_GENERALES_NOMBRE)
  const clientesVisibles = clientes.filter((c) => c.nombre !== GASTOS_GENERALES_NOMBRE)

  // Meses ya registrados (gastos con prefijo [Fijo] en Gastos Generales)
  const mesesRegistrados = (() => {
    if (!gastosGeneralesCliente) return []
    const set = new Map<string, { año: number; mes: number }>()
    for (const g of gastosGeneralesCliente.gastos ?? []) {
      if (!g.descripcion.startsWith('[Fijo]')) continue
      const f = g.fecha && typeof (g.fecha as { toDate?: unknown }).toDate === 'function'
        ? (g.fecha as { toDate: () => Date }).toDate()
        : new Date(g.fecha as unknown as string)
      const key = `${f.getFullYear()}-${f.getMonth()}`
      set.set(key, { año: f.getFullYear(), mes: f.getMonth() })
    }
    return Array.from(set.values())
  })()

  // KPIs globales (incluyendo Gastos Generales)
  const totalIngresos = clientes.reduce((s, c) => s + (c.ingresos ?? []).reduce((si, i) => si + i.monto, 0), 0)
  const totalGastos = clientes.reduce((s, c) => s + (c.gastos ?? []).reduce((sg, g) => sg + g.monto, 0), 0)
  const utilidad = totalIngresos - totalGastos

  // Lista unificada de todos los ingresos, ordenados por fecha desc
  const todosLosIngresos = useMemo(() => {
    const lista: { clienteId: string; clienteNombre: string; ingresoId: string; descripcion?: string; monto: number; fecha: Timestamp; categoria?: string }[] = []
    for (const c of clientes) {
      const nombreVisible = c.nombre === GASTOS_GENERALES_NOMBRE ? 'Gastos Generales' : c.nombre
      for (const i of c.ingresos ?? []) {
        lista.push({ clienteId: c.id, clienteNombre: nombreVisible, ingresoId: i.id, descripcion: i.descripcion, monto: i.monto, fecha: i.fecha, categoria: i.categoria })
      }
    }
    return lista.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis())
  }, [clientes])

  // Lista unificada de todos los gastos, ordenados por fecha desc
  const todosLosGastos = useMemo(() => {
    const lista: { clienteId: string; clienteNombre: string; gastoId: string; descripcion: string; monto: number; fecha: Timestamp; categoria?: string }[] = []
    for (const c of clientes) {
      const nombreVisible = c.nombre === GASTOS_GENERALES_NOMBRE ? 'Gastos Generales' : c.nombre
      for (const g of c.gastos ?? []) {
        lista.push({ clienteId: c.id, clienteNombre: nombreVisible, gastoId: g.id, descripcion: g.descripcion, monto: g.monto, fecha: g.fecha, categoria: g.categoria })
      }
    }
    return lista.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis())
  }, [clientes])

  if (loading) return <SkPage rows={2} />

  // Vista detalle
  if (selected) {
    const live = clientes.find((c) => c.id === selected.id) ?? selected
    const esGastosGenerales = live.nombre === GASTOS_GENERALES_NOMBRE
    return (
      <ProyectoDetalle
        proyecto={{
          nombre: esGastosGenerales ? 'Gastos Generales' : live.nombre,
          descripcion: live.descripcion,
          presupuesto: live.presupuesto,
          estado: live.estado,
          ingresos: (live.ingresos ?? []).map((i) => ({ id: i.id, monto: i.monto, fecha: i.fecha, descripcion: i.descripcion, categoria: i.categoria })),
          gastos: (live.gastos ?? []).map((g) => ({ id: g.id, monto: g.monto, fecha: g.fecha, descripcion: g.descripcion, categoria: g.categoria })),
        }}
        vertical="empresa"
        labels={{ ingresos: 'Ingresos', gastos: 'Gastos', nuevoIngreso: 'Nuevo ingreso', nuevoGasto: 'Nuevo gasto' }}
        estadoConfig={ESTADO_CONFIG}
        onClose={() => setSelected(null)}
        onEdit={() => openEdit(live)}
        onDelete={() => setConfirmDelete(live)}
        onAddIngreso={(data) => addIngreso(live, { monto: data.monto, fecha: data.fecha, descripcion: data.descripcion, categoria: data.categoria })}
        onUpdateIngreso={(id, data) => updateIngreso(live, id, { monto: data.monto, fecha: data.fecha, descripcion: data.descripcion, categoria: data.categoria })}
        onDeleteIngreso={(id) => deleteIngreso(live, id)}
        onAddGasto={(data) => addGasto(live, { descripcion: data.descripcion, monto: data.monto, fecha: data.fecha, categoria: data.categoria })}
        onUpdateGasto={(id, data) => updateGasto(live, id, { descripcion: data.descripcion, monto: data.monto, fecha: data.fecha, categoria: data.categoria })}
        onDeleteGasto={(id) => deleteGasto(live, id)}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Empresa</h1>
        </div>
        <button
          onClick={() => { setEditTarget(null); reset(); setShowForm(!showForm) }}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setShowAllIngresos(true)}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 text-left hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
        >
          <p className="text-xs text-slate-500">Ingresos</p>
          <p className="text-base font-bold text-emerald-600 mt-0.5">{formatMoney(totalIngresos)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Ver detalle →</p>
        </button>
        <button
          onClick={() => setShowAllGastos(true)}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 text-left hover:border-red-200 hover:bg-red-50/30 transition-colors"
        >
          <p className="text-xs text-slate-500">Gastos</p>
          <p className="text-base font-bold text-red-500 mt-0.5">{formatMoney(totalGastos)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Ver detalle →</p>
        </button>
        <div className={cn('rounded-2xl p-3.5 shadow-sm border', utilidad >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
          <p className="text-xs text-slate-500">Utilidad</p>
          <p className={cn('text-base font-bold mt-0.5', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {utilidad >= 0 ? '+' : ''}{formatMoney(utilidad)}
          </p>
        </div>
      </div>

      {/* Form nuevo/editar cliente */}
      {showForm && (
        <form onSubmit={handleSubmit(submit)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {editTarget ? 'Editar cliente' : 'Nuevo cliente'}
          </p>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nombre del cliente</label>
            <input {...register('nombre')} className={inputCls} placeholder="Ej: Constructora López, Juan Pérez..." />
            {errors.nombre && <p className="text-red-500 text-xs mt-0.5">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descripción (opcional)</label>
            <input {...register('descripcion')} className={inputCls} placeholder="Ej: Refacción cocina, mantenimiento..." />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Presupuesto (opcional)</label>
            <input {...register('presupuesto')} type="number" inputMode="numeric" className={inputCls} placeholder="0" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); reset() }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : editTarget ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      )}

      {/* Gastos fijos */}
      <GastosFijosSection
        onRegistrar={registrarGastosFijos}
        mesesRegistrados={mesesRegistrados}
      />

      {/* Lista de clientes */}
      {clientesVisibles.length === 0 && !showForm ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
          <p>Sin clientes aún.</p>
          <p className="text-xs mt-1">Creá el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientesVisibles.map((c) => {
            const ing = (c.ingresos ?? []).reduce((s, i) => s + i.monto, 0)
            const gas = (c.gastos ?? []).reduce((s, g) => s + g.monto, 0)
            const util = ing - gas
            const estadoCfg = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.activo
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 text-left hover:border-slate-200 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', estadoCfg.cls)}>
                      {estadoCfg.label}
                    </span>
                  </div>
                  {c.descripcion && <p className="text-xs text-slate-400 truncate">{c.descripcion}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                      <TrendingUp size={11} /> {formatMoney(ing)}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-red-500">
                      <TrendingDown size={11} /> {formatMoney(gas)}
                    </span>
                    <span className={cn('text-xs font-semibold', util >= 0 ? 'text-slate-700' : 'text-red-500')}>
                      {util >= 0 ? '+' : ''}{formatMoney(util)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      <ConfirmSheet
        open={!!confirmDelete}
        title="¿Eliminar cliente?"
        subtitle={confirmDelete ? `"${confirmDelete.nombre}" y todos sus movimientos` : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Panel: todos los ingresos */}
      {showAllIngresos && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={17} className="text-emerald-500" />
                <h2 className="font-semibold text-slate-900">Todos los ingresos</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{todosLosIngresos.length}</span>
              </div>
              <button onClick={() => setShowAllIngresos(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {todosLosIngresos.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Sin ingresos registrados.</p>
              ) : todosLosIngresos.map((i) => {
                const fecha = i.fecha.toDate()
                const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <div key={`${i.clienteId}-${i.ingresoId}`} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{i.descripcion || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{fechaStr}</span>
                        <span className="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full truncate max-w-32">
                          {i.clienteNombre}
                        </span>
                        {i.categoria && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{i.categoria}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">{formatMoney(i.monto)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
              <span className="text-sm text-slate-500 font-medium">Total ingresos</span>
              <span className="text-base font-bold text-emerald-600">{formatMoney(totalIngresos)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Panel: todos los gastos */}
      {showAllGastos && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ArrowDownLeft size={17} className="text-red-500" />
                <h2 className="font-semibold text-slate-900">Todos los egresos</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{todosLosGastos.length}</span>
              </div>
              <button onClick={() => setShowAllGastos(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {todosLosGastos.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Sin egresos registrados.</p>
              ) : todosLosGastos.map((g) => {
                const cliente = clientes.find((c) => c.id === g.clienteId)
                const fecha = g.fecha.toDate()
                const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                return (
                  <div key={`${g.clienteId}-${g.gastoId}`} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{g.descripcion}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{fechaStr}</span>
                        <span className="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full truncate max-w-32">
                          {g.clienteNombre}
                        </span>
                        {g.categoria && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{g.categoria}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-red-500">{formatMoney(g.monto)}</span>
                      {cliente && (
                        <button
                          onClick={() => deleteGasto(cliente, g.gastoId)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer total */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
              <span className="text-sm text-slate-500 font-medium">Total egresos</span>
              <span className="text-base font-bold text-red-500">{formatMoney(totalGastos)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
