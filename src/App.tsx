import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { VerticalGuard } from '@/components/VerticalGuard'
import { SplashScreen } from '@/components/SplashScreen'

// Rutas públicas — se cargan solas, sin nada del admin
const QuintaPublica  = lazy(() => import('@/routes/quinta/QuintaPublica').then(m => ({ default: m.QuintaPublica })))
const ResenaPublica  = lazy(() => import('@/routes/quinta/ResenaPublica').then(m => ({ default: m.ResenaPublica })))

// Admin — se cargan solo cuando el usuario está autenticado y navega a esa sección
const LoginPage       = lazy(() => import('@/routes/LoginPage').then(m => ({ default: m.LoginPage })))
const AppLayout       = lazy(() => import('@/routes/app/AppLayout').then(m => ({ default: m.AppLayout })))
const Dashboard       = lazy(() => import('@/routes/app/dashboard/Dashboard').then(m => ({ default: m.Dashboard })))
const CasaQuintaPage  = lazy(() => import('@/routes/app/casa-quinta/CasaQuintaPage').then(m => ({ default: m.CasaQuintaPage })))
const DepartamentosPage = lazy(() => import('@/routes/app/departamentos/DepartamentosPage').then(m => ({ default: m.DepartamentosPage })))
const ObrasPage       = lazy(() => import('@/routes/app/obras/ObrasPage').then(m => ({ default: m.ObrasPage })))
const EmpresaPage     = lazy(() => import('@/routes/app/empresa/EmpresaPage').then(m => ({ default: m.EmpresaPage })))
const FlotaPage       = lazy(() => import('@/routes/app/flota/FlotaPage').then(m => ({ default: m.FlotaPage })))
const AlertasPage     = lazy(() => import('@/routes/app/alertas/AlertasPage').then(m => ({ default: m.AlertasPage })))
const SettingsPage    = lazy(() => import('@/routes/app/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ColaboradorQuinta = lazy(() => import('@/routes/app/colaborador/ColaboradorQuinta').then(m => ({ default: m.ColaboradorQuinta })))



/**
 * AppCore vive dentro de BrowserRouter para poder usar useNavigate.
 * Maneja:
 *  - controllerchange: recarga cuando un nuevo SW toma el control (fuerza código nuevo)
 *  - message SW→app: navega cuando el usuario toca una push notification
 *  - refreshPushToken: limpia tokens FCM duplicados en Firestore al iniciar
 */
function AppCore() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Cuando un nuevo SW activa, recargar para ejecutar el código nuevo
    const onControllerChange = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // Navegar cuando el usuario toca una push notification (SW manda PUSH_NAVIGATE)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NAVIGATE') {
        try {
          const url = new URL(event.data.url as string)
          navigate(url.pathname + url.search)
        } catch { /* URL inválida */ }
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // Limpiar tokens FCM duplicados en Firestore al iniciar
    import('@/lib/firebase/messaging').then(({ refreshPushToken }) => {
      refreshPushToken().catch(() => {})
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }, [navigate])

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/quinta" element={<QuintaPublica />} />
        <Route path="/resena" element={<ResenaPublica />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Colaboradores: vista standalone, sin AppLayout */}
        <Route path="/colaborador/quinta" element={<ProtectedRoute><ColaboradorQuinta /></ProtectedRoute>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="casa-quinta/*" element={<VerticalGuard vertical="quinta"><CasaQuintaPage /></VerticalGuard>} />
          <Route path="departamentos/*" element={<VerticalGuard vertical="deptos"><DepartamentosPage /></VerticalGuard>} />
          <Route path="obras/*" element={<VerticalGuard vertical="obras"><ObrasPage /></VerticalGuard>} />
          <Route path="empresa" element={<VerticalGuard vertical="empresa"><EmpresaPage /></VerticalGuard>} />
          <Route path="flota/*" element={<VerticalGuard vertical="flota"><FlotaPage /></VerticalGuard>} />
          <Route path="alertas" element={<AlertasPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

function AppWithSplash() {
  const { loading } = useAuth()
  const [splashDone, setSplashDone] = useState(false)

  if (!splashDone) {
    return <SplashScreen authReady={!loading} onDone={() => {
      document.body.style.background = ''
      setSplashDone(true)
    }} />
  }

  return (
    <BrowserRouter>
      <AppCore />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithSplash />
    </AuthProvider>
  )
}
