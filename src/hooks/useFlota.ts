import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Vehiculo, GastoVehiculo, KmUpdate } from '@/types'

export function useFlota() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'vehiculos'), orderBy('marca', 'asc'))
    return onSnapshot(q, (snap) => {
      setVehiculos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehiculo)))
      setLoading(false)
    })
  }, [])

  const addVehiculo = async (data: Omit<Vehiculo, 'id'>) => {
    await addDoc(collection(db, 'vehiculos'), data)
  }

  const updateVehiculo = async (id: string, data: Partial<Omit<Vehiculo, 'id'>>) => {
    await updateDoc(doc(db, 'vehiculos', id), data)
  }

  const deleteVehiculo = async (id: string) => {
    await deleteDoc(doc(db, 'vehiculos', id))
  }

  const updateKm = async (vehiculo: Vehiculo, km: number) => {
    await updateDoc(doc(db, 'vehiculos', vehiculo.id), { kmActual: km })
    await addDoc(collection(db, 'km_updates'), {
      vehiculoId: vehiculo.id,
      km,
      fecha: Timestamp.now(),
    } satisfies Omit<KmUpdate, 'id'>)
  }

  return { vehiculos, loading, addVehiculo, updateVehiculo, deleteVehiculo, updateKm }
}

export function useGastosVehiculo(vehiculoId?: string) {
  const [gastos, setGastos] = useState<GastoVehiculo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const constraints = vehiculoId
      ? [where('vehiculoId', '==', vehiculoId), orderBy('fecha', 'desc')]
      : [orderBy('fecha', 'desc')]
    const q = query(collection(db, 'gastos_vehiculo'), ...constraints)
    return onSnapshot(q, (snap) => {
      setGastos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GastoVehiculo)))
      setLoading(false)
    })
  }, [vehiculoId])

  const addGasto = async (data: Omit<GastoVehiculo, 'id' | 'adjuntos'>) => {
    await addDoc(collection(db, 'gastos_vehiculo'), { ...data, adjuntos: [] })
  }

  const deleteGasto = async (id: string) => {
    await deleteDoc(doc(db, 'gastos_vehiculo', id))
  }

  return { gastos, loading, addGasto, deleteGasto }
}
