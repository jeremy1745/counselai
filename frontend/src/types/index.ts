export interface User {
  id: string
  email: string
  role: 'user' | 'superadmin'
}

export interface Case {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface Document {
  id: string
  case_id: string
  filename: string
  file_size: number
  page_count: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
}

export interface Conversation {
  id: string
  case_id: string
  title: string
  created_at: string
  archived_at: string | null
}

export interface Citation {
  source_index: number
  document_name: string
  page_numbers: number[]
  snippet: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[]
  created_at: string
}
