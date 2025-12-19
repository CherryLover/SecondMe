/**
 * 主应用逻辑
 */

// 全局状态
let currentTopicId = null;
let topics = [];
let providers = [];
let settings = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    if (!Auth.requireAuth()) {
        return;
    }

    // 显示用户信息
    updateUserInfo();

    await loadProviders();
    await loadSettings();
    await loadTopics();

    // 绑定事件
    bindEvents();
});

// 更新用户信息显示
function updateUserInfo() {
    const user = Auth.getUser();
    if (user) {
        const userInfoEl = document.getElementById('user-info');
        if (userInfoEl) {
            userInfoEl.textContent = user.username;
        }

        // 显示/隐藏管理员功能
        const isAdmin = Auth.isAdmin();
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }
    }
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        Auth.logout();
    }
}

// 绑定事件
function bindEvents() {
    // 新建话题
    document.getElementById('new-topic-btn').addEventListener('click', createNewTopic);

    // 发送消息
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 自动调整输入框高度
    document.getElementById('message-input').addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
    });

    // 设置弹窗
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('add-provider-btn').addEventListener('click', () => openProviderModal());
    document.getElementById('save-provider-btn').addEventListener('click', saveProvider);
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);

    // 记忆弹窗
    document.getElementById('memory-btn').addEventListener('click', openMemories);
    document.getElementById('add-memory-btn').addEventListener('click', () => openModal('add-memory-modal'));
    document.getElementById('save-memory-btn').addEventListener('click', saveMemory);
    document.getElementById('update-memory-btn').addEventListener('click', updateMemory);
    document.getElementById('delete-all-memories-btn').addEventListener('click', deleteAllMemories);

    // Flowmo
    document.getElementById('flowmo-topic-btn').addEventListener('click', openFlowmoTopic);
    document.getElementById('flowmo-list-btn').addEventListener('click', openFlowmoList);
    document.getElementById('add-flowmo-btn').addEventListener('click', () => openModal('add-flowmo-modal'));
    document.getElementById('save-flowmo-btn').addEventListener('click', saveFlowmo);
    document.getElementById('delete-all-flowmos-btn').addEventListener('click', deleteAllFlowmos);

    // 默认服务商切换时加载模型
    document.getElementById('default-chat-provider').addEventListener('change', (e) => {
        // 可以在这里加载模型列表供选择
    });
}

// 加载话题列表
async function loadTopics() {
    try {
        const data = await API.getTopics();
        topics = data.topics;
        renderTopicList(topics, currentTopicId);
    } catch (error) {
        console.error('Failed to load topics:', error);
    }
}

// 加载服务商列表
async function loadProviders() {
    try {
        const data = await API.getProviders();
        providers = data.providers;
    } catch (error) {
        console.error('Failed to load providers:', error);
    }
}

// 加载设置
async function loadSettings() {
    try {
        settings = await API.getSettings();
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// 创建新话题
async function createNewTopic() {
    try {
        const topic = await API.createTopic();
        topics.unshift(topic);
        renderTopicList(topics, topic.id);
        await selectTopic(topic.id);
    } catch (error) {
        console.error('Failed to create topic:', error);
        showToast('创建话题失败');
    }
}

// 选择话题
async function selectTopic(topicId) {
    currentTopicId = topicId;
    renderTopicList(topics, topicId);

    // 加载话题详情和消息
    try {
        const topic = await API.getTopic(topicId);
        setChatTitle(topic.title);

        const data = await API.getMessages(topicId);
        renderMessages(data.messages);

        setInputEnabled(true);
    } catch (error) {
        console.error('Failed to load topic:', error);
        showToast('加载话题失败');
    }
}

// 删除话题
async function deleteTopic(topicId) {
    if (!confirm('确定要删除这个话题吗？')) {
        return;
    }

    try {
        await API.deleteTopic(topicId);
        topics = topics.filter(t => t.id !== topicId);
        renderTopicList(topics, currentTopicId);

        if (currentTopicId === topicId) {
            currentTopicId = null;
            setChatTitle('选择或创建一个话题');
            document.getElementById('chat-messages').innerHTML =
                '<div class="empty-state" id="empty-state"><p>选择一个话题开始对话，或创建新话题</p></div>';
            setInputEnabled(false);
        }
    } catch (error) {
        console.error('Failed to delete topic:', error);
        showToast('删除话题失败');
    }
}

// 发送消息
async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content || !currentTopicId) {
        return;
    }

    // 清空输入框
    input.value = '';
    input.style.height = 'auto';

    // 禁用输入
    setInputEnabled(false);

    // 显示用户消息
    appendMessage('user', content);

    // 添加打字指示器
    addTypingIndicator();

    // 流式发送消息（使用默认 Provider 和模型）
    let assistantMessageDiv = null;
    let fullResponse = '';

    await API.sendMessageStream(
        currentTopicId,
        content,
        null,  // 使用默认 Provider
        null,  // 使用默认模型
        // onChunk
        (chunk) => {
            removeTypingIndicator();
            if (!assistantMessageDiv) {
                assistantMessageDiv = appendMessage('assistant', '');
            }
            fullResponse += chunk;
            updateStreamingMessage(assistantMessageDiv, fullResponse);
        },
        // onDone
        (data) => {
            removeTypingIndicator();
            // 更新话题标题
            if (data.topic_title_updated && data.new_title) {
                setChatTitle(data.new_title);
                // 更新话题列表中的标题
                const topic = topics.find(t => t.id === currentTopicId);
                if (topic) {
                    topic.title = data.new_title;
                    renderTopicList(topics, currentTopicId);
                }
            }
            setInputEnabled(true);
            input.focus();
        },
        // onError
        (error) => {
            removeTypingIndicator();
            showToast('发送失败: ' + error);
            setInputEnabled(true);
        }
    );
}

