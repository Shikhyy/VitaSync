import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import './Doctor.css'

interface Message {
  id: string
  sender_id: string
  content: string
  timestamp: string
}

export default function PatientCommunication() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiRequest<Message[]>(`/communication/${id}`)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load messages'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const msg = await apiRequest<Message>('/communication/', {
        method: 'POST',
        body: JSON.stringify({ recipient_id: id, content: newMessage }),
      })
      setMessages([...messages, msg])
      setNewMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message')
    }
  }

  return (
    <div className="communication-page">
      <div className="dash-page-header">
        <div>
          <Link to="/doctor" className="eyebrow" style={{ color: 'var(--bd-orange)', textDecoration: 'none' }}>← Back to Dashboard</Link>
          <h1 className="display-section dash-page-title">
            CHAT WITH <span className="italic-accent">{id?.slice(0, 8) || 'patient'}.</span>
          </h1>
        </div>
      </div>

      <div className="chat-container feat-card">
        <div className="chat-messages">
          {loading ? (
            <div className="loading-state body-small">Loading conversation...</div>
          ) : (
            <>
              {error && <div className="loading-state body-small" style={{ color: 'var(--color-danger)' }}>{error}</div>}
              {messages.length === 0 && !error && (
                <div className="loading-state body-small">No messages yet. Start a real conversation below.</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`message-bubble ${m.sender_id === user?.id ? 'sent' : 'received'}`}>
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

      <p className="body-small" style={{ color: 'var(--bd-muted)', marginTop: 'var(--space-lg)' }}>
        Messages are loaded from the VitaSync communication API. No prewritten conversation is injected.
      </p>
    </div>
  )
}
