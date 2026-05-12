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
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Unidad } from '@/types'

const COL = 'unidades'

export function useUnidades() {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('nombre', 'asc'))
    return onSnapshot(q, (snap) => {
      setUnidades(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Unidad)))
      setLoading(false)
    })
  }, [])

  const addUnidad = async (data: Omit<Unidad, 'id'>) => {
    await addDoc(collection(db, COL), data)
  }

  const updateUnidad = async (id: string, data: Partial<Omit<Unidad, 'id'>>) => {
    await updateDoc(doc(db, COL, id), data)
  }

  const deleteUnidad = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  return { unidades, loading, addUnidad, updateUnidad, deleteUnidad }
}
