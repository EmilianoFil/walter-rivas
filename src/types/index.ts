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
  googleMapsUrl?: string
  diasBloqueados?: RangoBloqueado[]
  /** Horas que una pre-reserva pendiente bloquea el calendario. Default: 24 */
  holdHoras?: number
  /** Horario de check-in, ej: "15:00" */
  horaCheckin?: string
  /** Horario de check-out, ej: "11:00" */
  horaCheckout?: string
  /** Instrucciones de acceso para el email de check-in */
  instruccionesCheckin?: string
  /** Normativa de checkout para el email del día anterior */
  normativaCheckout?: string
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
  /** Cuándo expira el hold. Si no está definido, usa creadoEn + holdHoras */
  expiraEn?: Timestamp
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AppUser {
  uid: string
  email: string
  displayName: string
}

export type VerticalPermiso = 'quinta' | 'deptos' | 'obras' | 'empresa' | 'flota'

export interface UsuarioApp {
  uid: string
  email: string
  nombre: string
  rol: 'admin' | 'usuario' | 'colaborador'
  verticales: VerticalPermiso[]
  /** Solo para rol='colaborador': la vertical a la que puede aportar movimientos */
  verticalColaborador?: VerticalPermiso
  creadoEn: Timestamp
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
export type EstadoReserva = 'libre' | 'señado' | 'reservado' | 'finalizada'

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
  creadoPor?: string
  /** Flags internos — qué emails ya se enviaron para esta reserva */
  _emailsSent?: {
    confirmacion?: boolean
    checkin?: boolean
    checkout?: boolean
    resena?: boolean
  }
}

export interface Resena {
  id: string
  reservaId: string
  nombre: string
  estrellas: number
  comentarios?: string  // comentario general — público
  loMejor: string       // lo que más gustó — público
  mejoras?: string      // sugerencias — solo admin
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

export interface PrecioBase {
  dom?: number
  lun?: number
  mar?: number
  mie?: number
  jue?: number
  vie?: number
  sab?: number
}

export interface GastoQuinta {
  id: string
  categoria: string
  descripcion: string
  monto: number
  fecha: Timestamp
  adjuntos: Adjunto[]
  creadoPor?: string
}

export interface MovimientoQuinta {
  id: string
  tipo: 'ingreso' | 'egreso'
  descripcion: string
  monto: number
  fecha: Timestamp
  creadoPor: string
  creadoPorNombre?: string
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
  creadoPor?: string
}

export interface GastoUnidad {
  id: string
  unidadId: string
  categoria?: string
  descripcion: string
  monto: number
  fecha: Timestamp
  adjuntos: Adjunto[]
  creadoPor?: string
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
  categoria?: string
  creadoPor?: string
}

export interface GastoObra {
  id: string
  descripcion: string
  monto: number
  fecha: Timestamp
  adjuntos: Adjunto[]
  categoria?: string
  creadoPor?: string
}

// ─── Empresa Clientes ────────────────────────────────────────────────────────
export interface EmpresaCliente {
  id: string
  nombre: string
  descripcion?: string
  presupuesto?: number
  ingresos: EmpresaIngreso[]
  gastos: EmpresaGasto[]
  estado: 'activo' | 'finalizado' | 'pausado'
  creadoEn: Timestamp
}

export interface EmpresaIngreso {
  id: string
  categoria?: string
  descripcion?: string
  monto: number
  fecha: Timestamp
  creadoPor?: string
}

export interface EmpresaGasto {
  id: string
  categoria?: string
  descripcion: string
  monto: number
  fecha: Timestamp
  creadoPor?: string
}

// ─── Movimientos Recurrentes ──────────────────────────────────────────────────
export type VerticalRecurrente = 'quinta' | 'deptos' | 'flota'

export interface Recurrente {
  id: string
  vertical: VerticalRecurrente
  tipo: 'ingreso' | 'egreso'
  nombre: string
  monto: number
  categoria?: string
  creadoEn: Timestamp
}

// ─── Gastos Fijos ─────────────────────────────────────────────────────────────
export interface GastoFijo {
  id: string
  nombre: string
  monto: number
  categoria?: string
  creadoEn: Timestamp
}

// ─── Empresa General ─────────────────────────────────────────────────────────
export type TipoMovimiento = 'ingreso' | 'egreso'

export type VerticalCategoria = 'quinta' | 'deptos' | 'flota' | 'obras' | 'empresa'

export interface Categoria {
  id: string
  nombre: string
  tipo: 'ingreso' | 'egreso' | 'ambos'
  verticales: VerticalCategoria[]
  creadoEn: Timestamp
}

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
  categoria: string
  descripcion: string
  monto: number
  fecha: Timestamp
  km?: number
  adjuntos: Adjunto[]
  creadoPor?: string
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
  creadoPor?: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface ResumenVertical {
  nombre: string
  ingresos: number
  egresos: number
  utilidad: number
}
