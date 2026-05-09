import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Doctor.css'

const DEMO_PATIENTS = [
  { id: 'p-001', name: 'Anika Sharma', age: 47, conditions: ['Type 2 Diabetes', 'Hypertension'], lastVisit: '2024-03-14', vitasyncId: 'VS-4729-A', status: 'warning', lastAlert: 'Hyperglycemia detected' },
  { id: 'p-002', name: 'Rajan Mehta', age: 62, conditions: ['Cardiovascular', 'Dyslipidaemia'], lastVisit: '2024-02-28', vitasyncId: 'VS-8831-B', status: 'stable', lastAlert: null },
  { id: 'p-003', name: 'Priya Nair', age: 35, conditions: ['Hypothyroidism', 'Anaemia'], lastVisit: '2024-03-01', vitasyncId: 'VS-2210-C', status: 'stable', lastAlert: null },
]

const MONITORING_ALERTS = [
  { id: 'a1', patient: 'Anika Sharma', time: '12 min ago', type: 'ML Anomaly', severity: 'warning', body: 'Spike in glucose detected (XGBoost: 0.82)' },
  { id: 'a2', patient: 'Rajan Mehta', time: '1h ago', type: 'System', severity: 'stable', body: 'New lab report processed (HL7)' },
]

export default function DoctorPortal() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const filtered = DEMO_PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.vitasyncId.toLowerCase().includes(search.toLowerCase())
  )

  const handleScanQR = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      setActiveModal('QR_SUCCESS')
    }, 2000)
  }

  return (
    <div className="doctor-portal-wrapper">
      {/* Simulation Modals */}
      {isScanning && (
        <div className="simulation-overlay">
          <div className="scanner-view">
            <div className="scanner-line" />
            <div className="scanner-corners" />
            <span className="eyebrow" style={{ color: 'white', marginTop: 20 }}>ACCESSING CAMERA...</span>
          </div>
        </div>
      )}

      {activeModal === 'QR_SUCCESS' && (
        <div className="simulation-overlay" onClick={() => setActiveModal(null)}>
          <div className="aside-widget modal-content" onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 40 }}>✅</span>
            <h3 className="display-section" style={{ fontSize: 24, margin: '16px 0' }}>PATIENT FOUND</h3>
            <div className="patient-row-card" style={{ background: 'rgba(255,255,255,0.05)', width: '100%' }}>
              <div className="row-main">
                <div className="row-avatar">A</div>
                <div className="row-info">
                  <span className="patient-name">Anika Sharma</span>
                  <span className="id-badge">VS-4729-A</span>
                </div>
              </div>
            </div>
            <button className="btn-primary w-full" style={{ marginTop: 20 }} onClick={() => navigate('/doctor/patient/p-001/chat')}>OPEN HUB</button>
            <button className="btn-ghost w-full" onClick={() => setActiveModal(null)}>CLOSE</button>
          </div>
        </div>
      )}

      {activeModal === 'PENDING' && (
        <div className="simulation-overlay" onClick={() => setActiveModal(null)}>
          <div className="aside-widget modal-content" style={{ maxWidth: 400 }}>
             <h3 className="eyebrow">Production Module</h3>
             <p className="body-small" style={{ margin: '12px 0' }}>This clinical module requires a connection to the VitaSync Production Cloud for real-time data sync.</p>
             <button className="btn-secondary w-full" onClick={() => setActiveModal(null)}>ACKNOWLEDGE</button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace</span>
          <h1 className="display-section">PATIENT <span className="italic-accent">roster.</span></h1>
        </div>
        <div className="header-search">
          <div className="search-pill">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search patients, conditions, or IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="btn-secondary scan-btn"
            onClick={handleScanQR}
          >
            SCAN QR
          </button>
        </div>
      </header>

      <div className="doctor-content-grid">
        <section className="patient-list-section">
          <div className="list-controls">
            <span className="eyebrow">Active Records ({filtered.length})</span>
            <div className="filter-chips">
              <span className="badge active">All</span>
              <span className="badge" onClick={() => setActiveModal('PENDING')}>Warning</span>
              <span className="badge" onClick={() => setActiveModal('PENDING')}>Stable</span>
            </div>
          </div>

          <div className="patient-rows">
            {filtered.map((patient) => (
              <div key={patient.id} className="patient-row-card">
                <div className="row-main">
                  <div className="row-avatar">{patient.name.charAt(0)}</div>
                  <div className="row-info">
                    <div className="row-name-line">
                      <span className="patient-name">{patient.name}</span>
                      <span className="id-badge">{patient.vitasyncId}</span>
                    </div>
                    <div className="row-meta">
                      Age {patient.age} · Last seen {patient.lastVisit}
                    </div>
                  </div>
                  <div className="row-conditions">
                    {patient.conditions.map(c => <span key={c} className="condition-tag">{c}</span>)}
                  </div>
                </div>

                <div className="row-actions">
                  {patient.lastAlert && (
                    <div className="row-alert">
                      <div className="live-dot pulse-warning" />
                      <span>{patient.lastAlert}</span>
                    </div>
                  )}
                  <div className="action-buttons">
                    <button className="row-btn primary" onClick={() => navigate(`/doctor/patient/${patient.id}/chat`)}>MESSAGE</button>
                    <button className="row-btn" onClick={() => navigate(`/doctor/patient/${patient.id}/prescribe`)}>AUDIT</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="doctor-aside">
          <div className="aside-widget monitor-widget">
            <div className="widget-header">
              <span className="eyebrow">Real-Time Monitor</span>
              <div className="live-indicator">
                <div className="live-dot" />
                <span>LIVE</span>
              </div>
            </div>
            <div className="alert-stream">
              {MONITORING_ALERTS.map(alert => (
                <div key={alert.id} className={`stream-item ${alert.severity}`}>
                  <div className="stream-header">
                    <span className="stream-patient">{alert.patient}</span>
                    <span className="stream-time">{alert.time}</span>
                  </div>
                  <p className="stream-body">{alert.body}</p>
                </div>
              ))}
            </div>
            <button className="btn-ghost w-full" onClick={() => setActiveModal('PENDING')}>VIEW LOGS →</button>
          </div>

          <div className="aside-widget workspace-widget">
            <span className="eyebrow">Quick Access</span>
            <div className="workspace-grid">
              <button className="workspace-btn" onClick={() => navigate('/doctor/schedule')}>
                <span className="ws-icon">📅</span>
                <span className="ws-label">Schedule</span>
              </button>
              <button className="workspace-btn" onClick={() => setActiveModal('PENDING')}>
                <span className="ws-icon">📝</span>
                <span className="ws-label">Templates</span>
              </button>
              <button className="workspace-btn" onClick={() => setActiveModal('PENDING')}>
                <span className="ws-icon">📊</span>
                <span className="ws-label">Analytics</span>
              </button>
              <button className="workspace-btn" onClick={() => setActiveModal('PENDING')}>
                <span className="ws-icon">⚙️</span>
                <span className="ws-label">Settings</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
