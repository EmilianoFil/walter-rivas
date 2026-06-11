import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, Timestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import type { MovimientoQuinta } from '@/types'

const COL = 'movimientos_quinta'

/** Hook para admins: lee todos los movimientos */
export function useMovimientosQuinta() {
  const [movimientos, setMovimientos] = useState<MovimientoQuinta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('fecha', 'desc'))
    return onSnapshot(q, (snap) => {
      setMovimientos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MovimientoQuinta)))
      setLoading(false)
    })
  }, [])

  return { movimientos, loading }
}

/** Hook para colaboradores: solo sus propios movimientos */
export function useMovimientosPropios(uid: string) {
  const [movimientos, setMovimientos] = useState<MovimientoQuinta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, COL), where('creadoPor', '==', uid), orderBy('fecha', 'desc'))
    return onSnapshot(q, (snap) => {
      setMovimientos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MovimientoQuinta)))
      setLoading(false)
    })
  }, [uid])

  const addMovimiento = async (data: { tipo: 'ingreso' | 'egreso'; descripcion: string; monto: number; fecha: Date; creadoPorNombre?: string }) => {
    await addDoc(collection(db, COL), {
      ...data,
      fecha: Timestamp.fromDate(data.fecha),
      creadoPor: auth.currentUser?.uid ?? '',
    })
  }

  const updateMovimiento = async (id: string, data: Partial<Pick<MovimientoQuinta, 'tipo' | 'descripcion' | 'monto' | 'fecha'>>) => {
    await updateDoc(doc(db, COL, id), data)
  }

  const deleteMovimiento = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  return { movimientos, loading, addMovimiento, updateMovimiento, deleteMovimiento }
}
