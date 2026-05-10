import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, queryPatient, type QueryResponse } from '../../lib/api'
import './Doctor.css'

const SUGGESTED_QUESTIONS = [
  'Does this patient have any history of cardiac events?',
  'What medications is the patient currently taking?',
  'What are the trends in HbA1c over the past 2 years?',
  'Is the patient at high risk for chronic kidney disease?',
  'Summarise the patient\'s medical history.',
]

export default function PatientQuery() {
  const { id: patientId = '' } = useParams()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<QueryResponse | null>(null)
  const [error, setError] = useState('')
  const [paymentRequired, setPaymentRequired] = useState('')

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return
    setLoading(true)
    setResponse(null)
    setError('')
    setPaymentRequired('')
    try {
      const res = await queryPatient(patientId, question)
      setResponse(res)
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaymentRequired(err.headers.get('PAYMENT-REQUIRED') || err.headers.get('X-PAYMENT-REQUIRED') || '')
      }
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="doctor-portal-wrapper">
      {/* Unified Header */}
      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Overview · Patient {patientId.slice(0, 8) || 'record'}</span>
          <h1 className="display-section">ASK THE <span className="italic-accent">brain.</span></h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 4 }}>
            Qwen 72B · PubMedBERT RAG · X402 gated
          </p>
        </div>
        <div className="header-actions">
           <div className="live-indicator">
              <div className="live-dot" />
              <span>INFERENCE ACTIVE</span>
           </div>
        </div>
      </header>

      <div className="query-layout">
        {/* Input Panel */}
        <div className="query-panel">
          <div className="aside-widget" style={{ padding: 'var(--space-lg)' }}>
            <label className="input-label">Clinical Question</label>
            <textarea
              className="input"
              style={{ minHeight: 140, resize: 'none', background: 'rgba(0,0,0,0.2)', border: '0.5px solid var(--bd-border)' }}
              placeholder="e.g. Does this patient have any history of cardiac events?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(query)
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span className="body-small" style={{ color: 'var(--bd-muted)', fontSize: 10 }}>⌘ + ENTER TO SUBMIT</span>
              <button
                className="btn-primary"
                onClick={() => handleSubmit(query)}
                disabled={loading || !query.trim()}
                style={{ padding: '10px 24px', fontSize: 11 }}
              >
                {loading ? 'Processing...' : 'Query →'}
              </button>
            </div>
          </div>

          <div className="suggested-questions" style={{ marginTop: 'var(--space-xl)' }}>
            <span className="eyebrow" style={{ fontSize: 10, display: 'block', marginBottom: 12 }}>Suggested Queries</span>
            <div className="suggested-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="suggested-question"
                  onClick={() => { setQuery(q); handleSubmit(q) }}
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '0.5px solid var(--bd-border)',
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'var(--bd-cream-60)',
                    fontSize: 12,
                    borderRadius: 2,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="response-panel">
          {loading && (
            <div className="aside-widget" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div className="loading-pipeline">
                  {['Embedding query', 'Semantic search', 'ML context', 'Qwen 72B inference'].map((step, i) => (
                    <div key={step} className="pipeline-step" style={{ animationDelay: `${i * 0.3}s`, marginBottom: 8 }}>
                      <div className="live-dot" />
                      <span className="body-small">{step}…</span>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {response && !loading && (
            <div className="aside-widget" id="query-response">
              <div className="widget-header">
                <span className="eyebrow">Brain Inference</span>
                <span className="badge" style={{ background: 'var(--bd-orange-muted)', color: 'var(--bd-orange)' }}>
                  {Math.round(response.confidence * 100)}% Confidence
                </span>
              </div>

              <div className="response-text" style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--bd-cream-60)', margin: '16px 0' }}>
                {response.answer}
              </div>

              <div className="divider" style={{ margin: '24px 0' }} />

              <div className="response-sources">
                <span className="eyebrow" style={{ fontSize: 10, marginBottom: 12, display: 'block' }}>RAG Sources</span>
                {response.sources.map((src, i) => (
                  <div key={i} className="source-item" style={{ padding: '12px 0', borderBottom: '0.5px solid var(--bd-border)' }}>
                    <div className="source-info">
                      <span className="source-title" style={{ display: 'block', fontSize: 13, color: 'var(--bd-cream)' }}>{src.title}</span>
                      <span className="body-small" style={{ fontSize: 11 }}>{src.date} · {src.source}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="response-disclaimer body-small" style={{ marginTop: 24, padding: 12, background: 'rgba(255, 131, 79, 0.05)', borderRadius: 2, borderLeft: '2px solid var(--bd-orange)' }}>
                ⚠ AI-generated. Verify against clinical documentation.
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="aside-widget" style={{ borderColor: 'var(--color-warning)', background: 'rgba(251,191,36,0.05)' }}>
              <span className="eyebrow">Query blocked</span>
              <p className="body-small" style={{ marginTop: 12, color: 'var(--bd-cream-60)', lineHeight: 1.7 }}>
                {error}
              </p>
              {paymentRequired && (
                <div className="response-disclaimer body-small" style={{ marginTop: 16, wordBreak: 'break-all' }}>
                  x402 requirement received. A wallet client should sign this payment requirement and retry with
                  {' '}<strong>PAYMENT-SIGNATURE</strong>: {paymentRequired.slice(0, 180)}...
                </div>
              )}
              <p className="body-small" style={{ marginTop: 12, color: 'var(--bd-muted)' }}>
                Use a real patient account ID with approved consent before invoking Qwen.
              </p>
            </div>
          )}

          {!response && !loading && !error && (
            <div className="aside-widget" style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
              <span style={{ fontSize: 40, marginBottom: 16 }}>🧠</span>
              <p className="body-small">Enter a clinical question to query<br />this patient's medical history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
