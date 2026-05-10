const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  headers: Headers
  detail: unknown

  constructor(message: string, status: number, headers: Headers, detail: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.headers = headers
    this.detail = detail
  }
}

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: 'patient' | 'doctor'
  institution?: string | null
  licence_number?: string | null
  wallet_address?: string | null
  created_at: string
}

export interface QueryResponse {
  query_id: string
  answer: string
  sources: Array<{
    title: string
    date: string
    source: string
    relevance: number
  }>
  confidence: number
  latency_ms: number
  ml_context: Record<string, number>
}

export interface IngestDocument {
  task_id: string
  patient_id: string
  filename?: string | null
  file_type?: string | null
  document_type?: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  entity_count: number
  created_at: string
}

export interface ConsentResponse {
  id: string
  patient_id: string
  doctor_id: string
  doctor_name?: string | null
  institution?: string | null
  scope: string
  status: 'pending' | 'approved' | 'revoked'
  price_per_query: number
  query_count: number
  expires_at?: string | null
  created_at: string
}

export interface AlertResponse {
  id: string
  patient_id: string
  type: 'lab_anomaly' | 'trend_change' | 'risk_increase' | 'drug_interaction'
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  source_lab_name?: string | null
  ml_score?: number | null
  is_read: boolean
  created_at: string
}

// ── API functions ────────────────────────────────────────────
async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let token = ''
  try {
    const authStorage = localStorage.getItem('vitasync-auth')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      if (parsed.state && parsed.state.token) {
        token = parsed.state.token
      }
    }
  } catch {
    console.warn('Failed to parse auth token')
  }

  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) }
  if (options?.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
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
    let rawDetail: unknown = detail
    try {
      const errBody = await res.json()
      rawDetail = errBody.detail ?? errBody
      if (typeof errBody.detail === 'string') detail = errBody.detail
      if (errBody.detail?.message) detail = errBody.detail.message
    } catch {
      // ignore JSON parse error
    }
    throw new ApiError(detail, res.status, res.headers, rawDetail)
  }
  
  // Return empty object for 204 No Content
  if (res.status === 204) return {} as T
  
  return res.json() as Promise<T>
}

async function registerUser(body: {
  email: string
  password: string
  full_name: string
  role: 'patient' | 'doctor'
  institution?: string
  licence_number?: string
}) {
  return apiRequest<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function loginUser(email: string, password: string) {
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)

  return apiRequest<{ access_token: string; token_type: string }>('/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
}

async function getCurrentUser() {
  return apiRequest<AuthUser>('/auth/me')
}

async function queryPatient(patientId: string, question: string) {
  return apiRequest<QueryResponse>(`/query/${patientId}`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}

async function listDocuments() {
  return apiRequest<IngestDocument[]>('/ingest/documents')
}

async function uploadDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiRequest<{ task_id: string; status: string; message: string }>('/ingest/upload', {
    method: 'POST',
    body: form,
  })
}

async function listAlerts(patientId: string) {
  return apiRequest<AlertResponse[]>(`/monitor/alerts/${patientId}`)
}

async function listConsents() {
  return apiRequest<{ consents: ConsentResponse[] }>('/consent/my')
}

async function requestConsent(patientId: string, scope: string) {
  return apiRequest<ConsentResponse>('/consent/request', {
    method: 'POST',
    body: JSON.stringify({ patient_id: patientId, scope }),
  })
}

async function approveConsent(consentId: string, pricePerQuery: number, expiresAt: string) {
  return apiRequest<ConsentResponse>(`/consent/${consentId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ price_per_query: pricePerQuery, expires_at: expiresAt }),
  })
}

async function revokeConsent(consentId: string) {
  return apiRequest(`/consent/${consentId}`, { method: 'DELETE' })
}

async function checkDrugInteraction(newDrug: string, currentMedications: string[]) {
  return apiRequest<{
    new_drug: string
    is_safe: boolean
    highest_severity: string | null
    interaction_count: number
    interactions: Array<{
      drug_a: string
      drug_b: string
      severity: string
      mechanism: string
      description: string
      recommendation: string
      evidence: string
    }>
  }>('/prescribe/drug-check', {
    method: 'POST',
    body: JSON.stringify({ new_drug: newDrug, current_medications: currentMedications }),
  })
}

export {
  apiRequest,
  registerUser,
  loginUser,
  getCurrentUser,
  queryPatient,
  listDocuments,
  uploadDocument,
  listAlerts,
  listConsents,
  requestConsent,
  approveConsent,
  revokeConsent,
  checkDrugInteraction,
}
