# Flowmo 随想记录

## 背景

用户希望有一个地方可以随手记录碎片化的想法、情绪、感慨等内容，同时：
- 有独立的 Flowmo 列表页面可以回顾
- AI 能感知这些内容（通过向量检索）
- 记录时 AI 能给予陪伴式的回应

## 方案概述

### 1. Flowmo 话题

- 侧边栏新增「Flowmo」按钮，与「新话题」并排
- 点击进入专门的 Flowmo 话题（全局唯一，长期使用）
- AI 以倾听陪伴的风格回应

### 2. 智能记录规则

**基于时间间隔自动判断：**

| 条件 | 行为 |
|------|------|
| 距离上一条消息 ≥ 5 分钟 | 自动记录到 Flowmo 列表 + 向量化 |
| 距离上一条消息 < 5 分钟 | 不记录，视为继续聊天 |
| 用户主动说"不用记录" | 删除刚才的 Flowmo 记录 |

### 3. 上下文处理

**发送给 AI 的消息：**
- 新 Flowmo 记录时：只发送当前这条消息（不带历史）
- 继续聊天时：带上这轮对话的上下文（从上一条 Flowmo 记录开始）

**前端显示：**
- 聊天记录全部显示，可以往上滚动查看历史

**示例：**
```
10:00  [Flowmo] "今天心情不错"        ← 新记录，只发这条给AI
10:01  [你] "为什么呢？"              ← 继续聊，发 10:00-10:01 给AI
10:02  [AI] "是发生了什么好事吗"
10:03  [你] "升职了"                  ← 继续聊，发 10:00-10:03 给AI

15:00  [Flowmo] "刚运动完很舒服"      ← 新记录，只发这条给AI（不带10:00那轮）
15:01  [你] "应该多运动"              ← 继续聊，发 15:00-15:01 给AI
```

### 4. Flowmo 页面

- 底部新增「Flowmo」按钮（与记忆按钮并排）
- 点击打开 Flowmo 列表弹窗
- 可以查看、删除记录
- 可以直接添加（不经过对话，不需要 AI 回复）

### 5. 记忆关联

- 所有 Flowmo 都会向量化存储
- 对话时同时检索 memories 和 flowmos
- 按相似度排序，取 top_k 条

## 数据结构

### flowmos 表

```sql
CREATE TABLE flowmos (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('chat', 'direct')),
    topic_id TEXT,
    message_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
)
```

| 字段 | 说明 |
|------|------|
| id | 主键 |
| content | 记录内容 |
| source | 来源：chat（对话中记录）/ direct（直接添加） |
| topic_id | 关联的 Flowmo 话题（source=chat 时有值） |
| message_id | 关联的消息ID（source=chat 时有值） |
| created_at | 创建时间 |

### topics 表新增字段

```sql
ALTER TABLE topics ADD COLUMN is_flowmo INTEGER DEFAULT 0
```

## API 设计

### Flowmo 话题

```
GET /api/flowmo/topic
```
获取或创建 Flowmo 话题。如果不存在则自动创建。

返回：
```json
{
    "id": "xxx",
    "title": "Flowmo",
    "is_flowmo": true,
    "created_at": "...",
    "updated_at": "..."
}
```

### Flowmo 列表

```
GET /api/flowmos?page=1&page_size=20
```

返回：
```json
{
    "flowmos": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
}
```

### 直接添加 Flowmo

```
POST /api/flowmos
Content-Type: application/json

{
    "content": "记录内容"
}
```

### 删除 Flowmo

```
DELETE /api/flowmos/{id}
```

### 删除全部 Flowmo

```
DELETE /api/flowmos/all
```

## Flowmo 话题的 AI Prompt

```
你是一个善于倾听的伙伴。用户在记录自己的想法、情绪或日常。
请以温和、共情的方式回应，可以简短也可以展开聊聊。
不要急于给建议，先理解和陪伴。
```

## 涉及文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `server/database.py` | 修改 | 新增 flowmos 表、topics.is_flowmo 字段、CRUD 函数 |
| `server/main.py` | 修改 | 新增 Flowmo API、修改消息发送逻辑 |
| `server/models.py` | 修改 | 新增 Flowmo 相关 Pydantic 模型 |
| `server/memory.py` | 修改 | 新增 Flowmo 向量存储、修改检索逻辑 |
| `server/config.py` | 修改 | 新增 `FLOWMO_INTERVAL_MINUTES` 配置（默认 5） |
| `web/index.html` | 修改 | 新增 Flowmo 按钮、Flowmo 列表弹窗 |
| `web/js/api.js` | 修改 | 新增 Flowmo API 调用 |
| `web/js/app.js` | 修改 | Flowmo 话题逻辑、列表弹窗逻辑 |
| `web/js/ui.js` | 修改 | 渲染 Flowmo 列表 |
| `web/css/style.css` | 修改 | Flowmo 相关样式 |
