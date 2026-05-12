import { useState } from 'react'
import { Bell, Plus, X, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAlertas } from '@/hooks/useAlertas'
import type { Alerta } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  titulo: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  fecha: z.string().min(1, 'Requerido'),
  anticipacionDias: z.coerce.number().min(0).max(90),
  vertical: z.enum(['quinta', 'deptos', 'obras', 'empresa', 'flota', 'general']).optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}
function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function diasHasta(t: Timestamp | Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = toDate(t); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

const VERTICAL_LABELS: Record<string, string> = {
  quinta: 'Casa quinta', deptos: 'Deptos', obras: 'Obras',
  empresa: 'Empresa', flota: 'Flota', general: 'General',
}

function AlertaItem({ alerta, onDescartar, onDelete }: { alerta: Alerta; onDescartar: () => void; onDelete: () => void }) {
  const dias = diasHasta(alerta.fecha)
  const descartada = alerta.estado === 'descartada'
  const vencida = dias < 0 && !descartada
  const urgente = dias >= 0 && dias <= alerta.anticipacionDias && !descartada

  return (
    <div className={cn(
      'rounded-2xl p-4 border transition-all',
      descartada ? 'bg-slate-50 border-slate-100 opacity-50' :
        vencida ? 'bg-red-50 border-red-100' :
          urgente ? 'bg-amber-50 border-amber-100' :
            'bg-white border-slate-100 shadow-sm'
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {descartada ? <CheckCircle size={15} className="text-slate-400" /> :
            vencida ? <AlertCircle size={15} className="text-red-500" /> :
              urgente ? <Bell size={15} className="text-amber-500" /> :
                <Clock size={15} className="text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', descartada ? 'text-slate-400 line-through' : 'text-slate-800')}>
            {alerta.titulo}
          </p>
          {alerta.descripcion && (
            <p className="text-xs text-slate-500 mt-0.5">{alerta.descripcion}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-400">{formatFecha(alerta.fecha)}</span>
            {alerta.vertical && (
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {VERTICAL_LABELS[alerta.vertical]}
              </span>
            )}
            {!descartada && (
              <span className={cn('text-xs font-medium',
                vencida ? 'text-red-500' : urgente ? 'text-amber-600' : 'text-slate-400')}>
                {vencida ? `Venció hace ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `En ${dias}d`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!descartada && (
            <button onClick={onDescartar} title="Descartar"
              className="p-1.5 text-slate-300 hover:text-emerald-500 transition-colors">
              <CheckCircle size={15} />
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AlertasPage() {
  const { alertas, loading, addAlerta, descartar, deleteAlerta } = useAlertas()
  const [showForm, setShowForm] = useState(false)
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { anticipacionDias: 3, vertical: 'general' },
  })

  const submit = async (data: FormData) => {
    await addAlerta({
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha: Timestamp.fromDate(new Date(data.fecha + 'T12:00:00')),
      anticipacionDias: data.anticipacionDias,
      vertical: data.vertical,
    })
    reset({ anticipacionDias: 3, vertical: 'general' })
    setShowForm(false)
  }

  const activas = alertas.filter(a => a.estado === 'activa')
  const descartadas = alertas.filter(a => a.estado === 'descartada')
  const urgentes = activas.filter(a => {
    const dias = diasHasta(a.fecha)
    return dias >= 0 && dias <= a.anticipacionDias
  })
  const vencidas = activas.filter(a => diasHasta(a.fecha) < 0)

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center relative">
            <Bell size={18} className="text-white" />
            {urgentes.length + vencidas.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-red-500 text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center border border-red-100">
                {urgentes.length + vencidas.length}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Alertas</h1>
            <p className="text-xs text-slate-500">{activas.length} activas</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition">
          <Plus size={16} /> Nueva
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit(submit)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Título</label>
            <input {...register('titulo')} className={inputCls} placeholder="Ej: Renovar seguro Kangoo" />
            {errors.titulo && <p className="text-red-500 text-xs mt-0.5">{errors.titulo.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descripción (opcional)</label>
            <input {...register('descripcion')} className={inputCls} placeholder="Detalles adicionales..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha límite</label>
              <input {...register('fecha')} type="date" className={inputCls} />
              {errors.fecha && <p className="text-red-500 text-xs mt-0.5">{errors.fecha.message}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Avisar con (días)</label>
              <input {...register('anticipacionDias')} type="number" inputMode="numeric" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Vertical</label>
            <select {...register('vertical')} className={inputCls}>
              <option value="general">General</option>
              <option value="quinta">Casa quinta</option>
              <option value="deptos">Deptos</option>
              <option value="obras">Obras</option>
              <option value="empresa">Empresa</option>
              <option value="flota">Flota</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); reset() }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Crear alerta'}
            </button>
          </div>
        </form>
      )}

      {/* Vencidas */}
      {vencidas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Vencidas ({vencidas.length})</p>
          {vencidas.map(a => <AlertaItem key={a.id} alerta={a} onDescartar={() => descartar(a.id)} onDelete={() => deleteAlerta(a.id)} />)}
        </div>
      )}

      {/* Urgentes */}
      {urgentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Próximas ({urgentes.length})</p>
          {urgentes.map(a => <AlertaItem key={a.id} alerta={a} onDescartar={() => descartar(a.id)} onDelete={() => deleteAlerta(a.id)} />)}
        </div>
      )}

      {/* Resto de activas */}
      {(() => {
        const resto = activas.filter(a => {
          const dias = diasHasta(a.fecha)
          return dias >= 0 && dias > a.anticipacionDias
        })
        if (resto.length === 0) return null
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Programadas ({resto.length})</p>
            {resto.map(a => <AlertaItem key={a.id} alerta={a} onDescartar={() => descartar(a.id)} onDelete={() => deleteAlerta(a.id)} />)}
          </div>
        )
      })()}

      {activas.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-400 text-sm">Sin alertas activas</div>
      )}

      {/* Descartadas */}
      {descartadas.length > 0 && (
        <button onClick={() => setMostrarDescartadas(!mostrarDescartadas)}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto">
          <X size={12} />
          {mostrarDescartadas ? 'Ocultar' : `Ver ${descartadas.length} descartadas`}
        </button>
      )}
      {mostrarDescartadas && descartadas.map(a => (
        <AlertaItem key={a.id} alerta={a} onDescartar={() => descartar(a.id)} onDelete={() => deleteAlerta(a.id)} />
      ))}
    </div>
  )
}
