import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Vehiculo } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  patente: z.string().min(1, 'Requerido'),
  marca: z.string().min(1, 'Requerido'),
  modelo: z.string().min(1, 'Requerido'),
  anio: z.coerce.number().min(1900).max(2100),
  color: z.string().min(1, 'Requerido'),
  kmActual: z.coerce.number().min(0),
  kmServiceCada: z.coerce.number().min(1000),
  kmUltimoService: z.coerce.number().min(0),
  seguroCompania: z.string().min(1, 'Requerido'),
  seguroPoliza: z.string().optional(),
  seguroMonto: z.coerce.number().min(0),
  seguroVto: z.string().min(1, 'Requerido'),
  patenteVto: z.string().min(1, 'Requerido'),
  vtvVto: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  vehiculo?: Vehiculo
  onSubmit: (data: Omit<Vehiculo, 'id'>) => Promise<void>
  onClose: () => void
}

function toInputDate(t?: Timestamp | Date) {
  if (!t) return ''
  const d = t instanceof Date ? t : t.toDate()
  return d.toISOString().split('T')[0]
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'
const labelCls = 'text-xs text-slate-500 mb-1 block'

export function VehiculoForm({ vehiculo, onSubmit, onClose }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: vehiculo ? {
      patente: vehiculo.patente, marca: vehiculo.marca, modelo: vehiculo.modelo,
      anio: vehiculo.anio, color: vehiculo.color, kmActual: vehiculo.kmActual,
      kmServiceCada: vehiculo.kmServiceCada, kmUltimoService: vehiculo.kmUltimoService,
      seguroCompania: vehiculo.seguro.compania, seguroPoliza: vehiculo.seguro.nroPoliza,
      seguroMonto: vehiculo.seguro.monto, seguroVto: toInputDate(vehiculo.seguro.vencimiento),
      patenteVto: toInputDate(vehiculo.patente_vto), vtvVto: toInputDate(vehiculo.vtv_vto),
    } : { kmServiceCada: 10000, kmUltimoService: 0, seguroMonto: 0, anio: new Date().getFullYear() },
  })

  const submit = async (data: FormData) => {
    await onSubmit({
      patente: data.patente.toUpperCase(),
      marca: data.marca, modelo: data.modelo, anio: data.anio, color: data.color,
      kmActual: data.kmActual, kmServiceCada: data.kmServiceCada, kmUltimoService: data.kmUltimoService,
      seguro: {
        compania: data.seguroCompania,
        nroPoliza: data.seguroPoliza ?? '',
        monto: data.seguroMonto,
        vencimiento: Timestamp.fromDate(new Date(data.seguroVto + 'T12:00:00')),
      },
      patente_vto: Timestamp.fromDate(new Date(data.patenteVto + 'T12:00:00')),
      ...(data.vtvVto ? { vtv_vto: Timestamp.fromDate(new Date(data.vtvVto + 'T12:00:00')) } : {}),
      activo: true,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">{vehiculo ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos del vehículo</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Patente</label>
                <input {...register('patente')} className={cn(inputCls, 'uppercase')} placeholder="ABC123" />
                {errors.patente && <p className="text-red-500 text-xs mt-0.5">{errors.patente.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Año</label>
                <input {...register('anio')} type="number" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Marca</label>
                <input {...register('marca')} className={inputCls} placeholder="Ford" />
              </div>
              <div>
                <label className={labelCls}>Modelo</label>
                <input {...register('modelo')} className={inputCls} placeholder="Ranger" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <input {...register('color')} className={inputCls} placeholder="Blanco" />
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Kilometraje</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Actual</label>
                <input {...register('kmActual')} type="number" inputMode="numeric" className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Último service</label>
                <input {...register('kmUltimoService')} type="number" inputMode="numeric" className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Cada (km)</label>
                <input {...register('kmServiceCada')} type="number" inputMode="numeric" className={inputCls} placeholder="10000" />
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Seguro</p>
            <div>
              <label className={labelCls}>Compañía</label>
              <input {...register('seguroCompania')} className={inputCls} placeholder="Sancor, Zurich..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nro. póliza</label>
                <input {...register('seguroPoliza')} className={inputCls} placeholder="Opcional" />
              </div>
              <div>
                <label className={labelCls}>Monto/mes</label>
                <input {...register('seguroMonto')} type="number" inputMode="numeric" className={inputCls} placeholder="0" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Vencimiento seguro</label>
              <input {...register('seguroVto')} type="date" className={inputCls} />
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Vencimientos</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Patente</label>
                <input {...register('patenteVto')} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>VTV (opcional)</label>
                <input {...register('vtvVto')} type="date" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : vehiculo ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
