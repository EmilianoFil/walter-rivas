import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { QuintaConfig, Reserva } from '@/types'
import { Phone, Mail, MapPin, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const DEFAULT_CONFIG: QuintaConfig = {
  nombre: 'Casa Quinta',
  descripcion: '',
  amenities: [],
  fotos: [],
  contactoEmail: '',
  whatsapp: '',
  ubicacion: '',
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function estaOcupado(reservas: Reserva[], date: Date): boolean {
  return reservas.some((r) => {
    if (r.estado === 'libre') return false
    const desde = new Date(toDate(r.fechaDesde)); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(toDate(r.fechaHasta)); hasta.setHours(23, 59, 59, 999)
    return date >= desde && date <= hasta
  })
}

function CalendarioPublico({ reservas }: { reservas: Reserva[] }) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMes(new Date(year, month - 1, 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <span className="text-sm font-medium text-slate-700 capitalize">{mesLabel}</span>
        <button
          onClick={() => setMes(new Date(year, month + 1, 1))}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center gap-y-1">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <div key={d} className="text-xs text-slate-400 font-medium pb-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const pasado = day < hoy
          const ocupado = !pasado && estaOcupado(reservas, day)
          return (
            <div
              key={i}
              className={cn(
                'w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full',
                pasado ? 'text-slate-300' :
                ocupado ? 'bg-red-100 text-red-500 font-semibold' :
                'text-slate-600'
              )}
            >
              {day.getDate()}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-5 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-slate-200 bg-white" />
          <span>Disponible</span>
        </div>
      </div>
    </div>
  )
}

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

  const prevFoto = () => setFotoIdx((i) => (i - 1 + config.fotos.length) % config.fotos.length)
  const nextFoto = () => setFotoIdx((i) => (i + 1) % config.fotos.length)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-semibold text-slate-900">{config.nombre}</h1>
        {config.ubicacion && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin size={11} />
            {config.ubicacion}
          </p>
        )}
      </header>

      {/* Galería de fotos */}
      {config.fotos.length > 0 && (
        <div className="relative aspect-video bg-slate-200 overflow-hidden">
          <img
            src={config.fotos[fotoIdx].url}
            alt=""
            className="w-full h-full object-cover"
          />
          {config.fotos.length > 1 && (
            <>
              <button
                onClick={prevFoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextFoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {config.fotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFotoIdx(i)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      i === fotoIdx ? 'bg-white scale-125' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Contenido */}
      <div className="space-y-4 p-4 pb-10">
        {/* Descripción */}
        {config.descripcion && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-700 text-sm leading-relaxed">{config.descripcion}</p>
          </div>
        )}

        {/* Amenities */}
        {config.amenities.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Qué incluye</h2>
            <div className="flex flex-wrap gap-2">
              {config.amenities.map((a) => (
                <span
                  key={a}
                  className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-medium"
                >
                  <CheckCircle size={11} />
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Disponibilidad */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Disponibilidad</h2>
          <CalendarioPublico reservas={reservas} />
        </div>

        {/* Contacto */}
        {(config.whatsapp || config.contactoEmail) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Reservar / Consultar</h2>
            {config.whatsapp && (
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition"
              >
                <Phone size={16} />
                Consultar por WhatsApp
              </a>
            )}
            {config.contactoEmail && (
              <a
                href={`mailto:${config.contactoEmail}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
              >
                <Mail size={16} />
                {config.contactoEmail}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} · {config.nombre}</p>
      </div>
    </div>
  )
}
