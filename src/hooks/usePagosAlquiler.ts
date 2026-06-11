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
  where,
  Timestamp,
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import type { PagoAlquiler, GastoUnidad } from '@/types'

// ─── Pagos ───────────────────────────────────────────────────────────────────
export function usePagosAlquiler(unidadId?: string) {
  const [pagos, setPagos] = useState<PagoAlquiler[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const constraints = unidadId
      ? [where('unidadId', '==', unidadId), orderBy('vencimiento', 'desc')]
      : [orderBy('vencimiento', 'asc')]
    const q = query(collection(db, 'pagos_alquiler'), ...constraints)
    return onSnapshot(q, (snap) => {
      setPagos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PagoAlquiler)))
      setLoading(false)
    })
  }, [unidadId])

  const addPago = async (data: Omit<PagoAlquiler, 'id' | 'adjuntos' | 'creadoPor'>) => {
    await addDoc(collection(db, 'pagos_alquiler'), { ...data, adjuntos: [], creadoPor: auth.currentUser?.uid ?? '' })
  }

  const markPagado = async (id: string, fecha: Date) => {
    await updateDoc(doc(db, 'pagos_alquiler', id), {
      estado: 'pagado',
      fechaPago: Timestamp.fromDate(fecha),
    })
  }

  const deletePago = async (id: string) => {
    await deleteDoc(doc(db, 'pagos_alquiler', id))
  }

  return { pagos, loading, addPago, markPagado, deletePago }
}

// ─── Gastos por unidad ────────────────────────────────────────────────────────
export function useGastosUnidad(unidadId?: string) {
  const [gastos, setGastos] = useState<GastoUnidad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const constraints = unidadId
      ? [where('unidadId', '==', unidadId), orderBy('fecha', 'desc')]
      : [orderBy('fecha', 'desc')]
    const q = query(collection(db, 'gastos_unidad'), ...constraints)
    return onSnapshot(q, (snap) => {
      setGastos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GastoUnidad)))
      setLoading(false)
    })
  }, [unidadId])

  const addGasto = async (data: Omit<GastoUnidad, 'id' | 'adjuntos' | 'creadoPor'>) => {
    await addDoc(collection(db, 'gastos_unidad'), { ...data, adjuntos: [], creadoPor: auth.currentUser?.uid ?? '' })
  }

  const updateGasto = async (id: string, data: Partial<Omit<GastoUnidad, 'id' | 'adjuntos'>>) => {
    await updateDoc(doc(db, 'gastos_unidad', id), data)
  }

  const deleteGasto = async (id: string) => {
    await deleteDoc(doc(db, 'gastos_unidad', id))
  }

  return { gastos, loading, addGasto, updateGasto, deleteGasto }
}
