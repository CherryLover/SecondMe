/**
 * API 请求封装
 */

const API_BASE = '/api';

class API {
    /**
     * 获取带认证的请求头
     */
    static getHeaders(contentType = true) {
        const headers = {};
        if (contentType) {
            headers['Content-Type'] = 'application/json';
        }
        const token = Auth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * 检查响应头中是否有新 Token（滑动过期刷新）
     */
    static checkNewToken(response) {
        const newToken = response.headers.get('X-New-Token');
        if (newToken) {
            // 自动更新 Token
            localStorage.setItem(Auth.TOKEN_KEY, newToken);
            console.log('Token 已自动刷新');
        }
    }

    /**
     * 处理响应，检查认证错误和 Token 刷新
     */
    static async handleResponse(response) {
        // 检查是否有新 Token
        this.checkNewToken(response);

        if (response.status === 401) {
            Auth.clearLogin();
            window.location.href = '/login.html';
            throw new Error('认证已过期，请重新登录');
        }
        return response.json();
    }

    // ==================== Topics ====================

    static async createTopic() {
        const response = await fetch(`${API_BASE}/topics`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({})
        });
        return this.handleResponse(response);
    }

    static async getTopics() {
        const response = await fetch(`${API_BASE}/topics`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async getTopic(topicId) {
        const response = await fetch(`${API_BASE}/topics/${topicId}`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async updateTopic(topicId, title) {
        const response = await fetch(`${API_BASE}/topics/${topicId}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ title })
        });
        return this.handleResponse(response);
    }

    static async deleteTopic(topicId) {
        const response = await fetch(`${API_BASE}/topics/${topicId}`, {
            method: 'DELETE',
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    // ==================== Messages ====================

    static async getMessages(topicId) {
        const response = await fetch(`${API_BASE}/topics/${topicId}/messages`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async sendMessage(topicId, content, providerId, model) {
        const response = await fetch(`${API_BASE}/topics/${topicId}/messages`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                content,
                provider_id: providerId || undefined,
                model: model || undefined
            })
        });
        return this.handleResponse(response);
    }

    static async sendMessageStream(topicId, content, providerId, model, onChunk, onDone, onError) {
        try {
            const response = await fetch(`${API_BASE}/topics/${topicId}/messages/stream`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    content,
                    provider_id: providerId || undefined,
                    model: model || undefined
                })
            });

            // 检查是否有新 Token
            this.checkNewToken(response);

            if (response.status === 401) {
                Auth.clearLogin();
                window.location.href = '/login.html';
                onError('认证已过期，请重新登录');
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') {
                                onChunk(data.content);
                            } else if (data.type === 'done') {
                                onDone(data);
                            } else if (data.type === 'error') {
                                onError(data.message);
                            } else if (data.type === 'user_message') {
                                // 用户消息已发送
                            }
                        } catch (e) {
                            // 解析失败，忽略
                        }
                    }
                }
            }
        } catch (error) {
            onError(error.message);
        }
    }

    // ==================== Providers ====================

    static async createProvider(name, baseUrl, apiKey, enabled = true) {
        const response = await fetch(`${API_BASE}/providers`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                name,
                base_url: baseUrl,
                api_key: apiKey,
                enabled
            })
        });
        return this.handleResponse(response);
    }

    static async getProviders() {
        const response = await fetch(`${API_BASE}/providers`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async updateProvider(providerId, name, baseUrl, apiKey, enabled) {
        const response = await fetch(`${API_BASE}/providers/${providerId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                name,
                base_url: baseUrl,
                api_key: apiKey || undefined,
                enabled
            })
        });
        return this.handleResponse(response);
    }

    static async deleteProvider(providerId) {
        const response = await fetch(`${API_BASE}/providers/${providerId}`, {
            method: 'DELETE',
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async getModels(providerId) {
        const response = await fetch(`${API_BASE}/providers/${providerId}/models`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    // ==================== Memories ====================

    static async getMemories(page = 1, pageSize = 20, source = null) {
        let url = `${API_BASE}/memories?page=${page}&page_size=${pageSize}`;
        if (source) {
            url += `&source=${source}`;
        }
        const response = await fetch(url, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async getMemory(memoryId) {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async createMemory(content) {
        const response = await fetch(`${API_BASE}/memories`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ content })
        });
        return this.handleResponse(response);
    }

    static async updateMemory(memoryId, content) {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ content })
        });
        return this.handleResponse(response);
    }

    static async deleteMemory(memoryId) {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
            method: 'DELETE',
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async deleteAllMemories() {
        const response = await fetch(`${API_BASE}/memories/all`, {
            method: 'DELETE'
        });
        return response.json();
    }

    // ==================== Flowmo ====================

    static async getFlowmoTopic() {
        const response = await fetch(`${API_BASE}/flowmo/topic`);
        return response.json();
    }

    static async getFlowmos(page = 1, pageSize = 20) {
        const response = await fetch(`${API_BASE}/flowmos?page=${page}&page_size=${pageSize}`);
        return response.json();
    }

    static async createFlowmo(content) {
        const response = await fetch(`${API_BASE}/flowmos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        return response.json();
    }

    static async deleteFlowmo(flowmoId) {
        const response = await fetch(`${API_BASE}/flowmos/${flowmoId}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    static async deleteAllFlowmos() {
        const response = await fetch(`${API_BASE}/flowmos/all`, {
            method: 'DELETE'
        });
        return response.json();
    }

    // ==================== Settings ====================

    static async getSettings() {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async updateSettings(settings) {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(settings)
        });
        return this.handleResponse(response);
    }

    // ==================== Admin ====================

    static async getInviteCodes() {
        const response = await fetch(`${API_BASE}/admin/invite-codes`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async createInviteCode(maxUses = 1, expiresDays = null) {
        const body = { max_uses: maxUses };
        if (expiresDays) {
            body.expires_days = expiresDays;
        }
        const response = await fetch(`${API_BASE}/admin/invite-codes`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        return this.handleResponse(response);
    }

    static async deleteInviteCode(codeId) {
        const response = await fetch(`${API_BASE}/admin/invite-codes/${codeId}`, {
            method: 'DELETE',
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async getUsers() {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    static async deleteUser(userId) {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: this.getHeaders(false)
        });
        return this.handleResponse(response);
    }

    // ==================== Auth ====================

    static async changePassword(currentPassword, newPassword) {
        const response = await fetch(`${API_BASE}/auth/password`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        return this.handleResponse(response);
    }
}
