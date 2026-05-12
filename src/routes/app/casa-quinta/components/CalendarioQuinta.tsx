import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Reserva, EstadoReserva } from '@/types'
import { cn } from '@/lib/cn'

interface Props {
  reservas: Reserva[]
  onDayClick?: (date: Date, reserva?: Reserva) => void
}

const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function getEstadoForDate(date: Date, reservas: Reserva[]): EstadoReserva | null {
  const d = date.getTime()
  for (const r of reservas) {
    const desde = toDate(r.fechaDesde).getTime()
    const hasta = toDate(r.fechaHasta).getTime()
    if (d >= desde && d <= hasta) return r.estado
  }
  return null
}

function getReservaForDate(date: Date, reservas: Reserva[]): Reserva | undefined {
  const d = date.getTime()
  return reservas.find((r) => {
    const desde = toDate(r.fechaDesde).getTime()
    const hasta = toDate(r.fechaHasta).getTime()
    return d >= desde && d <= hasta
  })
}

const ESTADO_STYLES: Record<EstadoReserva, string> = {
  libre: '',
  señado: 'bg-amber-100 text-amber-800',
  reservado: 'bg-emerald-100 text-emerald-800',
}

export function CalendarioQuinta({ reservas, onDayClick }: Props) {
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prev = () => setCurrent(new Date(year, month - 1, 1))
  const next = () => setCurrent(new Date(year, month + 1, 1))

  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button onClick={prev} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MESES[month]} {year}
        </span>
        <button onClick={next} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DIAS.map((d) => (
          <div key={d} className="text-center py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="h-8" />

          const estado = getEstadoForDate(date, reservas)
          const reserva = getReservaForDate(date, reservas)
          const hoy = isToday(date)

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDayClick?.(date, reserva)}
              className={cn(
                'h-8 flex items-center justify-center text-xs transition-all',
                estado ? ESTADO_STYLES[estado] : 'hover:bg-slate-50',
                hoy && !estado && 'font-bold text-red-500',
                hoy && estado && 'font-bold ring-2 ring-red-400 ring-inset rounded'
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-200" />
          <span className="text-[10px] text-slate-500">Señado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-200" />
          <span className="text-[10px] text-slate-500">Reservado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-200" />
          <span className="text-[10px] text-slate-500">Libre</span>
        </div>
      </div>
    </div>
  )
}
