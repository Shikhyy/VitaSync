import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Doctor.css'

const DEMO_PATIENTS = [
  { id: 'p-001', name: 'Anika Sharma', age: 47, conditions: ['Type 2 Diabetes', 'Hypertension'], lastVisit: '2024-03-14', vitasyncId: 'VS-4729-A' },
  { id: 'p-002', name: 'Rajan Mehta', age: 62, conditions: ['Cardiovascular Disease', 'Dyslipidaemia'], lastVisit: '2024-02-28', vitasyncId: 'VS-8831-B' },
  { id: 'p-003', name: 'Priya Nair', age: 35, conditions: ['Hypothyroidism', 'Anaemia'], lastVisit: '2024-03-01', vitasyncId: 'VS-2210-C' },
]

export default function DoctorPortal() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [qrMode, setQrMode] = useState(false)

  const filtered = DEMO_PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.vitasyncId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="doctor-portal" id="doctor-portal">
      <nav className="nav" aria-label="Doctor portal navigation">
        <div className="nav-inner container">
          <div className="nav-logo">
            <span className="nav-logo-dot" />
            <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
            <span className="badge" style={{ marginLeft: 12 }}>Doctor Portal</span>
          </div>
          <div className="nav-actions">
            <a href="/dashboard/overview" className="btn-ghost nav-btn">Patient View</a>
          </div>
        </div>
      </nav>

      <main className="container doctor-main" id="main-content">
        <div className="dash-page-header" style={{ marginTop: 'var(--space-2xl)' }}>
          <div>
            <span className="eyebrow">Clinician Dashboard</span>
            <h1 className="display-section dash-page-title">
              PATIENT <span className="italic-accent">search.</span>
            </h1>
          </div>
        </div>

        {/* Search */}
        <div className="doctor-search feat-card">
          <div className="doctor-search-row">
            <div style={{ flex: 1 }}>
              <label htmlFor="patient-search" className="input-label">Search Patient</label>
              <input
                id="patient-search"
                className="input"
                placeholder="Patient name or VitaSync ID (VS-XXXX-X)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="btn-secondary"
              onClick={() => setQrMode(!qrMode)}
              id="doctor-qr-btn"
              style={{ alignSelf: 'flex-end' }}
            >
              📷 Scan QR
            </button>
          </div>

          {qrMode && (
            <div className="qr-scanner-mock">
              <div className="qr-frame" aria-label="QR scanner placeholder">
                <div className="qr-corner tl" /><div className="qr-corner tr" />
                <div className="qr-corner bl" /><div className="qr-corner br" />
                <span className="eyebrow" style={{ color: 'var(--bd-orange)' }}>QR Scanner Active</span>
                <span className="body-small">Patient shares QR from their dashboard</span>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="doctor-patients">
          <div className="records-header">
            <span className="eyebrow">Patients with Approved Access</span>
            <span className="body-small" style={{ color: 'var(--bd-muted)' }}>{filtered.length} patient{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="records-list">
            {filtered.map((patient) => (
              <div key={patient.id} className="patient-card feat-card" id={`patient-${patient.id}`}>
                <div className="patient-avatar">{patient.name.charAt(0)}</div>
                <div className="patient-info">
                  <div className="patient-name-row">
                    <span className="patient-name">{patient.name}</span>
                    <span className="badge">{patient.vitasyncId}</span>
                  </div>
                  <div className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 2 }}>
                    Age {patient.age} · Last visit: {patient.lastVisit}
                  </div>
                  <div className="patient-conditions">
                    {patient.conditions.map((c) => <span key={c} className="badge">{c}</span>)}
                  </div>
                </div>
                <div className="patient-actions">
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/doctor/patient/${patient.id}/query`)}
                    id={`patient-query-btn-${patient.id}`}
                  >
                    Query Brain
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate(`/doctor/patient/${patient.id}/prescribe`)}
                    id={`patient-prescribe-btn-${patient.id}`}
                  >
                    Drug Check
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