// 打开设置弹窗
async function openSettings() {
    // 加载服务商列表
    await loadProviders();
    renderProviderList(providers);

    // 填充设置
    renderProviderSelect(providers, 'default-chat-provider', settings.default_chat_provider_id);
    renderProviderSelect(providers, 'embedding-provider', settings.embedding_provider_id);

    document.getElementById('default-chat-model').value = settings.default_chat_model || '';
    document.getElementById('embedding-model').value = settings.embedding_model || '';
    document.getElementById('memory-top-k').value = settings.memory_top_k || 5;

    // 记忆提炼设置
    document.getElementById('memory-extraction-enabled').checked = settings.memory_extraction_enabled !== false;
    document.getElementById('memory-silent-minutes').value = settings.memory_silent_minutes || 2;
    document.getElementById('memory-context-messages').value = settings.memory_context_messages || 6;

    openModal('settings-modal');
}

// 打开服务商编辑弹窗
async function openProviderModal(providerId = null) {
    const modal = document.getElementById('provider-modal');
    const title = document.getElementById('provider-modal-title');

    if (providerId) {
        title.textContent = '编辑服务商';
        // 这里应该有个 API 获取服务商详情，暂时从列表中获取
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
            document.getElementById('provider-id').value = provider.id;
            document.getElementById('provider-name').value = provider.name;
            document.getElementById('provider-base-url').value = provider.base_url;
            document.getElementById('provider-api-key').value = ''; // 不显示原有 key
            document.getElementById('provider-enabled').checked = provider.enabled;
        }
    } else {
        title.textContent = '添加服务商';
        document.getElementById('provider-id').value = '';
        document.getElementById('provider-name').value = '';
        document.getElementById('provider-base-url').value = '';
        document.getElementById('provider-api-key').value = '';
        document.getElementById('provider-enabled').checked = true;
    }

    openModal('provider-modal');
}

// 编辑服务商
function editProvider(providerId) {
    openProviderModal(providerId);
}

// 保存服务商
async function saveProvider() {
    const id = document.getElementById('provider-id').value;
    const name = document.getElementById('provider-name').value.trim();
    const baseUrl = document.getElementById('provider-base-url').value.trim();
    const apiKey = document.getElementById('provider-api-key').value.trim();
    const enabled = document.getElementById('provider-enabled').checked;

    if (!name || !baseUrl) {
        showToast('请填写名称和 Base URL');
        return;
    }

    if (!id && !apiKey) {
        showToast('请填写 API Key');
        return;
    }

    try {
        if (id) {
            await API.updateProvider(id, name, baseUrl, apiKey || undefined, enabled);
        } else {
            await API.createProvider(name, baseUrl, apiKey, enabled);
        }

        closeModal('provider-modal');
        await loadProviders();
        renderProviderList(providers);
        renderProviderSelect(providers, 'default-chat-provider', settings.default_chat_provider_id);
        renderProviderSelect(providers, 'embedding-provider', settings.embedding_provider_id);

        showToast('保存成功');
    } catch (error) {
        console.error('Failed to save provider:', error);
        showToast('保存失败');
    }
}

// 删除服务商
async function deleteProvider(providerId) {
    if (!confirm('确定要删除这个服务商吗？')) {
        return;
    }

    try {
        await API.deleteProvider(providerId);
        await loadProviders();
        renderProviderList(providers);
        renderProviderSelect(providers, 'default-chat-provider', settings.default_chat_provider_id);
        renderProviderSelect(providers, 'embedding-provider', settings.embedding_provider_id);

        showToast('删除成功');
    } catch (error) {
        console.error('Failed to delete provider:', error);
        showToast('删除失败');
    }
}

