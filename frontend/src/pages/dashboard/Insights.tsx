import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDocuments, type IngestDocument } from '../../lib/api'
import './Dashboard.css'
import './Insights.css'

export default function Insights() {
  const [documents, setDocuments] = useState<IngestDocument[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load insight inputs'))
  }, [])

  const entityCount = documents.reduce((sum, doc) => sum + doc.entity_count, 0)
  const readyForInsights = documents.length > 0 && entityCount > 0

  return (
    <div className="dash-page" id="dashboard-insights">
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Health Insights</span>
          <h1 className="display-section dash-page-title">
            REAL <span className="italic-accent">signals.</span>
          </h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 6 }}>
            This page only renders analytics from uploaded records. No synthetic lab trends are displayed.
          </p>
        </div>
      </div>

      {error && (
        <div className="no-alerts" style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)' }}>
          {error}
        </div>
      )}

      <div className="risk-bars-grid">
        <div className="feat-card risk-bar-item">
          <span className="eyebrow">Uploaded Records</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, color: 'var(--bd-orange)', letterSpacing: 2 }}>
            {documents.length}
          </span>
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Files processed by the ingestion API</span>
        </div>
        <div className="feat-card risk-bar-item">
          <span className="eyebrow">Extracted Entities</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, color: 'var(--color-success)', letterSpacing: 2 }}>
            {entityCount}
          </span>
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Conditions, drugs, labs, values, and dosages</span>
        </div>
        <div className="feat-card risk-bar-item">
          <span className="eyebrow">Model Readiness</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: readyForInsights ? 'var(--color-success)' : 'var(--bd-muted)', letterSpacing: 2 }}>
            {readyForInsights ? 'READY' : 'NEEDS DATA'}
          </span>
          <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Risk charts unlock once real longitudinal labs are persisted</span>
        </div>
      </div>

      <div className="chart-card feat-card">
        <div className="chart-card-header">
          <div>
            <span className="eyebrow">Clinical Trend Engine</span>
            <div className="chart-trend">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: 2, color: 'var(--bd-cream)' }}>
                {readyForInsights ? 'DATA INGESTED' : 'NO TREND DATA'}
              </span>
            </div>
          </div>
          <Link to="/dashboard/records" className="btn-primary">Upload Records</Link>
        </div>
        <div className="no-alerts body-small">
          Longitudinal charts are intentionally hidden until VitaSync has real dated lab observations from uploaded records. This avoids showing fabricated clinical trends.
        </div>
      </div>
    </div>
  )
}
