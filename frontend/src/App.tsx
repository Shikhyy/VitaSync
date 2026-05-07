import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import Landing from './pages/Landing'
import Signup from './pages/auth/Signup'
import Wizard from './pages/auth/Wizard'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import Overview from './pages/dashboard/Overview'
import Records from './pages/dashboard/Records'
import Insights from './pages/dashboard/Insights'
import Consent from './pages/dashboard/Consent'
import Alerts from './pages/dashboard/Alerts'
import DoctorPortal from './pages/doctor/DoctorPortal'
import PatientQuery from './pages/doctor/PatientQuery'
import Prescribe from './pages/doctor/Prescribe'
import { useAuthStore } from './stores/authStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/onboard/signup" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const path = window.location.pathname
  const hideNav = path.startsWith('/dashboard') || path.startsWith('/doctor') || path.startsWith('/onboard')

  return (
    <>
      {!hideNav && <Nav />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/onboard/signup" element={<Signup />} />
        <Route path="/onboard/wizard" element={<Wizard />} />

        {/* Patient Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="records" element={<Records />} />
          <Route path="insights" element={<Insights />} />
          <Route path="consent" element={<Consent />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>

        {/* Doctor Portal */}
        <Route path="/doctor" element={<DoctorPortal />} />
        <Route path="/doctor/patient/:id/query" element={<PatientQuery />} />
        <Route path="/doctor/patient/:id/prescribe" element={<Prescribe />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
