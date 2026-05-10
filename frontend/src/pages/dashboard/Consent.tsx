import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCardTilt } from '../../hooks/useCardTilt'
import { approveConsent, listConsents, revokeConsent, type ConsentResponse } from '../../lib/api'
import './Dashboard.css'
import './Consent.css'

export default function Consent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [consents, setConsents] = useState<ConsentResponse[]>([])
  const [error, setError] = useState('')
  const [terms, setTerms] = useState<Record<string, { price: string; expiresAt: string }>>({})

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

  const refresh = () => {
    listConsents()
      .then((data) => setConsents(data.consents))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load consent records'))
  }

  useEffect(refresh, [])

  const pending = consents.filter((c) => c.status === 'pending')
  const approved = consents.filter((c) => c.status === 'approved')
  const totalQueries = approved.reduce((sum, c) => sum + c.query_count, 0)
  const totalEarnings = approved.reduce((sum, c) => sum + c.query_count * c.price_per_query, 0)
  const activeRevenue = approved.reduce((sum, c) => sum + c.price_per_query, 0)

  const updateTerm = (id: string, patch: Partial<{ price: string; expiresAt: string }>) => {
    setTerms((current) => ({
      ...current,
      [id]: {
        price: current[id]?.price ?? '0.01',
        expiresAt: current[id]?.expiresAt ?? defaultDate,
        ...patch,
      },
    }))
  }

  const handleApprove = async (id: string) => {
    setError('')
    try {
      const term = terms[id] ?? { price: '0.01', expiresAt: defaultDate }
      await approveConsent(id, Number(term.price), term.expiresAt)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve consent')
    }
  }

  const handleRevoke = async (id: string) => {
    setError('')
    try {
      await revokeConsent(id)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke consent')
    }
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
          <div className="payment-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="eyebrow">x402 Query Rail</span>
          <span className="earnings-value">
            ${totalEarnings.toFixed(2)}
          </span>
          <span className="body-small">{totalQueries} settled queries · ${activeRevenue.toFixed(2)} active rate</span>
        </div>
      </div>

      <div className="x402-banner feat-card">
        <div>
          <span className="eyebrow">Payment Policy</span>
          <h2 className="display-card">CONSENT IS THE <span className="italic-accent">meter.</span></h2>
        </div>
        <p className="body-small">
          Each approved record sets a price-per-query. When x402 enforcement is enabled on the API,
          paid Qwen calls require a valid payment signature before the medical brain responds.
        </p>
        <div className="rail-line" aria-hidden="true">
          <span />
        </div>
      </div>

      {error && (
        <div className="no-alerts" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)' }}>
          {error}
        </div>
      )}

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
                      {(req.doctor_name || req.doctor_id).charAt(0)}
                    </div>
                    <div>
                      <div className="consent-name">{req.doctor_name || req.doctor_id}</div>
                      <div className="body-small">{req.institution || 'Institution not provided'}</div>
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
                    <span className="body-small">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="consent-price-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Price per Query (USD)</label>
                    <input
                      type="number"
                      className="input"
                      value={terms[req.id]?.price ?? '0.01'}
                      step="0.01"
                      min="0"
                      onChange={(e) => updateTerm(req.id, { price: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Access Expires</label>
                    <input
                      type="date"
                      className="input"
                      value={terms[req.id]?.expiresAt ?? defaultDate}
                      onChange={(e) => updateTerm(req.id, { expiresAt: e.target.value })}
                    />
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
                    onClick={() => handleRevoke(req.id)}
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
                    <div className="consent-avatar">{(req.doctor_name || req.doctor_id).charAt(0)}</div>
                    <div>
                      <div className="consent-name">{req.doctor_name || req.doctor_id}</div>
                      <div className="body-small">{req.institution}</div>
                    </div>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>

                <div className="x402-mini-rail" aria-label="x402 payment rail status">
                  <span className="live-dot" />
                  <span>402 payment required on paid Qwen query</span>
                  <strong>${req.price_per_query.toFixed(2)}</strong>
                </div>

                <div className="consent-stats">
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Queries</span>
                    <span className="consent-stat-value">{req.query_count}</span>
                  </div>
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Earned</span>
                    <span className="consent-stat-value text-success">${(req.query_count * req.price_per_query).toFixed(2)}</span>
                  </div>
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Price/Query</span>
                    <span className="consent-stat-value">${req.price_per_query.toFixed(2)}</span>
                  </div>
                  <div className="consent-stat">
                    <span className="eyebrow" style={{ fontSize: 9 }}>Expires</span>
                    <span className="consent-stat-value">{req.expires_at || 'No expiry'}</span>
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
