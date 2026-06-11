import { useState } from 'react'
import { Plus, Trash2, Tag, Edit2, Check, X } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { GastoQuinta } from '@/types'
import { useCategorias } from '@/hooks/useCategorias'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { GraficoGastos } from '@/components/GraficoGastos'

interface Props {
  gastos: GastoQuinta[]
  onAdd: (data: Omit<GastoQuinta, 'id' | 'adjuntos'>) => Promise<void>
  onUpdate: (id: string, data: Partial<Omit<GastoQuinta, 'id' | 'adjuntos'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const schema = z.object({
  categoria: z.string().min(1, 'Requerido'),
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
function toDateStr(t: Timestamp | Date): string {
  return toDate(t).toISOString().split('T')[0]
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

function EditForm({
  gasto,
  categorias,
  onSave,
  onCancel,
}: {
  gasto: GastoQuinta
  categorias: ReturnType<typeof useCategorias>['categorias']
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      categoria: gasto.categoria,
      descripcion: gasto.descripcion,
      monto: gasto.monto,
      fecha: toDateStr(gasto.fecha),
    },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="bg-white rounded-2xl border border-red-200 p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
          <select {...register('categoria')} className={inputCls}>
            <option value="">Seleccionar...</option>
            {categorias
              .filter((c) => c.tipo === 'egreso' || c.tipo === 'ambos')
              .map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
          {errors.categoria && <p className="text-red-500 text-xs mt-0.5">{errors.categoria.message}</p>}
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Monto</label>
          <input {...register('monto')} type="number" inputMode="numeric" className={inputCls} />
          {errors.monto && <p className="text-red-500 text-xs mt-0.5">{errors.monto.message}</p>}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
        <input {...register('descripcion')} className={inputCls} />
        {errors.descripcion && <p className="text-red-500 text-xs mt-0.5">{errors.descripcion.message}</p>}
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
        <input {...register('fecha')} type="date" className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium">
          <X size={14} /> Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">
          <Check size={14} /> {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export function GastosQuinta({ gastos, onAdd, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { categorias } = useCategorias('quinta')
  const total = gastos.reduce((s, g) => s + g.monto, 0)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { fecha: new Date().toISOString().split('T')[0] },
  })

  const submit = async (data: FormData) => {
    await onAdd({
      categoria: data.categoria,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
    })
    reset({ fecha: new Date().toISOString().split('T')[0] })
    setShowForm(false)
  }

  const handleEdit = async (id: string, data: FormData) => {
    await onUpdate(id, {
      categoria: data.categoria,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
    })
    setEditingId(null)
  }

  const gastoToDelete = gastos.find((g) => g.id === deleteId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Total gastos</p>
          <p className="text-lg font-bold text-slate-800">{formatMoney(total)}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null) }}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition"
        >
          <Plus size={16} />
          Nuevo gasto
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(submit)} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
              <select {...register('categoria')} className={inputCls}>
                <option value="">Seleccionar...</option>
                {categorias
                  .filter((c) => c.tipo === 'egreso' || c.tipo === 'ambos')
                  .map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
              {errors.categoria && <p className="text-red-500 text-xs mt-0.5">{errors.categoria.message}</p>}
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
          {categorias.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              No hay categorías para Quinta. Creá una en Configuración → Categorías.
            </p>
          )}
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

      {gastos.length === 0 && !showForm && (
        <div className="text-center py-10 text-slate-400 text-sm">Sin gastos registrados</div>
      )}

      {gastos.length > 1 && (
        <GraficoGastos gastos={gastos.map((g) => ({ categoria: g.categoria, monto: g.monto }))} />
      )}

      <div className="space-y-2">
        {gastos.map((g) =>
          editingId === g.id ? (
            <EditForm
              key={g.id}
              gasto={g}
              categorias={categorias}
              onSave={(data) => handleEdit(g.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={g.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100">
                <Tag size={16} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{g.descripcion}</p>
                <p className="text-xs text-slate-400">{g.categoria} · {formatFecha(g.fecha)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700 mr-1">{formatMoney(g.monto)}</p>
                <button
                  onClick={() => { setEditingId(g.id); setShowForm(false) }}
                  className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(g.id)}
                  className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <ConfirmSheet
        open={!!deleteId}
        title="¿Eliminar gasto?"
        subtitle={gastoToDelete ? `"${gastoToDelete.descripcion}" — ${formatMoney(gastoToDelete.monto)}` : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (deleteId) await onDelete(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
