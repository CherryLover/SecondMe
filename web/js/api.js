/**
 * API 请求封装
 */

const API_BASE = 'http://localhost:8000/api';

class API {
    // ==================== Topics ====================

    static async createTopic() {
        const response = await fetch(`${API_BASE}/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        return response.json();
    }

    static async getTopics() {
        const response = await fetch(`${API_BASE}/topics`);
        return response.json();
    }

    static async getTopic(topicId) {
        const response = await fetch(`${API_BASE}/topics/${topicId}`);
        return response.json();
    }

    static async updateTopic(topicId, title) {
        const response = await fetch(`${API_BASE}/topics/${topicId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        return response.json();
    }

    static async deleteTopic(topicId) {
        const response = await fetch(`${API_BASE}/topics/${topicId}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    // ==================== Messages ====================

    static async getMessages(topicId) {
        const response = await fetch(`${API_BASE}/topics/${topicId}/messages`);
        return response.json();
    }

    static async sendMessage(topicId, content, providerId, model) {
        const response = await fetch(`${API_BASE}/topics/${topicId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                provider_id: providerId || undefined,
                model: model || undefined
            })
        });
        return response.json();
    }

    static async sendMessageStream(topicId, content, providerId, model, onChunk, onDone, onError) {
        try {
            const response = await fetch(`${API_BASE}/topics/${topicId}/messages/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    provider_id: providerId || undefined,
                    model: model || undefined
                })
            });

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                base_url: baseUrl,
                api_key: apiKey,
                enabled
            })
        });
        return response.json();
    }

    static async getProviders() {
        const response = await fetch(`${API_BASE}/providers`);
        return response.json();
    }

    static async updateProvider(providerId, name, baseUrl, apiKey, enabled) {
        const response = await fetch(`${API_BASE}/providers/${providerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                base_url: baseUrl,
                api_key: apiKey || undefined,
                enabled
            })
        });
        return response.json();
    }

    static async deleteProvider(providerId) {
        const response = await fetch(`${API_BASE}/providers/${providerId}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    static async getModels(providerId) {
        const response = await fetch(`${API_BASE}/providers/${providerId}/models`);
        return response.json();
    }

    // ==================== Memories ====================

    static async getMemories(page = 1, pageSize = 20, source = null) {
        let url = `${API_BASE}/memories?page=${page}&page_size=${pageSize}`;
        if (source) {
            url += `&source=${source}`;
        }
        const response = await fetch(url);
        return response.json();
    }

    static async getMemory(memoryId) {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`);
        return response.json();
    }

    static async createMemory(content) {
        const response = await fetch(`${API_BASE}/memories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        return response.json();
    }

    static async updateMemory(memoryId, content) {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        return response.json();
    }

    static async deleteMemory(memoryId) {
        const response = await fetch(`${API_BASE}/memories/${memoryId}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    static async deleteAllMemories() {
        const response = await fetch(`${API_BASE}/memories/all`, {
            method: 'DELETE'
        });
        return response.json();
    }

    // ==================== Settings ====================

    static async getSettings() {
        const response = await fetch(`${API_BASE}/settings`);
        return response.json();
    }

    static async updateSettings(settings) {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return response.json();
    }
}
