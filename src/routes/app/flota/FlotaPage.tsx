import { useState } from 'react'
import { Car, Plus, AlertCircle } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Vehiculo } from '@/types'
import { useFlota } from '@/hooks/useFlota'
import { VehiculoCard } from './components/VehiculoCard'
import { VehiculoForm } from './components/VehiculoForm'
import { VehiculoDetalle } from './components/VehiculoDetalle'
import { ConfirmSheet } from '@/components/ConfirmSheet'

function diasHasta(t: Timestamp | Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = t instanceof Date ? t : t.toDate(); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

export function FlotaPage() {
  const { vehiculos, loading, addVehiculo, updateVehiculo, deleteVehiculo, updateKm } = useFlota()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Vehiculo | null>(null)
  const [editing, setEditing] = useState<Vehiculo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    if (!selected) return
    await deleteVehiculo(selected.id)
    setSelected(null)
    setConfirmDelete(false)
  }

  // Alertas globales de flota (vencimientos en 30 días)
  const alertasFlota = vehiculos.flatMap((v) => {
    const items: { texto: string; vehiculo: string }[] = []
    if (diasHasta(v.seguro.vencimiento) <= 30) items.push({ texto: 'Seguro por vencer', vehiculo: `${v.marca} ${v.modelo}` })
    if (diasHasta(v.patente_vto) <= 30) items.push({ texto: 'Patente por vencer', vehiculo: `${v.marca} ${v.modelo}` })
    if (v.vtv_vto && diasHasta(v.vtv_vto) <= 30) items.push({ texto: 'VTV por vencer', vehiculo: `${v.marca} ${v.modelo}` })
    const kmService = Math.max(0, v.kmUltimoService + v.kmServiceCada - v.kmActual)
    if (kmService <= 2000) items.push({ texto: `Service en ${kmService.toLocaleString('es-AR')} km`, vehiculo: `${v.marca} ${v.modelo}` })
    return items
  })

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center">
            <Car size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Flota</h1>
            <p className="text-xs text-slate-500">{vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition">
          <Plus size={16} /> Vehículo
        </button>
      </div>

      {/* Alertas de flota */}
      {alertasFlota.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requiere atención</p>
          {alertasFlota.map((a, i) => (
            <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{a.texto}</p>
                <p className="text-xs text-slate-500">{a.vehiculo}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {vehiculos.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Sin vehículos. Tocá + Vehículo para agregar el primero.
        </div>
      ) : (
        <div className="space-y-3">
          {vehiculos.map((v) => (
            <VehiculoCard key={v.id} vehiculo={v} onClick={() => setSelected(v)} />
          ))}
        </div>
      )}

      {/* Modales */}
      {(showForm || editing) && (
        <VehiculoForm
          vehiculo={editing ?? undefined}
          onSubmit={editing ? (data) => updateVehiculo(editing.id, data) : addVehiculo}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {selected && (
        <VehiculoDetalle
          vehiculo={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDelete={() => setConfirmDelete(true)}
          onUpdateKm={(km) => updateKm(selected, km)}
        />
      )}
      <ConfirmSheet
        open={confirmDelete}
        title={selected ? `¿Eliminar ${selected.marca} ${selected.modelo}?` : ''}
        confirmLabel="Eliminar vehículo"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
