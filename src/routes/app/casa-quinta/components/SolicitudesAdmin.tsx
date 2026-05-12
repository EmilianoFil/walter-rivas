import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { PreReserva } from '@/types'
import { cn } from '@/lib/cn'
import { usePreciosQuinta, usePrecioBase, calcPrecioRango, formatPrecio } from '@/hooks/usePreciosQuinta'

interface Props {
  preReservas: PreReserva[]
  onAccept: (pr: PreReserva, montoTotal: number, seña: number) => Promise<void>
  onReject: (id: string) => Promise<void>
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function formatFecha(t: Timestamp | Date) {
  return toDate(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function diffDias(a: Timestamp | Date, b: Timestamp | Date) {
  return Math.round(Math.abs(toDate(b).getTime() - toDate(a).getTime()) / 86400000)
}

function formatRelativo(t: Timestamp | Date) {
  const diff = Math.round((Date.now() - toDate(t).getTime()) / 60000)
  if (diff < 60) return `hace ${diff} min`
  if (diff < 1440) return `hace ${Math.round(diff / 60)}h`
  return `hace ${Math.round(diff / 1440)}d`
}

// ── Sheet de aceptación con precio calculado ──────────────────────────────────

function AceptarSheet({
  preReserva,
  onConfirm,
  onCancel,
}: {
  preReserva: PreReserva
  onConfirm: (montoTotal: number, seña: number) => Promise<void>
  onCancel: () => void
}) {
  const { precios } = usePreciosQuinta()
  const { precioBase } = usePrecioBase()

  const fechaDesde = toDate(preReserva.fechaDesde)
  const fechaHasta = toDate(preReserva.fechaHasta)
  const noches = diffDias(preReserva.fechaDesde, preReserva.fechaHasta)
  const calculado = calcPrecioRango(precios, fechaDesde, fechaHasta, precioBase)

  const [monto, setMonto] = useState(calculado !== null ? String(calculado) : '')
  const [seña, setSeña] = useState('')
  const [loading, setLoading] = useState(false)

  const montoNum = Number(monto)
  const señaNum = seña ? Number(seña) : 0
  const valido = monto !== '' && montoNum >= 0

  const handleConfirm = async () => {
    if (!valido) return
    setLoading(true)
    await onConfirm(montoNum, señaNum)
    setLoading(false)
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full bg-white rounded-t-3xl px-5 pt-4 pb-8 space-y-4">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

        {/* Header */}
        <div>
          <h3 className="text-base font-semibold text-slate-900">Confirmar reserva</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {preReserva.nombre} · {noches} noche{noches !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-400">
            {formatFecha(preReserva.fechaDesde)} → {formatFecha(preReserva.fechaHasta)}
          </p>
        </div>

        {/* Precio calculado */}
        {calculado !== null && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <Check size={14} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              Precio según tarifas: <span className="font-semibold">{formatPrecio(calculado)}</span>
            </p>
          </div>
        )}

        {/* Monto total */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Monto total ($)</label>
          <input
            type="number"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            className={inputCls}
            autoFocus
          />
        </div>

        {/* Seña */}
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Seña recibida ($, opcional)</label>
          <input
            type="number"
            inputMode="numeric"
            value={seña}
            onChange={(e) => setSeña(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
          {seña && montoNum > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Saldo pendiente: ${Math.max(0, montoNum - señaNum).toLocaleString('es-AR')}
            </p>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading || !valido}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-2xl text-sm font-semibold transition"
        >
          {loading ? 'Creando reserva...' : 'Crear reserva'}
        </button>
        <button onClick={onCancel} className="w-full py-2 text-sm text-slate-400">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function SolicitudesAdmin({ preReservas, onAccept, onReject }: Props) {
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [confirmReject, setConfirmReject] = useState<string | null>(null)
  const [aceptando, setAceptando] = useState<PreReserva | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const pendientes = preReservas.filter((p) => p.estado === 'pendiente')
  const historial = preReservas.filter((p) => p.estado !== 'pendiente')

  if (preReservas.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        Sin solicitudes recibidas
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pendientes */}
      {pendientes.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No hay solicitudes pendientes</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pendientes ({pendientes.length})
          </p>
          {pendientes.map((pr) => {
            const noches = diffDias(pr.fechaDesde, pr.fechaHasta)
            return (
              <div
                key={pr.id}
                className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden"
              >
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{pr.nombre}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatFecha(pr.fechaDesde)} → {formatFecha(pr.fechaHasta)}
                        <span className="text-slate-400"> · {noches} noche{noches !== 1 ? 's' : ''}</span>
                      </p>
                      {pr.personas && (
                        <p className="text-xs text-slate-500">{pr.personas} persona{pr.personas !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {formatRelativo(pr.creadoEn)}
                    </span>
                  </div>

                  {pr.mensaje && (
                    <p className="text-xs text-slate-600 mt-2 bg-white rounded-xl px-3 py-2 border border-amber-100">
                      "{pr.mensaje}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={`https://wa.me/${pr.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg"
                    >
                      <MessageCircle size={12} />
                      {pr.telefono}
                    </a>
                    {pr.email && (
                      <a
                        href={`mailto:${pr.email}`}
                        className="text-xs text-slate-500 underline"
                      >
                        {pr.email}
                      </a>
                    )}
                  </div>
                </div>

                <div className="border-t border-amber-200">
                  {confirmReject === pr.id ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <p className="text-xs text-slate-600 flex-1">¿Rechazar esta solicitud?</p>
                      <button
                        onClick={() => setConfirmReject(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          setConfirmReject(null)
                          setRejecting(pr.id)
                          await onReject(pr.id)
                          setRejecting(null)
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-lg"
                      >
                        Sí, rechazar
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2">
                      <button
                        onClick={() => setConfirmReject(pr.id)}
                        disabled={rejecting === pr.id}
                        className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition border-r border-amber-200 disabled:opacity-50"
                      >
                        <X size={14} />
                        {rejecting === pr.id ? 'Rechazando...' : 'Rechazar'}
                      </button>
                      <button
                        onClick={() => setAceptando(pr)}
                        className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        <Check size={14} />
                        Aceptar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Historial colapsable */}
      {historial.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 font-medium w-full py-2"
          >
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Historial ({historial.length})
          </button>

          {showHistory && (
            <div className="space-y-2 mt-1">
              {historial.map((pr) => {
                const noches = diffDias(pr.fechaDesde, pr.fechaHasta)
                return (
                  <div
                    key={pr.id}
                    className={cn(
                      'px-4 py-3 rounded-xl border text-sm',
                      pr.estado === 'aceptada'
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-slate-50 border-slate-100'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{pr.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {formatFecha(pr.fechaDesde)} · {noches} noches
                        </p>
                      </div>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        pr.estado === 'aceptada'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      )}>
                        {pr.estado === 'aceptada' ? 'Aceptada' : 'Rechazada'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Sheet de aceptación */}
      {aceptando && (
        <AceptarSheet
          preReserva={aceptando}
          onConfirm={async (montoTotal, seña) => {
            await onAccept(aceptando, montoTotal, seña)
            setAceptando(null)
          }}
          onCancel={() => setAceptando(null)}
        />
      )}
    </div>
  )
}
