import { useState, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, Trash2, ExternalLink, Plus, X, GripVertical, Loader2 } from 'lucide-react'
import { useQuintaConfig } from '@/hooks/useQuintaConfig'
import type { QuintaFoto } from '@/types'
import { cn } from '@/lib/cn'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().min(1, 'Requerido'),
  contactoEmail: z.string().email('Email inválido'),
  whatsapp: z.string().optional(),
  ubicacion: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition'

export function SitioPublicoAdmin() {
  const { config, loading, saveConfig, uploadFoto, deleteFoto } = useQuintaConfig()
  const [nuevoAmenity, setNuevoAmenity] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    values: {
      nombre: config.nombre,
      descripcion: config.descripcion,
      contactoEmail: config.contactoEmail,
      whatsapp: config.whatsapp ?? '',
      ubicacion: config.ubicacion ?? '',
    },
  })

  const submit = async (data: FormData) => {
    await saveConfig(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddAmenity = () => {
    const val = nuevoAmenity.trim()
    if (!val || config.amenities.includes(val)) return
    saveConfig({ amenities: [...config.amenities, val] })
    setNuevoAmenity('')
  }

  const handleRemoveAmenity = (a: string) => {
    saveConfig({ amenities: config.amenities.filter((x) => x !== a) })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      await uploadFoto(file, (pct) => setUploadPct(pct))
    }
    setUploading(false)
    setUploadPct(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteFoto = async (foto: QuintaFoto) => {
    if (!confirm('¿Eliminar esta foto?')) return
    await deleteFoto(foto)
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" /></div>

  const urlPublico = 'https://quinta-rivas.web.app'

  return (
    <div className="space-y-6">
      {/* Link al sitio */}
      <a
        href={urlPublico}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-slate-900 rounded-2xl px-4 py-3 text-white hover:bg-slate-800 transition"
      >
        <div>
          <p className="text-sm font-medium">Ver sitio público</p>
          <p className="text-xs text-slate-400">quinta-rivas.web.app</p>
        </div>
        <ExternalLink size={16} className="text-slate-400" />
      </a>

      {/* Datos principales */}
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Información del sitio</p>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Nombre de la quinta</label>
          <input {...register('nombre')} className={inputCls} placeholder="Ej: La Quinta de los Rivas" />
          {errors.nombre && <p className="text-red-500 text-xs mt-0.5">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
          <textarea {...register('descripcion')} rows={4} className={cn(inputCls, 'resize-none')}
            placeholder="Contá algo sobre la quinta, su ambiente, qué la hace especial..." />
          {errors.descripcion && <p className="text-red-500 text-xs mt-0.5">{errors.descripcion.message}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Ubicación</label>
          <input {...register('ubicacion')} className={inputCls} placeholder="Ej: Exaltación de la Cruz, Buenos Aires" />
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">Contacto</p>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Email de contacto</label>
          <input {...register('contactoEmail')} type="email" className={inputCls} placeholder="walter@email.com" />
          {errors.contactoEmail && <p className="text-red-500 text-xs mt-0.5">{errors.contactoEmail.message}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">WhatsApp (con código de país)</label>
          <input {...register('whatsapp')} className={inputCls} placeholder="5491112345678" />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-medium transition',
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
          )}
        >
          {saved ? '✓ Guardado' : isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* Amenities */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amenities</p>
        <div className="flex gap-2">
          <input
            value={nuevoAmenity}
            onChange={(e) => setNuevoAmenity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
            className={cn(inputCls, 'flex-1')}
            placeholder="Ej: Pileta, Quincho, Wi-Fi..."
          />
          <button onClick={handleAddAmenity}
            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition flex-shrink-0">
            <Plus size={16} />
          </button>
        </div>

        {config.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.amenities.map((a) => (
              <span key={a} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-full">
                {a}
                <button onClick={() => handleRemoveAmenity(a)} className="text-slate-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fotos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fotos</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="text-red-400 animate-spin" />
              <p className="text-xs text-slate-500">Subiendo... {uploadPct}%</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-400" />
              <p className="text-xs text-slate-500">Tocá para agregar fotos</p>
              <p className="text-xs text-slate-400">JPG, PNG · Podés seleccionar varias</p>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {config.fotos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {config.fotos.map((foto) => (
              <div key={foto.path} className="relative rounded-xl overflow-hidden aspect-video bg-slate-100 group">
                <img src={foto.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleDeleteFoto(foto)}
                    className="bg-red-500 text-white p-2 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="absolute top-1.5 left-1.5 bg-black/40 rounded-md p-1">
                  <GripVertical size={12} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
