import { useState, useEffect } from 'react'
import { collection, doc, query, orderBy, onSnapshot, addDoc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { PrecioQuinta, PrecioBase } from '@/types'

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

export function usePrecioBase() {
  const [precioBase, setPrecioBase] = useState<PrecioBase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(doc(db, 'quinta_config', 'precios_base'), (snap) => {
      setPrecioBase(snap.exists() ? (snap.data() as PrecioBase) : null)
      setLoading(false)
    })
  }, [])

  const savePrecioBase = async (data: PrecioBase) => {
    await setDoc(doc(db, 'quinta_config', 'precios_base'), data)
  }

  return { precioBase, loading, savePrecioBase }
}

// ─── Helpers de precio ───────────────────────────────────────────────────────

const DAY_KEYS: (keyof PrecioBase)[] = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']

export function getPrecioParaDia(
  precios: PrecioQuinta[],
  date: Date,
  precioBase?: PrecioBase | null,
): number | null {
  const iso = date.toISOString().split('T')[0]

  // 1. Período especial tiene prioridad
  for (const p of precios) {
    const desde = p.desde instanceof Timestamp ? p.desde.toDate() : p.desde
    const hasta = p.hasta instanceof Timestamp ? p.hasta.toDate() : p.hasta
    const isoDesde = desde.toISOString().split('T')[0]
    const isoHasta = hasta.toISOString().split('T')[0]
    if (iso >= isoDesde && iso <= isoHasta) return p.precio
  }

  // 2. Precio base del día de semana
  if (precioBase) {
    const key = DAY_KEYS[date.getDay()]
    const base = precioBase[key]
    if (base !== undefined) return base
  }

  return null
}

export function calcPrecioRango(
  precios: PrecioQuinta[],
  start: Date,
  end: Date,
  precioBase?: PrecioBase | null,
): number | null {
  const lo = start <= end ? start : end
  const hi = start <= end ? end : start
  let total = 0
  const cur = new Date(lo)
  while (cur < hi) {
    const precio = getPrecioParaDia(precios, cur, precioBase)
    if (precio === null) return null
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
