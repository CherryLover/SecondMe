# 功能清单

记录项目已实现的功能、入口、流程和关键文件。

## JWT Token 滑动刷新机制
- **标签**: jwt, authentication, token-refresh, security
- **描述**: 通过中间件自动检测 Token 剩余有效期，不足一半时自动刷新，避免用户频繁登录
- **入口**: FastAPI 中间件，在每次请求时自动检查
- **核心流程**:
  1. 1. 用户登录，服务端生成 JWT Token（有效期 7 天）
  2. 2. 前端每次请求在 Authorization 头中携带 Token
  3. 3. 后端中间件（main.py）解析 Token，获取过期时间
  4. 4. 计算剩余有效期：remaining = exp - now
  5. 5. 如果 remaining < total_duration / 2（即不足一半）
  6. 6. 生成新 Token（有效期重置为 7 天）
  7. 7. 在响应头 X-New-Token 中返回新 Token
  8. 8. 前端检测响应头，如果有 X-New-Token 则更新本地存储
- **关键文件**:
  - `server/main.py:60-90` - Token 滑动刷新中间件
  - `server/auth.py:30-50` - create_token 和 verify_token 方法
  - `web/src/services/api.ts:80-100` - 前端检测 X-New-Token 响应头
- **备注**: **优点**：
- 用户体验好：无感刷新，不需要手动重新登录
- 安全性高：Token 有效期短（7天），但不影响长期使用
- 实现简单：中间件自动处理，业务代码无需关心

**实现细节**：
- 刷新阈值：剩余有效期 < 总有效期 / 2（例如 7 天有效期，剩余不足 3.5 天时刷新）
- 响应头传递：避免修改响应体结构，用自定义头传递新 Token
- 前端自动更新：API Service 统一处理，所有请求自动享受

**适用场景**：
- 任何需要长期保持登录状态的应用
- 不方便频繁要求用户重新登录的场景（移动应用、桌面应用）

## 双层存储向量记忆系统
- **标签**: memory-system, vector-database, chromadb, sqlite, ai
- **描述**: SQLite 存储业务数据，ChromaDB 存储向量，通过相似度检索实现智能记忆
- **入口**: 消息发送时自动触发记忆检索和注入
- **核心流程**:
  1. 1. 用户发送消息时，提取消息内容
  2. 2. 调用向量化模型（embedding_model）将消息转为向量
  3. 3. 在 ChromaDB 中搜索相似向量（余弦相似度）
  4. 4. 按 user_id 过滤（metadata），只返回该用户的记忆
  5. 5. 返回 top-k 条最相关的记忆（默认 5 条）
  6. 6. 查询 SQLite 获取记忆的完整业务数据（内容、来源、类型）
  7. 7. 将记忆内容注入到 System Prompt
  8. 8. 调用 AI 生成回复（AI 基于记忆理解用户）
  9. 9. 记录记忆使用情况（memory_usage_records 表）
  10. 10. 后台异步提炼新记忆：向量化 → 存入 ChromaDB + SQLite
- **关键文件**:
  - `server/memory.py` - ChromaDB 操作：store_memory_vector、search_memories
  - `server/database.py:300-400` - SQLite 记忆 CRUD：add_memory、get_memory、update_memory
  - `server/ai_client.py:80-100` - get_embedding 方法，调用向量化模型
  - `server/main.py:250-300` - 消息处理时的记忆检索和注入逻辑
  - `server/extraction.py` - 后台记忆提炼任务，自动生成新记忆
- **备注**: **架构设计**：

**为什么需要双层存储？**
- SQLite：存储结构化业务数据（记忆内容、来源、类型、使用统计、创建时间）
- ChromaDB：存储向量数据，支持高效的相似度搜索
- 两者通过记忆 ID 关联

**数据流向**：
```
新记忆 → SQLite 存业务数据 → 向量化 → ChromaDB 存向量
查询 → ChromaDB 相似度搜索 → 返回 ID 列表 → SQLite 查完整数据
```

**关键技术点**：

1. **向量化模型选择**：
   - 支持任何 OpenAI 兼容的 embedding 模型
   - 默认使用 text-embedding-3-small（性能和成本平衡）

2. **相似度算法**：
   - ChromaDB 默认使用余弦相似度
   - 返回值越接近 1 表示越相关

3. **用户隔离**：
   - ChromaDB 的 metadata 中存储 user_id
   - 搜索时添加 where 条件：{"user_id": user_id}
   - 确保用户只能检索到自己的记忆

4. **top-k 选择**：
   - 默认 5 条，可通过配置调整
   - 太少：遗漏重要上下文
   - 太多：稀释关键信息，增加 Token 消耗

