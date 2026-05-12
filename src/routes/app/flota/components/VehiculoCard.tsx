import { ChevronRight, AlertCircle, Gauge } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import type { Vehiculo } from '@/types'

interface Props {
  vehiculo: Vehiculo
  onClick: () => void
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function diasHasta(t: Timestamp | Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const v = toDate(t); v.setHours(0, 0, 0, 0)
  return Math.round((v.getTime() - hoy.getTime()) / 86400000)
}

function kmParaService(v: Vehiculo): number {
  return Math.max(0, v.kmUltimoService + v.kmServiceCada - v.kmActual)
}

export function VehiculoCard({ vehiculo, onClick }: Props) {
  const alertas: string[] = []

  const diasSeguro = diasHasta(vehiculo.seguro.vencimiento)
  if (diasSeguro <= 30) alertas.push(`Seguro vence en ${diasSeguro}d`)

  const diasPatente = diasHasta(vehiculo.patente_vto)
  if (diasPatente <= 30) alertas.push(`Patente vence en ${diasPatente}d`)

  if (vehiculo.vtv_vto) {
    const diasVtv = diasHasta(vehiculo.vtv_vto)
    if (diasVtv <= 30) alertas.push(`VTV vence en ${diasVtv}d`)
  }

  const kmRestanteService = kmParaService(vehiculo)
  const serviceProximo = kmRestanteService <= 2000

  return (
    <button onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left hover:border-slate-200 transition-all active:scale-[0.99]">
      <div className="flex items-start gap-3 justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {alertas.length > 0 && (
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            )}
            <p className="text-sm font-semibold text-slate-800">
              {vehiculo.marca} {vehiculo.modelo}
            </p>
          </div>
          <p className="text-xs text-slate-500">{vehiculo.patente} · {vehiculo.anio} · {vehiculo.color}</p>
        </div>
        <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Gauge size={12} />
          <span>{vehiculo.kmActual.toLocaleString('es-AR')} km</span>
        </div>
        {serviceProximo && (
          <span className="text-amber-600 font-medium">
            Service en {kmRestanteService.toLocaleString('es-AR')} km
          </span>
        )}
      </div>

      {alertas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {alertas.map((a, i) => (
            <span key={i} className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">{a}</span>
          ))}
        </div>
      )}
    </button>
  )
}
