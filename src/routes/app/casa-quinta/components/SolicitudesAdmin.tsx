import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { PreReserva } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  preReservas: PreReserva[]
  onAccept: (pr: PreReserva) => Promise<void>
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

export function SolicitudesAdmin({ preReservas, onAccept, onReject }: Props) {
  const [accepting, setAccepting] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [confirmAccept, setConfirmAccept] = useState<string | null>(null)
  const [confirmReject, setConfirmReject] = useState<string | null>(null)
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
                  ) : confirmAccept === pr.id ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <p className="text-xs text-slate-600 flex-1">¿Crear reserva para {pr.nombre}?</p>
                      <button
                        onClick={() => setConfirmAccept(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          setConfirmAccept(null)
                          setAccepting(pr.id)
                          await onAccept(pr)
                          setAccepting(null)
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg"
                      >
                        Sí, aceptar
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2">
                      <button
                        onClick={() => setConfirmReject(pr.id)}
                        disabled={rejecting === pr.id || accepting === pr.id}
                        className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition border-r border-amber-200 disabled:opacity-50"
                      >
                        <X size={14} />
                        {rejecting === pr.id ? 'Rechazando...' : 'Rechazar'}
                      </button>
                      <button
                        onClick={() => setConfirmAccept(pr.id)}
                        disabled={accepting === pr.id || rejecting === pr.id}
                        className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50"
                      >
                        <Check size={14} />
                        {accepting === pr.id ? 'Creando...' : 'Aceptar'}
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
    </div>
  )
}
