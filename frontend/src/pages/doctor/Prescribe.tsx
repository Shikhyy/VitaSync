import { useState } from 'react'
import { useParams } from 'react-router-dom'
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
  useParams()
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
    <div className="doctor-portal-wrapper">
       <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace · Patient VS-4729-A</span>
          <h1 className="display-section">CLINICAL <span className="italic-accent">audit.</span></h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 4 }}>
            Drug-Drug Interaction Analysis (DDI)
          </p>
        </div>
        <div className="header-actions">
           <div className="live-indicator">
              <div className="live-dot" />
              <span>DRUGBANK ACTIVE</span>
           </div>
        </div>
      </header>

      <div className="doctor-content-grid">
        <div className="patient-list-section">
          {/* Current meds */}
          <div className="aside-widget">
            <span className="eyebrow">Patient's Current Regimen</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {CURRENT_MEDS.map((m) => (
                <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid var(--bd-border)', borderRadius: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--bd-cream)' }}>{m.name}</span>
                  <span className="body-small">{m.dosage} · {m.frequency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drug input */}
          <div className="aside-widget" style={{ marginTop: 'var(--space-xl)' }}>
            <label className="input-label">Simulate New Prescription</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input
                className="input"
                style={{ background: 'rgba(0,0,0,0.2)', border: '0.5px solid var(--bd-border)' }}
                placeholder="e.g. Warfarin 5mg"
                value={newDrug}
                onChange={(e) => setNewDrug(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
              <button
                className="btn-primary"
                onClick={handleCheck}
                disabled={checking || !newDrug.trim()}
                style={{ padding: '0 24px', fontSize: 11 }}
              >
                {checking ? 'Checking...' : 'Check →'}
              </button>
            </div>
            <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 12 }}>
              Try: <code className="text-orange">Warfarin</code> or <code className="text-orange">Ibuprofen</code>
            </p>
          </div>
        </div>

        <aside className="doctor-aside">
           {checked && (
            <div className="drug-check-result" style={{ animation: 'fadeUp 0.4s var(--ease-out) both' }}>
              {interactions.length === 0 ? (
                <div className="aside-widget" style={{ borderColor: 'var(--color-success)', background: 'rgba(74,222,128,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>✅</span>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-success)', letterSpacing: 2 }}>
                      NO INTERACTIONS
                    </div>
                    <p className="body-small" style={{ color: 'var(--bd-cream-dim)' }}>
                      {newDrug} appears safe to prescribe alongside current medications.
                    </p>
                  </div>
                </div>
              ) : (
                interactions.map((i, idx) => (
                  <div
                    key={idx}
                    className="aside-widget"
                    style={{ borderColor: i.severity === 'high' ? 'var(--color-danger)' : 'var(--color-warning)', background: i.severity === 'high' ? 'rgba(248,113,113,0.05)' : 'rgba(251,191,36,0.05)', marginBottom: 16 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--bd-cream)', letterSpacing: 1 }}>
                        ⚠ {i.drug1} + {i.drug2}
                      </div>
                    </div>
                    <p className="body-small" style={{ color: 'var(--bd-cream-60)', lineHeight: 1.6, marginBottom: 16 }}>{i.description}</p>
                    <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '0.5px solid var(--bd-border)', borderRadius: 2 }}>
                      <span className="eyebrow" style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>Recommendation</span>
                      <p className="body-small">{i.recommendation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!checked && !checking && (
            <div className="aside-widget" style={{ opacity: 0.5, textAlign: 'center', padding: '40px 20px' }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>💊</span>
              <p className="body-small">Audit interactions before<br />finalising prescription.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
