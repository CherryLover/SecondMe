# SecondMe 项目指南

## 项目概述

SecondMe 是一个带有长期记忆能力的 AI 对话助手系统，专为个人单用户使用设计。

## 架构

```
AI 服务商 (OpenAI/DeepSeek/SiliconFlow等)
         ↓ (OpenAI SDK + 自定义 baseUrl)
   Server (FastAPI)
   ├── SQLite (chat.db) - 业务数据
   └── ChromaDB - 向量记忆
         ↓ (REST API)
    Web (原生 HTML/JS)
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI 0.115.6 + Uvicorn 0.34.0 |
| AI 接口 | OpenAI SDK 1.58.1 |
| 向量数据库 | ChromaDB 0.5.23 |
| 业务数据库 | SQLite |
| 数据验证 | Pydantic 2.10.4 |
| 前端 | 原生 HTML/CSS/JavaScript（零依赖） |

## 目录结构

```
SecondMe/
├── docs/                    # 项目文档
│   ├── 00-版本记录.md
│   ├── 01-项目概述.md
│   ├── 02-功能清单.md
│   ├── 03-技术架构.md
│   ├── 04-API设计.md
│   ├── 05-数据库设计.md
│   └── 06-记忆系统设计.md
├── server/                  # Python 后端
│   ├── main.py             # FastAPI 主程序，路由定义
│   ├── config.py           # 配置管理（.env 加载）
│   ├── database.py         # SQLite CRUD 操作
│   ├── memory.py           # ChromaDB 向量操作
│   ├── ai_client.py        # AI API 调用封装
│   ├── models.py           # Pydantic 数据模型
│   ├── logger.py           # 日志配置
│   ├── requirements.txt    # Python 依赖
│   └── data/               # 数据目录
│       ├── chat.db         # SQLite 数据库
│       ├── chroma/         # ChromaDB 向量数据
│       └── logs/           # 日志文件
└── web/                     # 前端页面
    ├── index.html          # 主页面
    ├── css/style.css       # 样式表
    └── js/
        ├── api.js          # API 请求封装
        ├── app.js          # 主应用逻辑
        └── ui.js           # UI 渲染函数
```

## 数据库表结构

| 表名 | 用途 |
|------|------|
| topics | 话题（id, title, created_at, updated_at） |
| messages | 消息（id, topic_id, role, content, created_at） |
| providers | 服务商（id, name, base_url, api_key, enabled） |
| memories | 记忆（id, content, source, use_count, last_used_at） |
| memory_usage | 记忆使用记录（memory_id, topic_id, message_id） |
| settings | 配置（key, value） |

## API 端点

### 话题
- `POST /api/topics` - 创建话题
- `GET /api/topics` - 话题列表
- `GET /api/topics/{id}` - 获取话题
- `PATCH /api/topics/{id}` - 更新标题
- `DELETE /api/topics/{id}` - 删除话题

### 消息
- `GET /api/topics/{id}/messages` - 消息列表
- `POST /api/topics/{id}/messages` - 发送消息（同步）
- `POST /api/topics/{id}/messages/stream` - 发送消息（流式）

### 服务商
- `POST /api/providers` - 添加服务商
- `GET /api/providers` - 服务商列表
- `PUT /api/providers/{id}` - 更新服务商
- `DELETE /api/providers/{id}` - 删除服务商
- `GET /api/providers/{id}/models` - 获取模型列表

### 记忆
- `GET /api/memories` - 记忆列表
- `GET /api/memories/{id}` - 记忆详情
- `POST /api/memories` - 添加记忆
- `PUT /api/memories/{id}` - 更新记忆
- `DELETE /api/memories/{id}` - 删除记忆

### 配置
- `GET /api/settings` - 获取配置
- `PUT /api/settings` - 更新配置

## 记忆系统

### 数据流程
```
用户消息 → 保存到 SQLite → 向量化 → 存入 ChromaDB
    ↓
检索相关记忆 → 注入 System Prompt → 调用 AI
    ↓
保存 AI 回复 → 向量化 → 存入 ChromaDB → 更新统计
```

### 记忆类型
- `chat`: 对话过程中自动生成
- `manual`: 用户手动添加

### 配置项
- `embedding_provider_id`: 向量化服务商
- `embedding_model`: 向量化模型
- `memory_top_k`: 检索返回条数（默认 5）

## 常用命令

```bash
# 启动后端
cd server
pip install -r requirements.txt
python main.py

# 服务地址
# 后端 API: http://localhost:8000
# 前端页面: http://localhost:8000 (静态文件由 FastAPI 托管)
```

## 配置文件

创建 `server/.env` 文件：
```env
DEFAULT_PROVIDER_NAME=默认服务商名称
DEFAULT_PROVIDER_BASE_URL=https://api.xxx.com/v1
DEFAULT_PROVIDER_API_KEY=sk-xxx
DEFAULT_CHAT_MODEL=模型名称
DEFAULT_EMBEDDING_MODEL=embedding模型名称
DEFAULT_MEMORY_TOP_K=5
```
