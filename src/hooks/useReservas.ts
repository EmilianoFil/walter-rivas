import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import type { Reserva, PagoReserva, EstadoReserva } from '@/types'

const COL = 'reservas'

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('fechaDesde', 'asc'))
    return onSnapshot(q, (snap) => {
      setReservas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reserva)))
      setLoading(false)
    })
  }, [])

  const addReserva = async (data: Omit<Reserva, 'id' | 'creadoEn' | 'creadoPor' | 'pagos' | 'adjuntos'>) => {
    await addDoc(collection(db, COL), {
      ...data,
      pagos: [],
      adjuntos: [],
      creadoEn: Timestamp.now(),
      creadoPor: auth.currentUser?.uid ?? '',
    })
  }

  const updateReserva = async (id: string, data: Partial<Omit<Reserva, 'id'>>) => {
    await updateDoc(doc(db, COL, id), data)
  }

  const deleteReserva = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  const addPago = async (reservaId: string, reserva: Reserva, pago: Omit<PagoReserva, 'id'>) => {
    const nuevoPago: PagoReserva = { ...pago, id: crypto.randomUUID() }
    const pagos = [...reserva.pagos, nuevoPago]
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0)
    const saldoPendiente = Math.max(0, reserva.montoTotal - totalPagado)
    const estado: EstadoReserva =
      saldoPendiente === 0 ? 'reservado' : totalPagado > 0 ? 'señado' : 'libre'
    await updateDoc(doc(db, COL, reservaId), { pagos, saldoPendiente, estado })
  }

  const deletePago = async (reservaId: string, reserva: Reserva, pagoId: string) => {
    const pagos = reserva.pagos.filter((p) => p.id !== pagoId)
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0)
    const saldoPendiente = Math.max(0, reserva.montoTotal - totalPagado)
    const estado: EstadoReserva =
      saldoPendiente === 0 ? 'reservado' : totalPagado > 0 ? 'señado' : 'libre'
    await updateDoc(doc(db, COL, reservaId), { pagos, saldoPendiente, estado })
  }

  return { reservas, loading, addReserva, updateReserva, deleteReserva, addPago, deletePago }
}
