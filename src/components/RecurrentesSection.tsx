import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react'
import { useRecurrentes } from '@/hooks/useRecurrentes'
import { useCategorias } from '@/hooks/useCategorias'
import type { Recurrente, VerticalRecurrente, VerticalCategoria } from '@/types'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white'

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Modal confirmación con montos editables ───────────────────────────────────
function ConfirmModal({ items, mesLabel, onConfirm, onCancel }: {
  items: Recurrente[]
  mesLabel: string
  onConfirm: (items: Recurrente[]) => Promise<void>
  onCancel: () => void
}) {
  const [editados, setEditados] = useState<Recurrente[]>(items.map((r) => ({ ...r })))
  const [saving, setSaving] = useState(false)

  const setMonto = (id: string, val: string) => {
    const n = parseFloat(val)
    setEditados((prev) => prev.map((r) => r.id === id ? { ...r, monto: isNaN(n) ? 0 : n } : r))
  }

  const total = editados.reduce((s, r) => s + r.monto, 0)

  const handleConfirm = async () => {
    setSaving(true)
    try { await onConfirm(editados) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw size={16} className="text-slate-600" />
            <h2 className="font-semibold text-slate-900">Registrar {mesLabel}</h2>
          </div>
          <p className="text-sm text-slate-500">Ajustá los montos si es necesario. Solo afecta este registro.</p>
        </div>

        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
          {editados.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${r.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {r.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </span>
                  <p className="text-sm font-medium text-slate-800 truncate">{r.nombre}</p>
                </div>
                {r.categoria && <p className="text-xs text-slate-400 mt-0.5">{r.categoria}</p>}
              </div>
              <div className="relative flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number" inputMode="numeric"
                  value={r.monto}
                  onChange={(e) => setMonto(r.id, e.target.value)}
                  className="w-32 pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">Total</span>
          <span className="text-base font-bold text-slate-900">{formatMoney(total)}</span>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={saving || total <= 0}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition disabled:opacity-40">
            {saving ? 'Registrando...' : `Confirmar ${editados.length} movimiento${editados.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
  vertical: VerticalRecurrente
}

export function RecurrentesSection({ vertical }: Props) {
  const { recurrentes, mesesRegistrados, loading, totalMensual, addRecurrente, updateRecurrente, deleteRecurrente, registrarMes } = useRecurrentes(vertical)
  const { categorias } = useCategorias(vertical as VerticalCategoria)

  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // Form nuevo
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso')
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('')

  // Edición inline
  const [editTipo, setEditTipo] = useState<'ingreso' | 'egreso'>('egreso')
  const [editNombre, setEditNombre] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editCategoria, setEditCategoria] = useState('')

  const now = new Date()
  const mesActual = now.getMonth()
  const añoActual = now.getFullYear()
  const mesLabel = `${MESES[mesActual]} ${añoActual}`
  const yaRegistrado = mesesRegistrados.some((m) => m.mes === mesActual && m.año === añoActual)

  const resetForm = () => { setNombre(''); setMonto(''); setCategoria(''); setTipo('egreso'); setShowForm(false) }

  const handleAdd = async () => {
    const m = parseFloat(monto)
    if (!nombre.trim() || isNaN(m) || m <= 0) return
    setSaving(true)
    try {
      await addRecurrente({ tipo, nombre: nombre.trim(), monto: m, categoria: categoria || undefined })
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r: Recurrente) => {
    setEditingId(r.id)
    setEditTipo(r.tipo)
    setEditNombre(r.nombre)
    setEditMonto(String(r.monto))
    setEditCategoria(r.categoria ?? '')
  }

  const handleSaveEdit = async (id: string) => {
    const m = parseFloat(editMonto)
    if (!editNombre.trim() || isNaN(m) || m <= 0) return
    setSaving(true)
    try {
      await updateRecurrente(id, { tipo: editTipo, nombre: editNombre.trim(), monto: m, categoria: editCategoria || undefined })
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmRegistro = async (items: Recurrente[]) => {
    setFeedback(null)
    const ok = await registrarMes(items, añoActual, mesActual)
    setShowConfirm(false)
    if (ok) {
      setFeedback({ ok: true, msg: `✓ ${items.length} movimiento${items.length !== 1 ? 's' : ''} registrado${items.length !== 1 ? 's' : ''} para ${mesLabel}.` })
    } else {
      setFeedback({ ok: false, msg: `${mesLabel} ya fue registrado.` })
    }
  }

  const todasCategorias = categorias.filter((c) => c.tipo !== 'ingreso' || tipo === 'ingreso')

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          items={recurrentes}
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
            <RefreshCw size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Recurrentes</span>
            {recurrentes.length > 0 && (
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nuevo recurrente</p>

                {/* Tipo toggle */}
                <div className="flex gap-2">
                  {(['egreso', 'ingreso'] as const).map((t) => (
                    <button key={t} onClick={() => setTipo(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tipo === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                      {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-slate-500">Concepto</label>
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Limpieza, Seguro, Expensas..." className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Monto mensual</label>
                    <input value={monto} onChange={(e) => setMonto(e.target.value)}
                      type="number" inputMode="numeric" placeholder="0" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Categoría</label>
                    <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
                      <option value="">Sin categoría</option>
                      {todasCategorias.map((c) => (
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
            ) : recurrentes.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-4 text-center">
                Sin recurrentes. Agregá gastos o ingresos que se repiten cada mes.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {recurrentes.map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    {editingId === r.id ? (
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <select value={editTipo} onChange={(e) => setEditTipo(e.target.value as 'ingreso' | 'egreso')}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                          <option value="egreso">Egreso</option>
                          <option value="ingreso">Ingreso</option>
                        </select>
                        <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                          className="flex-1 min-w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <input value={editMonto} onChange={(e) => setEditMonto(e.target.value)} type="number"
                          className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <button onClick={() => handleSaveEdit(r.id)} disabled={saving}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-40"><Check size={15} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={15} /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${r.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                              {r.tipo === 'ingreso' ? '↑' : '↓'}
                            </span>
                            <p className="text-sm text-slate-800 truncate">{r.nombre}</p>
                          </div>
                          {r.categoria && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">{r.categoria}</span>
                          )}
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${r.tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {formatMoney(r.monto)}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => openEdit(r)} className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => deleteRecurrente(r.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            {recurrentes.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
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
                  <RefreshCw size={14} />
                  {yaRegistrado ? `${MESES[mesActual]} registrado` : `Registrar ${mesLabel}`}
                </button>
              </div>
            )}

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
