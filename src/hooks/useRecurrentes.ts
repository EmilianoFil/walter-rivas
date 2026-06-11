import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, Timestamp, setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Recurrente, VerticalRecurrente } from '@/types'

const COL = 'recurrentes'
const REG_COL = 'recurrentes_registros'

/** Colección y campos a usar al registrar según vertical */
function collectionDestino(vertical: VerticalRecurrente) {
  switch (vertical) {
    case 'quinta': return 'gastos_quinta'
    case 'deptos': return 'gastos_unidad'
    case 'flota':  return 'gastos_vehiculo'
  }
}

/** Campo de "entidad" requerido en deptos/flota (marca como recurrente general) */
function extraFields(vertical: VerticalRecurrente): Record<string, string | unknown[]> {
  switch (vertical) {
    case 'deptos': return { unidadId: '__recurrente__', adjuntos: [] }
    case 'flota':  return { vehiculoId: '__recurrente__', adjuntos: [] }
    default:       return {}
  }
}

export function useRecurrentes(vertical: VerticalRecurrente) {
  const [recurrentes, setRecurrentes] = useState<Recurrente[]>([])
  const [mesesRegistrados, setMesesRegistrados] = useState<{ año: number; mes: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, COL), where('vertical', '==', vertical), orderBy('creadoEn', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setRecurrentes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recurrente)))
      setLoading(false)
    })

    // Cargar meses registrados para esta vertical
    const qReg = query(collection(db, REG_COL), where('vertical', '==', vertical))
    const unsubReg = onSnapshot(qReg, (snap) => {
      setMesesRegistrados(snap.docs.map((d) => {
        const data = d.data()
        return { año: data.año as number, mes: data.mes as number }
      }))
    })

    return () => { unsub(); unsubReg() }
  }, [vertical])

  const addRecurrente = async (data: { tipo: 'ingreso' | 'egreso'; nombre: string; monto: number; categoria?: string }) => {
    const payload: Record<string, unknown> = {
      vertical,
      tipo: data.tipo,
      nombre: data.nombre,
      monto: data.monto,
      creadoEn: Timestamp.now(),
    }
    if (data.categoria) payload.categoria = data.categoria
    await addDoc(collection(db, COL), payload)
  }

  const updateRecurrente = async (id: string, data: Partial<Pick<Recurrente, 'nombre' | 'monto' | 'categoria' | 'tipo'>>) => {
    const payload: Record<string, unknown> = {}
    if (data.nombre !== undefined) payload.nombre = data.nombre
    if (data.monto !== undefined) payload.monto = data.monto
    if (data.tipo !== undefined) payload.tipo = data.tipo
    if (data.categoria !== undefined) payload.categoria = data.categoria || null
    await updateDoc(doc(db, COL, id), payload)
  }

  const deleteRecurrente = async (id: string) => {
    await deleteDoc(doc(db, COL, id))
  }

  /**
   * Registra los recurrentes como movimientos reales.
   * Devuelve true si se registró, false si el mes ya estaba registrado.
   */
  const registrarMes = async (items: Recurrente[], año: number, mes: number): Promise<boolean> => {
    const regId = `${vertical}-${año}-${mes}`
    // Verificar si ya fue registrado
    const existente = mesesRegistrados.find((m) => m.año === año && m.mes === mes)
    if (existente) return false

    const fecha = Timestamp.fromDate(new Date(año, mes, 1))
    const destino = collectionDestino(vertical)
    const extra = extraFields(vertical)

    for (const item of items) {
      const payload: Record<string, unknown> = {
        descripcion: `[Rec] ${item.nombre}`,
        monto: item.monto,
        fecha,
        ...extra,
      }
      if (item.categoria) payload.categoria = item.categoria
      // Para quinta, el tipo va implícito en la colección (gastos_quinta = egreso)
      // Para deptos/flota, ídem
      await addDoc(collection(db, destino), payload)
    }

    // Marcar mes como registrado
    await setDoc(doc(db, REG_COL, regId), { vertical, año, mes, registradoEn: Timestamp.now() })

    return true
  }

  const totalMensual = recurrentes.reduce((s, r) => s + r.monto, 0)

  return { recurrentes, mesesRegistrados, loading, totalMensual, addRecurrente, updateRecurrente, deleteRecurrente, registrarMes }
}
