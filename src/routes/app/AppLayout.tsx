import { Outlet, NavLink, useNavigate } from 'react-router-dom'
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

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/casa-quinta', icon: Home, label: 'Casa quinta' },
  { to: '/departamentos', icon: Building2, label: 'Deptos' },
  { to: '/obras', icon: HardHat, label: 'Obras' },
  { to: '/empresa', icon: Briefcase, label: 'Empresa' },
  { to: '/flota', icon: Car, label: 'Flota' },
  { to: '/alertas', icon: Bell, label: 'Alertas' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
                    ? 'bg-red-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )
              }
            >
              <Icon size={18} />
              {label}
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
        <div className="lg:hidden bg-slate-900 flex items-center justify-between px-4 h-14 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="WR" className="w-7 h-7 rounded-lg bg-white object-contain p-0.5" />
            <span className="text-white font-semibold text-sm">Rivas</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-1"
          >
            <Menu size={22} />
          </button>
        </div>

        {/* Contenido con scroll propio */}
        <main className="flex-1 overflow-y-auto overscroll-none">
          <div className="max-w-5xl mx-auto px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
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
                        ? 'bg-red-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-slate-800">
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
