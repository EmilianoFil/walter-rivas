import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Resena } from '@/types'

/**
 * Suscripción en tiempo real a todas las reseñas.
 * Retorna un map { reservaId → Resena } para lookup O(1) desde los cards.
 */
export function useResenas() {
  const [resenas, setResenas] = useState<Record<string, Resena>>({})

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'resenas'), (snap) => {
      const map: Record<string, Resena> = {}
      for (const doc of snap.docs) {
        const data = doc.data() as Omit<Resena, 'id'>
        if (data.reservaId) {
          map[data.reservaId] = { id: doc.id, ...data }
        }
      }
      setResenas(map)
    })
    return unsub
  }, [])

  return resenas
}
