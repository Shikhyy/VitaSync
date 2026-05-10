import { create } from 'zustand'

export interface RiskScores {
  diabetes: number
  cardiovascular: number
  ckd: number
}

export interface Alert {
  id: string
  type: 'lab_anomaly' | 'trend_change' | 'risk_increase' | 'drug_interaction'
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  sourceLabName?: string
  mlScore?: number
  isRead: boolean
  createdAt: string
}

export interface Document {
  id: string
  fileType: string
  documentType: string
  sourceName: string
  documentDate: string
  ingestionStatus: 'pending' | 'processing' | 'done' | 'failed'
  entityCount: number
  createdAt: string
}

interface PatientState {
  riskScores: RiskScores
  alerts: Alert[]
  documents: Document[]
  unreadAlertCount: number
  setRiskScores: (scores: RiskScores) => void
  addAlert: (alert: Alert) => void
  markAlertRead: (id: string) => void
  setDocuments: (docs: Document[]) => void
  addDocument: (doc: Document) => void
  updateDocumentStatus: (id: string, status: Document['ingestionStatus'], entityCount?: number) => void
}

export const usePatientStore = create<PatientState>((set) => ({
  riskScores: { diabetes: 0, cardiovascular: 0, ckd: 0 },
  alerts: [],
  documents: [],
  unreadAlertCount: 0,
  setRiskScores: (riskScores) => set({ riskScores }),
  addAlert: (alert) =>
    set((s) => {
      if (s.alerts.some((existing) => existing.id === alert.id)) return s
      return {
        alerts: [alert, ...s.alerts],
        unreadAlertCount: s.unreadAlertCount + (alert.isRead ? 0 : 1),
      }
    }),
  markAlertRead: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
      unreadAlertCount: Math.max(0, s.unreadAlertCount - 1),
    })),
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
  updateDocumentStatus: (id, status, entityCount) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, ingestionStatus: status, entityCount: entityCount ?? d.entityCount } : d
      ),
    })),
}))
