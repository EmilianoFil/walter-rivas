import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, Check, X, LogOut } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/context/AuthContext'
import { useMovimientosPropios } from '@/hooks/useMovimientosQuinta'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { auth } from '@/lib/firebase/config'
import { cn } from '@/lib/cn'
import type { MovimientoQuinta } from '@/types'

const schema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  descripcion: z.string().min(1, 'Requerido'),
  monto: z.coerce.number().min(1, 'Requerido'),
  fecha: z.string().min(1),
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}
function formatFecha(t: Timestamp | Date) {
  const d = t instanceof Date ? t : t.toDate()
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ColaboradorQuinta() {
  const { perfil } = useAuth()
  const uid = perfil?.uid ?? ''
  const { movimientos, loading, addMovimiento, updateMovimiento, deleteMovimiento } = useMovimientosPropios(uid)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MovimientoQuinta | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { tipo: 'egreso', fecha: new Date().toISOString().split('T')[0] },
  })

  const editForm = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
  })

  const submit = async (data: FormData) => {
    await addMovimiento({
      tipo: data.tipo,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: new Date(data.fecha + 'T12:00:00'),
      creadoPorNombre: perfil?.nombre,
    })
    reset({ tipo: 'egreso', fecha: new Date().toISOString().split('T')[0] })
    setShowForm(false)
  }

  const openEdit = (m: MovimientoQuinta) => {
    setEditingId(m.id)
    const fecha = m.fecha instanceof Date ? m.fecha : (m.fecha as Timestamp).toDate()
    editForm.reset({
      tipo: m.tipo,
      descripcion: m.descripcion,
      monto: m.monto,
      fecha: fecha.toISOString().split('T')[0],
    })
  }

  const submitEdit = async (data: FormData) => {
    if (!editingId) return
    await updateMovimiento(editingId, {
      tipo: data.tipo,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
    })
    setEditingId(null)
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="WR" className="w-7 h-7 rounded-lg bg-white object-contain p-0.5" />
            <span className="text-white font-semibold text-sm">Rivas · Quinta</span>
          </div>
          <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-white p-1 transition">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
        {/* Saludo */}
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Hola, {perfil?.nombre?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registrá tus movimientos de la quinta</p>
        </div>

        {/* Formulario nuevo movimiento */}
        {showForm ? (
          <form onSubmit={handleSubmit(submit)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo movimiento</p>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(['ingreso', 'egreso'] as const).map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" value={t} {...register('tipo')} className="sr-only" />
                  <div className={cn(
                    'flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition',
                    'has-[:checked]:border-current',
                    t === 'ingreso'
                      ? 'text-emerald-600 border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:border-emerald-300'
                      : 'text-red-500 border-slate-200 has-[:checked]:bg-red-50 has-[:checked]:border-red-300'
                  )}>
                    {t === 'ingreso' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
              <input {...register('descripcion')} placeholder="¿Qué fue?" className={inputCls} />
              {errors.descripcion && <p className="text-red-500 text-xs mt-0.5">{errors.descripcion.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Monto</label>
                <input {...register('monto')} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                {errors.monto && <p className="text-red-500 text-xs mt-0.5">Requerido</p>}
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha</label>
                <input {...register('fecha')} type="date" className={inputCls} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50">
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-semibold transition"
          >
            <Plus size={17} /> Nuevo movimiento
          </button>
        )}

        {/* Historial propio */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tu historial</p>

          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Cargando...</p>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Todavía no registraste nada.</p>
          ) : (
            <div className="space-y-2">
              {movimientos.map((m) => editingId === m.id ? (
                <form key={m.id} onSubmit={editForm.handleSubmit(submitEdit)} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(['ingreso', 'egreso'] as const).map((t) => (
                      <label key={t} className="cursor-pointer">
                        <input type="radio" value={t} {...editForm.register('tipo')} className="sr-only" />
                        <div className={cn(
                          'flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition',
                          t === 'ingreso'
                            ? 'text-emerald-600 border-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:border-emerald-300'
                            : 'text-red-500 border-slate-200 has-[:checked]:bg-red-50 has-[:checked]:border-red-300'
                        )}>
                          {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </div>
                      </label>
                    ))}
                  </div>
                  <input {...editForm.register('descripcion')} className={inputCls} placeholder="Descripción" />
                  <div className="grid grid-cols-2 gap-3">
                    <input {...editForm.register('monto')} type="number" inputMode="numeric" className={inputCls} />
                    <input {...editForm.register('fecha')} type="date" className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="flex items-center justify-center gap-1 flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">
                      <X size={13} /> Cancelar
                    </button>
                    <button type="submit" disabled={editForm.formState.isSubmitting} className="flex items-center justify-center gap-1 flex-1 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50">
                      <Check size={13} /> Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {m.tipo === 'ingreso'
                        ? <TrendingUp size={13} className="text-emerald-500 flex-shrink-0" />
                        : <TrendingDown size={13} className="text-red-400 flex-shrink-0" />}
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.descripcion}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={cn('text-base font-bold', m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500')}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{formatMoney(m.monto)}
                      </p>
                      <p className="text-xs text-slate-400">{formatFecha(m.fecha)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(m)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete(m)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmSheet
        open={!!confirmDelete}
        title="¿Eliminar movimiento?"
        subtitle={confirmDelete ? `${confirmDelete.descripcion} — ${formatMoney(confirmDelete.monto)}` : ''}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => { if (confirmDelete) await deleteMovimiento(confirmDelete.id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
