import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { PrecioQuinta } from '@/types'

const COL = 'precios_quinta'

export function usePreciosQuinta() {
  const [precios, setPrecios] = useState<PrecioQuinta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('desde', 'asc'))
    return onSnapshot(q, (snap) => {
      setPrecios(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrecioQuinta)))
      setLoading(false)
    })
  }, [])

  const addPrecio = async (data: Omit<PrecioQuinta, 'id'>) => {
    await addDoc(collection(db, COL), data)
  }

  const deletePrecio = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  return { precios, loading, addPrecio, deletePrecio }
}

// ─── Helpers de precio (usados también en QuintaPublica) ─────────────────────

export function getPrecioParaDia(precios: PrecioQuinta[], date: Date): number | null {
  const iso = date.toISOString().split('T')[0]
  for (const p of precios) {
    const desde = p.desde instanceof Timestamp ? p.desde.toDate() : p.desde
    const hasta = p.hasta instanceof Timestamp ? p.hasta.toDate() : p.hasta
    const isoDesde = desde.toISOString().split('T')[0]
    const isoHasta = hasta.toISOString().split('T')[0]
    if (iso >= isoDesde && iso <= isoHasta) return p.precio
  }
  return null
}

export function calcPrecioRango(precios: PrecioQuinta[], start: Date, end: Date): number | null {
  const lo = start <= end ? start : end
  const hi = start <= end ? end : start
  let total = 0
  const cur = new Date(lo)
  while (cur < hi) {
    const precio = getPrecioParaDia(precios, cur)
    if (precio === null) return null // algún día sin precio → no mostramos total
    total += precio
    cur.setDate(cur.getDate() + 1)
  }
  return total > 0 ? total : null
}

export function formatPrecio(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}
