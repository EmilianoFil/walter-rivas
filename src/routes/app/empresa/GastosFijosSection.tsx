import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, CalendarCheck, AlertCircle } from 'lucide-react'
import { useEmpresaGastosFijos } from '@/hooks/useEmpresaGastosFijos'
import { useCategorias } from '@/hooks/useCategorias'
import type { GastoFijo } from '@/types'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white'

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Props {
  onRegistrar: (gastosFijos: GastoFijo[], año: number, mes: number) => Promise<boolean>
  mesesRegistrados: { año: number; mes: number }[]
}

// ── Modal de confirmación con montos editables ────────────────────────────────
interface ConfirmRegistroProps {
  gastos: GastoFijo[]
  mesLabel: string
  onConfirm: (gastos: GastoFijo[]) => Promise<void>
  onCancel: () => void
}

function ConfirmRegistroModal({ gastos, mesLabel, onConfirm, onCancel }: ConfirmRegistroProps) {
  // Copia local con montos editables (no modifica las plantillas)
  const [items, setItems] = useState<GastoFijo[]>(gastos.map((g) => ({ ...g })))
  const [saving, setSaving] = useState(false)

  const setMonto = (id: string, val: string) => {
    const n = parseFloat(val)
    setItems((prev) => prev.map((g) => g.id === id ? { ...g, monto: isNaN(n) ? 0 : n } : g))
  }

  const total = items.reduce((s, g) => s + g.monto, 0)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onConfirm(items)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck size={18} className="text-slate-600" />
            <h2 className="font-semibold text-slate-900">Registrar {mesLabel}</h2>
          </div>
          <p className="text-sm text-slate-500">
            Revisá y ajustá los montos de este mes si es necesario. Los cambios aplican solo a este registro, no modifican las plantillas.
          </p>
        </div>

        {/* Lista con montos editables */}
        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
          {items.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{g.nombre}</p>
                {g.categoria && (
                  <span className="text-xs text-slate-400">{g.categoria}</span>
                )}
              </div>
              <div className="relative flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={g.monto}
                  onChange={(e) => setMonto(g.id, e.target.value)}
                  className="w-32 pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">Total a registrar</span>
          <span className="text-base font-bold text-slate-900">{formatMoney(total)}</span>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || total <= 0}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition disabled:opacity-40"
          >
            {saving ? 'Registrando...' : `Confirmar ${items.length} egreso${items.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function GastosFijosSection({ onRegistrar, mesesRegistrados }: Props) {
  const { gastosFijos, loading, totalMensual, addGastoFijo, updateGastoFijo, deleteGastoFijo } = useEmpresaGastosFijos()
  const { categorias } = useCategorias('empresa')

  const [expanded, setExpanded] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // Form nuevo
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('')

  // Edición inline
  const [editNombre, setEditNombre] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editCategoria, setEditCategoria] = useState('')

  const now = new Date()
  const mesActual = now.getMonth()
  const añoActual = now.getFullYear()
  const mesLabel = `${MESES[mesActual]} ${añoActual}`

  const yaRegistrado = mesesRegistrados.some((m) => m.mes === mesActual && m.año === añoActual)

  const resetForm = () => { setNombre(''); setMonto(''); setCategoria(''); setShowForm(false) }

  const handleAdd = async () => {
    const m = parseFloat(monto)
    if (!nombre.trim() || isNaN(m) || m <= 0) return
    setSaving(true)
    try {
      await addGastoFijo({ nombre: nombre.trim(), monto: m, categoria: categoria || undefined })
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (g: GastoFijo) => {
    setEditingId(g.id)
    setEditNombre(g.nombre)
    setEditMonto(String(g.monto))
    setEditCategoria(g.categoria ?? '')
  }

  const handleSaveEdit = async (id: string) => {
    const m = parseFloat(editMonto)
    if (!editNombre.trim() || isNaN(m) || m <= 0) return
    setSaving(true)
    try {
      await updateGastoFijo(id, { nombre: editNombre.trim(), monto: m, categoria: editCategoria || undefined })
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  // Recibe los gastos (posiblemente con montos ajustados) y los registra
  const handleConfirmRegistro = async (gastosAjustados: GastoFijo[]) => {
    setFeedback(null)
    const ok = await onRegistrar(gastosAjustados, añoActual, mesActual)
    setShowConfirm(false)
    if (ok) {
      setFeedback({ ok: true, msg: `✓ ${gastosAjustados.length} egreso${gastosAjustados.length !== 1 ? 's' : ''} registrado${gastosAjustados.length !== 1 ? 's' : ''} para ${mesLabel}.` })
    } else {
      setFeedback({ ok: false, msg: `${mesLabel} ya fue registrado.` })
    }
  }

  const egresosCategoria = categorias.filter((c) => c.tipo === 'egreso' || c.tipo === 'ambos')

  return (
    <>
      {showConfirm && (
        <ConfirmRegistroModal
          gastos={gastosFijos}
          mesLabel={mesLabel}
          onConfirm={handleConfirmRegistro}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Gastos fijos</span>
            {totalMensual > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {formatMoney(totalMensual)}/mes
              </span>
            )}
            {yaRegistrado && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check size={10} /> {MESES[mesActual]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowForm((v) => !v); setExpanded(true) }}
              className="text-red-500 hover:text-red-700 transition"
            >
              <Plus size={16} />
            </button>
            {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-slate-100">
            {/* Form nuevo */}
            {showForm && (
              <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo gasto fijo</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-500">Concepto</label>
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Sueldos, Alquiler oficina..." className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Monto mensual</label>
                    <input value={monto} onChange={(e) => setMonto(e.target.value)} type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Categoría</label>
                    <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
                      <option value="">Sin categoría</option>
                      {egresosCategoria.map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={saving || !nombre.trim() || !monto}
                    className="flex-1 bg-slate-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
                    {saving ? 'Guardando...' : 'Agregar'}
                  </button>
                  <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                </div>
              </div>
            )}

            {/* Lista */}
            {loading ? (
              <p className="text-sm text-slate-400 px-4 py-3">Cargando...</p>
            ) : gastosFijos.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-4 text-center">
                Sin gastos fijos. Agregá sueldos, alquileres, servicios...
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {gastosFijos.map((g) => (
                  <div key={g.id} className="px-4 py-3 flex items-center gap-3">
                    {editingId === g.id ? (
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                          className="flex-1 min-w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <input value={editMonto} onChange={(e) => setEditMonto(e.target.value)} type="number"
                          className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <select value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                          <option value="">—</option>
                          {egresosCategoria.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                        <button onClick={() => handleSaveEdit(g.id)} disabled={saving}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-40">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">{g.nombre}</p>
                          {g.categoria && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{g.categoria}</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{formatMoney(g.monto)}</span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => openEdit(g)} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => deleteGastoFijo(g.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer: total + botón registrar */}
            {gastosFijos.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Total mensual estimado</p>
                    <p className="text-base font-bold text-slate-800">{formatMoney(totalMensual)}</p>
                  </div>
                  <button
                    onClick={() => !yaRegistrado && setShowConfirm(true)}
                    disabled={yaRegistrado}
                    className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition ${
                      yaRegistrado
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    <CalendarCheck size={15} />
                    {yaRegistrado ? `${MESES[mesActual]} registrado` : `Registrar ${mesLabel}`}
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`mx-4 mb-3 mt-1 flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {!feedback.ok && <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
                {feedback.msg}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
