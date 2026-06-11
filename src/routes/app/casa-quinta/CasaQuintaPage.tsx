import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Reserva } from '@/types'
import { useReservas } from '@/hooks/useReservas'
import { useGastosQuinta } from '@/hooks/useGastosQuinta'
import { CalendarioQuinta } from './components/CalendarioQuinta'
import { ReservaCard } from './components/ReservaCard'
import { ReservaForm } from './components/ReservaForm'
import { ReservaDetalle } from './components/ReservaDetalle'
import { GastosQuinta } from './components/GastosQuinta'
import { RecurrentesSection } from '@/components/RecurrentesSection'
import { SkRow } from '@/components/Skeleton'
import { SitioPublicoAdmin } from './components/SitioPublicoAdmin'
import { SolicitudesAdmin } from './components/SolicitudesAdmin'
import { PreciosQuinta } from './components/PreciosQuinta'
import { usePreReservas } from '@/hooks/usePreReservas'
import { useResenas } from '@/hooks/useResenas'
import { useQuintaConfig } from '@/hooks/useQuintaConfig'
import { esModoNoches } from '@/lib/modoAlquiler'
import { cn } from '@/lib/cn'

type Tab = 'calendario' | 'reservas' | 'gastos' | 'precios' | 'sitio'

function isoDay(t: Timestamp | Date) {
  const d = t instanceof Date ? t : t.toDate()
  return d.toISOString().split('T')[0]
}

const VALID_TABS: Tab[] = ['calendario', 'reservas', 'gastos', 'precios', 'sitio']

function tabFromSearch(search: string): Tab | null {
  const t = new URLSearchParams(search).get('tab') as Tab | null
  return t && VALID_TABS.includes(t) ? t : null
}

