import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { checkDrugInteraction } from '../../lib/api'
import './Doctor.css'

export default function Prescribe() {
  const { id: patientId } = useParams()
  const [newDrug, setNewDrug] = useState('')
  const [currentMedsText, setCurrentMedsText] = useState('')
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [interactions, setInteractions] = useState<Array<{
    drug1: string
    drug2: string
    severity: string
    description: string
    evidence: string
    recommendation: string
  }>>([])
  const [error, setError] = useState('')

  const handleCheck = async () => {
    if (!newDrug.trim()) return
    const currentMedications = currentMedsText
      .split('\n')
      .map((med) => med.trim())
      .filter(Boolean)

    if (currentMedications.length === 0) {
      setError('Enter the patient current medications from the chart before running an audit.')
      return
    }

    setChecking(true)
    setChecked(false)
    setError('')
    try {
      const result = await checkDrugInteraction(newDrug, currentMedications)
      setInteractions(result.interactions.map((i) => ({
        drug1: i.drug_a,
        drug2: i.drug_b,
        severity: i.severity,
        description: i.description,
        evidence: i.evidence,
        recommendation: i.recommendation,
      })))
      setChecked(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drug interaction check failed')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="doctor-portal-wrapper">
       <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace · Patient {patientId?.slice(0, 8) || 'record'}</span>
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
          <div className="aside-widget">
            <span className="eyebrow">Patient Current Regimen</span>
            <textarea
              className="input"
              style={{ minHeight: 140, marginTop: 12, resize: 'vertical', background: 'rgba(0,0,0,0.2)', border: '0.5px solid var(--bd-border)' }}
              placeholder={'Paste one medication per line from the patient chart\\nExample: Aspirin 100mg\\nMetformin 500mg'}
              value={currentMedsText}
              onChange={(e) => setCurrentMedsText(e.target.value)}
            />
            <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 12 }}>
              VitaSync will only audit what you enter or extract from real records.
            </p>
          </div>

          <div className="aside-widget" style={{ marginTop: 'var(--space-xl)' }}>
            <label className="input-label">New Prescription Candidate</label>
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

          {error && !checking && (
            <div className="aside-widget" style={{ borderColor: 'var(--color-danger)', background: 'rgba(248,113,113,0.05)' }}>
              <span className="eyebrow">Audit failed</span>
              <p className="body-small" style={{ marginTop: 12 }}>{error}</p>
            </div>
          )}

          {!checked && !checking && !error && (
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
