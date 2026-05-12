import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { QuintaConfig, Reserva, RangoBloqueado, PrecioQuinta, PrecioBase } from '@/types'
import { Phone, Mail, MapPin, ChevronLeft, ChevronRight, Check, X, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getPrecioParaDia, calcPrecioRango, formatPrecio } from '@/hooks/usePreciosQuinta'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTs(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function diffDias(a: Date, b: Date) {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000)
}

function formatCorta(d: Date) {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function estaOcupado(reservas: Reserva[], date: Date): boolean {
  return reservas.some((r) => {
    if (r.estado === 'libre') return false
    const desde = new Date(toTs(r.fechaDesde)); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(toTs(r.fechaHasta)); hasta.setHours(23, 59, 59, 999)
    return date >= desde && date <= hasta
  })
}

function estaBloqueado(bloqueados: RangoBloqueado[], date: Date): boolean {
  const iso = isoDate(date)
  return bloqueados.some((b) => iso >= b.desde && iso <= b.hasta)
}

// ─── Calendario interactivo ───────────────────────────────────────────────────

interface CalProps {
  reservas: Reserva[]
  bloqueados: RangoBloqueado[]
  precios: PrecioQuinta[]
  precioBase: PrecioBase | null
  selStart: Date | null
  selEnd: Date | null
  onSelectStart: (d: Date) => void
  onSelectEnd: (d: Date) => void
  onClear: () => void
}

function Calendario({ reservas, bloqueados, precios, precioBase, selStart, selEnd, onSelectStart, onSelectEnd, onClear }: CalProps) {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const year = mes.getFullYear()
  const month = mes.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const lastDay = new Date(year, month + 1, 0).getDate()

  const days: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) days.push(null)
  for (let d = 1; d <= lastDay; d++) days.push(new Date(year, month, d))

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const mesLabel = mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const isUnavailable = (d: Date) => d < hoy || estaOcupado(reservas, d) || estaBloqueado(bloqueados, d)

  const isInRange = (d: Date) => {
    if (!selStart || !selEnd) return false
    const lo = selStart <= selEnd ? selStart : selEnd
    const hi = selStart <= selEnd ? selEnd : selStart
    return d > lo && d < hi
  }

  const isEdge = (d: Date) =>
    (selStart && isoDate(d) === isoDate(selStart)) ||
    (selEnd && isoDate(d) === isoDate(selEnd))

  const handleClick = (d: Date) => {
    if (isUnavailable(d)) return
    if (!selStart || (selStart && selEnd)) {
      onSelectStart(d); return
    }
    if (isoDate(d) === isoDate(selStart)) { onClear(); return }
    if (d < selStart) { onSelectEnd(selStart); onSelectStart(d) }
    else { onSelectEnd(d) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMes(new Date(year, month - 1, 1))} className="p-2 rounded-xl hover:bg-slate-100 transition">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <span className="text-sm font-semibold text-slate-700 capitalize">{mesLabel}</span>
        <button onClick={() => setMes(new Date(year, month + 1, 1))} className="p-2 rounded-xl hover:bg-slate-100 transition">
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 pb-2">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const unavailable = isUnavailable(day)
          const inRange = isInRange(day)
          const edge = isEdge(day)
          const precioNoche = !unavailable ? getPrecioParaDia(precios, day, precioBase) : null

          return (
            <div
              key={i}
              onClick={() => handleClick(day)}
              className={cn(
                'flex flex-col items-center justify-center gap-0 transition-colors',
                precioNoche ? 'h-12' : 'h-9',
                !unavailable && !edge && 'cursor-pointer',
                inRange && 'bg-emerald-50',
                edge && selStart && selEnd && (
                  isoDate(day) === isoDate(selStart) ? 'rounded-l-full' : 'rounded-r-full'
                ),
              )}
            >
              <span className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full text-xs',
                edge ? 'bg-emerald-500 text-white font-semibold' :
                unavailable ? 'text-slate-300 cursor-default' :
                'text-slate-700 hover:bg-slate-100'
              )}>
                {day.getDate()}
              </span>
              {precioNoche && (
                <span className={cn(
                  'text-[9px] font-medium leading-none',
                  edge ? 'text-emerald-200' : 'text-emerald-600'
                )}>
                  {formatPrecio(precioNoche)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          No disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Tu selección
        </div>
      </div>
    </div>
  )
}

// ─── Formulario de solicitud ──────────────────────────────────────────────────

interface FormSolicitudProps {
  selStart: Date
  selEnd: Date
  whatsapp: string
  nombreQuinta: string
  onClose: () => void
}

function FormSolicitud({ selStart, selEnd, whatsapp, nombreQuinta, onClose }: FormSolicitudProps) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [personas, setPersonas] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const noches = diffDias(selStart, selEnd)
  const lo = selStart <= selEnd ? selStart : selEnd
  const hi = selStart <= selEnd ? selEnd : selStart

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !telefono.trim()) { setError('Nombre y teléfono son obligatorios'); return }
    setLoading(true)
    setError('')
    try {
      await addDoc(collection(db, 'pre_reservas'), {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(personas ? { personas: Number(personas) } : {}),
        ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}),
        fechaDesde: Timestamp.fromDate(lo),
        fechaHasta: Timestamp.fromDate(hi),
        estado: 'pendiente',
        creadoEn: Timestamp.now(),
      })
      setEnviado(true)
    } catch {
      setError('Hubo un error. Intentá de nuevo o contactanos por WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[92dvh] flex flex-col">
        {/* Handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {!enviado ? (
            <>
              <div className="flex items-start justify-between mb-4 pt-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Solicitar reserva</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatCorta(lo)} → {formatCorta(hi)} · {noches} noche{noches !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={onClose} className="p-1 text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Nombre completo *</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                    className={inputCls} placeholder="Juan García" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Teléfono / WhatsApp *</label>
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)}
                    type="tel" className={inputCls} placeholder="11 1234-5678" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)}
                      type="email" className={inputCls} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Personas</label>
                    <input value={personas} onChange={(e) => setPersonas(e.target.value)}
                      type="number" min="1" className={inputCls} placeholder="¿Cuántos?" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Mensaje (opcional)</label>
                  <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                    rows={3} className={cn(inputCls, 'resize-none')}
                    placeholder="Alguna consulta o información adicional..." />
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition"
                >
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </form>
            </>
          ) : (
            /* Estado éxito */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={28} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">¡Solicitud enviada!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {nombreQuinta ? `El equipo de ${nombreQuinta}` : 'Te'} contactará en las próximas horas para confirmar.
                </p>
              </div>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 mx-auto w-fit px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium"
                >
                  <Phone size={15} />
                  También podés escribir por WhatsApp
                </a>
              )}
              <button onClick={onClose} className="text-sm text-slate-400 underline">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function QuintaPublica() {
  const [config, setConfig] = useState<QuintaConfig>(DEFAULT_CONFIG)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [precios, setPrecios] = useState<PrecioQuinta[]>([])
  const [precioBase, setPrecioBase] = useState<PrecioBase | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [reservasLoaded, setReservasLoaded] = useState(false)

  const [fotoIdx, setFotoIdx] = useState(0)
  const [selStart, setSelStart] = useState<Date | null>(null)
  const [selEnd, setSelEnd] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'quinta_config', 'main'), (snap) => {
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...(snap.data() as QuintaConfig) })
      setConfigLoaded(true)
    })
    const u2 = onSnapshot(collection(db, 'reservas'), (snap) => {
      setReservas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reserva)))
      setReservasLoaded(true)
    })
    const u3 = onSnapshot(collection(db, 'precios_quinta'), (snap) => {
      setPrecios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrecioQuinta)))
    })
    const u4 = onSnapshot(doc(db, 'quinta_config', 'precios_base'), (snap) => {
      setPrecioBase(snap.exists() ? (snap.data() as PrecioBase) : null)
    })
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  const loading = !configLoaded || !reservasLoaded
  const fotos = config.fotos
  const bloqueados = config.diasBloqueados ?? []
  const noches = selStart && selEnd ? diffDias(selStart, selEnd) : 0

  const rangeHasUnavailable = () => {
    if (!selStart || !selEnd) return false
    const lo = selStart <= selEnd ? selStart : selEnd
    const hi = selStart <= selEnd ? selEnd : selStart
    const cur = new Date(lo)
    while (cur <= hi) {
      const d = new Date(cur); d.setHours(0, 0, 0, 0)
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      if (d < hoy || estaOcupado(reservas, d) || estaBloqueado(bloqueados, d)) return true
      cur.setDate(cur.getDate() + 1)
    }
    return false
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  const lo = selStart && selEnd ? (selStart <= selEnd ? selStart : selEnd) : selStart
  const hi = selStart && selEnd ? (selStart <= selEnd ? selEnd : selStart) : null
  const unavailableInRange = selStart && selEnd && rangeHasUnavailable()
  const precioTotal = selStart && selEnd && !unavailableInRange
    ? calcPrecioRango(precios, selStart, selEnd, precioBase)
    : null

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero: foto + nav ── */}
      <div className="relative h-[52vh] min-h-[260px] max-h-[420px] bg-slate-900 overflow-hidden">
        {fotos.length > 0 ? (
          <img
            src={fotos[fotoIdx].url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-slate-900" />
        )}

        {/* Gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

        {/* Texto */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-10">
          <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">
            {config.nombre || 'Casa Quinta'}
          </h1>
          {config.ubicacion && (
            <p className="flex items-center gap-1.5 text-white/75 text-sm mt-1.5">
              <MapPin size={13} />
              {config.ubicacion}
            </p>
          )}
        </div>

        {/* Navegación entre fotos */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={() => setFotoIdx((i) => (i - 1 + fotos.length) % fotos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/25 hover:bg-black/45 text-white p-2 rounded-full transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setFotoIdx((i) => (i + 1) % fotos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/25 hover:bg-black/45 text-white p-2 rounded-full transition"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFotoIdx(i)}
                  className={cn(
                    'rounded-full transition-all',
                    i === fotoIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Contenido principal ── */}
      <div className="-mt-5 relative bg-white rounded-t-[28px] overflow-hidden">

        {/* Thumbnails */}
        {fotos.length > 1 && (
          <div className="flex gap-2 px-4 pt-4 pb-0 overflow-x-auto">
            {fotos.map((f, i) => (
              <button
                key={f.path}
                onClick={() => setFotoIdx(i)}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all',
                  i === fotoIdx ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                )}
              >
                <img src={f.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-5 space-y-7 pb-32">

          {/* Descripción */}
          {config.descripcion && (
            <p className="text-slate-600 text-[15px] leading-relaxed">{config.descripcion}</p>
          )}

          {/* Divisor */}
          {config.descripcion && config.amenities.length > 0 && (
            <div className="border-t border-slate-100" />
          )}

          {/* Amenities */}
          {config.amenities.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">Qué incluye</h2>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {config.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Check size={13} className="text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100" />

          {/* Disponibilidad */}
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Disponibilidad</h2>
            <p className="text-sm text-slate-500 mb-4">
              {!selStart
                ? 'Tocá la fecha de entrada para comenzar'
                : !selEnd
                ? 'Ahora elegí la fecha de salida'
                : `${noches} noche${noches !== 1 ? 's' : ''} seleccionada${noches !== 1 ? 's' : ''}`}
            </p>

            <Calendario
              reservas={reservas}
              bloqueados={bloqueados}
              precios={precios}
              precioBase={precioBase}
              selStart={selStart}
              selEnd={selEnd}
              onSelectStart={(d) => { setSelStart(d); setSelEnd(null) }}
              onSelectEnd={setSelEnd}
              onClear={() => { setSelStart(null); setSelEnd(null) }}
            />

            {/* Rango inválido */}
            {selStart && selEnd && unavailableInRange && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                <X size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">El rango incluye fechas no disponibles. Elegí otro período.</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Contacto directo */}
          {(config.whatsapp || config.contactoEmail) && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">Contacto</h2>
              <div className="space-y-2.5">
                {config.whatsapp && (
                  <a
                    href={`https://wa.me/${config.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 transition"
                  >
                    <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">WhatsApp</p>
                      <p className="text-xs text-slate-500">Respuesta rápida</p>
                    </div>
                  </a>
                )}
                {config.contactoEmail && (
                  <a
                    href={`mailto:${config.contactoEmail}`}
                    className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 transition"
                  >
                    <div className="w-9 h-9 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail size={16} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Email</p>
                      <p className="text-xs text-slate-500">{config.contactoEmail}</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 pb-24">
        © {new Date().getFullYear()} · {config.nombre}
      </p>

      {/* ── Barra inferior fija ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 pb-safe">
        {!selStart ? (
          /* Sin selección: botón WhatsApp directo */
          config.whatsapp ? (
            <a
              href={`https://wa.me/${config.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold transition"
            >
              <Phone size={16} />
              Consultar disponibilidad
            </a>
          ) : null
        ) : !selEnd ? (
          /* Start elegido, falta end */
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500">Entrada</p>
              <p className="text-sm font-semibold text-slate-900">{lo ? formatCorta(lo) : ''}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Salida</p>
              <p className="text-sm text-slate-400">Elegí en el calendario</p>
            </div>
            <button onClick={() => { setSelStart(null); setSelEnd(null) }} className="p-2 text-slate-400">
              <X size={16} />
            </button>
          </div>
        ) : unavailableInRange ? (
          /* Rango con fechas no disponibles */
          <button
            onClick={() => { setSelStart(null); setSelEnd(null) }}
            className="w-full py-3.5 bg-slate-100 text-slate-500 rounded-2xl text-sm font-medium"
          >
            Rango no disponible — limpiar selección
          </button>
        ) : (
          /* Selección completa y válida */
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">
                {noches} noche{noches !== 1 ? 's' : ''}
                {precioTotal ? ` · ${formatPrecio(precioTotal)} total` : ''}
              </p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {lo ? formatCorta(lo) : ''} → {hi ? formatCorta(hi) : ''}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl text-sm font-semibold transition flex-shrink-0"
            >
              <MessageSquare size={15} />
              Solicitar
            </button>
            <button onClick={() => { setSelStart(null); setSelEnd(null) }} className="p-2 text-slate-400">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Modal formulario de solicitud */}
      {showForm && selStart && selEnd && (
        <FormSolicitud
          selStart={selStart}
          selEnd={selEnd}
          whatsapp={config.whatsapp ?? ''}
          nombreQuinta={config.nombre}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