5. **记忆注入方式**：
   - 不作为消息历史（messages 数组）
   - 而是注入到 System Prompt："这些是你记得的关于用户的信息：..."
   - 让 AI 自然地使用记忆，而不是生硬地回忆

6. **使用统计**：
   - 记录每条记忆在哪些话题、哪些消息中被使用
   - 用于评估记忆价值，未来可实现自动清理低价值记忆

**适用场景**：
- 任何需要长期记忆的 AI 对话系统
- 知识库问答系统（RAG）
- 个性化推荐（基于用户偏好记忆）

**性能优化**：
- ChromaDB 索引优化：支持百万级向量检索
- 向量化批量处理：减少 API 调用次数
- 缓存热点记忆：减少数据库查询

## FastAPI + React 实现 SSE 流式输出
- **标签**: sse, streaming, fastapi, react, real-time
- **描述**: 通过 Server-Sent Events (SSE) 实现 AI 回复的实时流式输出，优化用户体验
- **入口**: 用户发送消息时选择流式模式
- **核心流程**:
  1. 1. 前端调用流式消息端点：POST /api/topics/{id}/messages/stream
  2. 2. 后端处理：
  3.    - 保存用户消息
  4.    - 获取上下文消息
  5.    - 检索相关记忆
  6.    - 构建 System Prompt
  7. 3. 调用 AI 流式生成（OpenAI streaming=true）
  8. 4. 后端 yield SSE 事件：
  9.    - 事件格式：data: {JSON}\n\n
  10.    - 每个 token 作为一个事件推送
  11.    - 最后一个事件标记为 [DONE]
  12. 5. 前端 EventSource 监听：
  13.    - 接收到 token 立即显示（逐字打印效果）
  14.    - 收到 [DONE] 后关闭连接
  15. 6. 后端在流结束后：
  16.    - 保存完整的 AI 回复
  17.    - 更新话题活跃时间
  18.    - 记录记忆使用情况
- **关键文件**:
  - `server/main.py:280-350` - 流式消息端点，yield SSE 事件
  - `server/ai_client.py:60-80` - chat_completion_stream 异步生成器
  - `web/src/services/api.ts:150-200` - sendStreamMessage 方法，EventSource 实现
  - `web/src/pages/ChatPage.tsx:200-250` - 前端处理流式响应，实时更新 UI
- **备注**: **技术实现**：

**后端（FastAPI）**：
```python
from fastapi.responses import StreamingResponse

async def stream_response():
    async for chunk in ai_client.chat_completion_stream(...):
        if chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            yield f"data: {json.dumps({'token': token})}\n\n"
    yield "data: [DONE]\n\n"

return StreamingResponse(stream_response(), media_type="text/event-stream")
```

**前端（React）**：
```typescript
const eventSource = new EventSource(`/api/topics/${topicId}/messages/stream`);

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close();
    return;
  }
  const { token } = JSON.parse(event.data);
  setMessage(prev => prev + token); // 逐字追加
};

eventSource.onerror = () => {
  eventSource.close();
};
```

**关键技术点**：

1. **SSE vs WebSocket**：
   - SSE：单向推送（服务端 → 客户端），更简单
   - WebSocket：双向通信，适合聊天室
   - AI 流式输出只需单向推送，SSE 更合适

2. **事件格式**：
   - 必须以 `data:` 开头
   - 必须以 `\n\n` 结尾（两个换行符）
   - 支持 JSON 格式

3. **流结束标记**：
   - 发送特殊标记 `[DONE]` 告知前端流结束
   - 前端收到后主动关闭 EventSource
   - 避免连接泄漏

4. **异步生成器**：
   - Python 使用 `async def` + `yield`
   - 配合 OpenAI SDK 的 streaming=true
   - 每个 token 立即 yield，不等待完整响应

5. **错误处理**：
   - 后端捕获 AI API 错误，发送错误事件
   - 前端监听 onerror，提示用户
   - 超时处理：设置合理的超时时间

6. **数据保存时机**：
   - 流式输出过程中不保存（避免频繁写入）
   - 等待流结束后一次性保存完整回复
   - 减少数据库写入次数

**用户体验优势**：
- ✅ 实时反馈：用户立即看到 AI 开始回复
- ✅ 减少等待焦虑：长回复时不会长时间空白
- ✅ 可读性强：逐字显示更符合人类阅读习惯
- ✅ 中断友好：用户可随时看到已生成的内容

**注意事项**：
- EventSource 不支持自定义请求头（无法直接传 Token）
  → 解决：通过 URL 参数或 Cookie 传递 Token
  → 或使用 fetch + ReadableStream 替代 EventSource
