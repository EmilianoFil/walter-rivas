import { useState } from 'react'
import { Building2, AlertCircle, Plus } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Unidad, PagoAlquiler } from '@/types'
import { useUnidades } from '@/hooks/useUnidades'
import { usePagosAlquiler, useGastosUnidad } from '@/hooks/usePagosAlquiler'
import { UnidadCard } from './components/UnidadCard'
import { UnidadDetalle } from './components/UnidadDetalle'
import { UnidadForm } from './components/UnidadForm'
import { RecurrentesSection } from '@/components/RecurrentesSection'
import { SkPage } from '@/components/Skeleton'

function formatMoney(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

// Sub-component that holds the hooks per-unidad to keep things simple
function UnidadDetalleWrapper({
  unidad,
  onClose,
  onUpdateInquilino,
  onDelete,
}: {
  unidad: Unidad
  onClose: () => void
  onUpdateInquilino: (data: Unidad['inquilino']) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const { pagos, addPago, markPagado, deletePago } = usePagosAlquiler(unidad.id)
  const { gastos, addGasto, updateGasto, deleteGasto } = useGastosUnidad(unidad.id)

  return (
    <UnidadDetalle
      unidad={unidad}
      pagos={pagos}
      gastos={gastos}
      onClose={onClose}
      onUpdateInquilino={onUpdateInquilino}
      onDelete={onDelete}
      onAddPago={addPago}
      onMarkPagado={(id) => markPagado(id, new Date())}
      onDeletePago={deletePago}
      onAddGasto={addGasto}
      onUpdateGasto={updateGasto}
      onDeleteGasto={deleteGasto}
    />
  )
}

export function DepartamentosPage() {
  const { unidades, loading, addUnidad, updateUnidad, deleteUnidad } = useUnidades()
  const { pagos: todosPagos } = usePagosAlquiler()
  const [selectedUnidadId, setSelectedUnidadId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const selectedUnidad = selectedUnidadId ? (unidades.find((u) => u.id === selectedUnidadId) ?? null) : null

  // Helper: último pago de una unidad
  const ultimoPago = (unidadId: string): PagoAlquiler | undefined =>
    todosPagos
      .filter((p) => p.unidadId === unidadId)
      .sort((a, b) => toDate(b.vencimiento).getTime() - toDate(a.vencimiento).getTime())[0]

  const pagosPendientes = (unidadId: string) =>
    todosPagos.filter((p) => p.unidadId === unidadId && p.estado !== 'pagado').length

  // Alertas de vencimientos próximos (7 días)
  const alertas = todosPagos.filter((p) => {
    if (p.estado === 'pagado') return false
    const dias = Math.round((toDate(p.vencimiento).getTime() - Date.now()) / 86400000)
    return dias <= 7
  })

  // KPIs
  const totalCobrado = todosPagos
    .filter((p) => p.estado === 'pagado')
    .reduce((s, p) => s + p.monto, 0)
  const totalPendiente = todosPagos
    .filter((p) => p.estado !== 'pagado')
    .reduce((s, p) => s + p.monto, 0)
  const unidadesOcupadas = unidades.filter((u) => u.inquilino).length

  if (loading) return <SkPage rows={3} />

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Deptos y Local</h1>
            <p className="text-xs text-slate-500">
              {unidadesOcupadas} de {unidades.length} unidades ocupadas
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition"
        >
          <Plus size={16} />
          Nueva
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Cobrado</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            ${(totalCobrado / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Pendiente</p>
          <p className="text-base font-bold text-red-500 mt-0.5">
            ${(totalPendiente / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Unidades</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {unidadesOcupadas}/{unidades.length}
          </p>
        </div>
      </div>

      {/* Alertas de vencimiento */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Vencimientos próximos
          </p>
          {alertas.map((p) => {
            const dias = Math.round((toDate(p.vencimiento).getTime() - Date.now()) / 86400000)
            const unidad = unidades.find((u) => u.id === p.unidadId)
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
              >
                <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {unidad?.nombre} · {p.periodo}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dias < 0 ? `Venció hace ${Math.abs(dias)} días` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`}
                    {' · '}{formatMoney(p.monto)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recurrentes */}
      <RecurrentesSection vertical="deptos" />

      {/* Lista de unidades */}
      {unidades.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm mb-3">Sin unidades. Creá la primera con el botón +</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unidades.map((u) => (
            <UnidadCard
              key={u.id}
              unidad={u}
              ultimoPago={ultimoPago(u.id)}
              pagosPendientes={pagosPendientes(u.id)}
              onClick={() => setSelectedUnidadId(u.id)}
            />
          ))}
        </div>
      )}

    </div>

    {/* Modales — fuera del space-y-5 para que no reciban margin-top */}
    {selectedUnidad && (
      <UnidadDetalleWrapper
        unidad={selectedUnidad}
        onClose={() => setSelectedUnidadId(null)}
        onUpdateInquilino={(data) => updateUnidad(selectedUnidad.id, { inquilino: data })}
        onDelete={async () => {
          await deleteUnidad(selectedUnidad.id)
          setSelectedUnidadId(null)
        }}
      />
    )}

    {showForm && (
      <UnidadForm
        onSubmit={(data) => addUnidad({ ...data, inquilino: null, activo: true })}
        onClose={() => setShowForm(false)}
      />
    )}
    </>
  )
}
