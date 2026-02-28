import type { Case, Conversation, Document, Message, User } from '../types'

const BASE = '/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Auth
export const register = (email: string, password: string) =>
  request<{ access_token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const login = (email: string, password: string) =>
  request<{ access_token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const getMe = () => request<User>('/auth/me')

// Cases
export const createCase = (data: { name: string; description?: string }) =>
  request<Case>('/cases', { method: 'POST', body: JSON.stringify(data) })

export const listCases = (includeArchived = false) =>
  request<Case[]>(`/cases?include_archived=${includeArchived}`)

export const getCase = (id: string) => request<Case>(`/cases/${id}`)

export const deleteCase = (id: string) =>
  request<void>(`/cases/${id}`, { method: 'DELETE' })

export const archiveCase = (id: string) =>
  request<Case>(`/cases/${id}/archive`, { method: 'PATCH' })

export const unarchiveCase = (id: string) =>
  request<Case>(`/cases/${id}/unarchive`, { method: 'PATCH' })

// Documents
export const uploadDocuments = async (caseId: string, files: File[]): Promise<Document[]> => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  const res = await fetch(`${BASE}/cases/${caseId}/documents`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export const listDocuments = (caseId: string) =>
  request<Document[]>(`/cases/${caseId}/documents`)

export const deleteDocument = (caseId: string, docId: string) =>
  request<void>(`/cases/${caseId}/documents/${docId}`, { method: 'DELETE' })

// Conversations
export const createConversation = (caseId: string, title?: string) =>
  request<Conversation>(`/cases/${caseId}/conversations`, {
    method: 'POST',
    body: JSON.stringify({ title: title || 'New Conversation' }),
  })

export const listConversations = (caseId: string, includeArchived = false) =>
  request<Conversation[]>(`/cases/${caseId}/conversations?include_archived=${includeArchived}`)

export const deleteConversation = (convId: string) =>
  request<void>(`/conversations/${convId}`, { method: 'DELETE' })

export const archiveConversation = (convId: string) =>
  request<Conversation>(`/conversations/${convId}/archive`, { method: 'PATCH' })

export const unarchiveConversation = (convId: string) =>
  request<Conversation>(`/conversations/${convId}/unarchive`, { method: 'PATCH' })

// Messages
export const getMessages = (convId: string) =>
  request<Message[]>(`/conversations/${convId}/messages`)

export const exportConversation = async (convId: string, format: 'pdf' | 'markdown') => {
  const res = await fetch(`${BASE}/conversations/${convId}/export?format=${format}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="(.+)"/)
  const filename = match ? match[1] : `conversation.${format === 'pdf' ? 'pdf' : 'md'}`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const sendMessage = async (convId: string, content: string) => {
  const res = await fetch(`${BASE}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Send failed: ${res.status}`)
  return res
}
