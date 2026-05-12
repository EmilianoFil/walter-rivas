import { useState } from 'react'
import { Plus, Trash2, Leaf, Sparkles, Receipt, Wrench, MoreHorizontal } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { GastoQuinta } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  gastos: GastoQuinta[]
  onAdd: (data: Omit<GastoQuinta, 'id' | 'adjuntos'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const CATEGORIAS = [
  { value: 'pasto', label: 'Pasto', icon: Leaf, color: 'text-green-600 bg-green-50' },
  { value: 'limpieza', label: 'Limpieza', icon: Sparkles, color: 'text-blue-600 bg-blue-50' },
  { value: 'impuestos', label: 'Impuestos', icon: Receipt, color: 'text-orange-600 bg-orange-50' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: Wrench, color: 'text-purple-600 bg-purple-50' },
  { value: 'otro', label: 'Otro', icon: MoreHorizontal, color: 'text-slate-600 bg-slate-100' },
] as const

type Categoria = typeof CATEGORIAS[number]['value']

const schema = z.object({
  categoria: z.enum(['pasto', 'limpieza', 'impuestos', 'mantenimiento', 'otro']),
  descripcion: z.string().min(1, 'Requerido'),
  monto: z.coerce.number().min(1, 'Requerido'),
  fecha: z.string().min(1, 'Requerido'),
})
type FormData = z.infer<typeof schema>

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function GastosQuinta({ gastos, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const total = gastos.reduce((s, g) => s + g.monto, 0)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      categoria: 'pasto',
      fecha: new Date().toISOString().split('T')[0],
    },
  })

  const submit = async (data: FormData) => {
    await onAdd({
      categoria: data.categoria,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
    })
    reset()
    setShowForm(false)
  }

  const getCat = (val: Categoria) => CATEGORIAS.find((c) => c.value === val)!

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total gastos</p>
          <p className="text-lg font-bold text-slate-800">{formatMoney(total)}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition"
        >
          <Plus size={16} />
          Nuevo gasto
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit(submit)} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
              <select {...register('categoria')} className={inputCls}>
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Monto</label>
              <input {...register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
              {errors.monto && <p className="text-red-500 text-xs mt-0.5">{errors.monto.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
            <input {...register('descripcion')} className={inputCls} placeholder="Ej: Corte de pasto mensual" />
            {errors.descripcion && <p className="text-red-500 text-xs mt-0.5">{errors.descripcion.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
            <input {...register('fecha')} type="date" className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); reset() }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {gastos.length === 0 && !showForm && (
        <div className="text-center py-10 text-slate-400 text-sm">Sin gastos registrados</div>
      )}

      <div className="space-y-2">
        {gastos.map((g) => {
          const cat = getCat(g.categoria)
          const Icon = cat.icon
          return (
            <div
              key={g.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3"
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cat.color)}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{g.descripcion}</p>
                <p className="text-xs text-slate-400">{cat.label} · {formatFecha(g.fecha)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700">{formatMoney(g.monto)}</p>
                <button onClick={() => onDelete(g.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
