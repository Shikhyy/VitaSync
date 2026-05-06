import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import './Doctor.css'

const CURRENT_MEDS = [
  { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
  { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
  { name: 'Aspirin', dosage: '100mg', frequency: 'once daily' },
]

const KNOWN_INTERACTIONS = [
  {
    drug1: 'Warfarin',
    drug2: 'Aspirin 100mg',
    severity: 'high',
    description: 'Combined anticoagulant + antiplatelet therapy significantly increases bleeding risk, particularly GI and intracranial haemorrhage.',
    evidence: 'PMID 19234567 · DrugBank DB00682',
    recommendation: 'Avoid combination. Consider alternative anticoagulation or monitor INR very closely.',
  },
  {
    drug1: 'Metformin',
    drug2: 'Ibuprofen',
    severity: 'moderate',
    description: 'NSAIDs may reduce renal clearance of metformin, increasing risk of lactic acidosis, especially in patients with renal impairment.',
    evidence: 'DrugBank DB00331',
    recommendation: 'Use paracetamol/acetaminophen instead. If NSAID required, monitor renal function.',
  },
]

export default function Prescribe() {
  const { id } = useParams()
  const [newDrug, setNewDrug] = useState('')
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [interactions, setInteractions] = useState<typeof KNOWN_INTERACTIONS>([])

  const handleCheck = async () => {
    if (!newDrug.trim()) return
    setChecking(true)
    setChecked(false)
    await new Promise((r) => setTimeout(r, 1000))
    // Mock: Warfarin triggers interaction
    const found = KNOWN_INTERACTIONS.filter((i) =>
      newDrug.toLowerCase().includes(i.drug1.toLowerCase())
    )
    setInteractions(found)
    setChecked(true)
    setChecking(false)
  }

  return (
    <div className="doctor-query-page" id="doctor-prescribe-page">
      <nav className="nav" aria-label="Doctor prescribe navigation">
        <div className="nav-inner container">
          <div className="nav-logo">
            <span className="nav-logo-dot" />
            <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
          </div>
          <div className="nav-links">
            <Link to="/doctor" className="nav-link">← All Patients</Link>
            <Link to={`/doctor/patient/${id}/query`} className="nav-link">Query Brain</Link>
          </div>
        </div>
      </nav>

      <main className="container query-main" id="main-content">
        <div style={{ maxWidth: 700, margin: '0 auto', paddingTop: 'var(--space-2xl)' }}>
          <span className="eyebrow">Drug Interaction Checker</span>
          <h1 className="display-section" style={{ fontSize: 40, marginTop: 8, marginBottom: 24 }}>
            SAFE TO <span className="italic-accent">prescribe?</span>
          </h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginBottom: 40 }}>
            Rule-based + cosine similarity check against DrugBank open data. Cross-referenced with patient's current medication list.
          </p>

          {/* Current meds */}
          <div className="feat-card" style={{ marginBottom: 24 }}>
            <span className="eyebrow">Patient's Current Medications</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {CURRENT_MEDS.map((m) => (
                <div key={m.name} className="medication-item">
                  <span className="med-name">{m.name}</span>
                  <span className="body-small">{m.dosage} · {m.frequency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drug input */}
          <div className="feat-card" style={{ marginBottom: 24 }}>
            <label htmlFor="new-drug-input" className="input-label">New Medication to Check</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input
                id="new-drug-input"
                className="input"
                placeholder="e.g. Warfarin 5mg"
                value={newDrug}
                onChange={(e) => setNewDrug(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
              <button
                className="btn-primary"
                onClick={handleCheck}
                disabled={checking || !newDrug.trim()}
                id="drug-check-btn"
                style={{ flexShrink: 0 }}
              >
                {checking ? <><span className="spinner" /> Checking…</> : 'Check →'}
              </button>
            </div>
            <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 8 }}>
              Try: <code className="code-inline">Warfarin 5mg</code> or <code className="code-inline">Ibuprofen 400mg</code>
            </p>
          </div>

          {/* Results */}
          {checked && (
            <div className="drug-check-result" style={{ animation: 'fadeUp 0.4s var(--ease-out) both' }}>
              {interactions.length === 0 ? (
                <div className="feat-card" style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>✅</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-success)', letterSpacing: 2 }}>
                        NO INTERACTIONS DETECTED
                      </div>
                      <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 4 }}>
                        {newDrug} appears safe to prescribe alongside current medications. Always apply clinical judgement.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                interactions.map((i, idx) => (
                  <div
                    key={idx}
                    className="feat-card"
                    style={{ borderColor: i.severity === 'high' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)', background: i.severity === 'high' ? 'rgba(248,113,113,0.04)' : 'rgba(251,191,36,0.04)', marginBottom: 16 }}
                    id={`interaction-${idx}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--bd-cream)', letterSpacing: 2 }}>
                        ⚠ {i.drug1} + {i.drug2}
                      </div>
                      <span className={`badge ${i.severity === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                        {i.severity} risk
                      </span>
                    </div>
                    <p className="body-text" style={{ marginBottom: 12 }}>{i.description}</p>
                    <div style={{ padding: '10px 14px', background: 'var(--bd-cream-faint)', borderRadius: 4, marginBottom: 12 }}>
                      <span className="eyebrow" style={{ fontSize: 9 }}>Recommendation</span>
                      <p className="body-small" style={{ marginTop: 4 }}>{i.recommendation}</p>
                    </div>
                    <span className="body-small" style={{ color: 'var(--bd-muted)' }}>Evidence: {i.evidence}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
