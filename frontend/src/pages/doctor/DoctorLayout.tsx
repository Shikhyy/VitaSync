import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import './DoctorLayout.css'

const DOCTOR_NAV_ITEMS = [
  { to: '/doctor/patients', label: 'Patients', icon: '👥', id: 'nav-doc-patients' },
  { to: '/doctor/schedule', label: 'Schedule', icon: '📅', id: 'nav-doc-schedule' },
  { to: '/doctor/messages', label: 'Messages', icon: '💬', id: 'nav-doc-messages' },
]

export default function DoctorLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const copyUserId = async () => {
    if (!user?.id) return
    await navigator.clipboard?.writeText(user.id)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const displayId = user?.id ? user.id.split('-')[0] || user.id.slice(0, 8) : ''

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Clinician navigation">
        <div className="dash-sidebar-header">
          <Link to="/" className="dash-logo" style={{ textDecoration: 'none' }}>
            <span className="nav-logo-dot" />
            <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
          </Link>
          <button
            className="dash-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* User */}
        <div className="dash-user">
          <div className="dash-user-avatar">
            {user?.fullName?.charAt(0) || 'D'}
          </div>
          <div className="dash-user-info">
            <div className="dash-user-name">{user?.fullName || 'Doctor'}</div>
            <div className="dash-user-role badge">Clinician</div>
            {user?.id && (
              <button className="dash-id-card" onClick={copyUserId} title={`Copy doctor ID: ${user.id}`} type="button">
                <span className="dash-id-label">Doctor ID</span>
                <span className="dash-id-value">{displayId}</span>
                <span className="dash-id-action">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="dash-nav">
          {DOCTOR_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}
              id={item.id}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span className="dash-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <button className="dash-nav-item dash-logout" onClick={handleLogout}>
            <span className="dash-nav-icon">→</span>
            <span className="dash-nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="dash-main">
        {/* Top bar (mobile) */}
        <header className="dash-topbar">
          <button className="dash-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <Link to="/" className="dash-logo" style={{ textDecoration: 'none' }}>
            <span className="nav-logo-dot" />
            <span className="nav-logo-text" style={{ fontSize: 16 }}>VITA<span className="nav-logo-accent">SYNC</span></span>
          </Link>
          <div className="dash-topbar-actions">
            <div className="live-dot" />
            <button className="dash-topbar-id" onClick={copyUserId} type="button" title="Copy doctor ID">
              {copied ? 'Copied' : `ID ${displayId || 'pending'}`}
            </button>
          </div>
        </header>

        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
