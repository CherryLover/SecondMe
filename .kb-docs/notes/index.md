# 开发笔记

记录项目开发过程中的问题、解决方案和最佳实践。

## SecondMe 项目概览 - 带记忆的多用户 AI 对话系统
- **日期**: 2026-01-14
- **标签**: secondme, ai, memory-system, multi-user, fastapi, react, chromadb
- **问题**: 构建一个支持长期记忆能力的多用户 AI 对话助手系统，解决 AI 对话无法记住用户信息和对话历史的问题
- **解决方案**: 采用 FastAPI + React + SQLite + ChromaDB 架构，实现了完整的多用户对话系统。核心特性：

**1. 长期记忆系统（核心亮点）**
- 双层存储：SQLite 存业务数据，ChromaDB 存向量
- 自动检索：基于相似度检索 top-5 相关记忆并注入 System Prompt
- 自动提炼：后台异步任务监测话题静默期（2分钟），自动调用 AI 提炼有价值信息
- 4 种记忆类型：personal、preference、fact、plan
- 使用统计：记录每条记忆在哪些话题中被引用

**2. Flowmo 随想记录系统**
- 独立话题类型（is_flowmo = 1）
- 时间间隔分组（距离上条消息 >= 5 分钟创建新分组）
- 自动向量化并参与记忆检索
- 专属温和共情的 System Prompt

**3. 多用户系统**
- JWT 认证 + Token 滑动刷新（剩余有效期不足一半自动续期）
- 邀请码注册机制（支持过期时间、使用次数限制）
- 所有数据按 user_id 完全隔离
- Admin/User 两级权限

**4. 多 AI 服务商管理**
- 支持任何 OpenAI 兼容 API
- 动态加载服务商模型列表
- 独立配置向量化模型

**5. 对话功能**
- 流式输出（SSE）
- 话题标题自动生成
- 上下文消息限制（最多 100 条）

**6. 前端特性**
- PWA 支持（自动更新检测，每 10 秒检查一次）
- 响应式设计（移动端优化）
- 深色/浅色主题切换
- 中英文国际化
- **相关文件**:
  - `server/main.py - FastAPI 主程序，23 个 API 端点`
  - `server/database.py - SQLite CRUD 操作，9 张表`
  - `server/memory.py - ChromaDB 向量存储，双集合（memories + flowmos）`
  - `server/ai_client.py - AI 服务客户端，OpenAI 兼容封装`
  - `server/extraction.py - 记忆提炼模块，后台异步任务`
  - `server/auth.py - JWT 认证，Token 滑动刷新`
  - `server/models.py - Pydantic 数据模型`
  - `server/config.py - 配置管理，环境变量加载`
  - `web/src/App.tsx - React 路由配置，7 个页面`
  - `web/src/pages/ChatPage.tsx - 主对话页面`
  - `web/src/pages/MemoryPage.tsx - 记忆管理页面`
  - `web/src/pages/FlowmoPage.tsx - Flowmo 管理页面`
  - `web/src/pages/SettingsPage.tsx - 系统设置页面`
  - `web/src/pages/AdminPage.tsx - 管理后台页面`
  - `web/src/contexts/AuthContext.tsx - 认证上下文`
  - `web/src/services/api.ts - API 调用封装，30+ 方法`
  - `docs/ - 完整的设计文档和版本记录`
- **经验教训**: **架构设计经验**：

1. **双层存储解决向量检索问题**：SQLite 存业务数据（记忆内容、来源、统计），ChromaDB 存向量用于相似度搜索，两者通过 ID 关联

2. **记忆注入 System Prompt**：检索相关记忆后不是作为消息历史，而是注入到 System Prompt 中，让 AI 知道"这些是你记得的关于用户的信息"

3. **Token 滑动刷新机制**：中间件检测 Token 剩余有效期，不足一半时自动刷新，通过响应头 X-New-Token 返回新 Token

4. **后台异步提炼**：不阻塞对话流程，通过监测"静默期"判断对话段落结束，再调用 AI 提炼记忆

5. **上下文消息限制**：限制最多 100 条消息发送给 AI，避免 Token 超限，同时检索 top-5 记忆补充上下文

6. **Flowmo 时间分组**：通过时间间隔（5 分钟）自动判断是否创建新分组，同一分组内可继续对话

7. **PWA 自动更新**：Service Worker 每 10 秒检查更新，检测到新版本 2 秒后自动刷新

8. **用户数据完全隔离**：所有表都通过 user_id 外键关联，ChromaDB 向量也通过 metadata 过滤

9. **SPA 路由支持**：生产模式下 FastAPI 托管前端 dist 目录，非 API 请求返回 index.html 交由 React Router 处理

10. **流式输出优化用户体验**：SSE 实时返回 AI 生成过程，避免长时间等待

## SecondMe 核心业务逻辑 - 消息处理与记忆提炼流程
- **日期**: 2026-01-14
- **标签**: secondme, business-logic, memory-extraction, message-flow, flowmo
- **问题**: 需要理解 SecondMe 的核心业务逻辑：如何处理消息、如何提炼记忆、Flowmo 如何分组
- **解决方案**: **1. 消息处理流程（main.py 中的消息端点）**