// 保存设置
async function saveSettings() {
    const newSettings = {
        default_chat_provider_id: document.getElementById('default-chat-provider').value || null,
        default_chat_model: document.getElementById('default-chat-model').value || null,
        embedding_provider_id: document.getElementById('embedding-provider').value || null,
        embedding_model: document.getElementById('embedding-model').value || null,
        memory_top_k: parseInt(document.getElementById('memory-top-k').value) || 5,
        memory_extraction_enabled: document.getElementById('memory-extraction-enabled').checked,
        memory_silent_minutes: parseInt(document.getElementById('memory-silent-minutes').value) || 2,
        memory_context_messages: parseInt(document.getElementById('memory-context-messages').value) || 6
    };

    try {
        settings = await API.updateSettings(newSettings);
        closeModal('settings-modal');
        showToast('设置已保存');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('保存设置失败');
    }
}

// 打开记忆管理弹窗
async function openMemories() {
    try {
        const data = await API.getMemories(1, 50);
        renderMemoryList(data.memories);
        openModal('memory-modal');
    } catch (error) {
        console.error('Failed to load memories:', error);
        showToast('加载记忆失败');
    }
}

// 保存记忆
async function saveMemory() {
    const content = document.getElementById('memory-content').value.trim();

    if (!content) {
        showToast('请输入记忆内容');
        return;
    }

    try {
        await API.createMemory(content);
        document.getElementById('memory-content').value = '';
        closeModal('add-memory-modal');

        // 刷新记忆列表
        const data = await API.getMemories(1, 50);
        renderMemoryList(data.memories);

        showToast('记忆已添加');
    } catch (error) {
        console.error('Failed to save memory:', error);
        showToast('添加记忆失败');
    }
}

// 删除记忆
async function deleteMemory(memoryId) {
    if (!confirm('确定要删除这条记忆吗？')) {
        return;
    }

    try {
        await API.deleteMemory(memoryId);

        // 刷新记忆列表
        const data = await API.getMemories(1, 50);
        renderMemoryList(data.memories);

        showToast('记忆已删除');
    } catch (error) {
        console.error('Failed to delete memory:', error);
        showToast('删除记忆失败');
    }
}

// 删除所有记忆
async function deleteAllMemories() {
    if (!confirm('确定要删除所有记忆吗？此操作不可恢复！')) {
        return;
    }

    try {
        const result = await API.deleteAllMemories();

        // 刷新记忆列表
        const data = await API.getMemories(1, 50);
        renderMemoryList(data.memories);

        showToast(`已删除 ${result.deleted_count} 条记忆`);
    } catch (error) {
        console.error('Failed to delete all memories:', error);
        showToast('删除记忆失败');
    }
}

// 编辑记忆 - 打开弹窗
function editMemory(memoryId, content) {
    document.getElementById('edit-memory-id').value = memoryId;
    document.getElementById('edit-memory-content').value = content;
    openModal('edit-memory-modal');
}

// 更新记忆
async function updateMemory() {
    const memoryId = document.getElementById('edit-memory-id').value;
    const content = document.getElementById('edit-memory-content').value.trim();

    if (!content) {
        showToast('请输入记忆内容');
        return;
    }

    try {
        await API.updateMemory(memoryId, content);
        closeModal('edit-memory-modal');

        // 刷新记忆列表
        const data = await API.getMemories(1, 50);
        renderMemoryList(data.memories);

        showToast('记忆已更新');
    } catch (error) {
        console.error('Failed to update memory:', error);
        showToast('更新记忆失败');
    }
}

// 查看记忆详情
async function viewMemoryDetail(memoryId) {
    try {
        const memory = await API.getMemory(memoryId);
        renderMemoryDetail(memory);
        openModal('memory-detail-modal');
    } catch (error) {
        console.error('Failed to load memory detail:', error);
        showToast('加载记忆详情失败');
    }
}

// ==================== Flowmo ====================

// 打开 Flowmo 话题
async function openFlowmoTopic() {
    try {
        const topic = await API.getFlowmoTopic();

        // 将 Flowmo 话题添加到话题列表（如果不存在）
        const existingIndex = topics.findIndex(t => t.id === topic.id);
        if (existingIndex === -1) {
            topics.unshift(topic);
        }

        // 选择该话题
        await selectTopic(topic.id);
    } catch (error) {
        console.error('Failed to open flowmo topic:', error);
        showToast('打开 Flowmo 话题失败');
    }
}

// 打开 Flowmo 列表弹窗
async function openFlowmoList() {
    try {
        const data = await API.getFlowmos(1, 50);
        renderFlowmoList(data.flowmos);
        openModal('flowmo-modal');
    } catch (error) {
        console.error('Failed to load flowmos:', error);
        showToast('加载随想列表失败');
    }
}

