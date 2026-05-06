import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import './Wizard.css'

const STEPS = [
  {
    id: 'conditions',
    title: 'HEALTH HISTORY',
    subtitle: 'Do you have any of these conditions? (optional — you can add records later)',
    options: ['Type 2 Diabetes', 'Hypertension', 'Heart Disease', 'Chronic Kidney Disease', 'Asthma / COPD', 'Thyroid Disorder', 'Dyslipidaemia', 'Cancer (current or past)'],
  },
  {
    id: 'medications',
    title: 'CURRENT MEDICATIONS',
    subtitle: 'Are you currently on any medications? (optional)',
    options: ['Metformin', 'Lisinopril', 'Atorvastatin', 'Aspirin', 'Levothyroxine', 'Amlodipine', 'Insulin', 'Other'],
  },
  {
    id: 'records',
    title: 'YOUR RECORDS',
    subtitle: 'Which types of medical records do you have available to upload?',
    options: ['Lab reports (blood tests, urine)', 'Hospital discharge summaries', 'Imaging reports (X-Ray, MRI, CT)', 'Prescription slips', 'ECG / Cardiology reports', 'Specialist consultation notes'],
  },
]

export default function Wizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<Record<string, Set<string>>>({})

  const currentStep = STEPS[step]
  const stepSelections = selections[currentStep.id] || new Set()

  const toggle = (option: string) => {
    const next = new Set(stepSelections)
    if (next.has(option)) next.delete(option)
    else next.add(option)
    setSelections({ ...selections, [currentStep.id]: next })
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      navigate('/dashboard/overview')
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-rings" aria-hidden="true">
        <div className="auth-ring auth-ring-1" />
        <div className="auth-ring auth-ring-2" />
      </div>

      <div className="wizard-container">
        {/* Progress */}
        <div className="wizard-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          <div className="wizard-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="wizard-header">
          <span className="eyebrow">Step {step + 1} of {STEPS.length}</span>
          <h1 className="display-section wizard-title">
            {currentStep.title}
          </h1>
          <p className="body-small wizard-subtitle">{currentStep.subtitle}</p>
        </div>

        <div className="wizard-options">
          {currentStep.options.map((opt) => (
            <button
              key={opt}
              className={`wizard-option ${stepSelections.has(opt) ? 'selected' : ''}`}
              onClick={() => toggle(opt)}
              id={`wizard-option-${opt.replace(/\s+/g, '-').toLowerCase()}`}
              aria-pressed={stepSelections.has(opt)}
            >
              <span className="wizard-option-check" aria-hidden="true">
                {stepSelections.has(opt) ? '✓' : ''}
              </span>
              {opt}
            </button>
          ))}
        </div>

        <div className="wizard-actions">
          <button
            className="btn-ghost"
            onClick={handleNext}
            id="wizard-skip-btn"
          >
            Skip
          </button>
          <button
            className="btn-primary"
            onClick={handleNext}
            id="wizard-next-btn"
          >
            {step < STEPS.length - 1 ? 'Continue' : 'Go to Dashboard →'}
          </button>
        </div>
      </div>
    </main>
  )
}
