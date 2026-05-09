import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { usePatientStore } from '../stores/patientStore'
import './Nav.css'

export default function Nav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()
  const { unreadAlertCount } = usePatientStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/doctor')

  // Close menu when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen((prev) => {
      if (prev) return false
      return prev
    })
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="nav-inner container">
        {/* Logo */}
        <Link to="/" className="nav-logo" aria-label="VitaSync home">
          <span className="nav-logo-dot" aria-hidden="true" />
          <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links" role="list">
          {!isDashboard ? (
            <>
              <a href="/#features" className="nav-link" role="listitem">Features</a>
              <a href="/#agents" className="nav-link" role="listitem">Agents</a>
              <Link to="/about" className="nav-link" role="listitem">About</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-link" role="listitem">GitHub</a>
            </>
          ) : (
            <>
              <Link to="/dashboard/overview" className={`nav-link ${location.pathname === '/dashboard/overview' ? 'active' : ''}`}>Overview</Link>
              <Link to="/dashboard/records" className={`nav-link ${location.pathname === '/dashboard/records' ? 'active' : ''}`}>Records</Link>
              <Link to="/dashboard/insights" className={`nav-link ${location.pathname === '/dashboard/insights' ? 'active' : ''}`}>Insights</Link>
              <Link to="/dashboard/consent" className={`nav-link ${location.pathname === '/dashboard/consent' ? 'active' : ''}`}>Consent</Link>
              <Link to="/dashboard/alerts" className={`nav-link ${location.pathname === '/dashboard/alerts' ? 'active' : ''}`}>
                Alerts {unreadAlertCount > 0 && <span className="alert-badge">{unreadAlertCount}</span>}
              </Link>
            </>
          )}
        </div>

        {/* CTAs */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <span className="nav-user-name">{user?.fullName?.split(' ')[0]}</span>
              <button className="btn-ghost nav-btn" onClick={handleLogout} id="nav-logout-btn">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/onboard/signup" className="btn-ghost nav-btn" id="nav-signin-btn">Sign In</Link>
              <Link to="/onboard/signup" className="btn-primary nav-btn" id="nav-getstarted-btn">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          id="nav-hamburger-btn"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="nav-mobile" role="dialog" aria-label="Mobile navigation">
          <a href="/#features" className="nav-mobile-link">Features</a>
          <a href="/#agents" className="nav-mobile-link">Agents</a>
          <Link to="/about" className="nav-mobile-link">About</Link>
          {isAuthenticated ? (
            <button className="nav-mobile-link" onClick={handleLogout}>Sign Out</button>
          ) : (
            <Link to="/onboard/signup" className="nav-mobile-link">Get Started</Link>
          )}
        </div>
      )}
    </nav>
  )
}
