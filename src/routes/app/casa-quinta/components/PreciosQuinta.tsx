import { useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { usePreciosQuinta, formatPrecio } from '@/hooks/usePreciosQuinta'

export function PreciosQuinta() {
  const { precios, addPrecio, deletePrecio } = usePreciosQuinta()

  const [nombre, setNombre] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [precio, setPrecio] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!nombre.trim() || !desde || !hasta || !precio) return
    if (hasta < desde) return
    setSaving(true)
    await addPrecio({
      nombre: nombre.trim(),
      desde: Timestamp.fromDate(new Date(desde + 'T12:00:00')),
      hasta: Timestamp.fromDate(new Date(hasta + 'T12:00:00')),
      precio: Number(precio),
    })
    setNombre(''); setDesde(''); setHasta(''); setPrecio('')
    setSaving(false)
  }

  const fmt = (t: Timestamp) =>
    t.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

  return (
    <div className="space-y-4">
      {/* Formulario para agregar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nuevo período de precio</p>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Nombre del período</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputCls}
            placeholder="Ej: Temporada alta, Fin de semana largo..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Precio por noche ($)</label>
          <input
            type="number"
            inputMode="numeric"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={saving || !nombre || !desde || !hasta || !precio}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium transition"
        >
          <Plus size={15} />
          {saving ? 'Guardando...' : 'Agregar período'}
        </button>
      </div>

      {/* Lista de precios */}
      {precios.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          Sin precios configurados. Los días sin precio muestran "Consultar".
        </div>
      ) : (
        <div className="space-y-2">
          {precios.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Tag size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                <p className="text-xs text-slate-400">
                  {fmt(p.desde)} → {fmt(p.hasta)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-800">{formatPrecio(p.precio)}</p>
                <p className="text-[10px] text-slate-400">por noche</p>
              </div>
              <button
                onClick={() => confirm(`¿Eliminar "${p.nombre}"?`) && deletePrecio(p.id)}
                className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
