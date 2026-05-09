import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Doctor.css'

const INITIAL_APPOINTMENTS = [
  { id: 'a1', patient: 'Anika Sharma', time: 'May 15, 2024 - 10:00 AM', reason: 'Diabetes follow-up', status: 'Confirmed' },
  { id: 'a2', patient: 'Rajan Mehta', time: 'May 16, 2024 - 02:30 PM', reason: 'Cardio checkup', status: 'Confirmed' },
]

export default function DoctorConsultations() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [activePatientId, setActivePatientId] = useState<string | null>(null)
  
  const [selectedDate, setSelectedDate] = useState<number>(18)
  const [selectedTime, setSelectedTime] = useState<string>('10:30')
  
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hours, setHours] = useState('09:00 - 17:00')

  const activePatient = appointments.find(a => a.id === activePatientId)?.patient

  const handleJoinRoom = (patient: string) => {
    setActivePatientId(appointments.find(a => a.patient === patient)?.id || null)
    setActiveModal('CONNECTING')
    setTimeout(() => {
      setActiveModal('VIDEO_ROOM')
    }, 2000)
  }

  const handleConfirmReschedule = () => {
    if (!activePatientId) return
    
    const newTime = `May ${selectedDate}, 2024 - ${selectedTime} AM` // Simplified for mock
    setAppointments(prev => prev.map(a => 
      a.id === activePatientId ? { ...a, time: newTime } : a
    ))
    
    setActiveModal(null)
    setActivePatientId(null)
  }

  return (
    <div className="doctor-portal-wrapper">
      {/* Simulation Overlays */}
      {activeModal === 'CONNECTING' && (
        <div className="simulation-overlay">
          <div className="modal-content">
             <div className="live-dot pulse-warning" style={{ width: 60, height: 60 }} />
             <h3 className="display-section" style={{ fontSize: 24, marginTop: 20 }}>ESTABLISHING BRIDGE</h3>
             <p className="body-small">Connecting to {activePatient} via secure WebRTC...</p>
          </div>
        </div>
      )}

      {activeModal === 'VIDEO_ROOM' && (
        <div className="simulation-overlay">
          <div className="aside-widget" style={{ width: '90%', maxWidth: 1000, height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            <div className="video-main" style={{ flex: 1, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
               <div style={{ textAlign: 'center' }}>
                  <div className="row-avatar" style={{ width: 120, height: 120, fontSize: 48, margin: '0 auto 20px' }}>{activePatient?.charAt(0)}</div>
                  <h2 className="display-section">{activePatient}</h2>
                  <p className="eyebrow" style={{ color: 'var(--bd-orange)' }}>WAITING FOR PATIENT TO START VIDEO...</p>
               </div>
               <div className="video-self" style={{ position: 'absolute', bottom: 20, right: 20, width: 200, height: 150, background: '#333', border: '2px solid var(--bd-orange-muted)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="eyebrow">SELF VIEW</span>
               </div>
            </div>
            <div className="video-controls" style={{ padding: '20px', background: 'var(--bd-ink)', display: 'flex', justifyContent: 'center', gap: 20 }}>
               <button className="row-btn" onClick={() => setActiveModal(null)} style={{ background: '#ff4b4b', color: 'white', border: 'none', padding: '10px 30px' }}>END CALL</button>
               <button className="row-btn">MUTE</button>
               <button className="row-btn">DISABLE VIDEO</button>
               <button className="row-btn">SHARE SCREEN</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'RESCHEDULE' && (
        <div className="simulation-overlay" onClick={() => setActiveModal(null)}>
          <div className="aside-widget modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
             <h3 className="display-section" style={{ fontSize: 20 }}>RESCHEDULE: {activePatient}</h3>
             <div style={{ width: '100%', marginTop: 20 }}>
                <div className="eyebrow" style={{ textAlign: 'left', marginBottom: 12 }}>Select New Date (May)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 4 }}>
                   {Array.from({ length: 14 }).map((_, i) => {
                     const day = 15 + i
                     return (
                       <div 
                         key={day} 
                         className={`badge ${selectedDate === day ? 'active' : ''}`} 
                         style={{ padding: '8px 0', cursor: 'pointer', background: selectedDate === day ? 'var(--bd-orange)' : '', color: selectedDate === day ? 'var(--bd-ink)' : '' }}
                         onClick={() => setSelectedDate(day)}
                       >
                         {day}
                       </div>
                     )
                   })}
                </div>
                <div className="eyebrow" style={{ textAlign: 'left', marginTop: 20, marginBottom: 12 }}>Select Time Slot</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                   {['09:00', '10:30', '14:00', '16:30'].map(t => (
                     <div 
                       key={t} 
                       className={`badge ${selectedTime === t ? 'active' : ''}`} 
                       style={{ padding: '8px 12px', cursor: 'pointer', background: selectedTime === t ? 'var(--bd-orange)' : '', color: selectedTime === t ? 'var(--bd-ink)' : '' }}
                       onClick={() => setSelectedTime(t)}
                     >
                       {t}
                     </div>
                   ))}
                </div>
             </div>
             <button className="btn-primary w-full" style={{ marginTop: 24 }} onClick={handleConfirmReschedule}>CONFIRM NEW SLOT</button>
             <button className="btn-ghost w-full" onClick={() => setActiveModal(null)}>CANCEL</button>
          </div>
        </div>
      )}

      {activeModal === 'VIDEO_TEST' && (
        <div className="simulation-overlay" onClick={() => setActiveModal(null)}>
           <div className="aside-widget modal-content" onClick={e => e.stopPropagation()}>
              <h3 className="eyebrow">DIAGNOSTIC SUITE</h3>
              <div style={{ width: '100%', textAlign: 'left', marginTop: 20 }}>
                 {[
                   { label: 'Camera Hardware', status: 'OK', val: 'Sony IMX-586' },
                   { label: 'Audio Input', status: 'OK', val: 'Studio Mic' },
                   { label: 'Network Latency', status: 'OK', val: '42ms (Low)' },
                   { label: 'Encryption Engine', status: 'OK', val: 'AES-256-GCM' }
                 ].map(test => (
                   <div key={test.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid var(--bd-border)' }}>
                      <div>
                        <div className="body-text" style={{ fontSize: 13 }}>{test.label}</div>
                        <div className="body-small" style={{ fontSize: 10 }}>{test.val}</div>
                      </div>
                      <span className="badge badge-success">{test.status}</span>
                   </div>
                 ))}
              </div>
              <button className="btn-secondary w-full" style={{ marginTop: 24 }} onClick={() => setActiveModal(null)}>DONE</button>
           </div>
        </div>
      )}

      {activeModal === 'CONFIGURE' && (
        <div className="simulation-overlay" onClick={() => setActiveModal(null)}>
           <div className="aside-widget modal-content" onClick={e => e.stopPropagation()}>
              <h3 className="eyebrow">WORKSPACE CONFIG</h3>
              <div style={{ width: '100%', textAlign: 'left', marginTop: 20 }}>
                 <div className="input-label">Video Bitrate</div>
                 <select className="input" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', marginTop: 4 }}>
                   <option>High Definition (1080p)</option>
                   <option>Standard Definition (720p)</option>
                   <option>Low Bandwidth (480p)</option>
                 </select>
                 <div className="input-label" style={{ marginTop: 20 }}>Recording Mode</div>
                 <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                   <button className="badge active">Cloud Sync</button>
                   <button className="badge">Local Only</button>
                 </div>
              </div>
              <button className="btn-primary w-full" style={{ marginTop: 24 }} onClick={() => setActiveModal(null)}>SAVE CONFIG</button>
           </div>
        </div>
      )}

      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace</span>
          <h1 className="display-section">DAILY <span className="italic-accent">schedule.</span></h1>
        </div>
        <div className="header-actions">
           <div className="live-indicator">
              <div className="live-dot" />
              <span>TIMEZONE: IST</span>
           </div>
        </div>
      </header>

      <div className="doctor-content-grid">
        <div className="patient-list-section">
          <div className="list-controls">
            <span className="eyebrow">Upcoming Consultations ({appointments.length})</span>
            <span className="badge">Today + Next 7 Days</span>
          </div>

          <div className="patient-rows">
            {appointments.map(appt => (
              <div key={appt.id} className="patient-row-card">
                <div className="row-main">
                  <div className="row-avatar">{appt.patient.charAt(0)}</div>
                  <div className="row-info">
                    <div className="row-name-line">
                      <span className="patient-name">{appt.patient}</span>
                      <span className="badge" style={{ fontSize: 9 }}>{appt.status}</span>
                    </div>
                    <div className="row-meta" style={{ color: 'var(--bd-orange)', fontWeight: 600 }}>
                      {appt.time}
                    </div>
                  </div>
                  <div className="body-small" style={{ opacity: 0.7 }}>
                    {appt.reason}
                  </div>
                </div>

                <div className="row-actions">
                  <div className="action-buttons">
                    <button 
                      className="row-btn primary" 
                      style={{ padding: '8px 20px' }}
                      onClick={() => handleJoinRoom(appt.patient)}
                    >
                      JOIN ROOM
                    </button>
                    <button className="row-btn" onClick={() => { setActivePatientId(appt.id); setActiveModal('RESCHEDULE'); }}>RESCHEDULE</button>
                    <button className="row-btn ghost" onClick={() => navigate('/doctor/patients')}>PATIENT RECORD</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="doctor-aside">
          <div className="aside-widget">
            <span className="eyebrow">Consultation Settings</span>
            <div style={{ marginTop: 16 }}>
              <div className="body-small" style={{ color: 'var(--bd-muted)' }}>Working Hours</div>
              {isEditingHours ? (
                <input 
                  className="input" 
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)} 
                  autoFocus 
                  style={{ marginTop: 8, fontSize: 14 }}
                />
              ) : (
                <div className="display-card" style={{ fontSize: 18, marginTop: 4 }}>{hours}</div>
              )}
            </div>
            <button 
              className="btn-secondary w-full" 
              style={{ marginTop: 24, fontSize: 11 }}
              onClick={() => setIsEditingHours(!isEditingHours)}
            >
              {isEditingHours ? 'Save Availability' : 'Update Availability'}
            </button>
          </div>

          <div className="aside-widget">
            <span className="eyebrow">Workspace</span>
            <div className="workspace-grid">
              <button className="workspace-btn" onClick={() => setActiveModal('VIDEO_TEST')}>
                <span className="ws-icon">📹</span>
                <span className="ws-label">Video Test</span>
              </button>
              <button className="workspace-btn" onClick={() => setActiveModal('CONFIGURE')}>
                <span className="ws-icon">⚙️</span>
                <span className="ws-label">Configure</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
