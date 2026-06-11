import { useState } from 'react'
import { HardHat, Plus } from 'lucide-react'
import type { Obra } from '@/types'
import { useObras } from '@/hooks/useObras'
import { ObraCard } from './components/ObraCard'
import { ObraForm } from './components/ObraForm'
import { SkPage } from '@/components/Skeleton'
import { ObraDetalle } from './components/ObraDetalle'
import { cn } from '@/lib/cn'
import { ConfirmSheet } from '@/components/ConfirmSheet'

type Filtro = 'todas' | 'activa' | 'pausada' | 'finalizada'

export function ObrasPage() {
  const { obras, loading, addObra, updateObra, deleteObra, addCobro, updateCobro, deleteCobro, addGasto, updateGasto, deleteGasto } = useObras()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState<Obra | null>(null)

  const selected = selectedId ? (obras.find((o) => o.id === selectedId) ?? null) : null

  const filtradas = filtro === 'todas' ? obras : obras.filter((o) => o.estado === filtro)

  const totalPresupuestado = obras.filter(o => o.estado === 'activa').reduce((s, o) => s + o.presupuesto, 0)
  const totalCobrado = obras.reduce((s, o) => s + o.cobros.reduce((cs, c) => cs + c.monto, 0), 0)
  const totalPorCobrar = obras
    .filter(o => o.estado === 'activa')
    .reduce((s, o) => {
      const cobrado = o.cobros.reduce((cs, c) => cs + c.monto, 0)
      return s + Math.max(0, o.presupuesto - cobrado)
    }, 0)

  const handleDelete = async () => {
    if (!selected) return
    await deleteObra(selected.id)
    setSelectedId(null)
    setConfirmDelete(false)
  }

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'activa', label: 'Activas' },
    { key: 'pausada', label: 'Pausadas' },
    { key: 'finalizada', label: 'Finalizadas' },
  ]

  if (loading) return <SkPage rows={3} kpis={false} />

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Obras</h1>
            <p className="text-xs text-slate-500">
              {obras.filter(o => o.estado === 'activa').length} activas
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition"
        >
          <Plus size={16} />
          Nueva obra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Presupuestado</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            ${(totalPresupuestado / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Cobrado</p>
          <p className="text-base font-bold text-emerald-600 mt-0.5">
            ${(totalCobrado / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Por cobrar</p>
          <p className={cn('text-base font-bold mt-0.5', totalPorCobrar > 0 ? 'text-red-500' : 'text-slate-900')}>
            ${(totalPorCobrar / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              filtro === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {filtro === 'todas' ? 'Sin obras. Tocá + Nueva obra para empezar.' : `Sin obras ${filtro}s`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((o) => (
            <ObraCard key={o.id} obra={o} onClick={() => setSelectedId(o.id)} />
          ))}
        </div>
      )}

    </div>

    {/* Modales — fuera del space-y-5 para que no reciban margin-top */}
    {(showForm || editing) && (
      <ObraForm
        obra={editing ?? undefined}
        onSubmit={editing
          ? (data) => updateObra(editing.id, data)
          : addObra
        }
        onClose={() => { setShowForm(false); setEditing(null) }}
      />
    )}

    {selected && (
      <ObraDetalle
        obra={selected}
        onClose={() => setSelectedId(null)}
        onEdit={() => { setEditing(selected); setSelectedId(null) }}
        onDelete={() => setConfirmDelete(true)}
        onAddCobro={(c) => addCobro(selected!, c)}
        onUpdateCobro={(id, data) => updateCobro(selected!, id, data)}
        onDeleteCobro={(id) => deleteCobro(selected!, id)}
        onAddGasto={(g) => addGasto(selected!, g)}
        onUpdateGasto={(id, data) => updateGasto(selected!, id, data)}
        onDeleteGasto={(id) => deleteGasto(selected!, id)}
      />
    )}

    <ConfirmSheet
      open={confirmDelete}
      title={`¿Eliminar "${selected?.nombre}"?`}
      subtitle="Se borrarán todos sus datos."
      confirmLabel="Eliminar obra"
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  )
}
