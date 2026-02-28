import type { Case, Conversation, Document, Message } from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Cases
export const createCase = (data: { name: string; description?: string }) =>
  request<Case>('/cases', { method: 'POST', body: JSON.stringify(data) })

export const listCases = () => request<Case[]>('/cases')

export const getCase = (id: string) => request<Case>(`/cases/${id}`)

export const deleteCase = (id: string) =>
  request<void>(`/cases/${id}`, { method: 'DELETE' })

// Documents
export const uploadDocuments = async (caseId: string, files: File[]): Promise<Document[]> => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  const res = await fetch(`${BASE}/cases/${caseId}/documents`, {
    method: 'POST',
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

export const listConversations = (caseId: string) =>
  request<Conversation[]>(`/cases/${caseId}/conversations`)

// Messages
export const getMessages = (convId: string) =>
  request<Message[]>(`/conversations/${convId}/messages`)

export const sendMessage = async (convId: string, content: string) => {
  const res = await fetch(`${BASE}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Send failed: ${res.status}`)
  return res
}
