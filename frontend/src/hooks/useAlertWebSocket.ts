import { useEffect } from 'react'
import { usePatientStore } from '../stores/patientStore'
import { useAuthStore } from '../stores/authStore'

export function useAlertWebSocket() {
  const { user } = useAuthStore()
  const { addAlert } = usePatientStore()

  useEffect(() => {
    if (!user || user.role !== 'patient') return

    // Connect to WebSocket using the patient ID
    // In dev mode, we connect to the local FastAPI backend (assuming it runs on 8000)
    const wsUrl = `ws://localhost:8000/monitor/ws/${user.id}`
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