export function CasaQuintaPage() {
  const { reservas, loading, addReserva, updateReserva, deleteReserva, addPago, deletePago } = useReservas()
  const { gastos, addGasto, updateGasto, deleteGasto } = useGastosQuinta()
  const { preReservas, acceptPreReserva, rejectPreReserva } = usePreReservas()
  const resenas = useResenas()
  const { config: quintaConfig } = useQuintaConfig()
  const noches = esModoNoches(quintaConfig.horaCheckout)
  const location = useLocation()

  const [tab, setTab] = useState<Tab>(() => {
    // Si la app se abrió desde una push notification, abrir directo en reservas
    return tabFromSearch(window.location.search) ?? 'calendario'
  })

  // Actualiza el tab cuando React Router navega (p.ej. desde una push notification con la app abierta)
  useEffect(() => {
    const t = tabFromSearch(location.search)
    if (t) {
      setTab(t)
      // Limpia el query param de la URL sin causar re-render
      const url = new URL(window.location.href)
      url.searchParams.delete('tab')
      window.history.replaceState({}, '', url)
    }
  }, [location.search])
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

  // ── Período seleccionado para KPIs ──
  const hoy = new Date()
  const [periodoYear, setPeriodoYear] = useState(hoy.getFullYear())
  const [periodoMonth, setPeriodoMonth] = useState(hoy.getMonth()) // 0-indexed

  const prevMes = () => {
    if (periodoMonth === 0) { setPeriodoMonth(11); setPeriodoYear(y => y - 1) }
    else setPeriodoMonth(m => m - 1)
  }
  const nextMes = () => {
    if (periodoMonth === 11) { setPeriodoMonth(0); setPeriodoYear(y => y + 1) }
    else setPeriodoMonth(m => m + 1)
  }

  const enPeriodo = (ts: Timestamp | Date) => {
    const d = ts instanceof Date ? ts : ts.toDate()
    return d.getFullYear() === periodoYear && d.getMonth() === periodoMonth
  }

  const totalIngresos = reservas.reduce((s, r) =>
    s + r.pagos.filter(p => enPeriodo(p.fecha)).reduce((ps, p) => ps + p.monto, 0), 0)

  const totalGastos = gastos
    .filter(g => enPeriodo(g.fecha))
    .reduce((s, g) => s + g.monto, 0)

  // Proyectado: lo que queda por cobrar de reservas que inician este mes
  const totalProyectado = reservas
    .filter(r => enPeriodo(r.fechaDesde))
    .reduce((s, r) => {
      const pagado = r.pagos.reduce((ps, p) => ps + p.monto, 0)
      return s + Math.max(0, r.montoTotal - pagado)
    }, 0)

  const reservasActivas = reservas.length // toda reserva creada por admin está confirmada

  const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const fmt = (n: number) => {
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace('.0', '')}M`
    if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
    return `${sign}$${abs}`
  }

  // Pre-reservas pendientes para el calendario (admin ve todas, sin filtrar expiradas)
  const preReservasPendientes = preReservas.filter((p) => p.estado === 'pendiente')
  const solicitudesPendientes = preReservasPendientes.length

  // Reservas ordenadas por fecha de entrada (más próxima primero)
  const reservasOrdenadas = [...reservas].sort((a, b) => {
    const ta = a.fechaDesde instanceof Date ? a.fechaDesde.getTime() : a.fechaDesde.toDate().getTime()
    const tb = b.fechaDesde instanceof Date ? b.fechaDesde.getTime() : b.fechaDesde.toDate().getTime()
    return ta - tb
  })

  // Late checkout: solo aplica en modo noches (en modo días el día de salida ya está ocupado)
  function lateCheckoutDisponible(reserva: Reserva): boolean {
    if (!noches) return false
    const checkout = isoDay(reserva.fechaHasta)
    return !reservas.some((r) => r.id !== reserva.id && isoDay(r.fechaDesde) === checkout)
  }

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'calendario', label: 'Calendario' },
    { key: 'reservas', label: 'Reservas', badge: solicitudesPendientes },
    { key: 'gastos', label: 'Gastos' },
    { key: 'precios', label: 'Precios' },
    { key: 'sitio', label: 'Sitio' },
  ]

  return (
    <>
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
      <div className="space-y-2">
        {/* Selector de período */}
        <div className="flex items-center justify-between">
          <button onClick={prevMes} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft size={15} className="text-slate-500" />
          </button>
          <button
            onClick={() => { setPeriodoYear(hoy.getFullYear()); setPeriodoMonth(hoy.getMonth()) }}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            {MESES_CORTOS[periodoMonth]} {periodoYear}
          </button>
          <button onClick={nextMes} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronRight size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500">Ingresos</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{fmt(totalIngresos)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500">Gastos</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{fmt(totalGastos)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500">Utilidad</p>
            <p className={cn('text-base font-bold mt-0.5', totalIngresos - totalGastos >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {fmt(totalIngresos - totalGastos)}
            </p>
            {totalProyectado > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                +{fmt(totalProyectado)} proy.
              </p>
            )}
          </div>
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkRow key={i} />)}
        </div>
      ) : (
        <>
          {tab === 'calendario' && (
            <div className="space-y-4">
              <CalendarioQuinta reservas={reservasOrdenadas} preReservas={preReservasPendientes} onDayClick={handleDayClick} horaCheckout={quintaConfig.horaCheckout} />
              {reservasOrdenadas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Próximas
                  </p>
                  <div className="space-y-2">
                    {reservasOrdenadas
                      .filter((r) => {
                        const hasta = r.fechaHasta instanceof Date ? r.fechaHasta : r.fechaHasta.toDate()
                        return hasta >= new Date()
                      })
                      .slice(0, 3)
                      .map((r) => (
                        <ReservaCard key={r.id} reserva={r} resena={resenas[r.id]} lateCheckoutDisponible={lateCheckoutDisponible(r)} onClick={() => setSelectedReservaId(r.id)} />
                      ))}
                  </div>
                </div>
              )}
              {reservasOrdenadas.length === 0 && (
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
              {preReservas.length > 0 && reservasOrdenadas.length > 0 && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reservas confirmadas
                </p>
              )}
              {reservasOrdenadas.length === 0 && preReservas.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">Sin reservas ni solicitudes</div>
              )}
              <div className="space-y-2">
                {reservasOrdenadas.map((r) => (
                  <ReservaCard key={r.id} reserva={r} resena={resenas[r.id]} lateCheckoutDisponible={lateCheckoutDisponible(r)} onClick={() => setSelectedReservaId(r.id)} />
                ))}
              </div>
            </div>
          )}

          {tab === 'gastos' && (
            <div className="space-y-4">
              <RecurrentesSection vertical="quinta" />
              <GastosQuinta gastos={gastos} onAdd={addGasto} onUpdate={updateGasto} onDelete={deleteGasto} />
            </div>
          )}

          {tab === 'precios' && <PreciosQuinta />}

          {tab === 'sitio' && <SitioPublicoAdmin />}
        </>
      )}

    </div>

    {/* Modales — fuera del space-y-5 para que no reciban margin-top */}
    {(showForm || editingReserva) && (
      <ReservaForm
        reserva={editingReserva ?? undefined}
        reservasExistentes={reservas}
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
        resena={resenas[selectedReserva.id]}
        onClose={() => setSelectedReservaId(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddPago={(pago) => addPago(selectedReserva.id, selectedReserva, pago)}
        onDeletePago={(pagoId) => deletePago(selectedReserva.id, selectedReserva, pagoId)}
      />
    )}
    </>
  )
}
