import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { VerticalPermiso } from '@/types'

interface Props {
  vertical: VerticalPermiso
  children: React.ReactNode
}

export function VerticalGuard({ vertical, children }: Props) {
  const { puedeVer, loading } = useAuth()

  if (loading) return null
  if (!puedeVer(vertical)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
