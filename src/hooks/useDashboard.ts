import { useState, useEffect } from 'react'
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Reserva, PagoAlquiler, Obra, EmpresaCliente, GastoQuinta, GastoUnidad, GastoVehiculo, Alerta, VerticalPermiso } from '@/types'

export interface VerticalResumen {
  nombre: string
  key: string
  ingresos: number
  egresos: number
}

export interface RawData {
  reservas: Reserva[]
  gastosQuinta: GastoQuinta[]
  pagosAlquiler: PagoAlquiler[]
  gastosUnidad: GastoUnidad[]
  obras: Obra[]
  empresaClientes: EmpresaCliente[]
  gastosVehiculo: GastoVehiculo[]
}

export interface DashboardData {
  verticales: VerticalResumen[]
  alertasActivas: Alerta[]
  rawData: RawData
  loading: boolean
}

function toDate(t: Timestamp | Date): Date {
  return t instanceof Date ? t : t.toDate()
}

export function useDashboard(puedeVer: (v: VerticalPermiso) => boolean, authLoading: boolean): DashboardData {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [gastosQuinta, setGastosQuinta] = useState<GastoQuinta[]>([])
  const [pagosAlquiler, setPagosAlquiler] = useState<PagoAlquiler[]>([])
  const [gastosUnidad, setGastosUnidad] = useState<GastoUnidad[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [empresaClientes, setEmpresaClientes] = useState<EmpresaCliente[]>([])
  const [gastosVehiculo, setGastosVehiculo] = useState<GastoVehiculo[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loaded, setLoaded] = useState(0)

  const canQuinta  = !authLoading && puedeVer('quinta')
  const canDeptos  = !authLoading && puedeVer('deptos')
  const canObras   = !authLoading && puedeVer('obras')
  const canEmpresa = !authLoading && puedeVer('empresa')
  const canFlota   = !authLoading && puedeVer('flota')

  const total = 1 + (canQuinta ? 2 : 0) + (canDeptos ? 2 : 0) + (canObras ? 1 : 0) + (canEmpresa ? 1 : 0) + (canFlota ? 1 : 0)

  useEffect(() => {
    if (authLoading) return
    setLoaded(0)
    const subs: (() => void)[] = []
    const inc = () => setLoaded(n => n + 1)

    if (canQuinta) {
      subs.push(onSnapshot(query(collection(db, 'reservas')),      s => { setReservas(s.docs.map(d => ({ id: d.id, ...d.data() } as Reserva))); inc() }))
      subs.push(onSnapshot(query(collection(db, 'gastos_quinta')), s => { setGastosQuinta(s.docs.map(d => ({ id: d.id, ...d.data() } as GastoQuinta))); inc() }))
    }
    if (canDeptos) {
      subs.push(onSnapshot(query(collection(db, 'pagos_alquiler')), s => { setPagosAlquiler(s.docs.map(d => ({ id: d.id, ...d.data() } as PagoAlquiler))); inc() }))
      subs.push(onSnapshot(query(collection(db, 'gastos_unidad')),  s => { setGastosUnidad(s.docs.map(d => ({ id: d.id, ...d.data() } as GastoUnidad))); inc() }))
    }
    if (canObras) {
      subs.push(onSnapshot(query(collection(db, 'obras')), s => { setObras(s.docs.map(d => ({ id: d.id, ...d.data() } as Obra))); inc() }))
    }
    if (canEmpresa) {
      subs.push(onSnapshot(query(collection(db, 'empresa_clientes')), s => { setEmpresaClientes(s.docs.map(d => ({ id: d.id, ...d.data() } as EmpresaCliente))); inc() }))
    }
    if (canFlota) {
      subs.push(onSnapshot(query(collection(db, 'gastos_vehiculo')), s => { setGastosVehiculo(s.docs.map(d => ({ id: d.id, ...d.data() } as GastoVehiculo))); inc() }))
    }
    subs.push(onSnapshot(query(collection(db, 'alertas')), s => { setAlertas(s.docs.map(d => ({ id: d.id, ...d.data() } as Alerta))); inc() }))

    return () => subs.forEach(u => u())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canQuinta, canDeptos, canObras, canEmpresa, canFlota])

  // ── Verticales: all-time (solo las que el usuario puede ver) ─────────────
  const verticales: VerticalResumen[] = [
    puedeVer('quinta') && {
      nombre: 'Casa quinta', key: 'quinta',
      ingresos: reservas.reduce((s, r) => s + r.pagos.reduce((ps, p) => ps + p.monto, 0), 0),
      egresos: gastosQuinta.reduce((s, g) => s + g.monto, 0),
    },
    puedeVer('deptos') && {
      nombre: 'Deptos / Local', key: 'deptos',
      ingresos: pagosAlquiler.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0),
      egresos: gastosUnidad.reduce((s, g) => s + g.monto, 0),
    },
    puedeVer('obras') && {
      nombre: 'Obras', key: 'obras',
      ingresos: obras.reduce((s, o) => s + o.cobros.reduce((cs, c) => cs + c.monto, 0), 0),
      egresos: obras.reduce((s, o) => s + o.gastos.reduce((gs, g) => gs + g.monto, 0), 0),
    },
    puedeVer('empresa') && {
      nombre: 'Empresa', key: 'empresa',
      ingresos: empresaClientes.reduce((s, c) => s + c.ingresos.reduce((cs, i) => cs + i.monto, 0), 0),
      egresos:  empresaClientes.reduce((s, c) => s + c.gastos.reduce((cs, g) => cs + g.monto, 0), 0),
    },
    puedeVer('flota') && {
      nombre: 'Flota', key: 'flota',
      ingresos: 0,
      egresos:  gastosVehiculo.reduce((s, g) => s + g.monto, 0),
    },
  ].filter(Boolean) as VerticalResumen[]

  // ── Alertas activas ───────────────────────────────────────────────────────
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
    alertasActivas,
    rawData: { reservas, gastosQuinta, pagosAlquiler, gastosUnidad, obras, empresaClientes, gastosVehiculo },
    loading: authLoading || loaded < total,
  }
}
