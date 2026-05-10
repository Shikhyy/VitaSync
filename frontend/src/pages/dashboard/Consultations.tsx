import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'
import './DashboardLayout.css'

interface Consultation {
  id: string
  doctor_id: string
  doctor_name: string
  slot_time: string
  reason?: string | null
  status: string
}

export default function Consultations() {
  const [doctorId, setDoctorId] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [slotTime, setSlotTime] = useState('')
  const [reason, setReason] = useState('')
  const [appointments, setAppointments] = useState<Consultation[]>([])
  const [error, setError] = useState('')

  const refresh = () => {
    apiRequest<Consultation[]>('/consultations/patient')
      .then(setAppointments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load consultations'))
  }

  useEffect(refresh, [])

  const handleBook = async () => {
    if (!doctorId || !doctorName || !slotTime) return
    setError('')
    try {
      await apiRequest('/consultations/', {
        method: 'POST',
        body: JSON.stringify({ doctor_id: doctorId, doctor_name: doctorName, slot_time: slotTime, reason }),
      })
      setDoctorId('')
      setDoctorName('')
      setSlotTime('')
      setReason('')
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book consultation')
    }
  }

  return (
    <div className="consultations-page">
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Care Schedule</span>
          <h1 className="display-section dash-page-title">
            BOOK A <span className="italic-accent">slot.</span>
          </h1>
          <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 6 }}>
            Enter a real doctor account ID. Provider rows are never prefilled.
          </p>
        </div>
      </div>

      {error && <div className="no-alerts" style={{ color: 'var(--color-danger)' }}>{error}</div>}

      <div className="overview-grid" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="feat-card">
          <h3 className="eyebrow" style={{ marginBottom: 'var(--space-md)' }}>New Consultation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <input className="input" placeholder="Doctor account ID" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
            <input className="input" placeholder="Doctor display name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            <input type="datetime-local" className="input" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} />
            <input className="input" placeholder="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="btn-primary" onClick={handleBook} style={{ marginTop: 8 }}>
              Confirm Booking
            </button>
          </div>
        </div>

        <div className="feat-card">
          <h3 className="eyebrow" style={{ marginBottom: 'var(--space-md)' }}>Upcoming Sessions</h3>
          <div className="appt-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.length === 0 ? (
              <p className="body-small" style={{ color: 'var(--bd-muted)' }}>No consultations booked.</p>
            ) : appointments.map((a) => (
              <div key={a.id} className="appt-item" style={{ padding: 12, border: '0.5px solid var(--bd-border)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="body-text" style={{ fontWeight: 500 }}>{a.doctor_name}</div>
                  <div className="body-small" style={{ color: 'var(--bd-muted)' }}>{new Date(a.slot_time).toLocaleString()}</div>
                  {a.reason && <div className="body-small">{a.reason}</div>}
                </div>
                <span className="badge">{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
