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
import { db } from '@/lib/firebase/config'
import type { Obra, CobroObra, GastoObra } from '@/types'

const COL = 'obras'

export function useObras() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('creadoEn', 'desc'))
    return onSnapshot(q, (snap) => {
      setObras(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Obra))  )
      setLoading(false)
    })
  }, [])

  const addObra = async (data: { nombre: string; descripcion: string; cliente: string; presupuesto: number }) => {
    await addDoc(collection(db, COL), {
      ...data,
      cobros: [],
      gastos: [],
      estado: 'activa',
      adjuntos: [],
      creadoEn: Timestamp.now(),
    })
  }

  const updateObra = async (id: string, data: Partial<Omit<Obra, 'id'>>) => {
    await updateDoc(doc(db, COL, id), data)
  }

  const deleteObra = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  const addCobro = async (obra: Obra, cobro: Omit<CobroObra, 'id'>) => {
    const nuevoCobro: CobroObra = { ...cobro, id: crypto.randomUUID() }
    await updateDoc(doc(db, COL, obra.id), { cobros: [...obra.cobros, nuevoCobro] })
  }

  const deleteCobro = async (obra: Obra, cobroId: string) => {
    await updateDoc(doc(db, COL, obra.id), {
      cobros: obra.cobros.filter((c) => c.id !== cobroId),
    })
  }

  const addGasto = async (obra: Obra, gasto: Omit<GastoObra, 'id' | 'adjuntos'>) => {
    const nuevoGasto: GastoObra = { ...gasto, id: crypto.randomUUID(), adjuntos: [] }
    await updateDoc(doc(db, COL, obra.id), { gastos: [...obra.gastos, nuevoGasto] })
  }

  const deleteGasto = async (obra: Obra, gastoId: string) => {
    await updateDoc(doc(db, COL, obra.id), {
      gastos: obra.gastos.filter((g) => g.id !== gastoId),
    })
  }

  return { obras, loading, addObra, updateObra, deleteObra, addCobro, deleteCobro, addGasto, deleteGasto }
}
