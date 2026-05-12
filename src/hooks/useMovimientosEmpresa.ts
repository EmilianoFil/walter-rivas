import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { MovimientoEmpresa } from '@/types'

const COL = 'movimientos_empresa'

export function useMovimientosEmpresa() {
  const [movimientos, setMovimientos] = useState<MovimientoEmpresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('fecha', 'desc'))
    return onSnapshot(q, (snap) => {
      setMovimientos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MovimientoEmpresa)))
      setLoading(false)
    })
  }, [])

  const addMovimiento = async (data: Omit<MovimientoEmpresa, 'id' | 'adjuntos'>) => {
    await addDoc(collection(db, COL), { ...data, adjuntos: [] })
  }

  const deleteMovimiento = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  return { movimientos, loading, addMovimiento, deleteMovimiento }
}
