import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  doc, setDoc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { db } from '@/lib/firebase/config'
import { secondaryAuth } from '@/lib/firebase/secondary'
import type { UsuarioApp, VerticalPermiso } from '@/types'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), orderBy('creadoEn', 'asc'))
    return onSnapshot(q, (snap) => {
      setUsuarios(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UsuarioApp)))
      setLoading(false)
    })
  }, [])

  /** Crea un usuario en Firebase Auth (con instancia secundaria) y su perfil en Firestore */
  const crearUsuario = async (data: {
    email: string
    password: string
    nombre: string
    rol?: 'usuario' | 'colaborador'
    verticales: VerticalPermiso[]
    verticalColaborador?: VerticalPermiso
  }) => {
    // Crear en Auth sin desloguear al admin
    const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password)
    const uid = cred.user.uid

    // Desloguear la instancia secundaria inmediatamente
    await signOut(secondaryAuth)

    const rol = data.rol ?? 'usuario'
    const perfil: Record<string, unknown> = {
      email: data.email,
      nombre: data.nombre,
      rol,
      verticales: rol === 'colaborador' ? [] : data.verticales,
      creadoEn: Timestamp.now(),
    }
    if (rol === 'colaborador' && data.verticalColaborador) {
      perfil.verticalColaborador = data.verticalColaborador
    }

    await setDoc(doc(db, 'usuarios', uid), perfil)
  }

  const actualizarVerticales = async (uid: string, verticales: VerticalPermiso[]) => {
    await updateDoc(doc(db, 'usuarios', uid), { verticales })
  }

  const actualizarNombre = async (uid: string, nombre: string) => {
    await updateDoc(doc(db, 'usuarios', uid), { nombre })
  }

  /** Solo elimina el perfil de Firestore. El usuario de Auth queda (limitación del cliente SDK) */
  const eliminarUsuario = async (uid: string) => {
    await deleteDoc(doc(db, 'usuarios', uid))
  }

  return { usuarios, loading, crearUsuario, actualizarVerticales, actualizarNombre, eliminarUsuario }
}
