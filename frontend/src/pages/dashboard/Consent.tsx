import { useState, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCardTilt } from '../../hooks/useCardTilt'
import { mockPatientData } from '../../lib/api'
import './Dashboard.css'
import './Consent.css'

export default function Consent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { consent } = mockPatientData
  const [approved, setApproved] = useState(consent.approved)
  const [pending, setPending] = useState(consent.pendingRequests)

  const [defaultDate] = useState(() => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  useCardTilt()

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    gsap.set('.dash-page-title', { y: 30, opacity: 0 })
    gsap.set('.eyebrow', { y: 20, opacity: 0 })
    gsap.set('.feat-card', { y: 40, opacity: 0 })

    tl.to('.eyebrow', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.2)
      .to('.dash-page-title', { y: 0, opacity: 1, duration: 0.8 }, 0.4)
      .to('.feat-card', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.6)
  }, { scope: containerRef })

  const handleApprove = (id: string) => {
    const req = pending.find((r) => r.id === id)!
    setPending((p) => p.filter((r) => r.id !== id))
    setApproved((a) => [...a, {
      id,
      requesterName: req.requesterName,
      institution: req.institution,
      specialty: req.specialty,
      scope: req.scope,
      pricePerQuery: 0.01,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      queryCount: 0,
      earnings: 0,
    }])
  }

  const handleRevoke = (id: string) => {
    setApproved((a) => a.filter((r) => r.id !== id))
  }

  return (
    <div className="dash-page" id="dashboard-consent" ref={containerRef}>
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Consent & Access</span>
          <h1 className="display-section dash-page-title">
            YOU <span className="italic-accent">control</span> ACCESS.
          </h1>
        </div>
        <div className="consent-earnings feat-card">
          <span className="eyebrow">Monthly Earnings</span>
          <span className="earnings-value">
            ${consent.totalEarnings.toFixed(2)}
          </span>
          <span className="body-small">{consent.totalQueries} queries · X402 micropayments</span>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="consent-section">
          <div className="records-header">
            <span className="eyebrow">Pending Requests</span>
            <span className="badge badge-warning">{pending.length} awaiting</span>
          </div>
          <div className="records-list">
            {pending.map((req) => (
              <div key={req.id} className="consent-card feat-card" id={`consent-pending-${req.id}`}>
                <div className="consent-card-header">
                  <div className="consent-doctor-info">
                    <div className="consent-avatar">
                      {req.requesterName.charAt(0)}
                    </div>
                    <div>
                      <div className="consent-name">{req.requesterName}</div>
                      <div className="body-small">{req.institution} · {req.specialty}</div>
                    </div>
                  </div>
                  <span className="badge badge-warning">Pending</span>
                </div>

                <div className="consent-details">
                  <div className="consent-detail-item">
                    <span className="input-label">Scope Requested</span>
                    <span className="badge">{req.scope}</span>
                  </div>
                  <div className="consent-detail-item">
                    <span className="input-label">Requested</span>
                    <span className="body-small">{new Date(req.requestedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="consent-price-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Price per Query (USD)</label>
                    <input type="number" className="input" defaultValue="0.01" step="0.01" min="0" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Access Expires</label>
                    <input type="date" className="input" defaultValue={defaultDate} />
                  </div>
                </div>

                <div className="consent-actions">
                  <button
                    className="btn-primary"
                    onClick={() => handleApprove(req.id)}
                    id={`consent-approve-${req.id}`}
                  >
                    Approve Access
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setPending((p) => p.filter((r) => r.id !== req.id))}
                    id={`consent-deny-${req.id}`}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved access */}
      <div className="consent-section">
        <div className="records-header">
          <span className="eyebrow">Approved Access</span>
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
            {approved.length} active
          </span>
        </div>

        {approved.length === 0 ? (
          <div className="no-alerts body-small">
            No approved access. Doctors can request access from the Doctor Portal.
          </div>
        ) : (
          <div className="records-list">
            {approved.map((req) => (
              <div key={req.id} className="consent-card feat-card" id={`consent-approved-${req.id}`}>
                <div className="consent-card-header">
                  <div className="consent-doctor-info">
                    <div className="consent-avatar">{req.requesterName.charAt(0)}</div>
                    <div>
                      <div className="consent-name">{req.requesterName}</div>
                      <div className="body-small">{req.institution}</div>
                    </div>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>

                <div className="consent-stats">
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Queries</span>
                    <span className="consent-stat-value">{req.queryCount}</span>
                  </div>
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Earned</span>
                    <span className="consent-stat-value text-success">${req.earnings.toFixed(2)}</span>
                  </div>
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Price/Query</span>
                    <span className="consent-stat-value">${req.pricePerQuery.toFixed(2)}</span>
                  </div>
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Expires</span>
                    <span className="consent-stat-value">{req.expiresAt}</span>
                  </div>
                </div>

                <div className="consent-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handleRevoke(req.id)}
                    id={`consent-revoke-${req.id}`}
                    style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--color-danger)' }}
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
