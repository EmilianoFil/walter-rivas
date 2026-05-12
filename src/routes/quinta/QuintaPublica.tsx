import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { QuintaConfig, Reserva, RangoBloqueado } from '@/types'
import { Phone, Mail, MapPin, ChevronLeft, ChevronRight, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const DEFAULT_CONFIG: QuintaConfig = {
  nombre: 'Casa Quinta',
  descripcion: '',
  amenities: [],
  fotos: [],
  contactoEmail: '',
  whatsapp: '',
  ubicacion: '',
  diasBloqueados: [],
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function estaOcupado(reservas: Reserva[], date: Date): boolean {
  return reservas.some((r) => {
    if (r.estado === 'libre') return false
    const desde = new Date(toDate(r.fechaDesde)); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(toDate(r.fechaHasta)); hasta.setHours(23, 59, 59, 999)
    return date >= desde && date <= hasta
  })
}

function estaBloqueado(bloqueados: RangoBloqueado[], date: Date): boolean {
  const iso = isoDate(date)
  return bloqueados.some((b) => iso >= b.desde && iso <= b.hasta)
}

function formatFechaLarga(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function diffDias(a: Date, b: Date) {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000)
}

// ─── Calendario ───────────────────────────────────────────────────────────────

interface CalProps {
  reservas: Reserva[]
  bloqueados: RangoBloqueado[]
  whatsapp: string
  nombreQuinta: string
}

function CalendarioInteractivo({ reservas, bloqueados, whatsapp, nombreQuinta }: CalProps) {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selStart, setSelStart] = useState<Date | null>(null)
  const [selEnd, setSelEnd] = useState<Date | null>(null)
  const [hovered, setHovered] = useState<Date | null>(null)

  const year = mes.getFullYear()
  const month = mes.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()

  const days: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) days.push(null)
  for (let d = 1; d <= lastDay; d++) days.push(new Date(year, month, d))

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const mesLabel = mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const isNoDisponible = (d: Date) =>
    d < hoy || estaOcupado(reservas, d) || estaBloqueado(bloqueados, d)

  const previewEnd = selStart && !selEnd ? (hovered ?? null) : null

  const isInRange = (d: Date) => {
    const start = selStart
    const end = selEnd ?? previewEnd
    if (!start || !end) return false
    const lo = start <= end ? start : end
    const hi = start <= end ? end : start
    return d > lo && d < hi
  }

  const isStart = (d: Date) => selStart && isoDate(d) === isoDate(selStart)
  const isEnd = (d: Date) => selEnd && isoDate(d) === isoDate(selEnd)

  const handleDayClick = (d: Date) => {
    if (isNoDisponible(d)) return
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d)
      setSelEnd(null)
    } else {
      if (isoDate(d) === isoDate(selStart)) {
        setSelStart(null)
        return
      }
      if (d < selStart) {
        setSelEnd(selStart)
        setSelStart(d)
      } else {
        setSelEnd(d)
      }
    }
  }

  const rangeHasUnavailable = (): boolean => {
    if (!selStart || !selEnd) return false
    const lo = selStart <= selEnd ? selStart : selEnd
    const hi = selStart <= selEnd ? selEnd : selStart
    const cur = new Date(lo)
    while (cur <= hi) {
      if (isNoDisponible(cur)) return true
      cur.setDate(cur.getDate() + 1)
    }
    return false
  }

  const buildWaLink = () => {
    if (!selStart || !selEnd) return ''
    const lo = selStart <= selEnd ? selStart : selEnd
    const hi = selStart <= selEnd ? selEnd : selStart
    const msg = `Hola! Me gustaría consultar disponibilidad del ${formatFechaLarga(lo)} al ${formatFechaLarga(hi)} para ${nombreQuinta || 'la quinta'}. ¿Está disponible?`
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`
  }

  const noches = selStart && selEnd ? diffDias(selStart, selEnd) : 0
  const unavailable = selStart && selEnd && rangeHasUnavailable()

  return (
    <div>
      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMes(new Date(year, month - 1, 1))}
          className="p-2 hover:bg-slate-100 rounded-xl transition"
        >
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-700 capitalize">{mesLabel}</span>
        <button
          onClick={() => setMes(new Date(year, month + 1, 1))}
          className="p-2 hover:bg-slate-100 rounded-xl transition"
        >
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 text-center gap-y-1">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <div key={d} className="text-xs text-slate-400 font-medium pb-1.5">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const pasado = day < hoy
          const nodisponible = isNoDisponible(day)
          const inRange = isInRange(day)
          const start = isStart(day)
          const end = isEnd(day)
          const selected = start || end

          return (
            <div
              key={i}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => { if (selStart && !selEnd) setHovered(day) }}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'relative flex items-center justify-center text-xs h-9 cursor-pointer select-none transition-all',
                // Range background
                inRange && 'bg-emerald-50',
                // Start/end left-right rounding
                start && selEnd && 'rounded-l-full',
                end && 'rounded-r-full',
                // Day circle
                selected
                  ? 'font-semibold'
                  : nodisponible
                  ? 'text-slate-300 cursor-default'
                  : 'hover:bg-slate-100 rounded-full text-slate-700'
              )}
            >
              <span className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full text-xs z-10 relative',
                selected && 'bg-emerald-500 text-white',
                !selected && pasado && 'text-slate-300',
                !selected && !pasado && nodisponible && 'bg-red-50 text-red-400',
              )}>
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-50 border border-red-200" />
          No disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          Tu selección
        </div>
      </div>

      {/* Instrucción */}
      {!selStart && (
        <p className="text-xs text-slate-400 text-center mt-4">
          Tocá una fecha de entrada para comenzar
        </p>
      )}
      {selStart && !selEnd && (
        <p className="text-xs text-slate-400 text-center mt-4">
          Entrada: <span className="font-medium text-emerald-600">{formatFechaLarga(selStart)}</span>
          &nbsp;— ahora elegí la salida
        </p>
      )}

      {/* CTA de reserva */}
      {selStart && selEnd && (
        <div className={cn(
          'mt-4 rounded-2xl p-4 space-y-3',
          unavailable ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {formatFechaLarga(selStart <= selEnd ? selStart : selEnd)}
                {' → '}
                {formatFechaLarga(selStart <= selEnd ? selEnd : selStart)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{noches} noche{noches !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => { setSelStart(null); setSelEnd(null) }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>

          {unavailable ? (
            <p className="text-xs text-red-600 font-medium">
              El rango seleccionado incluye fechas no disponibles. Por favor elegí otro período.
            </p>
          ) : whatsapp ? (
            <a
              href={buildWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition"
            >
              <Phone size={15} />
              Consultar disponibilidad por WhatsApp
            </a>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function QuintaPublica() {
  const [config, setConfig] = useState<QuintaConfig>(DEFAULT_CONFIG)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  const [reservasLoaded, setReservasLoaded] = useState(false)
  const [fotoIdx, setFotoIdx] = useState(0)

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'quinta_config', 'main'), (snap) => {
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...(snap.data() as QuintaConfig) })
      setConfigLoaded(true)
    })
    const unsubReservas = onSnapshot(collection(db, 'reservas'), (snap) => {
      setReservas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reserva)))
      setReservasLoaded(true)
    })
    return () => { unsubConfig(); unsubReservas() }
  }, [])

  const loading = !configLoaded || !reservasLoaded

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  const fotos = config.fotos
  const bloqueados = config.diasBloqueados ?? []

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* ── Hero ── */}
      <div className="relative bg-slate-900 overflow-hidden">
        {fotos.length > 0 ? (
          <>
            <img
              src={fotos[fotoIdx].url}
              alt=""
              className="w-full aspect-[4/3] object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-900" />
        )}

        {/* Texto sobre el hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-12">
          <h1 className="text-2xl font-bold text-white leading-tight">
            {config.nombre || 'Casa Quinta'}
          </h1>
          {config.ubicacion && (
            <p className="flex items-center gap-1 text-white/70 text-sm mt-1">
              <MapPin size={13} />
              {config.ubicacion}
            </p>
          )}
        </div>

        {/* Flechas navegación */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={() => setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setFotoIdx((i) => (i + 1) % fotos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {fotos.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-b border-slate-100">
          {fotos.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setFotoIdx(i)}
              className={cn(
                'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition',
                i === fotoIdx ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img src={f.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      <div className="space-y-4 p-4 pb-12">

        {/* Descripción */}
        {config.descripcion && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-slate-700 text-sm leading-relaxed">{config.descripcion}</p>
          </div>
        )}

        {/* Amenities */}
        {config.amenities.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Qué incluye</h2>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
              {config.amenities.map((a) => (
                <div key={a} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disponibilidad + selección */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Disponibilidad</h2>
          <CalendarioInteractivo
            reservas={reservas}
            bloqueados={bloqueados}
            whatsapp={config.whatsapp ?? ''}
            nombreQuinta={config.nombre}
          />
        </div>

        {/* Contacto */}
        {(config.whatsapp || config.contactoEmail) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Contacto directo</h2>
            {config.whatsapp && (
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition"
              >
                <Phone size={15} />
                WhatsApp
              </a>
            )}
            {config.contactoEmail && (
              <a
                href={`mailto:${config.contactoEmail}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
              >
                <Mail size={15} />
                {config.contactoEmail}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 pb-10">
        © {new Date().getFullYear()} · {config.nombre}
      </p>
    </div>
  )
}
