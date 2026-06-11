import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, X } from 'lucide-react'
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
          <h2 className="text-base font-semibold text-slate-900 flex-1">
            {obra ? 'Editar obra' : 'Nueva obra'}
          </h2>
          <button onClick={onClose} className="hidden sm:block p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form id="obra-form" onSubmit={handleSubmit(submit)} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4" style={{ touchAction: 'pan-y' }}>
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
        </form>

        {/* Bottom CTA */}
        <div
          className="px-4 pt-3 border-t border-slate-100 flex-shrink-0 flex gap-2"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="obra-form"
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Guardando…' : obra ? 'Guardar' : 'Crear obra'}
          </button>
        </div>
      </div>
    </div>
  )
}
