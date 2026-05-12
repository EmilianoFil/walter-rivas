import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
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

  // Seed initial units if empty
  const seedUnidades = async () => {
    const iniciales: Omit<Unidad, 'id'>[] = [
      { tipo: 'depto', nombre: 'Depto 1', inquilino: null, activo: true },
      { tipo: 'depto', nombre: 'Depto 2', inquilino: null, activo: true },
      { tipo: 'depto', nombre: 'Depto 3', inquilino: null, activo: true },
      { tipo: 'local', nombre: 'Local', inquilino: null, activo: true },
    ]
    for (const u of iniciales) {
      await addDoc(collection(db, COL), u)
    }
  }

  return { unidades, loading, addUnidad, updateUnidad, seedUnidades }
}
