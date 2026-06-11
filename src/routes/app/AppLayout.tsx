import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  LayoutDashboard,
  Home,
  Building2,
  HardHat,
  Briefcase,
  Car,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/AuthContext'
import type { VerticalPermiso } from '@/types'

const ALL_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio', vertical: null, adminOnly: false },
  { to: '/casa-quinta', icon: Home, label: 'Casa quinta', vertical: 'quinta' as VerticalPermiso, adminOnly: false },
  { to: '/departamentos', icon: Building2, label: 'Deptos', vertical: 'deptos' as VerticalPermiso, adminOnly: false },
  { to: '/obras', icon: HardHat, label: 'Obras', vertical: 'obras' as VerticalPermiso, adminOnly: false },
  { to: '/empresa', icon: Briefcase, label: 'Empresa', vertical: 'empresa' as VerticalPermiso, adminOnly: false },
  { to: '/flota', icon: Car, label: 'Flota', vertical: 'flota' as VerticalPermiso, adminOnly: false },
  { to: '/alertas', icon: Bell, label: 'Alertas', vertical: null, adminOnly: false },
  { to: '/settings', icon: Settings, label: 'Configuración', vertical: null, adminOnly: true },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { puedeVer, isAdmin } = useAuth()

  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.vertical) return puedeVer(item.vertical)
    return true
  })

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    // h-dvh + overflow-hidden en el root = scroll contenido en <main>, no en body.
    // Esto hace que position:fixed funcione correctamente en iOS Safari.
    <div className="h-dvh bg-slate-50 flex overflow-hidden">

      {/* Desktop sidebar — flex normal, no fixed */}
      <aside className="hidden lg:flex flex-col w-60 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <img src="/logo.png" alt="WR" className="w-8 h-8 rounded-lg bg-white object-contain p-0.5 flex-shrink-0" />
          <span className="text-white font-semibold text-sm">Rivas</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-white/[0.09] text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-red-400' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full"
          >
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </aside>

      {/* Columna derecha: header móvil + contenido scrollable */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header — estático dentro del flex, no fixed */}
        <div className="lg:hidden bg-slate-900 flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 active:opacity-70 transition-opacity">
              <img src="/logo.png" alt="WR" className="w-7 h-7 rounded-lg bg-white object-contain p-0.5" />
              <span className="text-white font-semibold text-sm">Rivas</span>
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white p-1"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Contenido con scroll propio */}
        <main className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'none' }}>
          <div
            key={location.pathname}
            className="max-w-5xl mx-auto px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] page-enter"
          >
            <Outlet />
          </div>
        </main>

      </div>

      {/* Mobile drawer — fixed está bien acá porque no hay scroll en body */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-slate-900 flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="WR" className="w-7 h-7 rounded-lg bg-white object-contain p-0.5" />
                  <span className="text-white font-semibold text-sm">Rivas</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-white/[0.09] text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} className={isActive ? 'text-red-400' : ''} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 border-t border-slate-800" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full"
              >
                <LogOut size={18} />
                Salir
              </button>
            </div>
          </aside>
        </div>
      )}

    </div>
  )
}