// 保存 Flowmo（直接添加）
async function saveFlowmo() {
    const content = document.getElementById('flowmo-content').value.trim();

    if (!content) {
        showToast('请输入随想内容');
        return;
    }

    try {
        await API.createFlowmo(content);
        document.getElementById('flowmo-content').value = '';
        closeModal('add-flowmo-modal');

        // 刷新 Flowmo 列表
        const data = await API.getFlowmos(1, 50);
        renderFlowmoList(data.flowmos);

        showToast('随想已添加');
    } catch (error) {
        console.error('Failed to save flowmo:', error);
        showToast('添加随想失败');
    }
}

// 删除 Flowmo
async function deleteFlowmo(flowmoId) {
    if (!confirm('确定要删除这条随想吗？')) {
        return;
    }

    try {
        await API.deleteFlowmo(flowmoId);

        // 刷新 Flowmo 列表
        const data = await API.getFlowmos(1, 50);
        renderFlowmoList(data.flowmos);

        showToast('随想已删除');
    } catch (error) {
        console.error('Failed to delete flowmo:', error);
        showToast('删除随想失败');
    }
}

// 删除所有 Flowmo
async function deleteAllFlowmos() {
    if (!confirm('确定要删除所有随想吗？此操作不可恢复！')) {
        return;
    }

    try {
        const result = await API.deleteAllFlowmos();

        // 刷新 Flowmo 列表
        const data = await API.getFlowmos(1, 50);
        renderFlowmoList(data.flowmos);

        showToast(`已删除 ${result.deleted_count} 条随想`);
    } catch (error) {
        console.error('Failed to delete all flowmos:', error);
        showToast('删除随想失败');
    }
}


// ==================== 管理员功能 ====================

// 打开管理员面板
async function openAdmin() {
    if (!Auth.isAdmin()) {
        showToast('需要管理员权限');
        return;
    }

    await loadInviteCodes();
    await loadUsers();
    openModal('admin-modal');
}

// 加载邀请码列表
async function loadInviteCodes() {
    try {
        const data = await API.getInviteCodes();
        renderInviteCodeList(data.invite_codes);
    } catch (error) {
        console.error('Failed to load invite codes:', error);
    }
}

// 渲染邀请码列表
function renderInviteCodeList(codes) {
    const container = document.getElementById('invite-code-list');
    if (!container) return;

    if (!codes || codes.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无邀请码</p>';
        return;
    }

    container.innerHTML = codes.map(code => `
        <div class="invite-code-item">
            <div class="invite-code-info">
                <span class="invite-code">${code.code}</span>
                <span class="invite-code-usage">${code.used_count}/${code.max_uses} 次使用</span>
                ${code.expires_at ? `<span class="invite-code-expires">过期: ${formatDate(code.expires_at)}</span>` : ''}
            </div>
            <button class="btn-danger-small" onclick="deleteInviteCode('${code.id}')">删除</button>
        </div>
    `).join('');
}

// 创建邀请码
async function createInviteCode() {
    const maxUses = parseInt(document.getElementById('invite-max-uses').value) || 1;
    const expiresDays = parseInt(document.getElementById('invite-expires-days').value) || null;

    try {
        await API.createInviteCode(maxUses, expiresDays);
        await loadInviteCodes();
        showToast('邀请码已创建');
    } catch (error) {
        console.error('Failed to create invite code:', error);
        showToast('创建邀请码失败');
    }
}

// 删除邀请码
async function deleteInviteCode(codeId) {
    if (!confirm('确定要删除这个邀请码吗？')) {
        return;
    }

    try {
        await API.deleteInviteCode(codeId);
        await loadInviteCodes();
        showToast('邀请码已删除');
    } catch (error) {
        console.error('Failed to delete invite code:', error);
        showToast('删除邀请码失败');
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const data = await API.getUsers();
        renderUserList(data.users);
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// 渲染用户列表
function renderUserList(users) {
    const container = document.getElementById('user-list');
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = '<p class="empty-text">暂无用户</p>';
        return;
    }

    const currentUser = Auth.getUser();
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <span class="user-name">${user.username}</span>
                <span class="user-role ${user.role}">${user.role === 'admin' ? '管理员' : '用户'}</span>
                <span class="user-created">注册: ${formatDate(user.created_at)}</span>
            </div>
            ${user.id !== currentUser?.id ? `<button class="btn-danger-small" onclick="deleteUser('${user.id}')">删除</button>` : ''}
        </div>
    `).join('');
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除这个用户吗？该用户的所有数据将被删除。')) {
        return;
    }

    try {
        await API.deleteUser(userId);
        await loadUsers();
        showToast('用户已删除');
    } catch (error) {
        console.error('Failed to delete user:', error);
        showToast('删除用户失败');
    }
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
