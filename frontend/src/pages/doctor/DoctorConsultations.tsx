import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import './Doctor.css'

interface Consultation {
  id: string
  patient_id: string
  patient_name: string
  slot_time: string
  reason?: string | null
  status: string
}

export default function DoctorConsultations() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Consultation[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<Consultation[]>('/consultations/doctor')
      .then(setAppointments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load schedule'))
  }, [])

  return (
    <div className="doctor-portal-wrapper">
      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace</span>
          <h1 className="display-section">DAILY <span className="italic-accent">schedule.</span></h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 4 }}>
            Schedule rows come from the consultation API only.
          </p>
        </div>
      </header>

      {error && <div className="no-alerts" style={{ color: 'var(--color-danger)' }}>{error}</div>}

      <div className="patient-list-section">
        <div className="list-controls">
          <span className="eyebrow">Upcoming Consultations ({appointments.length})</span>
          <span className="badge">Live API</span>
        </div>

        <div className="patient-rows">
          {appointments.length === 0 ? (
            <div className="patient-row-card">
              <div className="row-main">
                <div className="row-avatar">0</div>
                <div className="row-info">
                  <span className="patient-name">No consultations booked</span>
                  <div className="row-meta">Patients will appear here after they book with your real doctor account ID.</div>
                </div>
              </div>
            </div>
          ) : appointments.map((appt) => (
            <div key={appt.id} className="patient-row-card">
              <div className="row-main">
                <div className="row-avatar">{appt.patient_name.charAt(0)}</div>
                <div className="row-info">
                  <div className="row-name-line">
                    <span className="patient-name">{appt.patient_name}</span>
                    <span className="badge" style={{ fontSize: 9 }}>{appt.status}</span>
                  </div>
                  <div className="row-meta" style={{ color: 'var(--bd-orange)', fontWeight: 600 }}>
                    {new Date(appt.slot_time).toLocaleString()}
                  </div>
                </div>
                <div className="body-small" style={{ opacity: 0.7 }}>{appt.reason || 'Consultation'}</div>
              </div>

              <div className="row-actions">
                <div className="action-buttons">
                  <button className="row-btn primary" onClick={() => navigate(`/doctor/patient/${appt.patient_id}/chat`)}>MESSAGE</button>
                  <button className="row-btn" onClick={() => navigate(`/doctor/patient/${appt.patient_id}/query`)}>QUERY RECORD</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
