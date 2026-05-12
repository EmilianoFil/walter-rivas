import type { Timestamp } from 'firebase/firestore'

// ─── Quinta Config (micrositio público) ──────────────────────────────────────
export interface QuintaFoto {
  url: string
  path: string
  orden: number
}

export interface RangoBloqueado {
  id: string
  desde: string  // YYYY-MM-DD
  hasta: string  // YYYY-MM-DD
  motivo?: string
}

export interface QuintaConfig {
  nombre: string
  descripcion: string
  amenities: string[]
  fotos: QuintaFoto[]
  contactoEmail: string
  whatsapp?: string
  ubicacion?: string
  diasBloqueados?: RangoBloqueado[]
}

// ─── Pre-reservas (solicitudes públicas) ─────────────────────────────────────
export type EstadoPreReserva = 'pendiente' | 'aceptada' | 'rechazada'

export interface PreReserva {
  id: string
  nombre: string
  telefono: string
  email?: string
  personas?: number
  mensaje?: string
  fechaDesde: Timestamp
  fechaHasta: Timestamp
  estado: EstadoPreReserva
  creadoEn: Timestamp
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AppUser {
  uid: string
  email: string
  displayName: string
}

// ─── Shared ──────────────────────────────────────────────────────────────────
export interface Adjunto {
  nombre: string
  url: string
  path: string
  fechaSubida: Timestamp
}

export type EstadoPago = 'pagado' | 'parcial' | 'pendiente'

// ─── Casa Quinta ─────────────────────────────────────────────────────────────
export type EstadoReserva = 'libre' | 'señado' | 'reservado'

export interface Reserva {
  id: string
  inquilino: {
    nombre: string
    telefono: string
    email?: string
    dni?: string
  }
  fechaDesde: Timestamp
  fechaHasta: Timestamp
  estado: EstadoReserva
  montoTotal: number
  seña: number
  saldoPendiente: number
  pagos: PagoReserva[]
  adjuntos: Adjunto[]
  notas?: string
  creadoEn: Timestamp
}

export interface PagoReserva {
  id: string
  monto: number
  fecha: Timestamp
  tipo: 'seña' | 'saldo' | 'parcial'
  notas?: string
}

export interface PrecioQuinta {
  id: string
  nombre: string
  desde: Timestamp
  hasta: Timestamp
  precio: number
  notas?: string
}

export interface GastoQuinta {
  id: string
  categoria: 'pasto' | 'limpieza' | 'impuestos' | 'mantenimiento' | 'otro'
  descripcion: string
  monto: number
  fecha: Timestamp
  adjuntos: Adjunto[]
}

// ─── Departamentos / Local ────────────────────────────────────────────────────
export type TipoUnidad = 'depto' | 'local'

export interface Unidad {
  id: string
  tipo: TipoUnidad
  nombre: string
  descripcion?: string
  inquilino: {
    nombre: string
    telefono: string
    email?: string
    dni?: string
  } | null
  activo: boolean
}

export interface PagoAlquiler {
  id: string
  unidadId: string
  monto: number
  vencimiento: Timestamp
  fechaPago?: Timestamp
  estado: EstadoPago
  periodo: string
  notas?: string
  adjuntos: Adjunto[]
}

export interface GastoUnidad {
  id: string
  unidadId: string
  descripcion: string
  monto: number
  fecha: Timestamp
  adjuntos: Adjunto[]
}

// ─── Obras ───────────────────────────────────────────────────────────────────
export interface Obra {
  id: string
  nombre: string
  descripcion: string
  cliente: string
  presupuesto: number
  cobros: CobroObra[]
  gastos: GastoObra[]
  estado: 'activa' | 'finalizada' | 'pausada'
  creadoEn: Timestamp
  adjuntos: Adjunto[]
}

export interface CobroObra {
  id: string
  monto: number
  fecha: Timestamp
  notas?: string
}

export interface GastoObra {
  id: string
  descripcion: string
  monto: number
  fecha: Timestamp
  adjuntos: Adjunto[]
}

// ─── Empresa General ─────────────────────────────────────────────────────────
export type TipoMovimiento = 'ingreso' | 'egreso'

export interface MovimientoEmpresa {
  id: string
  tipo: TipoMovimiento
  descripcion: string
  monto: number
  fecha: Timestamp
  categoria?: string
  adjuntos: Adjunto[]
}

// ─── Flota ───────────────────────────────────────────────────────────────────
export interface Vehiculo {
  id: string
  patente: string
  marca: string
  modelo: string
  anio: number
  color: string
  fotoUrl?: string
  kmActual: number
  kmServiceCada: number
  kmUltimoService: number
  seguro: {
    compania: string
    nroPoliza: string
    monto: number
    vencimiento: Timestamp
  }
  patente_vto: Timestamp
  vtv_vto?: Timestamp
  activo: boolean
}

export interface GastoVehiculo {
  id: string
  vehiculoId: string
  categoria: 'combustible' | 'service' | 'reparacion' | 'neumaticos' | 'lavado' | 'seguro' | 'patente' | 'vtv' | 'otro'
  descripcion: string
  monto: number
  fecha: Timestamp
  km?: number
  adjuntos: Adjunto[]
}

export interface KmUpdate {
  id: string
  vehiculoId: string
  km: number
  fecha: Timestamp
}

// ─── Alertas ─────────────────────────────────────────────────────────────────
export type EstadoAlerta = 'activa' | 'enviada' | 'descartada'

export interface Alerta {
  id: string
  titulo: string
  descripcion?: string
  fecha: Timestamp
  anticipacionDias: number
  estado: EstadoAlerta
  vertical?: 'quinta' | 'deptos' | 'obras' | 'empresa' | 'flota' | 'general'
  referenciaId?: string
  creadoEn: Timestamp
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface ResumenVertical {
  nombre: string
  ingresos: number
  egresos: number
  utilidad: number
}
