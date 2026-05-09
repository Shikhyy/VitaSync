import { Link } from 'react-router-dom'
import './Doctor.css'

const RECENT_CHATS = [
  { id: 'p-001', name: 'Anika Sharma', lastMsg: 'I am feeling better, thank you.', time: '10m ago', unread: true },
  { id: 'p-002', name: 'Rajan Mehta', lastMsg: 'When should I take the new medicine?', time: '2h ago', unread: false },
  { id: 'p-003', name: 'Priya Nair', lastMsg: 'Lab reports have been uploaded.', time: '5h ago', unread: false },
]

export default function DoctorMessages() {
  return (
    <div className="doctor-portal-wrapper">
      <header className="doctor-header">
        <div className="header-titles">
          <span className="eyebrow">Clinician Workspace</span>
          <h1 className="display-section">PATIENT <span className="italic-accent">messages.</span></h1>
        </div>
        <div className="header-actions">
           <div className="live-indicator">
              <div className="live-dot" />
              <span>ENCRYPTED HUB</span>
           </div>
        </div>
      </header>

      <div className="patient-list-section" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="list-controls">
          <span className="eyebrow">Recent Conversations ({RECENT_CHATS.length})</span>
        </div>

        <div className="patient-rows">
          {RECENT_CHATS.map(chat => (
            <Link key={chat.id} to={`/doctor/patient/${chat.id}/chat`} className="patient-row-card chat-row" style={{ textDecoration: 'none' }}>
              <div className="row-main">
                <div className="row-avatar">{chat.name.charAt(0)}</div>
                <div className="row-info">
                  <div className="row-name-line">
                    <span className="patient-name">{chat.name}</span>
                    {chat.unread && <span className="badge" style={{ background: 'var(--bd-orange)', color: 'var(--bd-ink)', borderColor: 'var(--bd-orange)' }}>NEW</span>}
                  </div>
                  <div className="row-meta" style={{ color: chat.unread ? 'var(--bd-cream)' : 'var(--bd-muted)' }}>
                    {chat.lastMsg}
                  </div>
                </div>
                <div className="row-meta" style={{ fontSize: 10 }}>
                  {chat.time}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
