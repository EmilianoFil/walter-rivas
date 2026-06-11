import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, Timestamp, getDocs, where,
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import type { EmpresaCliente, EmpresaIngreso, EmpresaGasto, GastoFijo } from '@/types'

export const GASTOS_GENERALES_NOMBRE = '__gastos_generales__'

const COL = 'empresa_clientes'

export function useEmpresaClientes() {
  const [clientes, setClientes] = useState<EmpresaCliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('creadoEn', 'desc'))
    return onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmpresaCliente)))
      setLoading(false)
    })
  }, [])

  const addCliente = async (data: { nombre: string; descripcion?: string; presupuesto?: number }) => {
    await addDoc(collection(db, COL), {
      ...data,
      ingresos: [],
      gastos: [],
      estado: 'activo',
      creadoEn: Timestamp.now(),
    })
  }

  const updateCliente = async (id: string, data: Partial<Omit<EmpresaCliente, 'id'>>) => {
    await updateDoc(doc(db, COL, id), data)
  }

  const deleteCliente = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  const addIngreso = async (cliente: EmpresaCliente, ingreso: Omit<EmpresaIngreso, 'id' | 'creadoPor'>) => {
    const nuevo: EmpresaIngreso = { ...ingreso, id: crypto.randomUUID(), creadoPor: auth.currentUser?.uid ?? '' }
    await updateDoc(doc(db, COL, cliente.id), { ingresos: [...(cliente.ingresos ?? []), nuevo] })
  }

  const updateIngreso = async (cliente: EmpresaCliente, ingresoId: string, data: Partial<Omit<EmpresaIngreso, 'id'>>) => {
    await updateDoc(doc(db, COL, cliente.id), {
      ingresos: (cliente.ingresos ?? []).map((i) => i.id === ingresoId ? { ...i, ...data } : i),
    })
  }

  const deleteIngreso = async (cliente: EmpresaCliente, ingresoId: string) => {
    await updateDoc(doc(db, COL, cliente.id), {
      ingresos: (cliente.ingresos ?? []).filter((i) => i.id !== ingresoId),
    })
  }

  const addGasto = async (cliente: EmpresaCliente, gasto: Omit<EmpresaGasto, 'id' | 'creadoPor'>) => {
    const nuevo: EmpresaGasto = { ...gasto, id: crypto.randomUUID(), creadoPor: auth.currentUser?.uid ?? '' }
    await updateDoc(doc(db, COL, cliente.id), { gastos: [...(cliente.gastos ?? []), nuevo] })
  }

  const updateGasto = async (cliente: EmpresaCliente, gastoId: string, data: Partial<Omit<EmpresaGasto, 'id'>>) => {
    await updateDoc(doc(db, COL, cliente.id), {
      gastos: (cliente.gastos ?? []).map((g) => g.id === gastoId ? { ...g, ...data } : g),
    })
  }

  const deleteGasto = async (cliente: EmpresaCliente, gastoId: string) => {
    await updateDoc(doc(db, COL, cliente.id), {
      gastos: (cliente.gastos ?? []).filter((g) => g.id !== gastoId),
    })
  }

  /**
   * Registra todos los gastos fijos como gastos reales en el cliente especial
   * "Gastos Generales". Lo crea si no existe. Devuelve true si se registró,
   * false si el mes ya estaba registrado.
   */
  const registrarGastosFijos = async (gastosFijos: GastoFijo[], año: number, mes: number): Promise<boolean> => {
    // Buscar o crear el cliente Gastos Generales
    const q = query(collection(db, COL), where('nombre', '==', GASTOS_GENERALES_NOMBRE))
    const snap = await getDocs(q)

    let clienteId: string
    let clienteActual: EmpresaCliente

    if (snap.empty) {
      const ref = await addDoc(collection(db, COL), {
        nombre: GASTOS_GENERALES_NOMBRE,
        descripcion: 'Gastos fijos y generales de la empresa',
        ingresos: [],
        gastos: [],
        estado: 'activo',
        creadoEn: Timestamp.now(),
      })
      clienteId = ref.id
      clienteActual = { id: clienteId, nombre: GASTOS_GENERALES_NOMBRE, descripcion: 'Gastos fijos y generales de la empresa', ingresos: [], gastos: [], estado: 'activo', creadoEn: Timestamp.now() }
    } else {
      const d = snap.docs[0]
      clienteId = d.id
      clienteActual = { id: d.id, ...d.data() } as EmpresaCliente
    }

    // Verificar si ya hay gastos de ese mes (marcados con _mes)
    const yaRegistrado = (clienteActual.gastos ?? []).some((g) => {
      const f = g.fecha instanceof Timestamp ? g.fecha.toDate() : g.fecha
      return f.getFullYear() === año && f.getMonth() === mes && g.descripcion.startsWith('[Fijo]')
    })

    if (yaRegistrado) return false

    // Crear la fecha del primer día del mes
    const fecha = Timestamp.fromDate(new Date(año, mes, 1))
    const nuevosGastos: EmpresaGasto[] = gastosFijos.map((gf) => {
      const g: EmpresaGasto = {
        id: crypto.randomUUID(),
        descripcion: `[Fijo] ${gf.nombre}`,
        monto: gf.monto,
        fecha,
      }
      if (gf.categoria) g.categoria = gf.categoria
      return g
    })

    await updateDoc(doc(db, COL, clienteId), {
      gastos: [...(clienteActual.gastos ?? []), ...nuevosGastos],
    })

    return true
  }

  return { clientes, loading, addCliente, updateCliente, deleteCliente, addIngreso, updateIngreso, deleteIngreso, addGasto, updateGasto, deleteGasto, registrarGastosFijos }
}
