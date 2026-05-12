import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Alerta } from '@/types'

const COL = 'alertas'

export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('fecha', 'asc'))
    return onSnapshot(q, (snap) => {
      setAlertas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alerta)))
      setLoading(false)
    })
  }, [])

  const addAlerta = async (data: Omit<Alerta, 'id' | 'creadoEn' | 'estado'>) => {
    await addDoc(collection(db, COL), { ...data, estado: 'activa', creadoEn: Timestamp.now() })
  }

  const descartar = async (id: string) => {
    await updateDoc(doc(db, COL, id), { estado: 'descartada' })
  }

  const deleteAlerta = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  return { alertas, loading, addAlerta, descartar, deleteAlerta }
}
