import type {
  User,
  Topic,
  Memory,
  Flowmo,
  Provider,
  ProviderInput,
  Settings,
  InviteCode,
  AuthResponse,
  TopicsResponse,
  MessagesResponse,
  MemoriesResponse,
  FlowmosResponse,
  ProvidersResponse,
  InviteCodesResponse,
  UsersResponse,
  DeleteCountResponse,
  StreamDoneData,
} from '@/types'
import { t } from '@/i18n'

// 生产环境使用环境变量配置的 API 地址，开发环境使用代理
const API_BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'secondme_token'

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  private getHeaders(contentType = true): HeadersInit {
    const headers: HeadersInit = {}
    if (contentType) {
      headers['Content-Type'] = 'application/json'
    }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  private checkNewToken(response: Response): void {
    const newToken = response.headers.get('X-New-Token')
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
      console.log(t('common.errors.tokenRefresh'))
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    this.checkNewToken(response)

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('secondme_user')
      window.location.href = '/login'
      throw new Error(t('common.errors.authExpired'))
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.detail || t('common.errors.requestFailed', { status: response.status }))
    }

    return response.json()
  }

  // ==================== Auth ====================

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    return this.handleResponse<AuthResponse>(response)
  }

  async register(username: string, password: string, inviteCode: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, invite_code: inviteCode }),
    })
    return this.handleResponse<AuthResponse>(response)
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<User>(response)
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })
    await this.handleResponse(response)
  }

  // ==================== Topics ====================

  async createTopic(): Promise<Topic> {
    const response = await fetch(`${API_BASE}/topics`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    })
    return this.handleResponse<Topic>(response)
  }

  async getTopics(): Promise<TopicsResponse> {
    const response = await fetch(`${API_BASE}/topics`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<TopicsResponse>(response)
  }

  async getTopic(id: string): Promise<Topic> {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<Topic>(response)
  }

  async updateTopic(id: string, title: string): Promise<Topic> {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ title }),
    })
    return this.handleResponse<Topic>(response)
  }

  async deleteTopic(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    await this.handleResponse(response)
  }

  // ==================== Messages ====================

  async getMessages(topicId: string): Promise<MessagesResponse> {
    const response = await fetch(`${API_BASE}/topics/${topicId}/messages`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<MessagesResponse>(response)
  }

  async sendMessageStream(
    topicId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onDone: (data: StreamDoneData) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/topics/${topicId}/messages/stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ content }),
      })

      this.checkNewToken(response)

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem('secondme_user')
        window.location.href = '/login'
        onError(t('common.errors.authExpired'))
        return
      }

      if (!response.body) {
        onError(t('common.errors.streamFailed'))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk') {
                onChunk(data.content)
              } else if (data.type === 'done') {
                onDone(data)
              } else if (data.type === 'error') {
                onError(data.message)
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : t('common.errors.sendFailed'))
    }
  }

  // ==================== Memories ====================

  async getMemories(page = 1, pageSize = 20, source?: string): Promise<MemoriesResponse> {
    let url = `${API_BASE}/memories?page=${page}&page_size=${pageSize}`
    if (source) {
      url += `&source=${source}`
    }
    const response = await fetch(url, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<MemoriesResponse>(response)
  }

  async getMemory(id: string): Promise<Memory> {
    const response = await fetch(`${API_BASE}/memories/${id}`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<Memory>(response)
  }

  async createMemory(content: string): Promise<Memory> {
    const response = await fetch(`${API_BASE}/memories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    })
    return this.handleResponse<Memory>(response)
  }

  async updateMemory(id: string, content: string): Promise<Memory> {
    const response = await fetch(`${API_BASE}/memories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    })
    return this.handleResponse<Memory>(response)
  }

  async deleteMemory(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/memories/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    await this.handleResponse(response)
  }

  async deleteAllMemories(): Promise<DeleteCountResponse> {
    const response = await fetch(`${API_BASE}/memories/all`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    return this.handleResponse<DeleteCountResponse>(response)
  }

  // ==================== Flowmo ====================

  async getFlowmoTopic(): Promise<Topic> {
    const response = await fetch(`${API_BASE}/flowmo/topic`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<Topic>(response)
  }

  async getFlowmos(page = 1, pageSize = 20): Promise<FlowmosResponse> {
    const response = await fetch(`${API_BASE}/flowmos?page=${page}&page_size=${pageSize}`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<FlowmosResponse>(response)
  }

  async createFlowmo(content: string): Promise<Flowmo> {
    const response = await fetch(`${API_BASE}/flowmos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    })
    return this.handleResponse<Flowmo>(response)
  }

  async deleteFlowmo(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/flowmos/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    await this.handleResponse(response)
  }

  async deleteAllFlowmos(): Promise<DeleteCountResponse> {
    const response = await fetch(`${API_BASE}/flowmos/all`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    return this.handleResponse<DeleteCountResponse>(response)
  }

  // ==================== Settings ====================

  async getSettings(): Promise<Settings> {
    const response = await fetch(`${API_BASE}/settings`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<Settings>(response)
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    })
    return this.handleResponse<Settings>(response)
  }

  // ==================== Providers ====================

  async getProviders(): Promise<ProvidersResponse> {
    const response = await fetch(`${API_BASE}/providers`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<ProvidersResponse>(response)
  }

  async createProvider(data: ProviderInput): Promise<Provider> {
    const response = await fetch(`${API_BASE}/providers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return this.handleResponse<Provider>(response)
  }

  async updateProvider(id: string, data: ProviderInput): Promise<Provider> {
    const response = await fetch(`${API_BASE}/providers/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return this.handleResponse<Provider>(response)
  }

  async deleteProvider(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/providers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    await this.handleResponse(response)
  }

  // ==================== Admin ====================

  async getInviteCodes(): Promise<InviteCodesResponse> {
    const response = await fetch(`${API_BASE}/admin/invite-codes`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<InviteCodesResponse>(response)
  }

  async createInviteCode(maxUses = 1, expiresDays?: number): Promise<InviteCode> {
    const body: { max_uses: number; expires_days?: number } = { max_uses: maxUses }
    if (expiresDays) {
      body.expires_days = expiresDays
    }
    const response = await fetch(`${API_BASE}/admin/invite-codes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })
    return this.handleResponse<InviteCode>(response)
  }

  async deleteInviteCode(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/invite-codes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    await this.handleResponse(response)
  }

  async getUsers(): Promise<UsersResponse> {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: this.getHeaders(false),
    })
    return this.handleResponse<UsersResponse>(response)
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(false),
    })
    await this.handleResponse(response)
  }
}

export const api = new ApiService()
