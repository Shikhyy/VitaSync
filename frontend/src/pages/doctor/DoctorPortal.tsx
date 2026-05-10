import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listConsents, requestConsent, type ConsentResponse } from '../../lib/api'
import './Doctor.css'

export default function DoctorPortal() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [patientId, setPatientId] = useState('')
  const [scope, setScope] = useState('Full history')
  const [consents, setConsents] = useState<ConsentResponse[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = () => {
    listConsents()
      .then((data) => setConsents(data.consents))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load patient access'))
  }

  useEffect(refresh, [])

  const filtered = useMemo(() => {
    const needle = search.toLowerCase()
    return consents.filter((consent) =>
      consent.patient_id.toLowerCase().includes(needle) ||
      consent.scope.toLowerCase().includes(needle) ||
      consent.status.toLowerCase().includes(needle)
    )
  }, [consents, search])

  const approved = filtered.filter((consent) => consent.status === 'approved')
  const pending = filtered.filter((consent) => consent.status === 'pending')

  const handleRequest = async () => {
    if (!patientId.trim()) return
    setLoading(true)
    setError('')
    try {
      await requestConsent(patientId.trim(), scope)
      setPatientId('')
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consent request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="doctor-portal-wrapper">
      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace</span>
          <h1 className="display-section">ACCESS <span className="italic-accent">ledger.</span></h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 4 }}>
            Only patients with approved consent appear here. The roster is never prefilled.
          </p>
        </div>
        <div className="header-search">
          <div className="x402-status-pill">
            <span className="live-dot" />
            <span>x402 metered</span>
          </div>
          <div className="search-pill">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search patient IDs, scopes, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="no-alerts" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)' }}>
          {error}
        </div>
      )}

      <div className="doctor-content-grid">
        <section className="patient-list-section">
          <div className="list-controls">
            <span className="eyebrow">Approved Records ({approved.length})</span>
            <div className="filter-chips">
              <span className="badge active">Live consent only</span>
            </div>
          </div>

          <div className="patient-rows">
            {approved.length === 0 && (
              <div className="patient-row-card">
                <div className="row-main">
                  <div className="row-avatar">0</div>
                  <div className="row-info">
                    <span className="patient-name">No approved patient access yet</span>
                    <div className="row-meta">Request consent using a real patient UUID. Once approved, the Qwen query and drug audit actions unlock here.</div>
                  </div>
                </div>
              </div>
            )}

            {approved.map((consent) => (
              <div key={consent.id} className="patient-row-card">
                <div className="row-rail" aria-hidden="true" />
                <div className="row-main">
                  <div className="row-avatar">{consent.patient_id.slice(0, 2).toUpperCase()}</div>
                  <div className="row-info">
                    <div className="row-name-line">
                      <span className="patient-name">Patient {consent.patient_id.slice(0, 8)}</span>
                      <span className="id-badge">{consent.patient_id}</span>
                    </div>
                    <div className="row-meta">
                      Scope: {consent.scope} · Expires {consent.expires_at || 'not set'}
                    </div>
                  </div>
                  <div className="row-conditions">
                    <span className="condition-tag">Approved</span>
                    <span className="condition-tag">${consent.price_per_query.toFixed(2)} / query</span>
                  </div>
                </div>

                <div className="row-actions">
                  <div className="row-alert">
                    <div className="live-dot" />
                    <span>Qwen access ready · x402 ${consent.price_per_query.toFixed(2)}</span>
                  </div>
                  <div className="action-buttons">
                    <button className="row-btn primary" onClick={() => navigate(`/doctor/patient/${consent.patient_id}/query`)}>QUERY</button>
                    <button className="row-btn" onClick={() => navigate(`/doctor/patient/${consent.patient_id}/prescribe`)}>AUDIT</button>
                    <button className="row-btn" onClick={() => navigate(`/doctor/patient/${consent.patient_id}/chat`)}>MESSAGE</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="doctor-aside">
          <div className="aside-widget monitor-widget">
            <div className="widget-header">
              <span className="eyebrow">Request Access</span>
              <span className="badge">{pending.length} pending</span>
            </div>
            <div className="payment-stack">
              <span>1. Request consent</span>
              <span>2. Patient sets query price</span>
              <span>3. x402 signature unlocks Qwen</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="input-label">Patient UUID</label>
              <input className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Paste patient account ID" />
              <label className="input-label">Scope</label>
              <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option>Full history</option>
                <option>Last 12 months</option>
                <option>Medication and allergies</option>
                <option>Lab trends only</option>
              </select>
              <button className="btn-primary w-full" onClick={handleRequest} disabled={loading || !patientId.trim()}>
                {loading ? 'Requesting...' : 'Request Consent'}
              </button>
            </div>
          </div>

          <div className="aside-widget workspace-widget">
            <span className="eyebrow">Pending Requests</span>
            <div className="alert-stream" style={{ marginTop: 12 }}>
              {pending.length === 0 ? (
                <p className="body-small" style={{ color: 'var(--bd-muted)' }}>No outstanding consent requests.</p>
              ) : pending.map((consent) => (
                <div key={consent.id} className="stream-item stable">
                  <div className="stream-header">
                    <span className="stream-patient">{consent.patient_id.slice(0, 8)}</span>
                    <span className="stream-time">pending</span>
                  </div>
                  <p className="stream-body">{consent.scope}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
