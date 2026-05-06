import { usePatientStore } from '../../stores/patientStore'
import { mockPatientData } from '../../lib/api'
import './Dashboard.css'

const SEVERITY_STYLES = {
  info: { badge: '', icon: 'ℹ', border: 'rgba(96,165,250,0.2)', bg: 'rgba(96,165,250,0.04)' },
  warning: { badge: 'badge-warning', icon: '⚠', border: 'rgba(251,191,36,0.2)', bg: 'rgba(251,191,36,0.04)' },
  critical: { badge: 'badge-danger', icon: '🚨', border: 'rgba(248,113,113,0.2)', bg: 'rgba(248,113,113,0.04)' },
}

export default function Alerts() {
  const { markAlertRead } = usePatientStore()
  const alerts = mockPatientData.alerts

  return (
    <div className="dash-page" id="dashboard-alerts">
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Monitoring Alerts</span>
          <h1 className="display-section dash-page-title">
            YOUR <span className="italic-accent">health</span> WATCH.
          </h1>
        </div>
        <div className="dash-header-actions">
          <div className="live-dot" />
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
            Agent checks every 10 minutes
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className="feat-card agent-info">
        <div className="agent-info-inner">
          <span className="agent-info-icon" role="img" aria-label="Monitor">🤖</span>
          <div>
            <span className="eyebrow">Continuous Monitoring Agent</span>
            <p className="body-small" style={{ marginTop: 4 }}>
              XGBoost classifies every new lab result in &lt;50ms. The LLM is only invoked when a classification score
              exceeds <code className="code-inline">0.65</code>. Alerts are delivered here in real-time via WebSocket.
            </p>
          </div>
        </div>
      </div>

      {/* Alerts list */}
      <div className="alert-feed">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <span>✓</span> No alerts. Your monitoring agent is watching.
          </div>
        ) : (
          alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES]
            return (
              <div
                key={alert.id}
                className="alert-full-card"
                style={{ borderColor: style.border, background: style.bg }}
                id={`alert-${alert.id}`}
              >
                <div className="alert-full-header">
                  <div className="alert-full-title-row">
                    <span className="alert-full-icon" role="img" aria-label={alert.severity}>{style.icon}</span>
                    <span className="alert-full-title">{alert.title}</span>
                    {!alert.isRead && <span className="alert-unread-dot" aria-label="Unread" />}
                  </div>
                  <div className="alert-full-meta">
                    <span className={`badge ${style.badge}`}>{alert.severity}</span>
                    <span className="badge">{alert.type.replace('_', ' ')}</span>
                    {alert.mlScore !== undefined && (
                      <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
                        ML: {(alert.mlScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                <p className="alert-full-body body-text">{alert.body}</p>

                <div className="alert-full-footer">
                  <span className="body-small" style={{ color: 'var(--bd-muted)' }}>
                    {new Date(alert.createdAt).toLocaleString()}
                    {alert.sourceLabName && ` · Lab: ${alert.sourceLabName}`}
                  </span>
                  {!alert.isRead && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '6px 14px' }}
                      onClick={() => markAlertRead(alert.id)}
                      id={`alert-mark-read-${alert.id}`}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
