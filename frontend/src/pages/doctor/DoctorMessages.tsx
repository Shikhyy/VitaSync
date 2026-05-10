import { Link } from 'react-router-dom'
import './Doctor.css'

export default function DoctorMessages() {
  return (
    <div className="doctor-portal-wrapper">
      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace</span>
          <h1 className="display-section">PATIENT <span className="italic-accent">messages.</span></h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 4 }}>
            Conversation threads open from approved patient records. Empty means no messages exist yet.
          </p>
        </div>
      </header>

      <div className="patient-list-section" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="patient-rows">
          <div className="patient-row-card">
            <div className="row-main">
              <div className="row-avatar">0</div>
              <div className="row-info">
                <span className="patient-name">No active conversations</span>
                <div className="row-meta">Open an approved patient from the access ledger to start secure messaging.</div>
              </div>
              <Link to="/doctor/patients" className="row-btn primary" style={{ textDecoration: 'none' }}>ACCESS LEDGER</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
