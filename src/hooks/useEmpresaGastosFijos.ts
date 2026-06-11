import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { GastoFijo } from '@/types'

const COL = 'empresa_gastos_fijos'

export function useEmpresaGastosFijos() {
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('creadoEn', 'asc'))
    return onSnapshot(q, (snap) => {
      setGastosFijos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GastoFijo)))
      setLoading(false)
    })
  }, [])

  const addGastoFijo = async (data: { nombre: string; monto: number; categoria?: string }) => {
    const payload: Record<string, unknown> = {
      nombre: data.nombre,
      monto: data.monto,
      creadoEn: Timestamp.now(),
    }
    if (data.categoria) payload.categoria = data.categoria
    await addDoc(collection(db, COL), payload)
  }

  const updateGastoFijo = async (id: string, data: Partial<Pick<GastoFijo, 'nombre' | 'monto' | 'categoria'>>) => {
    const payload: Record<string, unknown> = {}
    if (data.nombre !== undefined) payload.nombre = data.nombre
    if (data.monto !== undefined) payload.monto = data.monto
    if (data.categoria !== undefined) payload.categoria = data.categoria || null
    await updateDoc(doc(db, COL, id), payload)
  }

  const deleteGastoFijo = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  const totalMensual = gastosFijos.reduce((s, g) => s + g.monto, 0)

  return { gastosFijos, loading, totalMensual, addGastoFijo, updateGastoFijo, deleteGastoFijo }
}
