import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import { useAuthStore } from './stores/authStore'

const Landing = lazy(() => import('./pages/Landing'))
const About = lazy(() => import('./pages/About'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const Wizard = lazy(() => import('./pages/auth/Wizard'))
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const Overview = lazy(() => import('./pages/dashboard/Overview'))
const Records = lazy(() => import('./pages/dashboard/Records'))
const Insights = lazy(() => import('./pages/dashboard/Insights'))
const Consent = lazy(() => import('./pages/dashboard/Consent'))
const Alerts = lazy(() => import('./pages/dashboard/Alerts'))
const Consultations = lazy(() => import('./pages/dashboard/Consultations'))
const DoctorLayout = lazy(() => import('./pages/doctor/DoctorLayout'))
const DoctorPortal = lazy(() => import('./pages/doctor/DoctorPortal'))
const DoctorConsultations = lazy(() => import('./pages/doctor/DoctorConsultations'))
const DoctorMessages = lazy(() => import('./pages/doctor/DoctorMessages'))
const PatientQuery = lazy(() => import('./pages/doctor/PatientQuery'))
const Prescribe = lazy(() => import('./pages/doctor/Prescribe'))
const PatientCommunication = lazy(() => import('./pages/doctor/PatientCommunication'))

function ProtectedRoute({ children, role }: { children: ReactNode; role?: 'patient' | 'doctor' }) {
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
      <Suspense fallback={<RouteLoader />}>
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
      </Suspense>
    </>
  )
}

function RouteLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bd-ink)', color: 'var(--bd-cream)' }}>
      <div className="loading-pipeline">
        <div className="pipeline-step">
          <div className="live-dot" />
          <span className="body-small">Loading VitaSync workspace...</span>
        </div>
      </div>
    </div>
  )
}
