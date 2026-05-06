import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { usePatientStore } from '../../stores/patientStore'
import { useAlertWebSocket } from '../../hooks/useAlertWebSocket'
import './DashboardLayout.css'

const NAV_ITEMS = [
  { to: '/dashboard/overview', label: 'Overview', icon: '◈', id: 'nav-overview' },
  { to: '/dashboard/records', label: 'Records', icon: '📁', id: 'nav-records' },
  { to: '/dashboard/insights', label: 'Insights', icon: '📊', id: 'nav-insights' },
  { to: '/dashboard/consent', label: 'Consent', icon: '🔐', id: 'nav-consent' },
  { to: '/dashboard/alerts', label: 'Alerts', icon: '🔔', id: 'nav-alerts' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const { unreadAlertCount } = usePatientStore()
  const navigate = useNavigate()
  useAlertWebSocket()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Dashboard navigation">
        <div className="dash-sidebar-header">
          <div className="dash-logo">
            <span className="nav-logo-dot" />
            <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
          </div>
          <button
            className="dash-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            id="dash-sidebar-close-btn"
          >
            ✕
          </button>
        </div>

        {/* User */}
        <div className="dash-user">
          <div className="dash-user-avatar">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="dash-user-info">
            <div className="dash-user-name">{user?.fullName || 'User'}</div>
            <div className="dash-user-role badge">{user?.role || 'patient'}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="dash-nav" aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}
              id={item.id}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="dash-nav-icon" role="img" aria-label={item.label}>{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
              {item.label === 'Alerts' && unreadAlertCount > 0 && (
                <span className="dash-nav-badge">{unreadAlertCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <NavLink to="/doctor" className="dash-nav-item" id="nav-doctor-portal">
            <span className="dash-nav-icon" role="img" aria-label="Doctor Portal">🩺</span>
            <span className="dash-nav-label">Doctor Portal</span>
          </NavLink>
          <button className="dash-nav-item dash-logout" onClick={handleLogout} id="dash-logout-btn">
            <span className="dash-nav-icon" aria-hidden="true">→</span>
            <span className="dash-nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="dash-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <div className="dash-main">
        {/* Top bar (mobile) */}
        <header className="dash-topbar">
          <button
            className="dash-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            id="dash-hamburger-btn"
          >
            ☰
          </button>
          <div className="dash-logo">
            <span className="nav-logo-dot" />
            <span className="nav-logo-text" style={{ fontSize: 16 }}>VITA<span className="nav-logo-accent">SYNC</span></span>
          </div>
          <div className="dash-topbar-actions">
            <div className="live-dot" aria-label="System online" />
            <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Live</span>
          </div>
        </header>

        <main id="main-content" className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
