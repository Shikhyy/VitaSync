import { useState } from 'react'
import './DashboardLayout.css'

const DEMO_DOCTORS = [
  { id: 'dr-001', name: 'Dr. Anika Sharma', specialty: 'Endocrinology' },
  { id: 'dr-002', name: 'Dr. Rajan Mehta', specialty: 'Cardiology' },
]

export default function Consultations() {
  const [selectedDoc, setSelectedDoc] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [appointments, setAppointments] = useState([
    { id: 'a1', doc: 'Dr. Anika Sharma', time: 'May 15, 2024 - 10:00 AM', status: 'Confirmed' }
  ])

  const handleBook = () => {
    if (!selectedDoc || !selectedTime) return
    const docName = DEMO_DOCTORS.find(d => d.id === selectedDoc)?.name || 'Doctor'
    const newAppt = {
      id: Date.now().toString(),
      doc: docName,
      time: selectedTime,
      status: 'Confirmed'
    }
    setAppointments([...appointments, newAppt])
    setSelectedDoc('')
    setSelectedTime('')
  }

  return (
    <div className="consultations-page">
      <div className="dash-page-header">
        <div>
          <span className="eyebrow">Care Schedule</span>
          <h1 className="display-section dash-page-title">
            BOOK A <span className="italic-accent">slot.</span>
          </h1>
        </div>
      </div>

      <div className="overview-grid" style={{ marginTop: 'var(--space-xl)' }}>
        {/* Booking Form */}
        <div className="feat-card">
          <h3 className="eyebrow" style={{ marginBottom: 'var(--space-md)' }}>New Consultation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label className="input-label">Select Physician</label>
              <select 
                className="input" 
                value={selectedDoc} 
                onChange={(e) => setSelectedDoc(e.target.value)}
              >
                <option value="">Choose a doctor...</option>
                {DEMO_DOCTORS.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Preferred Time Slot</label>
              <input 
                type="datetime-local" 
                className="input" 
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={handleBook} style={{ marginTop: 8 }}>
              Confirm Booking
            </button>
          </div>
        </div>

        {/* Existing Appointments */}
        <div className="feat-card">
          <h3 className="eyebrow" style={{ marginBottom: 'var(--space-md)' }}>Upcoming Sessions</h3>
          <div className="appt-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.length === 0 ? (
              <p className="body-small" style={{ color: 'var(--bd-muted)' }}>No upcoming consultations.</p>
            ) : (
              appointments.map(a => (
                <div key={a.id} className="appt-item" style={{ 
                  padding: 12, border: '0.5px solid var(--bd-border)', borderRadius: 4,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div className="body-text" style={{ fontWeight: 500 }}>{a.doc}</div>
                    <div className="body-small" style={{ color: 'var(--bd-muted)' }}>{a.time}</div>
                  </div>
                  <span className="badge">{a.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
