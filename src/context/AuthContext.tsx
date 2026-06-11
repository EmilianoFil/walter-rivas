import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc, collection, getDocs, query, limit, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import type { UsuarioApp, VerticalPermiso } from '@/types'

interface AuthContextValue {
  user: User | null
  perfil: UsuarioApp | null
  loading: boolean
  isAdmin: boolean
  esColaborador: boolean
  verticalColaborador: VerticalPermiso | undefined
  verticales: VerticalPermiso[]
  puedeVer: (v: VerticalPermiso) => boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  perfil: null,
  loading: true,
  isAdmin: false,
  esColaborador: false,
  verticalColaborador: undefined,
  verticales: [],
  puedeVer: () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<UsuarioApp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubPerfil: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u)

      if (unsubPerfil) { unsubPerfil(); unsubPerfil = null }

      if (!u) {
        setPerfil(null)
        setLoading(false)
        return
      }

      // Escuchar el perfil en tiempo real
      const perfilRef = doc(db, 'usuarios', u.uid)
      unsubPerfil = onSnapshot(perfilRef, async (snap) => {
        if (snap.exists()) {
          setPerfil({ uid: snap.id, ...snap.data() } as UsuarioApp)
          setLoading(false)
        } else {
          // Perfil no existe → bootstrap: si no hay ningún admin, este usuario es admin
          const q = query(collection(db, 'usuarios'), limit(1))
          const existing = await getDocs(q)
          const esElPrimero = existing.empty

          const nuevoPerfil: Omit<UsuarioApp, 'uid'> = {
            email: u.email ?? '',
            nombre: u.displayName ?? u.email ?? 'Usuario',
            rol: esElPrimero ? 'admin' : 'usuario',
            verticales: esElPrimero
              ? ['quinta', 'deptos', 'obras', 'empresa', 'flota']
              : [],
            creadoEn: Timestamp.now(),
          }
          await setDoc(perfilRef, nuevoPerfil)
          // El onSnapshot va a dispararse de nuevo con el doc creado
        }
      })
    })

    return () => {
      unsubAuth()
      if (unsubPerfil) unsubPerfil()
    }
  }, [])

  const isAdmin = perfil?.rol === 'admin'
  const esColaborador = perfil?.rol === 'colaborador'
  const verticalColaborador = esColaborador ? perfil?.verticalColaborador : undefined
  const verticales: VerticalPermiso[] = isAdmin
    ? ['quinta', 'deptos', 'obras', 'empresa', 'flota']
    : (perfil?.verticales ?? [])

  const puedeVer = (v: VerticalPermiso) => isAdmin || verticales.includes(v)

  return (
    <AuthContext.Provider value={{ user, perfil, loading, isAdmin, esColaborador, verticalColaborador, verticales, puedeVer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
