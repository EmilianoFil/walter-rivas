import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Categoria, VerticalCategoria } from '@/types'

export function useCategorias(vertical?: VerticalCategoria) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'categorias'), orderBy('creadoEn', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Categoria))
      setCategorias(vertical ? all.filter((c) => c.verticales.includes(vertical)) : all)
      setLoading(false)
    })
    return unsub
  }, [vertical])

  const addCategoria = async (data: {
    nombre: string
    tipo: Categoria['tipo']
    verticales: VerticalCategoria[]
  }) => {
    await addDoc(collection(db, 'categorias'), {
      ...data,
      creadoEn: Timestamp.now(),
    })
  }

  const deleteCategoria = async (id: string) => {
    await deleteDoc(doc(db, 'categorias', id))
  }

  return { categorias, loading, addCategoria, deleteCategoria }
}
