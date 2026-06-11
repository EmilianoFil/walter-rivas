import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Tag, Save } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { usePreciosQuinta, usePrecioBase, formatPrecio } from '@/hooks/usePreciosQuinta'
import type { PrecioBase, PrecioQuinta } from '@/types'
import { ConfirmSheet } from '@/components/ConfirmSheet'

const DIAS: { key: keyof PrecioBase; label: string }[] = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
]

export function PreciosQuinta() {
  const { precios, addPrecio, deletePrecio } = usePreciosQuinta()
  const { precioBase, savePrecioBase } = usePrecioBase()

  // ── Precio base ─────────────────────────────────────────────────────────
  const [baseForm, setBaseForm] = useState<Record<string, string>>({})
  const [savingBase, setSavingBase] = useState(false)
  const baseInitialized = useRef(false)

  useEffect(() => {
    if (!baseInitialized.current && precioBase !== null) {
      baseInitialized.current = true
      const init: Record<string, string> = {}
      DIAS.forEach(({ key }) => {
        const v = precioBase[key]
        init[key] = v !== undefined ? String(v) : ''
      })
      setBaseForm(init)
    }
  }, [precioBase])

  const handleSaveBase = async () => {
    setSavingBase(true)
    const data: PrecioBase = {}
    DIAS.forEach(({ key }) => {
      const val = Number(baseForm[key])
      if (baseForm[key] !== '' && !isNaN(val) && val > 0) {
        data[key] = val
      }
    })
    await savePrecioBase(data)
    setSavingBase(false)
  }

  // ── Período especial ─────────────────────────────────────────────────────
  const [nombre, setNombre] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [precio, setPrecio] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<PrecioQuinta | null>(null)

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

      {/* ── Precio base por día ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Precio base por día</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Se aplica cuando no hay período especial. Vacío = "Consultar".</p>
        </div>

        <div className="space-y-2">
          {DIAS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-24 flex-shrink-0">{label}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={baseForm[key] ?? ''}
                  onChange={(e) => setBaseForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="–"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveBase}
          disabled={savingBase}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium transition"
        >
          <Save size={14} />
          {savingBase ? 'Guardando...' : 'Guardar precios base'}
        </button>
      </div>

      {/* ── Nuevo período especial ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Período especial</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Reemplaza el precio base en ese rango de fechas.</p>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1 block">Nombre</label>
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
          <label className="text-xs text-slate-500 mb-1 block">Precio por día ($)</label>
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
          {saving ? 'Guardando...' : 'Agregar período especial'}
        </button>
      </div>

      {/* ── Lista de períodos especiales ── */}
      {precios.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Períodos activos</p>
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
                <p className="text-[10px] text-slate-400">por día</p>
              </div>
              <button
                onClick={() => setConfirmDelete(p)}
                className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmSheet
        open={!!confirmDelete}
        title={`¿Eliminar "${confirmDelete?.nombre}"?`}
        confirmLabel="Eliminar período"
        onConfirm={() => { if (confirmDelete) deletePrecio(confirmDelete.id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
