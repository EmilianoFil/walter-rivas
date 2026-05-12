import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TipoUnidad } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  tipo: z.enum(['depto', 'local']),
})
type FormData = z.infer<typeof schema>

interface Props {
  onSubmit: (data: { nombre: string; tipo: TipoUnidad }) => Promise<void>
  onClose: () => void
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function UnidadForm({ onSubmit, onClose }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'depto' },
  })

  const submit = async (data: FormData) => {
    await onSubmit({ nombre: data.nombre, tipo: data.tipo })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Nueva unidad</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['depto', 'local'] as const).map((t) => (
                <label key={t} className="cursor-pointer">
                  <input {...register('tipo')} type="radio" value={t} className="sr-only peer" />
                  <div className={cn(
                    'text-center py-2.5 rounded-xl border text-sm font-medium transition',
                    'peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-600',
                    'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}>
                    {t === 'depto' ? 'Departamento' : 'Local comercial'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nombre</label>
            <input
              {...register('nombre')}
              className={inputCls}
              placeholder="Ej: Depto A, Local 1, PH..."
              autoFocus
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-0.5">{errors.nombre.message}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creando...' : 'Crear unidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
