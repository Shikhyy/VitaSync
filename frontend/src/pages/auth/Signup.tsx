import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import './Auth.css'

export default function Signup() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    institution: '', licenceNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'role' | 'details'>('role')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Mock auth — replace with real API call
    await new Promise((r) => setTimeout(r, 1200))
    setAuth(
      {
        id: crypto.randomUUID(),
        email: form.email,
        fullName: form.fullName,
        role,
        institution: form.institution,
        licenceNumber: form.licenceNumber,
      },
      'mock-jwt-token'
    )
    setLoading(false)
    if (role === 'patient') {
      navigate('/onboard/wizard')
    } else {
      navigate('/doctor')
    }
  }

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-rings" aria-hidden="true">
        <div className="auth-ring auth-ring-1" />
        <div className="auth-ring auth-ring-2" />
      </div>

      <div className="auth-container">
        <Link to="/" className="auth-logo">
          <span className="nav-logo-dot" />
          <span className="nav-logo-text">VITA<span className="nav-logo-accent">SYNC</span></span>
        </Link>

        <div className="auth-card">
          {step === 'role' ? (
            <>
              <h1 className="auth-title display-section">JOIN<br /><span className="italic-accent">the</span><br />PLATFORM.</h1>
              <p className="body-small auth-subtitle">Who are you joining as?</p>

              <div className="role-grid">
                <button
                  className={`role-card ${role === 'patient' ? 'active' : ''}`}
                  onClick={() => setRole('patient')}
                  id="role-patient-btn"
                >
                  <span className="role-icon" role="img" aria-label="Patient">🫀</span>
                  <span className="role-name display-card">PATIENT</span>
                  <span className="body-small">Upload and manage your medical records. Control who accesses your data.</span>
                </button>
                <button
                  className={`role-card ${role === 'doctor' ? 'active' : ''}`}
                  onClick={() => setRole('doctor')}
                  id="role-doctor-btn"
                >
                  <span className="role-icon" role="img" aria-label="Doctor">🩺</span>
                  <span className="role-name display-card">CLINICIAN</span>
                  <span className="body-small">Query patient records with AI reasoning. Request consent. Get cited answers.</span>
                </button>
              </div>

              <button className="btn-primary w-full" onClick={() => setStep('details')} id="role-continue-btn">
                Continue as {role === 'patient' ? 'Patient' : 'Clinician'}
              </button>

              <p className="auth-signin body-small">
                Already have an account? <Link to="/onboard/signup" className="auth-link">Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <button className="auth-back btn-ghost" onClick={() => setStep('role')} id="auth-back-btn">
                ← Back
              </button>
              <h1 className="auth-title display-section" style={{ fontSize: 40 }}>
                CREATE ACCOUNT
              </h1>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="fullName" className="input-label">Full Name</label>
                  <input
                    id="fullName"
                    className="input"
                    type="text"
                    placeholder="Dr. Anika Sharma"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="input-label">Email Address</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    placeholder="you@hospital.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="input-label">Password</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    placeholder="Min. 12 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={12}
                  />
                </div>

                {role === 'doctor' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="institution" className="input-label">Institution</label>
                      <input
                        id="institution"
                        className="input"
                        type="text"
                        placeholder="City General Hospital"
                        value={form.institution}
                        onChange={(e) => setForm({ ...form, institution: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="licenceNumber" className="input-label">Medical Licence Number</label>
                      <input
                        id="licenceNumber"
                        className="input"
                        type="text"
                        placeholder="MCI-XXXXXXXX"
                        value={form.licenceNumber}
                        onChange={(e) => setForm({ ...form, licenceNumber: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  id="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner" aria-hidden="true" /> Creating Account…</>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <p className="auth-footnote body-small">
                By creating an account, you agree to our open-source{' '}
                <a href="#" className="auth-link">Terms</a> and{' '}
                <a href="#" className="auth-link">Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
