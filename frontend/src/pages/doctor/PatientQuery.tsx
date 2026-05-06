import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { mockDoctorQueryResponse } from '../../lib/api'
import './Doctor.css'

const SAMPLE_QUESTIONS = [
  'Does this patient have any history of cardiac events?',
  'What medications is the patient currently taking? Any drug interactions to watch for?',
  'What are the trends in HbA1c over the past 2 years?',
  'Is the patient at high risk for chronic kidney disease?',
  'Summarise the patient\'s complete medical history for a new specialist.',
]

export default function PatientQuery() {
  const { id } = useParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<typeof mockDoctorQueryResponse | null>(null)

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return
    setLoading(true)
    setResponse(null)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1800 + Math.random() * 800))
    const res = { ...mockDoctorQueryResponse }
    setResponse(res)
    setLoading(false)
  }

  return (
    <div className="doctor-query-page" id="doctor-query-page">
      <nav className="nav" aria-label="Doctor query navigation">
        <div className="nav-inner container">
          <div className="nav-logo">
            <span className="nav-logo-dot" />
            <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
          </div>
          <div className="nav-links">
            <Link to="/doctor" className="nav-link">← All Patients</Link>
            <Link to={`/doctor/patient/${id}/prescribe`} className="nav-link">Drug Check</Link>
          </div>
        </div>
      </nav>

      <main className="container query-main" id="main-content">
        <div className="query-layout">
          {/* Query panel */}
          <div className="query-panel">
            <div className="query-header">
              <span className="eyebrow">Patient ID: VS-4729-A</span>
              <h1 className="display-section" style={{ fontSize: 36, letterSpacing: 2 }}>
                ASK THE <span className="italic-accent">brain.</span>
              </h1>
              <p className="body-small" style={{ color: 'var(--bd-muted)' }}>
                Qwen 72B · PubMedBERT RAG · X402 gated · All inference on-premise
              </p>
            </div>

            <div className="query-input-area feat-card">
              <label htmlFor="query-input" className="input-label">Clinical Question</label>
              <textarea
                id="query-input"
                className="input query-textarea"
                placeholder="e.g. Does this patient have any history of cardiac events?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(query)
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="body-small" style={{ color: 'var(--bd-muted)' }}>⌘ + Enter to submit</span>
                <button
                  className="btn-primary"
                  onClick={() => handleSubmit(query)}
                  disabled={loading || !query.trim()}
                  id="query-submit-btn"
                >
                  {loading ? <><span className="spinner" />Querying Qwen 72B…</> : 'Query →'}
                </button>
              </div>
            </div>

            {/* Sample questions */}
            <div className="sample-questions">
              <span className="eyebrow" style={{ fontSize: 10 }}>Sample Questions</span>
              <div className="sample-list">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className="sample-question"
                    onClick={() => { setQuery(q); handleSubmit(q) }}
                    id={`sample-q-${SAMPLE_QUESTIONS.indexOf(q)}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Response panel */}
          <div className="response-panel">
            {loading && (
              <div className="response-loading feat-card">
                <div className="loading-pipeline">
                  {['Embedding query', 'Semantic search', 'ML context', 'Qwen 72B inference', 'Formatting'].map((step, i) => (
                    <div key={step} className="pipeline-step" style={{ animationDelay: `${i * 0.3}s` }}>
                      <div className="pipeline-dot" />
                      <span className="body-small">{step}…</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response && !loading && (
              <div className="response-card feat-card" id="query-response">
                <div className="response-header">
                  <span className="eyebrow">Answer</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-success">Confidence: {Math.round(response.confidence * 100)}%</span>
                    <span className="body-small" style={{ color: 'var(--bd-muted)' }}>{response.latencyMs}ms</span>
                  </div>
                </div>

                <p className="response-text">{response.answer}</p>

                <div className="response-sources">
                  <span className="eyebrow" style={{ fontSize: 10, marginBottom: 8, display: 'block' }}>Sources</span>
                  {response.sources.map((src, i) => (
                    <div key={i} className="source-item">
                      <div className="source-relevance" style={{ width: `${src.relevance * 100}%` }} />
                      <div className="source-info">
                        <span className="source-title">{src.title}</span>
                        <span className="body-small">{src.date} · {src.source}</span>
                      </div>
                      <span className="body-small" style={{ color: 'var(--bd-orange)', flexShrink: 0 }}>
                        {Math.round(src.relevance * 100)}% match
                      </span>
                    </div>
                  ))}
                </div>

                <div className="response-ml-context">
                  <span className="eyebrow" style={{ fontSize: 10 }}>ML Risk Context</span>
                  <span className="body-small">
                    Cardiovascular risk: {Math.round((response.mlContext.cardiovascularRisk) * 100)}% ·
                    Active alerts: {response.mlContext.alertCount}
                  </span>
                </div>

                <div className="response-disclaimer body-small">
                  ⚠ This answer is informational only. Always verify against source documents and apply your clinical judgement.
                  VitaSync does not make diagnoses.
                </div>
              </div>
            )}

            {!response && !loading && (
              <div className="response-empty feat-card">
                <span style={{ fontSize: 48 }} role="img" aria-label="Brain">🧠</span>
                <p className="body-small" style={{ color: 'var(--bd-muted)', textAlign: 'center' }}>
                  Ask a clinical question to query this patient's medical brain.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
