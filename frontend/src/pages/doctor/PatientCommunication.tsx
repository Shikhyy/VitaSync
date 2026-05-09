import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import './Doctor.css'

interface Message {
  id: string
  sender_id: string
  content: string
  timestamp: string
}

export default function PatientCommunication() {
  const { id } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Mock patient info (in real app, fetch from store)
  const patient = { name: 'Anika Sharma', id: id }

  useEffect(() => {
    // Mock initial messages
    setTimeout(() => {
      setMessages([
        { id: '1', sender_id: 'doctor-001', content: 'Hello Anika, how are you feeling today after the new medication?', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', sender_id: id!, content: 'I am feeling a bit better, but still have some dizziness in the morning.', timestamp: new Date(Date.now() - 1800000).toISOString() },
      ])
      setLoading(false)
    }, 500)
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    
    const msg: Message = {
      id: Date.now().toString(),
      sender_id: 'doctor-001', // current doctor ID
      content: newMessage,
      timestamp: new Date().toISOString()
    }
    
    setMessages([...messages, msg])
    setNewMessage('')
  }

  return (
    <div className="communication-page">
      <div className="dash-page-header">
        <div>
          <Link to="/doctor" className="eyebrow" style={{ color: 'var(--bd-orange)', textDecoration: 'none' }}>← Back to Dashboard</Link>
          <h1 className="display-section dash-page-title">
            CHAT WITH <span className="italic-accent">{patient.name.split(' ')[0]}.</span>
          </h1>
        </div>
      </div>

      <div className="chat-container feat-card">
        <div className="chat-messages">
          {loading ? (
            <div className="loading-state body-small">Loading conversation...</div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className={`message-bubble ${m.sender_id === 'doctor-001' ? 'sent' : 'received'}`}>
                  <div className="message-content body-text">{m.content}</div>
                  <div className="message-time eyebrow" style={{ fontSize: 9 }}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        <div className="chat-input-row">
          <input
            className="input"
            placeholder="Type a message or clinical instruction..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="btn-primary" onClick={handleSendMessage}>Send</button>
        </div>
      </div>

      <div className="quick-templates" style={{ marginTop: 'var(--space-lg)' }}>
        <span className="eyebrow">Quick Clinical Instructions</span>
        <div className="template-grid">
          <button className="badge" onClick={() => setNewMessage('Please monitor your blood pressure twice daily for the next week.')}>
            Monitor BP daily
          </button>
          <button className="badge" onClick={() => setNewMessage('Schedule a follow-up appointment for blood work in 2 weeks.')}>
            Follow-up Blood Work
          </button>
          <button className="badge" onClick={() => setNewMessage('Reduce your sodium intake and stay hydrated.')}>
            Dietary Advice
          </button>
        </div>
      </div>
    </div>
  )
}
