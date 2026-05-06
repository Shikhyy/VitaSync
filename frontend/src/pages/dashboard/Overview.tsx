import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCardTilt } from '../../hooks/useCardTilt'
import { usePatientStore } from '../../stores/patientStore'
import { mockPatientData } from '../../lib/api'
import './Dashboard.css'

const TREND_ICON = { up: '↑', down: '↓', stable: '→' }
const TREND_CLASS = { up: 'text-warning', down: 'text-success', stable: 'text-muted' }

export default function DashboardOverview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { riskScores, setDocuments } = usePatientStore()
  const { overview } = mockPatientData
  
  useCardTilt()

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    // Reset initial states
    gsap.set('.dash-page-title', { y: 30, opacity: 0 })
    gsap.set('.eyebrow', { y: 20, opacity: 0 })
    gsap.set('.dash-header-actions', { opacity: 0 })
    gsap.set('.feat-card', { y: 40, opacity: 0 })
    gsap.set('.ml-bar-fill', { scaleX: 0 })

    tl.to('.eyebrow', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.2)
      .to('.dash-page-title', { y: 0, opacity: 1, duration: 0.8 }, 0.4)
      .to('.dash-header-actions', { opacity: 1, duration: 0.8 }, 0.6)
      .to('.feat-card', { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.8)
      .to('.ml-bar-fill', { scaleX: 1, duration: 1.5, ease: 'power2.out', stagger: 0.1 }, 1.2)
  }, { scope: containerRef })

  useEffect(() => {
    setDocuments(mockPatientData.documents)
  }, [setDocuments])

  const riskItems = [
    { label: 'Diabetes Risk', value: riskScores.diabetes, color: riskScores.diabetes > 0.5 ? 'alert' : riskScores.diabetes > 0.3 ? 'borderline' : 'normal' },
    { label: 'Cardiovascular Risk', value: riskScores.cardiovascular, color: riskScores.cardiovascular > 0.5 ? 'alert' : riskScores.cardiovascular > 0.3 ? 'borderline' : 'normal' },
    { label: 'Kidney Disease Risk', value: riskScores.ckd, color: riskScores.ckd > 0.5 ? 'alert' : riskScores.ckd > 0.3 ? 'borderline' : 'normal' },
  ]

  const unreadAlerts = mockPatientData.alerts.filter((a) => !a.isRead)

  return (
    <div className="dash-page" id="dashboard-overview" ref={containerRef}>
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Patient Dashboard</span>
          <h1 className="display-section dash-page-title">
            YOUR <span className="italic-accent">health</span> BRAIN.
          </h1>
        </div>
        <div className="dash-header-actions">
          <div className="live-dot" />
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Monitoring active</span>
        </div>
      </div>

      <div className="overview-grid">
        {/* Health Summary */}
        <div className="feat-card overview-summary">
          <span className="eyebrow">Active Conditions</span>
          <div className="condition-list">
            {overview.conditions.map((c) => (
              <span key={c} className="badge">{c}</span>
            ))}
          </div>

          <div className="divider" />

          <span className="eyebrow">Current Medications</span>
          <div className="medication-list">
            {overview.medications.map((m) => (
              <div key={m.name} className="medication-item">
                <span className="med-name">{m.name}</span>
                <span className="body-small">{m.dosage} · {m.frequency}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ML Risk Panel */}
        <div className="feat-card overview-risk">
          <div className="risk-header">
            <span className="eyebrow">ML Risk Engine</span>
            <span className="badge">XGBoost v2.0</span>
          </div>

          <div className="risk-list">
            {riskItems.map((item, i) => (
              <div key={item.label} className="risk-item" style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="risk-item-header">
                  <span className="risk-label body-small">{item.label}</span>
                  <span className={`risk-value ${item.color === 'alert' ? 'text-danger' : item.color === 'borderline' ? 'text-warning' : 'text-success'}`}>
                    {Math.round(item.value * 100)}%
                  </span>
                </div>
                <div className="ml-bar-track">
                  <div
                    className={`ml-bar-fill ${item.color}`}
                    style={{ width: `${item.value * 100}%` }}
                  />
                </div>
                <span className="risk-class body-small">
                  {item.color === 'alert' ? '⚠ High' : item.color === 'borderline' ? '~ Moderate' : '✓ Low'}
                </span>
              </div>
            ))}
          </div>

          <p className="body-small risk-footnote">
            Based on last 12 lab results. Updated every 10 minutes.
          </p>
        </div>

        {/* Latest Labs */}
        <div className="feat-card overview-labs">
          <span className="eyebrow">Latest Lab Results</span>
          <div className="lab-list">
            {overview.lastLabResults.map((lab) => (
              <div key={lab.name} className="lab-item">
                <div className="lab-name-row">
                  <span className="lab-name">{lab.name}</span>
                  <span className={`lab-trend ${TREND_CLASS[lab.trend as keyof typeof TREND_CLASS]}`}>
                    {TREND_ICON[lab.trend as keyof typeof TREND_ICON]}
                  </span>
                </div>
                <div className="lab-value-row">
                  <span className="lab-value">{lab.value} <span className="lab-unit">{lab.unit}</span></span>
                  <span className="body-small">{lab.date}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/dashboard/insights" className="btn-secondary" style={{ marginTop: 'auto' }} id="overview-view-trends-btn">
            View Trends →
          </Link>
        </div>

        {/* Recent Alerts */}
        <div className="feat-card overview-alerts">
          <div className="risk-header">
            <span className="eyebrow">Recent Alerts</span>
            {unreadAlerts.length > 0 && (
              <span className="badge badge-warning">{unreadAlerts.length} unread</span>
            )}
          </div>

          <div className="alert-list">
            {unreadAlerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className={`alert-item alert-${alert.severity}`}>
                <div className="alert-item-header">
                  <span className="alert-item-title">{alert.title}</span>
                  <span className={`badge badge-${alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : ''}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="body-small alert-item-body">{alert.body.slice(0, 100)}…</p>
                {alert.mlScore !== undefined && (
                  <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
                    ML score: {(alert.mlScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
            {unreadAlerts.length === 0 && (
              <div className="no-alerts body-small">
                <span>✓</span> No active alerts. System is monitoring.
              </div>
            )}
          </div>

          <Link to="/dashboard/alerts" className="btn-ghost" id="overview-view-alerts-btn">
            View All Alerts →
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="feat-card overview-actions">
          <span className="eyebrow">Quick Actions</span>
          <div className="quick-actions">
            <Link to="/dashboard/records" className="quick-action-btn" id="overview-upload-btn">
              <span className="quick-action-icon">📤</span>
              <span>Upload Records</span>
            </Link>
            <Link to="/dashboard/consent" className="quick-action-btn" id="overview-consent-btn">
              <span className="quick-action-icon">🔐</span>
              <span>Manage Consent</span>
            </Link>
            <Link to="/dashboard/insights" className="quick-action-btn" id="overview-insights-btn">
              <span className="quick-action-icon">📊</span>
              <span>View Insights</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
