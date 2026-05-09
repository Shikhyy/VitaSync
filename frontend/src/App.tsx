import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import Landing from './pages/Landing'
import About from './pages/About'
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
import PatientCommunication from './pages/doctor/PatientCommunication'
import Consultations from './pages/dashboard/Consultations'
import DoctorConsultations from './pages/doctor/DoctorConsultations'
import DoctorLayout from './pages/doctor/DoctorLayout'
import DoctorMessages from './pages/doctor/DoctorMessages'
import { useAuthStore } from './stores/authStore'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'patient' | 'doctor' }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/onboard/signup" replace />

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'doctor' ? '/doctor' : '/dashboard'} replace />
  }

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
  const { pathname } = useLocation()
  const hideNav = pathname.startsWith('/dashboard') || pathname.startsWith('/doctor') || pathname.startsWith('/onboard')

  return (
    <>
      {!hideNav && <Nav />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/onboard/signup" element={<Signup />} />
        <Route path="/onboard/wizard" element={<Wizard />} />

        {/* Patient Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="patient">
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
          <Route path="consultations" element={<Consultations />} />
        </Route>

        {/* Doctor Portal Workspace */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute role="doctor">
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/doctor/patients" replace />} />
          <Route path="patients" element={<DoctorPortal />} />
          <Route path="schedule" element={<DoctorConsultations />} />
          <Route path="messages" element={<DoctorMessages />} />
          <Route path="patient/:id/query" element={<PatientQuery />} />
          <Route path="patient/:id/prescribe" element={<Prescribe />} />
          <Route path="patient/:id/chat" element={<PatientCommunication />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
