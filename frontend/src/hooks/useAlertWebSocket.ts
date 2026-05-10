import { useEffect } from 'react'
import { usePatientStore } from '../stores/patientStore'
import { useAuthStore } from '../stores/authStore'

function buildWebSocketUrl(patientId: string) {
  const configuredWsUrl = import.meta.env.VITE_WS_URL
  if (configuredWsUrl) return `${configuredWsUrl.replace(/\/$/, '')}/monitor/ws/${patientId}`

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  if (apiUrl.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${apiUrl}/monitor/ws/${patientId}`
  }

  return `${apiUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/monitor/ws/${patientId}`
}

export function useAlertWebSocket() {
  const { user } = useAuthStore()
  const { addAlert } = usePatientStore()

  useEffect(() => {
    if (!user || user.role !== 'patient') return

    const wsUrl = buildWebSocketUrl(user.id)
    let ws: WebSocket | null = null
    let reconnectTimer: number

    const connect = () => {
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // The data should be an alert object that matches the schema
          if (data && data.type && data.severity) {
            addAlert(data)
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      }

      ws.onclose = () => {
        // Automatically try to reconnect
        reconnectTimer = window.setTimeout(() => {
          connect()
        }, 5000)
      }
    }

    connect()

    return () => {
      if (ws) {
        ws.onclose = null // Prevent reconnect loop on intentional unmount
        ws.close()
      }
      clearTimeout(reconnectTimer)
    }
  }, [user, addAlert])
}
