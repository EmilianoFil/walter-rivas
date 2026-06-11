import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import type { GastoQuinta } from '@/types'

const COL = 'gastos_quinta'

export function useGastosQuinta() {
  const [gastos, setGastos] = useState<GastoQuinta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('fecha', 'desc'))
    return onSnapshot(q, (snap) => {
      setGastos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GastoQuinta)))
      setLoading(false)
    })
  }, [])

  const addGasto = async (data: Omit<GastoQuinta, 'id' | 'adjuntos' | 'creadoPor'>) => {
    await addDoc(collection(db, COL), { ...data, adjuntos: [], creadoPor: auth.currentUser?.uid ?? '', fecha: Timestamp.fromDate(data.fecha instanceof Date ? data.fecha : (data.fecha as Timestamp).toDate()) })
  }

  const updateGasto = async (id: string, data: Partial<Omit<GastoQuinta, 'id' | 'adjuntos'>>) => {
    await updateDoc(doc(db, COL, id), data)
  }

  const deleteGasto = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  return { gastos, loading, addGasto, updateGasto, deleteGasto }
}
