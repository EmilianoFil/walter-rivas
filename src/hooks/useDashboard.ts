import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Reserva, PagoAlquiler, Obra, MovimientoEmpresa, GastoQuinta, GastoUnidad, GastoVehiculo, Alerta } from '@/types'

export interface VerticalResumen {
  nombre: string
  key: string
  ingresos: number
  egresos: number
}

export interface MesData {
  mes: string
  ingresos: number
  egresos: number
}

export interface DashboardData {
  verticales: VerticalResumen[]
  grafico: MesData[]
  alertasActivas: Alerta[]
  loading: boolean
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

function isMes(t: Timestamp | Date, year: number, month: number): boolean {
  const d = toDate(t)
  return d.getFullYear() === year && d.getMonth() === month
}

function mesLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('es-AR', { month: 'short' })
}

// Últimos N meses
function ultimosMeses(n: number): { year: number; month: number; label: string }[] {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: mesLabel(d.getFullYear(), d.getMonth()) })
  }
  return result
}

export function useDashboard(): DashboardData {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [gastosQuinta, setGastosQuinta] = useState<GastoQuinta[]>([])
  const [pagosAlquiler, setPagosAlquiler] = useState<PagoAlquiler[]>([])
  const [gastosUnidad, setGastosUnidad] = useState<GastoUnidad[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoEmpresa[]>([])
  const [gastosVehiculo, setGastosVehiculo] = useState<GastoVehiculo[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loaded, setLoaded] = useState(0)

  const TOTAL = 8

  useEffect(() => {
    const subs = [
      onSnapshot(query(collection(db, 'reservas')), s => { setReservas(s.docs.map(d => ({ id: d.id, ...d.data() } as Reserva))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'gastos_quinta')), s => { setGastosQuinta(s.docs.map(d => ({ id: d.id, ...d.data() } as GastoQuinta))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'pagos_alquiler')), s => { setPagosAlquiler(s.docs.map(d => ({ id: d.id, ...d.data() } as PagoAlquiler))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'gastos_unidad')), s => { setGastosUnidad(s.docs.map(d => ({ id: d.id, ...d.data() } as GastoUnidad))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'obras')), s => { setObras(s.docs.map(d => ({ id: d.id, ...d.data() } as Obra))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'movimientos_empresa')), s => { setMovimientos(s.docs.map(d => ({ id: d.id, ...d.data() } as MovimientoEmpresa))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'gastos_vehiculo')), s => { setGastosVehiculo(s.docs.map(d => ({ id: d.id, ...d.data() } as GastoVehiculo))); setLoaded(n => n + 1) }),
      onSnapshot(query(collection(db, 'alertas')), s => { setAlertas(s.docs.map(d => ({ id: d.id, ...d.data() } as Alerta))); setLoaded(n => n + 1) }),
    ]
    return () => subs.forEach(u => u())
  }, [])

  // ── Vertical: Casa Quinta ─────────────────────────────────────────────────
  const quintaIngresos = reservas.reduce((s, r) => s + r.pagos.reduce((ps, p) => ps + p.monto, 0), 0)
  const quintaEgresos = gastosQuinta.reduce((s, g) => s + g.monto, 0)

  // ── Vertical: Deptos / Local ──────────────────────────────────────────────
  const deptosIngresos = pagosAlquiler.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0)
  const deptosEgresos = gastosUnidad.reduce((s, g) => s + g.monto, 0)

  // ── Vertical: Obras ───────────────────────────────────────────────────────
  const obrasIngresos = obras.reduce((s, o) => s + o.cobros.reduce((cs, c) => cs + c.monto, 0), 0)
  const obrasEgresos = obras.reduce((s, o) => s + o.gastos.reduce((gs, g) => gs + g.monto, 0), 0)

  // ── Vertical: Empresa ─────────────────────────────────────────────────────
  const empresaIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const empresaEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
    + gastosVehiculo.reduce((s, g) => s + g.monto, 0)

  const verticales: VerticalResumen[] = [
    { nombre: 'Casa quinta', key: 'quinta', ingresos: quintaIngresos, egresos: quintaEgresos },
    { nombre: 'Deptos / Local', key: 'deptos', ingresos: deptosIngresos, egresos: deptosEgresos },
    { nombre: 'Obras', key: 'obras', ingresos: obrasIngresos, egresos: obrasEgresos },
    { nombre: 'Empresa', key: 'empresa', ingresos: empresaIngresos, egresos: empresaEgresos },
  ]

  // ── Gráfico: últimos 6 meses ──────────────────────────────────────────────
  const meses = ultimosMeses(6)

  const grafico: MesData[] = meses.map(({ year, month, label }) => {
    // Ingresos del mes
    const quintaIng = reservas.reduce((s, r) =>
      s + r.pagos.filter(p => isMes(p.fecha, year, month)).reduce((ps, p) => ps + p.monto, 0), 0)
    const deptosIng = pagosAlquiler.filter(p => p.estado === 'pagado' && p.fechaPago && isMes(p.fechaPago, year, month))
      .reduce((s, p) => s + p.monto, 0)
    const obrasIng = obras.reduce((s, o) =>
      s + o.cobros.filter(c => isMes(c.fecha, year, month)).reduce((cs, c) => cs + c.monto, 0), 0)
    const empresaIng = movimientos.filter(m => m.tipo === 'ingreso' && isMes(m.fecha, year, month))
      .reduce((s, m) => s + m.monto, 0)

    // Egresos del mes
    const quintaEg = gastosQuinta.filter(g => isMes(g.fecha, year, month)).reduce((s, g) => s + g.monto, 0)
    const deptosEg = gastosUnidad.filter(g => isMes(g.fecha, year, month)).reduce((s, g) => s + g.monto, 0)
    const obrasEg = obras.reduce((s, o) =>
      s + o.gastos.filter(g => isMes(g.fecha, year, month)).reduce((gs, g) => gs + g.monto, 0), 0)
    const empresaEg = movimientos.filter(m => m.tipo === 'egreso' && isMes(m.fecha, year, month))
      .reduce((s, m) => s + m.monto, 0)
    const flotaEg = gastosVehiculo.filter(g => isMes(g.fecha, year, month)).reduce((s, g) => s + g.monto, 0)

    return {
      mes: label,
      ingresos: quintaIng + deptosIng + obrasIng + empresaIng,
      egresos: quintaEg + deptosEg + obrasEg + empresaEg + flotaEg,
    }
  })

  // ── Alertas activas y urgentes ────────────────────────────────────────────
  const alertasActivas = alertas
    .filter(a => {
      if (a.estado !== 'activa') return false
      const dias = Math.round((toDate(a.fecha).getTime() - Date.now()) / 86400000)
      return dias <= a.anticipacionDias
    })
    .sort((a, b) => toDate(a.fecha).getTime() - toDate(b.fecha).getTime())
    .slice(0, 5)

  return {
    verticales,
    grafico,
    alertasActivas,
    loading: loaded < TOTAL,
  }
}
