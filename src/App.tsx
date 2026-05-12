import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/routes/app/AppLayout'
import { LoginPage } from '@/routes/LoginPage'
import { Dashboard } from '@/routes/app/dashboard/Dashboard'
import { CasaQuintaPage } from '@/routes/app/casa-quinta/CasaQuintaPage'
import { DepartamentosPage } from '@/routes/app/departamentos/DepartamentosPage'
import { ObrasPage } from '@/routes/app/obras/ObrasPage'
import { EmpresaPage } from '@/routes/app/empresa/EmpresaPage'
import { FlotaPage } from '@/routes/app/flota/FlotaPage'
import { AlertasPage } from '@/routes/app/alertas/AlertasPage'
import { QuintaPublica } from '@/routes/quinta/QuintaPublica'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/quinta" element={<QuintaPublica />} />
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="casa-quinta/*" element={<CasaQuintaPage />} />
            <Route path="departamentos/*" element={<DepartamentosPage />} />
            <Route path="obras/*" element={<ObrasPage />} />
            <Route path="empresa" element={<EmpresaPage />} />
            <Route path="flota/*" element={<FlotaPage />} />
            <Route path="alertas" element={<AlertasPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
