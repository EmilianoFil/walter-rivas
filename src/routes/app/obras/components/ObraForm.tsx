import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import type { Obra } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  cliente: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  presupuesto: z.coerce.number().min(0),
  estado: z.enum(['activa', 'pausada', 'finalizada']),
})
type FormData = z.infer<typeof schema>

interface Props {
  obra?: Obra
  onSubmit: (data: { nombre: string; descripcion: string; cliente: string; presupuesto: number; estado?: Obra['estado'] }) => Promise<void>
  onClose: () => void
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function ObraForm({ obra, onSubmit, onClose }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: obra
      ? { nombre: obra.nombre, cliente: obra.cliente, descripcion: obra.descripcion, presupuesto: obra.presupuesto, estado: obra.estado }
      : { estado: 'activa' },
  })

  const submit = async (data: FormData) => {
    await onSubmit({ nombre: data.nombre, cliente: data.cliente, descripcion: data.descripcion ?? '', presupuesto: data.presupuesto, estado: data.estado })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{obra ? 'Editar obra' : 'Nueva obra'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nombre de la obra</label>
            <input {...register('nombre')} className={inputCls} placeholder="Ej: Refacción cocina García" />
            {errors.nombre && <p className="text-red-500 text-xs mt-0.5">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Cliente</label>
            <input {...register('cliente')} className={inputCls} placeholder="Nombre del cliente" />
            {errors.cliente && <p className="text-red-500 text-xs mt-0.5">{errors.cliente.message}</p>}
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
            <textarea {...register('descripcion')} rows={2} className={cn(inputCls, 'resize-none')} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Presupuesto ($)</label>
              <input {...register('presupuesto')} type="number" inputMode="numeric" className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Estado</label>
              <select {...register('estado')} className={inputCls}>
                <option value="activa">Activa</option>
                <option value="pausada">Pausada</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : obra ? 'Guardar' : 'Crear obra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
