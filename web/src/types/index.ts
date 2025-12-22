// User
export interface User {
  id: string
  username: string
  role: 'admin' | 'user'
  created_at: string
}

// Topic
export interface Topic {
  id: string
  title: string
  is_flowmo: boolean
  created_at: string
  updated_at: string
}

// Message
export interface Message {
  id: string
  topic_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Memory type
export type MemoryType = 'personal' | 'preference' | 'fact' | 'plan' | 'manual' | 'chat'

// Memory usage record
export interface MemoryUsageRecord {
  topic_title: string
  used_at: string
}

// Memory
export interface Memory {
  id: string
  content: string
  memory_type: MemoryType
  source: 'chat' | 'manual'
  use_count: number
  last_used_at: string | null
  created_at: string
  usage_records?: MemoryUsageRecord[]
}

// Flowmo
export interface Flowmo {
  id: string
  content: string
  source: 'chat' | 'direct'
  created_at: string
}

// Provider
export interface Provider {
  id: string
  name: string
  base_url: string
  enabled: boolean
}

// Provider input
export interface ProviderInput {
  name: string
  base_url: string
  api_key?: string
  enabled: boolean
}

// Settings
export interface Settings {
  default_chat_provider_id: string | null
  default_chat_model: string | null
  embedding_provider_id: string | null
  embedding_model: string | null
  memory_top_k: number
  memory_extraction_enabled: boolean
  memory_silent_minutes: number
  memory_context_messages: number
}

// Invite code
export interface InviteCode {
  id: string
  code: string
  max_uses: number
  used_count: number
  expires_at: string | null
  created_at: string
}

// Stream completion data
export interface StreamDoneData {
  type: 'done'
  message_id: string
  user_message_id: string
  full_content: string
  topic_title?: string
  topic_title_updated?: boolean
}

// Auth response
export interface AuthResponse {
  access_token: string
  user: User
}

// API response helpers
export interface TopicsResponse {
  topics: Topic[]
}

export interface MessagesResponse {
  messages: Message[]
}

export interface MemoriesResponse {
  memories: Memory[]
  total: number
}

export interface FlowmosResponse {
  flowmos: Flowmo[]
}

export interface ProvidersResponse {
  providers: Provider[]
}

export interface InviteCodesResponse {
  invite_codes: InviteCode[]
}

export interface UsersResponse {
  users: User[]
}

export interface DeleteCountResponse {
  deleted_count: number
}
