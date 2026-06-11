import { useState, useEffect, useRef } from 'react'
import { collection, doc, onSnapshot, addDoc, Timestamp, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { QuintaConfig, Reserva, RangoBloqueado, PrecioQuinta, PrecioBase, PreReserva, Resena } from '@/types'
import { Phone, Mail, MapPin, ChevronLeft, ChevronRight, Check, X, MessageSquare, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getPrecioParaDia, calcPrecioRango, formatPrecio } from '@/hooks/usePreciosQuinta'
import { esModoNoches, contarUnidades, labelUnidad } from '@/lib/modoAlquiler'

const DEFAULT_HOLD_HORAS = 24

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


function formatCorta(d: Date) {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/**
 * Modo noches: rango [fechaDesde, fechaHasta) — checkout day libre.
 * Modo días:   rango [fechaDesde, fechaHasta] — checkout day ocupado.
 */
function estaOcupado(reservas: Reserva[], preReservas: PreReserva[], date: Date, noches: boolean): boolean {
  const d = new Date(date); d.setHours(0, 0, 0, 0)

  const enRango = (desde: Date, hasta: Date) =>
    noches ? (d >= desde && d < hasta) : (d >= desde && d <= hasta)

  if (reservas.some((r) => {
    const desde = new Date(toTs(r.fechaDesde)); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(toTs(r.fechaHasta)); hasta.setHours(0, 0, 0, 0)
    return enRango(desde, hasta)
  })) return true

  return preReservas.some((pr) => {
    if (pr.estado !== 'pendiente') return false
    const desde = new Date(toTs(pr.fechaDesde)); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(toTs(pr.fechaHasta)); hasta.setHours(0, 0, 0, 0)
    return enRango(desde, hasta)
  })
}

function estaBloqueado(bloqueados: RangoBloqueado[], date: Date): boolean {
  const iso = isoDate(date)
  return bloqueados.some((b) => iso >= b.desde && iso <= b.hasta)
}

// ─── Calendario interactivo ───────────────────────────────────────────────────

interface CalProps {
  reservas: Reserva[]
  preReservas: PreReserva[]
  bloqueados: RangoBloqueado[]
  precios: PrecioQuinta[]
  precioBase: PrecioBase | null
  selStart: Date | null
  selEnd: Date | null
  noches: boolean
  onSelectStart: (d: Date) => void
  onSelectEnd: (d: Date) => void
  onClear: () => void
}

function Calendario({ reservas, preReservas, bloqueados, precios, precioBase, selStart, selEnd, noches, onSelectStart, onSelectEnd, onClear }: CalProps) {
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

  const isUnavailable = (d: Date) => d < hoy || estaOcupado(reservas, preReservas, d, noches) || estaBloqueado(bloqueados, d)

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
    if (isoDate(d) === isoDate(selStart)) {
      // Modo noches: mismo día = limpiar (0 noches no tiene sentido)
      // Modo días:   mismo día = confirmar 1 día
      if (noches) { onClear() } else { onSelectEnd(d) }
      return
    }
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
          const precioDia = !unavailable ? getPrecioParaDia(precios, day, precioBase) : null

          return (
            <div
              key={i}
              onClick={() => handleClick(day)}
              className={cn(
                'flex flex-col items-center justify-center gap-0 transition-colors',
                precioDia ? 'h-12' : 'h-9',
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
              {precioDia && (
                <span className={cn(
                  'text-[9px] font-medium leading-none',
                  edge ? 'text-emerald-200' : 'text-emerald-600'
                )}>
                  {formatPrecio(precioDia)}
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
  holdHoras: number
  noches: boolean
  onClose: () => void
}

function FormSolicitud({ selStart, selEnd, whatsapp, nombreQuinta, holdHoras, noches, onClose }: FormSolicitudProps) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [personas, setPersonas] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const lo = selStart <= selEnd ? selStart : selEnd
  const hi = selStart <= selEnd ? selEnd : selStart
  const unidades = contarUnidades(lo, hi, noches)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !telefono.trim()) { setError('Nombre y teléfono son obligatorios'); return }
    setLoading(true)
    setError('')
    try {
      const ahora = Timestamp.now()
      const expiraMs = ahora.toDate().getTime() + holdHoras * 3600 * 1000
      await addDoc(collection(db, 'pre_reservas'), {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(personas ? { personas: Number(personas) } : {}),
        ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}),
        fechaDesde: Timestamp.fromDate(lo),
        fechaHasta: Timestamp.fromDate(hi),
        estado: 'pendiente',
        creadoEn: ahora,
        expiraEn: Timestamp.fromMillis(expiraMs),
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
                    {formatCorta(lo)} → {formatCorta(hi)} · {labelUnidad(unidades, noches)}
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
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                    `Hola! Soy *${nombre}*.\nRealicé una pre-reserva desde el *${formatCorta(lo)}* hasta el *${formatCorta(hi)}*.\n\nNecesito preguntarte algo...`
                  )}`}
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
  const [preReservas, setPreReservas] = useState<PreReserva[]>([])
  const [precios, setPrecios] = useState<PrecioQuinta[]>([])
  const [precioBase, setPrecioBase] = useState<PrecioBase | null>(null)
  const [resenas, setResenas] = useState<Resena[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  const [reservasLoaded, setReservasLoaded] = useState(false)

  const [fotoIdx, setFotoIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const touchStartX  = useRef<number | null>(null)   // lightbox swipe
  const heroTouchX   = useRef<number | null>(null)   // hero mobile swipe
  const heroSwiped   = useRef(false)                 // evita que el tap dispare onClick tras un swipe
  const lightboxDir  = useRef<'next' | 'prev'>('next') // dirección para la animación del lightbox

  // Pre-carga todas las fotos al montar para evitar el lag al cambiar de imagen
  useEffect(() => {
    config.fotos?.forEach((f) => { const i = new Image(); i.src = f.url })
  }, [config.fotos])

  // Navegación con teclado cuando el lightbox está abierto
  useEffect(() => {
    if (lightboxIdx === null) return
    const total = config.fotos?.length ?? 0
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { lightboxDir.current = 'next'; setLightboxIdx((i) => i === null ? null : (i + 1) % total) }
      if (e.key === 'ArrowLeft')  { lightboxDir.current = 'prev'; setLightboxIdx((i) => i === null ? null : (i - 1 + total) % total) }
      if (e.key === 'Escape')     setLightboxIdx(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx, config.fotos?.length])

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
    // Solo pre-reservas pendientes (el resto no interesa al público)
    const u5 = onSnapshot(
      query(collection(db, 'pre_reservas'), where('estado', '==', 'pendiente')),
      (snap) => setPreReservas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PreReserva)))
    )
    const u6 = onSnapshot(collection(db, 'resenas'), (snap) => {
      setResenas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resena)))
    })
    return () => { u1(); u2(); u3(); u4(); u5(); u6() }
  }, [])

  const loading = !configLoaded || !reservasLoaded
  const fotos = config.fotos
  const bloqueados = config.diasBloqueados ?? []
  const holdHoras = config.holdHoras ?? DEFAULT_HOLD_HORAS
  const noches = esModoNoches(config.horaCheckout)
  const unidades = selStart && selEnd ? contarUnidades(selStart, selEnd, noches) : 0

  const rangeHasUnavailable = () => {
    if (!selStart || !selEnd) return false
    const lo = selStart <= selEnd ? selStart : selEnd
    const hi = selStart <= selEnd ? selEnd : selStart
    const cur = new Date(lo)
    // En modo noches: verificar [lo, hi) — checkout libre.
    // En modo días:   verificar [lo, hi] — checkout también ocupado.
    const limit = noches ? hi : new Date(hi.getTime() + 86400000) // +1d para incluir hi
    while (cur < limit) {
      const d = new Date(cur); d.setHours(0, 0, 0, 0)
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      if (d < hoy || estaOcupado(reservas, preReservas, d, noches) || estaBloqueado(bloqueados, d)) return true
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
    ? calcPrecioRango(precios, selStart, selEnd, precioBase, noches)
    : null

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}

      {/* Mobile: hero swipeable — tap abre lightbox, swipe cambia foto */}
      <div
        className="relative lg:hidden h-[52vh] min-h-[260px] max-h-[420px] bg-slate-900 overflow-hidden select-none"
        onTouchStart={(e) => { heroTouchX.current = e.touches[0].clientX; heroSwiped.current = false }}
        onTouchEnd={(e) => {
          if (heroTouchX.current === null) return
          const dx = e.changedTouches[0].clientX - heroTouchX.current
          heroTouchX.current = null
          if (Math.abs(dx) > 40) {
            heroSwiped.current = true
            setFotoIdx((i) => dx < 0
              ? (i + 1) % fotos.length
              : (i - 1 + fotos.length) % fotos.length
            )
          }
        }}
        onClick={() => { if (!heroSwiped.current && fotos.length > 0) setLightboxIdx(fotoIdx) }}
      >
        {fotos.length > 0 ? (
          <img
            key={fotoIdx}
            src={fotos[fotoIdx].url}
            alt=""
            className="w-full h-full object-cover animate-fade-in"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-10 pointer-events-none">
          <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">{config.nombre || 'Casa Quinta'}</h1>
          {config.ubicacion && (
            <p className="flex items-center gap-1.5 text-white/75 text-sm mt-1.5"><MapPin size={13} />{config.ubicacion}</p>
          )}
        </div>
        {/* Dots + hint "toca para ver fotos" */}
        {fotos.length > 1 && (
          <div className="absolute bottom-3.5 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none">
            <div className="flex gap-1.5">
              {fotos.map((_, i) => (
                <span key={i} className={cn('rounded-full transition-all duration-300', i === fotoIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40')} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: mosaico de fotos estilo Airbnb */}
      <div className="hidden lg:block relative overflow-hidden">
        {fotos.length === 0 ? (
          <div className="h-[58vh] bg-gradient-to-br from-emerald-900 to-slate-900" />
        ) : fotos.length === 1 ? (
          /* 1 foto: pantalla completa */
          <div className="h-[58vh] cursor-pointer" onClick={() => setLightboxIdx(0)}>
            <img src={fotos[0].url} alt="" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700" />
          </div>
        ) : fotos.length === 2 ? (
          /* 2 fotos: mitad/mitad */
          <div className="h-[58vh] grid grid-cols-2 gap-1">
            {fotos.slice(0, 2).map((f, i) => (
              <div key={f.path} className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(i)}>
                <img src={f.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
              </div>
            ))}
          </div>
        ) : fotos.length === 3 ? (
          /* 3 fotos: grande izq + 2 apiladas der */
          <div className="h-[58vh] grid grid-cols-[3fr_2fr] gap-1">
            <div className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(0)}>
              <img src={fotos[0].url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
            </div>
            <div className="grid grid-rows-2 gap-1">
              {fotos.slice(1, 3).map((f, i) => (
                <div key={f.path} className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(i + 1)}>
                  <img src={f.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                </div>
              ))}
            </div>
          </div>
        ) : fotos.length === 4 ? (
          /* 4 fotos: grande izq + 3 der (1 arriba, 2 abajo) */
          <div className="h-[58vh] grid grid-cols-[3fr_2fr] gap-1">
            <div className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(0)}>
              <img src={fotos[0].url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
            </div>
            <div className="grid grid-rows-2 gap-1">
              <div className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(1)}>
                <img src={fotos[1].url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                {fotos.slice(2, 4).map((f, i) => (
                  <div key={f.path} className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(i + 2)}>
                    <img src={f.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* 5+ fotos: grande izq + 2×2 der */
          <div className="h-[58vh] grid grid-cols-[3fr_2fr] gap-1">
            {/* Foto principal */}
            <div className="overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(0)}>
              <img src={fotos[0].url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
            </div>
            {/* 4 pequeñas en 2×2 */}
            <div className="grid grid-cols-2 grid-rows-2 gap-1">
              {fotos.slice(1, 5).map((f, i) => (
                <div key={f.path} className="relative overflow-hidden cursor-pointer group" onClick={() => setLightboxIdx(i + 1)}>
                  <img src={f.url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  {/* "Ver todas" en la última celda cuando hay más de 5 */}
                  {i === 3 && fotos.length > 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                      <span className="text-white font-semibold text-sm">+{fotos.length - 5} fotos</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overlay de texto */}
        <div className="absolute bottom-0 left-0 right-0 px-10 pb-8 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}>
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight drop-shadow">{config.nombre || 'Casa Quinta'}</h1>
          {config.ubicacion && (
            <p className="flex items-center gap-1.5 text-white/85 text-sm mt-2"><MapPin size={13} />{config.ubicacion}</p>
          )}
        </div>

        {/* Botón "Ver todas las fotos" — siempre visible si hay 2+ */}
        {fotos.length > 1 && (
          <button
            onClick={() => setLightboxIdx(0)}
            className="absolute bottom-5 right-5 flex items-center gap-2 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-sm transition"
          >
            <span className="grid grid-cols-2 gap-0.5 w-4 h-4">
              {[0,1,2,3].map(i => <span key={i} className="bg-slate-500 rounded-[1px]" />)}
            </span>
            Ver las {fotos.length} fotos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && fotos.length > 0 && (
        <div
          className="fixed inset-0 z-[200] bg-black"
          onTouchStart={(e) => {
            // 2 dedos (pinch) o imagen ya zoomedada → ignorar swipe
            const zoomed = (window.visualViewport?.scale ?? 1) > 1.05
            if (e.touches.length > 1 || zoomed) { touchStartX.current = null; return }
            touchStartX.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (Math.abs(dx) < 40) return
            touchStartX.current = null
            const total = fotos.length
            if (dx < 0) { lightboxDir.current = 'next'; setLightboxIdx((i) => i === null ? null : (i + 1) % total) }
            else        { lightboxDir.current = 'prev'; setLightboxIdx((i) => i === null ? null : (i - 1 + total) % total) }
          }}
        >
          {/* Foto a pantalla completa — click en el fondo cierra */}
          <div className="absolute inset-0 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
            <img
              key={lightboxIdx}
              src={fotos[lightboxIdx].url}
              alt=""
              className={cn(
                'max-w-full max-h-full object-contain select-none',
                lightboxDir.current === 'next' ? 'animate-lb-next' : 'animate-lb-prev'
              )}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Barra superior — overlay con gradiente */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4 pb-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <p className="text-white/60 text-sm font-medium">
              {lightboxIdx + 1} <span className="text-white/30">/ {fotos.length}</span>
            </p>
            <button
              onClick={() => setLightboxIdx(null)}
              className="pointer-events-auto text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Flechas — overlay, solo desktop */}
          {fotos.length > 1 && (
            <>
              <button
                onClick={() => { lightboxDir.current = 'prev'; setLightboxIdx((lightboxIdx - 1 + fotos.length) % fotos.length) }}
                className="absolute left-3 top-1/2 -translate-y-1/2 hidden lg:flex text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                onClick={() => { lightboxDir.current = 'next'; setLightboxIdx((lightboxIdx + 1) % fotos.length) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          {/* Thumbnails — overlay abajo con gradiente */}
          {fotos.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 pt-10 pb-4 bg-gradient-to-t from-black/65 to-transparent">
              <div className="flex gap-2 justify-center px-4 overflow-x-auto no-scrollbar">
                {fotos.map((f, i) => (
                  <button
                    key={f.path}
                    onClick={() => { lightboxDir.current = i > lightboxIdx ? 'next' : 'prev'; setLightboxIdx(i) }}
                    className={cn(
                      'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200',
                      i === lightboxIdx ? 'border-white opacity-100 scale-110' : 'border-transparent opacity-35 hover:opacity-65'
                    )}
                  >
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Contenido principal ── */}
      <div className="-mt-5 relative bg-white rounded-t-[28px] lg:rounded-none lg:mt-0">

        {/* Grid: columna izquierda (info) + derecha (reserva) en desktop */}
        <div className="lg:max-w-5xl lg:mx-auto lg:grid lg:grid-cols-[1fr_360px] lg:gap-12 lg:px-10 lg:py-10">

          {/* ── Columna izquierda ── */}
          <div className="px-5 py-5 space-y-7 pb-32 lg:px-0 lg:py-0 lg:pb-12">

            {/* Descripción — renderiza HTML del editor rico */}
            {config.descripcion && (
              <div
                className="prose prose-slate prose-sm max-w-none text-[15px]
                  prose-p:leading-relaxed prose-p:text-slate-600 prose-p:my-1
                  prose-strong:text-slate-800 prose-em:text-slate-600
                  prose-h2:text-base prose-h2:font-semibold prose-h2:text-slate-900 prose-h2:mt-4 prose-h2:mb-1
                  prose-ul:text-slate-600 prose-ul:my-1 prose-ol:text-slate-600 prose-ol:my-1
                  prose-li:my-0.5 prose-hr:border-slate-200"
                dangerouslySetInnerHTML={{ __html: config.descripcion }}
              />
            )}

            {/* Divisor */}
            {config.descripcion && config.amenities.length > 0 && (
              <div className="border-t border-slate-100" />
            )}

            {/* Amenities — 2 cols mobile, 3 cols desktop */}
            {config.amenities.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-4">Qué incluye</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4">
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

            {/* Disponibilidad — SOLO mobile (en desktop va en columna derecha) */}
            <div className="lg:hidden">
              <div className="border-t border-slate-100" />
              <div className="pt-7">
                <h2 className="text-base font-semibold text-slate-900 mb-1">Disponibilidad</h2>
                <p className="text-sm text-slate-500 mb-4">
                  {!selStart ? 'Tocá la fecha de entrada para comenzar'
                    : !selEnd ? 'Ahora elegí la fecha de salida'
                    : `${labelUnidad(unidades, noches)} seleccionado${unidades !== 1 ? 's' : ''}`}
                </p>
                <Calendario
                  reservas={reservas} preReservas={preReservas} bloqueados={bloqueados}
                  precios={precios} precioBase={precioBase}
                  selStart={selStart} selEnd={selEnd} noches={noches}
                  onSelectStart={(d) => { setSelStart(d); setSelEnd(null) }}
                  onSelectEnd={setSelEnd}
                  onClear={() => { setSelStart(null); setSelEnd(null) }}
                />
                {selStart && selEnd && unavailableInRange && (
                  <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                    <X size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">El rango incluye fechas no disponibles. Elegí otro período.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reseñas */}
            {resenas.length > 0 && (
              <>
                <div className="border-t border-slate-100" />
                <ResenasSection resenas={resenas} />
              </>
            )}

            {/* Contacto */}
            {(config.whatsapp || config.contactoEmail) && (
              <>
                <div className="border-t border-slate-100" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900 mb-4">Contacto</h2>
                  <div className="space-y-2.5">
                    {config.whatsapp && (
                      <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 transition">
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
                      <a href={`mailto:${config.contactoEmail}`}
                        className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 transition">
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
              </>
            )}
          </div>

          {/* ── Columna derecha: widget de reserva — SOLO desktop ── */}
          <div className="hidden lg:block">
            <div className="sticky top-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Disponibilidad</h3>
                <p className="text-sm text-slate-500">
                  {!selStart ? 'Seleccioná las fechas de tu estadía'
                    : !selEnd ? 'Ahora elegí la fecha de salida'
                    : `${labelUnidad(unidades, noches)} · ${lo ? formatCorta(lo) : ''} → ${hi ? formatCorta(hi) : ''}`}
                </p>
              </div>

              <Calendario
                reservas={reservas} preReservas={preReservas} bloqueados={bloqueados}
                precios={precios} precioBase={precioBase}
                selStart={selStart} selEnd={selEnd} noches={noches}
                onSelectStart={(d) => { setSelStart(d); setSelEnd(null) }}
                onSelectEnd={setSelEnd}
                onClear={() => { setSelStart(null); setSelEnd(null) }}
              />

              {selStart && selEnd && unavailableInRange && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <X size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">El rango incluye fechas no disponibles.</p>
                </div>
              )}

              {selStart && selEnd && !unavailableInRange && (
                <div className="space-y-3 pt-1">
                  {precioTotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{labelUnidad(unidades, noches)}</span>
                      <span className="font-semibold text-slate-800">{formatPrecio(precioTotal)}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare size={15} />
                    Solicitar reserva
                  </button>
                </div>
              )}

              {!selStart && config.whatsapp && (
                <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
                  <Phone size={14} />
                  Consultar por WhatsApp
                </a>
              )}
            </div>
          </div>

        </div>{/* /grid */}
      </div>{/* /contenido */}

      {/* Footer */}
      <FooterQuinta nombre={config.nombre} />

      {/* ── Barra inferior fija — mobile only, solo con fechas seleccionadas ── */}
      {selStart && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 pb-safe">
        {!selEnd ? (
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
                {labelUnidad(unidades, noches)}
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
      )}

      {/* Modal formulario de solicitud */}
      {showForm && selStart && selEnd && (
        <FormSolicitud
          selStart={selStart}
          selEnd={selEnd}
          whatsapp={config.whatsapp ?? ''}
          nombreQuinta={config.nombre}
          holdHoras={holdHoras}
          noches={noches}
          onClose={() => { setShowForm(false); setSelStart(null); setSelEnd(null) }}
        />
      )}
    </div>
  )
}

// ─── Sección de reseñas públicas ─────────────────────────────────────────────

function ResenasSection({ resenas }: { resenas: Resena[] }) {
  const promedio = resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length
  const redondeado = Math.round(promedio * 10) / 10

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Opiniones</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={13}
                  className={i <= Math.round(promedio)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-200'}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-slate-800">{redondeado}</span>
            <span className="text-xs text-slate-400">· {resenas.length} opinión{resenas.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>
      </div>

      {/* Cards verticales — texto completo */}
      <div className="space-y-3">
        {resenas.map((r) => (
          <div
            key={r.id}
            className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3"
          >
            {/* Estrellas */}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className={i <= r.estrellas
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 fill-slate-200'}
                />
              ))}
            </div>

            {/* Comentario general */}
            {r.comentarios && (
              <p className="text-sm text-slate-700 leading-relaxed">
                {r.comentarios}
              </p>
            )}

            {/* Lo que más gustó */}
            <div className="flex items-start gap-1.5">
              <span className="text-[11px] font-medium text-emerald-600 mt-0.5 flex-shrink-0">Lo mejor</span>
              <p className="text-sm text-slate-600 italic">"{r.loMejor}"</p>
            </div>

            {/* Nombre */}
            <p className="text-xs font-medium text-slate-500">— {r.nombre}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterQuinta({ nombre }: { nombre: string }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50">
      <div className="py-4 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">
          © {new Date().getFullYear()} · {nombre || 'Casa Quinta'} · Hecho por
        </span>
        <a
          href="https://filgueira.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 100" height="13" aria-label="Filgueira.dev">
            <polygon points="45,5 84,27.5 84,72.5 45,95 6,72.5 6,27.5" fill="#D94040"/>
            <text x="45" y="70" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontSize="54" fontWeight="900" fill="white">F</text>
            <text x="100" y="76" fontFamily="Arial,Helvetica,sans-serif" fontSize="66" fontWeight="700">
              <tspan fill="#1a1a1a">Filgueira</tspan>
              <tspan fill="#D94040">.dev</tspan>
            </text>
          </svg>
        </a>
      </div>
    </div>
  )
}
