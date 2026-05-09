// Mock API client — replace base URL with real backend when available
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || false

// ── Mock data ────────────────────────────────────────────────
export const mockPatientData = {
  overview: {
    conditions: ['Type 2 Diabetes Mellitus', 'Hypertension', 'Dyslipidaemia'],
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'once daily' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'once nightly' },
    ],
    lastLabResults: [
      { name: 'HbA1c', value: 7.2, unit: '%', trend: 'up', date: '2024-03-14' },
      { name: 'Creatinine', value: 0.9, unit: 'mg/dL', trend: 'stable', date: '2024-03-14' },
      { name: 'LDL', value: 2.4, unit: 'mmol/L', trend: 'down', date: '2024-02-28' },
    ],
  },
  riskScores: { diabetes: 0.34, cardiovascular: 0.18, ckd: 0.09 },
  documents: [
    { id: '1', fileType: 'pdf', documentType: 'Lab Report', sourceName: 'City Diagnostic Lab', documentDate: '2024-03-14', ingestionStatus: 'done' as const, entityCount: 23, createdAt: '2024-03-14T10:00:00Z' },
    { id: '2', fileType: 'pdf', documentType: 'Discharge Summary', sourceName: 'Apollo Hospital', documentDate: '2023-11-20', ingestionStatus: 'done' as const, entityCount: 47, createdAt: '2023-11-20T15:30:00Z' },
    { id: '3', fileType: 'jpeg', documentType: 'Prescription', sourceName: 'Dr. Sharma Clinic', documentDate: '2024-01-08', ingestionStatus: 'done' as const, entityCount: 12, createdAt: '2024-01-08T09:15:00Z' },
    { id: '4', fileType: 'pdf', documentType: 'ECG Report', sourceName: 'Cardiology Centre', documentDate: '2023-09-05', ingestionStatus: 'done' as const, entityCount: 8, createdAt: '2023-09-05T14:00:00Z' },
  ],
  alerts: [
    { id: 'a1', type: 'trend_change', severity: 'warning', title: 'HbA1c Trending Up', body: 'HbA1c has increased by 0.4% over the past 6 months. Current: 7.2%. Personal baseline: 6.8%. Consider reviewing diet and medication.', sourceLabName: 'HbA1c', mlScore: 0.71, isRead: false, createdAt: '2024-03-14T10:30:00Z' },
    { id: 'a2', type: 'lab_anomaly', severity: 'info', title: 'Creatinine Within Normal Range', body: 'Latest creatinine 0.9 mg/dL — within normal range. Kidney function stable.', sourceLabName: 'Creatinine', mlScore: 0.12, isRead: true, createdAt: '2024-03-14T10:30:00Z' },
  ],
  labTrends: {
    hba1c: {
      labels: ['Sep 22', 'Jan 23', 'Jun 23', 'Oct 23', 'Mar 24'],
      values: [6.5, 6.7, 6.9, 7.0, 7.2],
    },
    systolicBP: {
      labels: ['Sep 22', 'Jan 23', 'Jun 23', 'Oct 23', 'Mar 24'],
      values: [138, 135, 132, 130, 128],
    },
    ldl: {
      labels: ['Sep 22', 'Jan 23', 'Jun 23', 'Oct 23', 'Mar 24'],
      values: [3.2, 2.9, 2.6, 2.5, 2.4],
    },
  },
  consent: {
    pendingRequests: [
      { id: 'r1', requesterName: 'Dr. Sarah Chen', institution: 'Metro General Hospital', specialty: 'Endocrinology', scope: 'Full history', requestedAt: '2024-03-15T08:00:00Z' },
    ],
    approved: [
      { id: 'r2', requesterName: 'Dr. James Okafor', institution: 'City Cardiology Clinic', specialty: 'Cardiology', scope: 'Last 12 months', pricePerQuery: 0.01, expiresAt: '2024-09-01', queryCount: 14, earnings: 0.14 },
    ],
    totalEarnings: 0.47,
    totalQueries: 47,
  },
}

export const mockDoctorQueryResponse = {
  answer: "No documented cardiac events found in the patient's records. One ECG performed on 5 September 2023 was reported as normal sinus rhythm with no ST-segment changes. A cardiology referral note from November 2023 notes no arrhythmia detected on 24-hour Holter monitoring. The patient's cardiovascular risk score is currently 18% (low-to-moderate) based on ML risk modelling of their lab history.",
  sources: [
    { title: 'ECG Report', date: '2023-09-05', source: 'Cardiology Centre', relevance: 0.94 },
    { title: 'Cardiology Referral Note', date: '2023-11-20', source: 'Apollo Hospital', relevance: 0.87 },
  ],
  confidence: 0.91,
  latencyMs: 2340,
  mlContext: { cardiovascularRisk: 0.18, alertCount: 0 },
}

// ── API functions ────────────────────────────────────────────
async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (DEV_MODE) {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 800))
    throw new Error('DEV_MODE: use mock data directly')
  }

  // Get token from auth-storage (Zustand persist key)
  let token = ''
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      if (parsed.state && parsed.state.token) {
        token = parsed.state.token
      }
    }
  } catch {
    console.warn('Failed to parse auth token')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let detail = `API error ${res.status}`
    try {
      const errBody = await res.json()
      if (errBody.detail) detail = errBody.detail
    } catch {
      // ignore JSON parse error
    }
    throw new Error(detail)
  }
  
  // Return empty object for 204 No Content
  if (res.status === 204) return {} as T
  
  return res.json() as Promise<T>
}

export { apiRequest }