```
用户发送消息
    ↓
1. 保存用户消息到 SQLite (database.add_message)
2. 判断话题类型（is_flowmo）
3a. [Flowmo] 检查时间间隔决定是否创建新 Flowmo 记录
    - >= 5 分钟：创建新 Flowmo，上下文只含当前消息
    - < 5 分钟：继续对话，上下文从最近 Flowmo 之后的所有消息
3b. [普通话题] 获取最近 100 条消息作为上下文
4. 检索相关记忆（memory.search_memories_and_flowmos）
    - 基于用户消息的向量相似度
    - 返回 top-k 条记忆（默认 5）
    - 记忆和 Flowmo 联合搜索并按相似度排序
5. 构建 System Prompt
    - 普通话题：标准助手 Prompt
    - Flowmo：温和共情的倾听者 Prompt
    - 注入检索到的记忆内容
6. 调用 AI 生成回复（同步或流式）
    - 使用配置的 chat_provider 和 chat_model
    - 流式：SSE 实时推送
    - 同步：一次性返回
7. 保存 AI 回复到 SQLite
8. 更新话题 last_active_at（用于记忆提炼判断）
9. 记录记忆使用情况（memory_usage_records 表）
10. 首条消息时自动生成话题标题（ai_client.generate_title）
    ↓
返回：用户消息 + AI 回复 + 已使用记忆列表
```

**2. 记忆提炼流程（extraction.py 后台任务）**

```
后台任务每隔 N 秒运行一次
    ↓
遍历所有话题（非 Flowmo）
    ↓
检查是否满足提炼条件：
  - 距离上次活跃时间 >= 静默时长（默认 2 分钟）
  - 存在未提炼的新消息（last_active_at > memory_processed_at）
    ↓
否 → 跳过，继续下个话题
是 ↓
1. 获取新对话内容（memory_processed_at 之后的消息）
2. 检索上下文消息（默认最近 6 条）
3. 检索已有相关记忆（避免重复）
4. 构建提炼 Prompt（告诉 AI 要提取什么类型的信息）
5. 调用 AI 提炼（返回 JSON 格式）
   格式：{
     "memories": [
       {
         "type": "personal/preference/fact/plan",
         "content": "记忆内容",
         "action": "add/update",
         "update_id": "如果是 update 则指定要更新的记忆 ID",
         "reason": "为什么要记录/更新这条信息"
       }
     ]
   }
6. 解析 AI 返回的 JSON
7. 执行操作：
   - add：创建新记忆 → 向量化 → 存入 ChromaDB
   - update：更新已有记忆 → 重新向量化 → 更新 ChromaDB
8. 更新 topics.memory_processed_at = last_active_at
    ↓
等待下次检查
```

**3. Flowmo 分组逻辑（main.py 消息处理）**

```
用户在 Flowmo 话题中发送消息
    ↓
1. 获取话题的上一条消息（最近的消息）
2. 计算时间差 = 当前时间 - 上一条消息时间
3. 判断是否创建新 Flowmo：
   if 时间差 >= FLOWMO_INTERVAL_MINUTES (默认 5 分钟):
       创建新 Flowmo 记录（database.add_flowmo）
       source = 'chat'
       关联当前 topic_id 和 message_id
       向量化并存入 ChromaDB flowmos 集合
   else:
       不创建新记录，在同一 Flowmo 下继续对话
4. 确定上下文消息范围：
   - 新 Flowmo：只包含当前用户消息
   - 继续对话：从最近 Flowmo 之后的所有消息
5. 检索相关记忆和 Flowmo（联合搜索）
6. 调用 AI 生成回复（使用 Flowmo 专属 Prompt）
    ↓
Flowmo 记录被向量化，后续可被检索用于记忆增强
```

**4. 数据流向总览**

```
用户消息 → messages 表（SQLite）
    ↓
向量化（embedding_provider + embedding_model）
    ↓
memories 集合（ChromaDB）或 flowmos 集合（ChromaDB）
    ↓
检索时按 user_id 过滤（metadata: {user_id: xxx}）
    ↓
相似度排序后返回 top-k 条
    ↓
注入 System Prompt
    ↓
AI 生成回复（基于记忆增强的上下文）
    ↓
记录使用情况（memory_usage_records 表）
```
- **相关文件**:
  - `server/main.py:180-350 - 消息处理端点（同步和流式）`
  - `server/extraction.py:50-150 - 记忆提炼主逻辑`
  - `server/memory.py - ChromaDB 向量操作（存储、检索、删除）`
  - `server/database.py:200-250 - add_flowmo 方法`
  - `server/database.py:150-180 - add_message 方法`
  - `server/ai_client.py:50-80 - chat_completion 和 chat_completion_stream`
  - `server/config.py:30-35 - FLOWMO_INTERVAL_MINUTES 配置`
- **经验教训**: **关键设计决策**：

1. **为什么记忆提炼要有静默期？**
   避免对话过程中频繁提炼，等待用户完成一个对话段落后再总结，减少 AI 调用成本。

2. **为什么 Flowmo 要时间分组？**
   模拟人类思考的间隔，5 分钟内的连续思考属于同一个想法，超过 5 分钟则是新的思考。

3. **为什么上下文消息要限制 100 条？**
   防止 Token 超限导致 API 调用失败，同时通过记忆检索补充长期上下文。

4. **为什么记忆检索只返回 top-5？**
   平衡相关性和 System Prompt 长度，太多记忆会稀释关键信息，太少则遗漏重要上下文。

5. **为什么 Flowmo 不限制上下文消息数？**
   Flowmo 是个人思考记录，同一分组内的对话连贯性很强，需要完整上下文才能理解思路。

6. **为什么记忆使用要记录 topic_id 和 message_id？**
   追溯记忆的使用场景，评估记忆的价值，未来可用于记忆质量评分和自动清理。

7. **为什么提炼时要检索已有相关记忆？**
   避免重复记录相似信息，AI 可以判断是更新已有记忆还是新增记忆。

8. **为什么 Flowmo 和 memories 分开存储？**
   Flowmo 是个人思考，不是提炼的结构化记忆，但同样有检索价值，分开存储便于管理。
