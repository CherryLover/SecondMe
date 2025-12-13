# SecondMe - API 设计

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **Content-Type**: `application/json`

---

## 话题接口

### 创建话题

```
POST /api/topics
```

**请求体**: 无（空对象或不传）

**响应**:
```json
{
  "id": "uuid-string",
  "title": "新话题",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 获取话题列表

```
GET /api/topics
```

**响应**:
```json
{
  "topics": [
    {
      "id": "uuid-string",
      "title": "话题标题",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**说明**: 按 `updated_at` 降序排列，最近更新的在前面

### 获取单个话题

```
GET /api/topics/{topic_id}
```

**响应**:
```json
{
  "id": "uuid-string",
  "title": "话题标题",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 更新话题标题

```
PATCH /api/topics/{topic_id}
```

**请求体**:
```json
{
  "title": "新标题"
}
```

**响应**:
```json
{
  "id": "uuid-string",
  "title": "新标题",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 删除话题

```
DELETE /api/topics/{topic_id}
```

**响应**:
```json
{
  "success": true
}
```

**说明**: 同时删除该话题下的所有消息和向量记忆

---

## 消息接口

### 获取消息列表

```
GET /api/topics/{topic_id}/messages
```

**响应**:
```json
{
  "messages": [
    {
      "id": "uuid-string",
      "topic_id": "uuid-string",
      "role": "user",
      "content": "用户消息内容",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-string",
      "topic_id": "uuid-string",
      "role": "assistant",
      "content": "AI 回复内容",
      "created_at": "2024-01-01T00:00:01Z"
    }
  ]
}
```

**说明**: 按 `created_at` 升序排列

### 发送消息

```
POST /api/topics/{topic_id}/messages
```

**请求体**:
```json
{
  "content": "用户的问题",
  "provider_id": "uuid-string",
  "model": "gpt-3.5-turbo"
}
```

**说明**:
- `provider_id` 和 `model` 可选，不传则使用默认配置

**响应**:
```json
{
  "user_message": {
    "id": "uuid-string",
    "topic_id": "uuid-string",
    "role": "user",
    "content": "用户的问题",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "assistant_message": {
    "id": "uuid-string",
    "topic_id": "uuid-string",
    "role": "assistant",
    "content": "AI 的回复",
    "created_at": "2024-01-01T00:00:01Z"
  },
  "topic_title_updated": true,
  "memories_used": ["memory-id-1", "memory-id-2"]
}
```

**说明**:
- `topic_title_updated`: 如果是话题的第一条消息，会自动生成标题，此字段为 `true`
- `memories_used`: 本次回复使用的记忆 ID 列表
- 该接口会自动处理：存储消息、检索记忆、调用 AI、存储向量、记录记忆使用

---

## 服务商接口

### 添加服务商

```
POST /api/providers
```

**请求体**:
```json
{
  "name": "OpenAI",
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-xxx",
  "enabled": true
}
```

**响应**:
```json
{
  "id": "uuid-string",
  "name": "OpenAI",
  "base_url": "https://api.openai.com/v1",
  "enabled": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**说明**: `api_key` 不会在响应中返回

### 获取服务商列表

```
GET /api/providers
```

**响应**:
```json
{
  "providers": [
    {
      "id": "uuid-string",
      "name": "OpenAI",
      "base_url": "https://api.openai.com/v1",
      "enabled": true,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-string",
      "name": "DeepSeek",
      "base_url": "https://api.deepseek.com/v1",
      "enabled": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 更新服务商

```
PUT /api/providers/{provider_id}
```

**请求体**:
```json
{
  "name": "OpenAI",
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-new-key",
  "enabled": true
}
```

**说明**: `api_key` 可选，不传则保持原值

**响应**:
```json
{
  "id": "uuid-string",
  "name": "OpenAI",
  "base_url": "https://api.openai.com/v1",
  "enabled": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 删除服务商

```
DELETE /api/providers/{provider_id}
```

**响应**:
```json
{
  "success": true
}
```

### 获取模型列表

```
GET /api/providers/{provider_id}/models
```

**响应**:
```json
{
  "models": [
    {
      "id": "gpt-4",
      "name": "GPT-4"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo"
    }
  ]
}
```

**说明**: 调用服务商的 `/models` 接口获取可用模型列表

---

## 记忆接口

### 获取记忆列表

```
GET /api/memories
```

**查询参数**:
- `page`: 页码，默认 1
- `page_size`: 每页数量，默认 20
- `source`: 过滤来源，可选值 `chat`（对话生成）/ `manual`（手动添加）

**响应**:
```json
{
  "memories": [
    {
      "id": "uuid-string",
      "content": "记忆内容文本",
      "source": "chat",
      "source_topic_id": "topic-uuid",
      "source_message_id": "message-uuid",
      "use_count": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "last_used_at": "2024-01-05T00:00:00Z"
    },
    {
      "id": "uuid-string",
      "content": "用户手动添加的记忆",
      "source": "manual",
      "source_topic_id": null,
      "source_message_id": null,
      "use_count": 2,
      "created_at": "2024-01-02T00:00:00Z",
      "last_used_at": "2024-01-04T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### 获取记忆详情

```
GET /api/memories/{memory_id}
```

**响应**:
```json
{
  "id": "uuid-string",
  "content": "记忆内容文本",
  "source": "chat",
  "source_topic_id": "topic-uuid",
  "source_message_id": "message-uuid",
  "use_count": 5,
  "created_at": "2024-01-01T00:00:00Z",
  "last_used_at": "2024-01-05T00:00:00Z",
  "usage_records": [
    {
      "topic_id": "topic-uuid-1",
      "topic_title": "关于Python的讨论",
      "message_id": "message-uuid-1",
      "used_at": "2024-01-02T00:00:00Z"
    },
    {
      "topic_id": "topic-uuid-2",
      "topic_title": "代码重构方案",
      "message_id": "message-uuid-2",
      "used_at": "2024-01-05T00:00:00Z"
    }
  ]
}
```

### 添加记忆

```
POST /api/memories
```

**请求体**:
```json
{
  "content": "用户主动添加的记忆内容"
}
```

**响应**:
```json
{
  "id": "uuid-string",
  "content": "用户主动添加的记忆内容",
  "source": "manual",
  "source_topic_id": null,
  "source_message_id": null,
  "use_count": 0,
  "created_at": "2024-01-01T00:00:00Z",
  "last_used_at": null
}
```

### 更新记忆

```
PUT /api/memories/{memory_id}
```

**请求体**:
```json
{
  "content": "修改后的记忆内容"
}
```

**响应**:
```json
{
  "id": "uuid-string",
  "content": "修改后的记忆内容",
  "source": "manual",
  "use_count": 2,
  "created_at": "2024-01-01T00:00:00Z",
  "last_used_at": "2024-01-04T00:00:00Z"
}
```

**说明**: 更新记忆后会重新向量化

### 删除记忆

```
DELETE /api/memories/{memory_id}
```

**响应**:
```json
{
  "success": true
}
```

---

## 配置接口

### 获取配置

```
GET /api/settings
```

**响应**:
```json
{
  "default_chat_provider_id": "provider-uuid",
  "default_chat_model": "gpt-3.5-turbo",
  "embedding_provider_id": "provider-uuid",
  "embedding_model": "text-embedding-3-small",
  "memory_top_k": 5
}
```

### 更新配置

```
PUT /api/settings
```

**请求体**:
```json
{
  "default_chat_provider_id": "provider-uuid",
  "default_chat_model": "gpt-4",
  "embedding_provider_id": "provider-uuid",
  "embedding_model": "text-embedding-3-small",
  "memory_top_k": 10
}
```

**响应**: 同获取配置

---

## 错误响应

所有接口在出错时返回统一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 错误码

| 状态码 | code | 描述 |
|--------|------|------|
| 400 | INVALID_REQUEST | 请求参数错误 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 503 | AI_SERVICE_ERROR | AI 服务调用失败 |
| 503 | PROVIDER_ERROR | 服务商连接失败 |

---

## 流式响应（P1 功能）

后续可以支持 SSE 流式输出：

```
POST /api/topics/{topic_id}/messages/stream
```

响应为 Server-Sent Events 格式：

```
data: {"type": "chunk", "content": "AI"}
data: {"type": "chunk", "content": "的"}
data: {"type": "chunk", "content": "回复"}
data: {"type": "done", "message": {...完整消息对象}, "memories_used": [...]}
```