- 需要设置正确的 CORS 头
- 生产环境注意 Nginx 缓冲配置（proxy_buffering off）

## 多租户数据隔离设计
- **标签**: multi-tenant, data-isolation, security, user-management
- **描述**: 通过 user_id 外键和权限检查实现多用户数据完全隔离
- **入口**: 所有需要用户数据的 API 端点
- **核心流程**:
  1. 1. 用户登录，JWT Token 中包含 user_id
  2. 2. 后端中间件解析 Token，获取 current_user
  3. 3. 数据库操作时自动添加 user_id 过滤：
  4.    - 查询：WHERE user_id = current_user.id
  5.    - 插入：自动设置 user_id = current_user.id
  6. 4. 向量数据库（ChromaDB）通过 metadata 过滤：
  7.    - 存储时：metadata={'user_id': user_id}
  8.    - 查询时：where={'user_id': user_id}
  9. 5. 跨用户操作时权限检查：
  10.    - verify_topic_owner(topic_id, user_id)
  11.    - verify_memory_owner(memory_id, user_id)
  12.    - verify_flowmo_owner(flowmo_id, user_id)
  13. 6. 管理员特权：
  14.    - require_admin() 依赖注入
  15.    - 跳过 user_id 过滤，可访问所有数据
- **关键文件**:
  - `server/auth.py:50-80` - get_current_user 和 require_admin 依赖注入
  - `server/database.py:100-150` - verify_topic_owner 等权限检查函数
  - `server/database.py` - 所有 CRUD 操作都带 user_id 过滤
  - `server/memory.py:50-80` - ChromaDB 查询时的 where 条件
  - `server/main.py` - 所有端点都使用 get_current_user 依赖
- **备注**: **数据库设计**：

**表结构（SQLite）**：
```sql
-- 所有用户数据表都有 user_id 外键
CREATE TABLE topics (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,  -- 外键关联 users 表
    title TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE memories (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,  -- 外键关联
    content TEXT,
    source TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    topic_id INTEGER NOT NULL,
    -- 通过 topic_id → topics.user_id 实现间接隔离
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
```

**向量数据库（ChromaDB）**：
```python
# 存储时添加 metadata
collection.add(
    ids=[memory_id],
    documents=[content],
    embeddings=[embedding],
    metadatas=[{'user_id': user_id, 'source': source}]
)

# 查询时过滤
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=top_k,
    where={'user_id': user_id}  # 关键：按 user_id 过滤
)
```

**权限检查模式**：

```python
def verify_topic_owner(topic_id: int, user_id: int):
    """验证话题所有权"""
    topic = get_topic(topic_id)
    if not topic or topic['user_id'] != user_id:
        raise HTTPException(status_code=404, detail="话题不存在")
    return topic

@app.delete("/api/topics/{topic_id}")
def delete_topic(
    topic_id: int,
    current_user: dict = Depends(get_current_user)
):
    # 先验证所有权
    verify_topic_owner(topic_id, current_user['id'])
    # 再执行删除
    database.delete_topic(topic_id)
```

**关键技术点**：

1. **依赖注入**：
   - FastAPI 的 `Depends(get_current_user)` 自动注入当前用户
   - 每个端点都强制要求认证
   - 未登录自动返回 401

2. **级联删除**：
   - 数据库外键设置 `ON DELETE CASCADE`
   - 删除用户时自动删除其所有数据（话题、消息、记忆）
   - 防止孤立数据

3. **间接隔离**：
   - messages 表通过 topic_id 关联，不直接存 user_id
   - 查询时先验证 topic 所有权，再查询 messages
   - 减少冗余字段

4. **管理员特权**：
   - Admin 可以跨用户操作（用户管理、邀请码管理）
   - 通过 `require_admin()` 依赖注入实现
   - 其他用户调用管理员端点返回 403

5. **向量隔离**：
   - ChromaDB 没有原生的用户系统
   - 通过 metadata + where 条件实现逻辑隔离
   - 性能：ChromaDB 会先执行相似度搜索，再过滤 metadata

6. **安全性增强**：
   - 所有查询都在后端过滤，前端无法绕过
   - 404 vs 403：未授权访问返回 404（避免信息泄露）
   - Token 中的 user_id 不可伪造（JWT 签名验证）

**适用场景**：
- SaaS 应用（多租户系统）
- 社交平台（用户隔离）
- 企业内部系统（部门隔离）

**性能优化**：
- 为 user_id 字段添加索引
- 联合索引：(user_id, created_at)
- 分库分表：user_id 取模
