/**
 * UI 渲染函数
 */

// 渲染话题列表
function renderTopicList(topics, activeTopicId) {
    const container = document.getElementById('topic-list');
    container.innerHTML = topics.map(topic => `
        <div class="topic-item ${topic.id === activeTopicId ? 'active' : ''}"
             data-id="${topic.id}"
             onclick="selectTopic('${topic.id}')">
            <span class="topic-title">${escapeHtml(topic.title)}</span>
            <button class="topic-delete" onclick="event.stopPropagation(); deleteTopic('${topic.id}')">&times;</button>
        </div>
    `).join('');
}

// 渲染消息列表
function renderMessages(messages) {
    const container = document.getElementById('chat-messages');

    if (messages.length === 0) {
        container.innerHTML = '<div class="empty-state" id="empty-state"><p>开始新的对话</p></div>';
        return;
    }

    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-content">${escapeHtml(msg.content)}</div>
        </div>
    `).join('');

    // 滚动到底部
    container.scrollTop = container.scrollHeight;
}

// 添加消息到列表
function appendMessage(role, content) {
    const container = document.getElementById('chat-messages');
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;

    return messageDiv;
}

// 添加打字指示器
function addTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.className = 'message assistant';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

// 移除打字指示器
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 更新流式消息内容
function updateStreamingMessage(messageDiv, content) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.textContent = content;
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
}

// 渲染服务商下拉列表
function renderProviderSelect(providers, selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    const currentValue = select.value;

    select.innerHTML = '<option value="">选择服务商</option>' +
        providers
            .filter(p => p.enabled)
            .map(p => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
            .join('');

    // 保持之前的选择
    if (currentValue && !selectedId) {
        select.value = currentValue;
    }
}

// 渲染模型下拉列表
function renderModelSelect(models) {
    const select = document.getElementById('model-select');
    select.innerHTML = '<option value="">选择模型</option>' +
        models.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
}

// 渲染服务商管理列表
function renderProviderList(providers) {
    const container = document.getElementById('provider-list');
    container.innerHTML = providers.map(p => `
        <div class="provider-item">
            <div class="provider-info">
                <div class="provider-name">${escapeHtml(p.name)} ${p.enabled ? '' : '(已禁用)'}</div>
                <div class="provider-url">${escapeHtml(p.base_url)}</div>
            </div>
            <div class="provider-actions">
                <button class="btn-secondary" onclick="editProvider('${p.id}')">编辑</button>
                <button class="btn-secondary btn-danger" onclick="deleteProvider('${p.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

// 记忆类型映射
const MEMORY_TYPE_LABELS = {
    'personal': '个人信息',
    'preference': '偏好习惯',
    'fact': '重要事实',
    'plan': '计划决定',
    'manual': '手动添加',
    'chat': '对话'
};

// 渲染记忆列表
function renderMemoryList(memories) {
    const container = document.getElementById('memory-list');

    if (memories.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">暂无记忆</p>';
        return;
    }

    container.innerHTML = memories.map(m => {
        const memoryType = m.memory_type || 'chat';
        const typeLabel = MEMORY_TYPE_LABELS[memoryType] || memoryType;
        return `
        <div class="memory-item">
            <div class="memory-content" onclick="viewMemoryDetail('${m.id}')" style="cursor: pointer;">${escapeHtml(m.content)}</div>
            <div class="memory-meta">
                <div class="memory-stats">
                    <span class="memory-type-tag memory-type-${memoryType}">${typeLabel}</span>
                    <span>来源: ${m.source === 'chat' ? '对话' : '手动'}</span>
                    <span>使用次数: ${m.use_count}</span>
                </div>
                <div class="memory-actions-inline">
                    <button class="btn-secondary btn-small" onclick="viewMemoryDetail('${m.id}')">详情</button>
                    <button class="btn-secondary btn-small" onclick="editMemory('${m.id}', '${escapeAttr(m.content)}')">编辑</button>
                    <button class="btn-secondary btn-small btn-danger" onclick="deleteMemory('${m.id}')">删除</button>
                </div>
            </div>
        </div>
    `}).join('');
}

// 渲染记忆详情
function renderMemoryDetail(memory) {
    document.getElementById('detail-memory-content').textContent = memory.content;
    document.getElementById('detail-memory-source').textContent = memory.source === 'chat' ? '对话生成' : '手动添加';
    document.getElementById('detail-memory-use-count').textContent = memory.use_count;
    document.getElementById('detail-memory-created-at').textContent = formatDateTime(memory.created_at);
    document.getElementById('detail-memory-last-used').textContent = memory.last_used_at ? formatDateTime(memory.last_used_at) : '从未使用';

    const usageList = document.getElementById('memory-usage-list');
    if (memory.usage_records && memory.usage_records.length > 0) {
        usageList.innerHTML = memory.usage_records.map(u => `
            <div class="usage-item">
                <div class="usage-topic">${escapeHtml(u.topic_title || '未知话题')}</div>
                <div class="usage-time">${formatDateTime(u.used_at)}</div>
            </div>
        `).join('');
    } else {
        usageList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">暂无使用记录</p>';
    }
}

// 格式化日期时间
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 转义属性值（用于 onclick 等）
function escapeAttr(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// 打开弹窗
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 设置输入状态
function setInputEnabled(enabled) {
    const input = document.getElementById('message-input');
    const button = document.getElementById('send-btn');
    input.disabled = !enabled;
    button.disabled = !enabled;
}

// 设置聊天标题
function setChatTitle(title) {
    document.getElementById('chat-title').textContent = title;
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 简单的 alert，可以后续改成更好看的 toast
    alert(message);
}

// ==================== Flowmo ====================

// Flowmo 来源映射
const FLOWMO_SOURCE_LABELS = {
    'chat': '对话记录',
    'direct': '直接添加'
};

// 渲染 Flowmo 列表
function renderFlowmoList(flowmos) {
    const container = document.getElementById('flowmo-list');

    if (flowmos.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">暂无随想记录</p>';
        return;
    }

    container.innerHTML = flowmos.map(f => {
        const sourceLabel = FLOWMO_SOURCE_LABELS[f.source] || f.source;
        return `
        <div class="flowmo-item">
            <div class="flowmo-content">${escapeHtml(f.content)}</div>
            <div class="flowmo-meta">
                <div class="flowmo-stats">
                    <span class="flowmo-source-tag flowmo-source-${f.source}">${sourceLabel}</span>
                    <span>${formatDateTime(f.created_at)}</span>
                </div>
                <div class="flowmo-actions-inline">
                    <button class="btn-secondary btn-small btn-danger" onclick="deleteFlowmo('${f.id}')">删除</button>
                </div>
            </div>
        </div>
    `}).join('');
}
