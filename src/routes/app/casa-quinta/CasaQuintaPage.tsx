import { useState } from 'react'
import { Plus, Home } from 'lucide-react'
import type { Reserva } from '@/types'
import { useReservas } from '@/hooks/useReservas'
import { useGastosQuinta } from '@/hooks/useGastosQuinta'
import { CalendarioQuinta } from './components/CalendarioQuinta'
import { ReservaCard } from './components/ReservaCard'
import { ReservaForm } from './components/ReservaForm'
import { ReservaDetalle } from './components/ReservaDetalle'
import { GastosQuinta } from './components/GastosQuinta'
import { SitioPublicoAdmin } from './components/SitioPublicoAdmin'
import { SolicitudesAdmin } from './components/SolicitudesAdmin'
import { PreciosQuinta } from './components/PreciosQuinta'
import { usePreReservas } from '@/hooks/usePreReservas'
import { cn } from '@/lib/cn'

type Tab = 'calendario' | 'reservas' | 'gastos' | 'precios' | 'sitio'

export function CasaQuintaPage() {
  const { reservas, loading, addReserva, updateReserva, deleteReserva, addPago, deletePago } = useReservas()
  const { gastos, addGasto, deleteGasto } = useGastosQuinta()
  const { preReservas, acceptPreReserva, rejectPreReserva } = usePreReservas()

  const [tab, setTab] = useState<Tab>('calendario')
  const [showForm, setShowForm] = useState(false)
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null)
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null)

  // Siempre derivado del array actualizado por onSnapshot — nunca stale
  const selectedReserva = selectedReservaId
    ? (reservas.find((r) => r.id === selectedReservaId) ?? null)
    : null

  const handleDayClick = (_date: Date, reserva?: Reserva) => {
    if (reserva) setSelectedReservaId(reserva.id)
  }

  const handleEdit = () => {
    setEditingReserva(selectedReserva)
    setSelectedReservaId(null)
  }

  const handleDelete = async () => {
    if (!selectedReserva) return
    await deleteReserva(selectedReserva.id)
    setSelectedReservaId(null)
  }

  const totalIngresos = reservas.reduce((s, r) => s + r.pagos.reduce((ps, p) => ps + p.monto, 0), 0)
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const reservasActivas = reservas.filter((r) => r.estado !== 'libre').length

  const solicitudesPendientes = preReservas.filter((p) => p.estado === 'pendiente').length

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'calendario', label: 'Calendario' },
    { key: 'reservas', label: 'Reservas', badge: solicitudesPendientes },
    { key: 'gastos', label: 'Gastos' },
    { key: 'precios', label: 'Precios' },
    { key: 'sitio', label: 'Sitio' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Home size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Casa Quinta</h1>
            <p className="text-xs text-slate-500">{reservasActivas} reservas activas</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition"
        >
          <Plus size={16} />
          Reserva
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Ingresos</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            ${(totalIngresos / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Gastos</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            ${(totalGastos / 1000).toFixed(0)}k
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Utilidad</p>
          <p className={cn('text-base font-bold mt-0.5', totalIngresos - totalGastos >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            ${((totalIngresos - totalGastos) / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Tabs — scrollable para caber en mobile */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all relative whitespace-nowrap',
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'calendario' && (
            <div className="space-y-4">
              <CalendarioQuinta reservas={reservas} onDayClick={handleDayClick} />
              {reservas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Próximas
                  </p>
                  <div className="space-y-2">
                    {reservas
                      .filter((r) => {
                        const hasta = r.fechaHasta instanceof Date ? r.fechaHasta : r.fechaHasta.toDate()
                        return hasta >= new Date()
                      })
                      .slice(0, 3)
                      .map((r) => (
                        <ReservaCard key={r.id} reserva={r} onClick={() => setSelectedReservaId(r.id)} />
                      ))}
                  </div>
                </div>
              )}
              {reservas.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Sin reservas. Tocá + Reserva para crear una.
                </div>
              )}
            </div>
          )}

          {tab === 'reservas' && (
            <div className="space-y-4">
              {/* Solicitudes */}
              {preReservas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Solicitudes
                  </p>
                  <SolicitudesAdmin
                    preReservas={preReservas}
                    onAccept={(pr, montoTotal, seña) => acceptPreReserva(pr, montoTotal, seña)}
                    onReject={rejectPreReserva}
                  />
                </div>
              )}

              {/* Reservas */}
              {preReservas.length > 0 && reservas.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reservas confirmadas
                </p>
              )}
              {reservas.length === 0 && preReservas.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">Sin reservas ni solicitudes</div>
              )}
              <div className="space-y-2">
                {reservas.map((r) => (
                  <ReservaCard key={r.id} reserva={r} onClick={() => setSelectedReservaId(r.id)} />
                ))}
              </div>
            </div>
          )}

          {tab === 'gastos' && (
            <GastosQuinta gastos={gastos} onAdd={addGasto} onDelete={deleteGasto} />
          )}

          {tab === 'precios' && <PreciosQuinta />}

          {tab === 'sitio' && <SitioPublicoAdmin />}
        </>
      )}

      {/* Modales */}
      {(showForm || editingReserva) && (
        <ReservaForm
          reserva={editingReserva ?? undefined}
          onSubmit={editingReserva
            ? (data) => updateReserva(editingReserva.id, data)
            : addReserva
          }
          onClose={() => { setShowForm(false); setEditingReserva(null) }}
        />
      )}

      {selectedReserva && (
        <ReservaDetalle
          reserva={selectedReserva}
          onClose={() => setSelectedReservaId(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddPago={(pago) => addPago(selectedReserva.id, selectedReserva, pago)}
          onDeletePago={(pagoId) => deletePago(selectedReserva.id, selectedReserva, pagoId)}
        />
      )}
    </div>
  )
}
