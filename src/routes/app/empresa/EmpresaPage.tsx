import { useState } from 'react'
import { Briefcase, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMovimientosEmpresa } from '@/hooks/useMovimientosEmpresa'
import type { TipoMovimiento } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  descripcion: z.string().min(1, 'Requerido'),
  monto: z.coerce.number().min(1, 'Requerido'),
  fecha: z.string().min(1),
  categoria: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

export function EmpresaPage() {
  const { movimientos, loading, addMovimiento, deleteMovimiento } = useMovimientosEmpresa()
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | TipoMovimiento>('todos')

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { tipo: 'ingreso', fecha: new Date().toISOString().split('T')[0] },
  })

  const tipoWatch = watch('tipo')

  const submit = async (data: FormData) => {
    await addMovimiento({
      tipo: data.tipo,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
      categoria: data.categoria,
    })
    reset({ tipo: 'ingreso', fecha: new Date().toISOString().split('T')[0] })
    setShowForm(false)
  }

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const utilidad = totalIngresos - totalEgresos

  const filtrados = filtro === 'todos' ? movimientos : movimientos.filter(m => m.tipo === filtro)

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" /></div>

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
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition">
          <Plus size={16} /> Movimiento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Ingresos</p>
          <p className="text-base font-bold text-emerald-600 mt-0.5">${(totalIngresos / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Egresos</p>
          <p className="text-base font-bold text-red-500 mt-0.5">${(totalEgresos / 1000).toFixed(0)}k</p>
        </div>
        <div className={cn('rounded-2xl p-3.5 shadow-sm border', utilidad >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
          <p className="text-xs text-slate-500">Utilidad</p>
          <p className={cn('text-base font-bold mt-0.5', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {utilidad >= 0 ? '+' : ''}${(utilidad / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit(submit)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          {/* Tipo toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['ingreso', 'egreso'] as const).map((t) => (
              <label key={t} className={cn(
                'flex-1 text-center py-2 rounded-lg text-xs font-medium cursor-pointer transition-all',
                tipoWatch === t
                  ? t === 'ingreso' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  : 'text-slate-500'
              )}>
                <input {...register('tipo')} type="radio" value={t} className="hidden" />
                {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
              </label>
            ))}
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
            <input {...register('descripcion')} className={inputCls} placeholder="Ej: Venta materiales, pago proveedor..." />
            {errors.descripcion && <p className="text-red-500 text-xs mt-0.5">{errors.descripcion.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Monto</label>
              <input {...register('monto')} type="number" inputMode="numeric" className={inputCls} placeholder="0" />
              {errors.monto && <p className="text-red-500 text-xs mt-0.5">{errors.monto.message}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
              <input {...register('fecha')} type="date" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Categoría (opcional)</label>
            <input {...register('categoria')} className={inputCls} placeholder="Ej: Sueldos, materiales..." />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); reset() }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {(['todos', 'ingreso', 'egreso'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              filtro === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500')}>
            {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Egresos'}
          </button>
        ))}
      </div>

      {/* Historial */}
      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {movimientos.length === 0 ? 'Sin movimientos. Registrá el primero.' : 'Sin movimientos en esta categoría.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                m.tipo === 'ingreso' ? 'bg-emerald-50' : 'bg-red-50')}>
                {m.tipo === 'ingreso'
                  ? <TrendingUp size={16} className="text-emerald-500" />
                  : <TrendingDown size={16} className="text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{m.descripcion}</p>
                <p className="text-xs text-slate-400">
                  {formatFecha(m.fecha)}{m.categoria ? ` · ${m.categoria}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className={cn('text-sm font-semibold', m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500')}>
                  {m.tipo === 'ingreso' ? '+' : '-'}{formatMoney(m.monto)}
                </p>
                <button onClick={() => deleteMovimiento(m.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
