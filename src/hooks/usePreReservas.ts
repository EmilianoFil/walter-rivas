import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { PreReserva } from '@/types'

const COL = 'pre_reservas'

export function usePreReservas() {
  const [preReservas, setPreReservas] = useState<PreReserva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), orderBy('creadoEn', 'desc'))
    return onSnapshot(q, (snap) => {
      setPreReservas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PreReserva)))
      setLoading(false)
    })
  }, [])

  const acceptPreReserva = async (pr: PreReserva, montoTotal: number, seña: number) => {
    const reservaRef = await addDoc(collection(db, 'reservas'), {
      inquilino: {
        nombre: pr.nombre,
        telefono: pr.telefono,
        ...(pr.email ? { email: pr.email } : {}),
      },
      fechaDesde: pr.fechaDesde,
      fechaHasta: pr.fechaHasta,
      estado: 'reservado',
      montoTotal,
      seña,
      saldoPendiente: Math.max(0, montoTotal - seña),
      pagos: [],
      adjuntos: [],
      ...(pr.mensaje ? { notas: pr.mensaje } : {}),
      creadoEn: Timestamp.now(),
    })
    // Guardamos reservaId para que la Cloud Function pueda leer el saldo directo
    await updateDoc(doc(db, COL, pr.id), { estado: 'aceptada', reservaId: reservaRef.id })
  }

  const rejectPreReserva = async (id: string) => {
    await updateDoc(doc(db, COL, id), { estado: 'rechazada' })
  }

  return { preReservas, loading, acceptPreReserva, rejectPreReserva }
}
