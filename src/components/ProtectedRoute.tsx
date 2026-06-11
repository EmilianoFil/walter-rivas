import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, esColaborador, verticalColaborador } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Colaboradores: redirigir a su página específica si intentan acceder al admin general
  if (esColaborador && verticalColaborador) {
    const destino = `/colaborador/${verticalColaborador}`
    if (location.pathname !== destino) {
      return <Navigate to={destino} replace />
    }
  }

  return <>{children}</>
}
