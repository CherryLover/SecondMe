# SecondMe 项目指南

## 项目概述

SecondMe 是一个带有长期记忆能力的 AI 对话助手系统，支持多用户使用。

## 架构

```
AI 服务商 (OpenAI/DeepSeek/SiliconFlow等)
         ↓ (OpenAI SDK + 自定义 baseUrl)
   Server (FastAPI)
   ├── SQLite (chat.db) - 业务数据
   └── ChromaDB - 向量记忆
         ↓ (REST API)
    Web (React + TypeScript)
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI 0.115.6 + Uvicorn 0.34.0 |
| AI 接口 | OpenAI SDK 1.58.1 |
| 向量数据库 | ChromaDB 0.5.23 |
| 业务数据库 | SQLite |
| 数据验证 | Pydantic 2.10.4 |
| 前端框架 | React 18 + TypeScript + Vite |
| UI 样式 | Tailwind CSS + shadcn/ui |
| 国际化 | 自定义 i18n（中/英文） |

## 目录结构

```
SecondMe/
├── docs/                    # 项目文档
│   ├── 需求池.md            # 需求收集和状态跟踪
│   ├── 00-版本记录.md       # 版本列表（表格形式）
│   ├── 01-项目概述.md
│   ├── 02-功能清单.md
│   ├── 03-技术架构.md
│   ├── 04-API设计.md
│   ├── 05-数据库设计.md
│   ├── 06-记忆系统设计.md
│   ├── 07-记忆提炼系统设计.md
│   ├── 08-上下文消息限制.md
│   ├── 09-Flowmo随想记录.md
│   ├── 10-多用户系统设计.md
│   └── versions/            # 各版本详情文档
│       ├── v1.0.0.md
│       ├── v1.1.0.md
│       ├── v1.2.0.md
│       └── v1.3.0.md
├── server/                  # Python 后端
│   ├── main.py             # FastAPI 主程序，路由定义
│   ├── config.py           # 配置管理（.env 加载）
│   ├── database.py         # SQLite CRUD 操作
│   ├── memory.py           # ChromaDB 向量操作
│   ├── ai_client.py        # AI API 调用封装
│   ├── auth.py             # JWT 认证模块
│   ├── extraction.py       # 记忆提炼模块
│   ├── models.py           # Pydantic 数据模型
│   ├── logger.py           # 日志配置
│   ├── requirements.txt    # Python 依赖
│   └── data/               # 数据目录
│       ├── chat.db         # SQLite 数据库
│       ├── chroma/         # ChromaDB 向量数据
│       └── logs/           # 日志文件
└── web/                     # React 前端
    ├── index.html          # HTML 入口
    ├── package.json        # 依赖配置
    ├── vite.config.ts      # Vite 配置
    ├── tailwind.config.js  # Tailwind 配置
    ├── public/             # 静态资源
    │   └── secondme-icon.svg
    └── src/
        ├── main.tsx        # React 入口
        ├── App.tsx         # 根组件（路由）
        ├── index.css       # 全局样式
        ├── components/     # 组件
        │   ├── chat/       # 对话相关
        │   ├── common/     # 通用组件
        │   ├── flowmo/     # Flowmo 相关
        │   ├── landing/    # 落地页
        │   ├── memory/     # 记忆相关
        │   ├── settings/   # 设置相关
        │   └── ui/         # shadcn/ui 组件
        ├── contexts/       # React Context
        │   ├── AuthContext.tsx
        │   ├── ThemeContext.tsx
        │   └── I18nContext.tsx
        ├── i18n/           # 国际化
        │   ├── index.ts
        │   └── translations.ts
        ├── pages/          # 页面组件
        │   ├── LandingPage.tsx
        │   ├── LoginPage.tsx
        │   ├── ChatPage.tsx
        │   ├── FlowmoPage.tsx
        │   ├── MemoryPage.tsx
        │   ├── SettingsPage.tsx
        │   └── AdminPage.tsx
        ├── services/       # API 服务
        │   └── api.ts
        ├── types/          # TypeScript 类型
        │   └── index.ts
        └── lib/            # 工具函数
            └── utils.ts
```

## 数据库表结构

| 表名 | 用途 |
|------|------|
| users | 用户（id, username, password_hash, role） |
| invite_codes | 邀请码（id, code, max_uses, used_count） |
| topics | 话题（id, user_id, title, is_flowmo） |
| messages | 消息（id, topic_id, role, content） |
| providers | 服务商（id, name, base_url, api_key）- 全局共享 |
| memories | 记忆（id, user_id, content, memory_type） |
| flowmos | Flowmo（id, user_id, content, source） |
| settings | 配置（key, value）- 全局共享 |

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册（需邀请码）
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/password` - 修改密码

### 管理员
- `POST /api/admin/invite-codes` - 创建邀请码
- `GET /api/admin/invite-codes` - 邀请码列表
- `DELETE /api/admin/invite-codes/{id}` - 删除邀请码
- `GET /api/admin/users` - 用户列表
- `DELETE /api/admin/users/{id}` - 删除用户

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

### Flowmo
- `GET /api/flowmo/topic` - 获取或创建 Flowmo 话题
- `GET /api/flowmos` - Flowmo 列表
- `POST /api/flowmos` - 直接添加 Flowmo
- `DELETE /api/flowmos/{id}` - 删除 Flowmo
- `DELETE /api/flowmos/all` - 删除全部 Flowmo

### 服务商（管理员）
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
- `PUT /api/settings` - 更新配置（管理员）

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

# 启动前端开发服务器
cd web
npm install
npm run dev

# 构建前端生产版本
cd web
npm run build

# 服务地址
# 后端 API: http://localhost:8000
# 前端开发: http://localhost:5173
# 生产模式: http://localhost:8000 (dist 由 FastAPI 托管)
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

## 开发流程指引

### 流程概览

```
需求收集 → 需求讨论 → 设计文档 → 用户确认 → 开发实现 → 测试验证 → 版本发布
   ↓           ↓           ↓           ↓           ↓           ↓           ↓
 需求池     确认方案    XX-设计.md   审阅通过   逐项完成    自测通过   versions/
```

### 相关文档

| 文档 | 用途 |
|------|------|
| `docs/需求池.md` | 收集和跟踪所有需求状态 |
| `docs/XX-XXX设计.md` | 功能设计文档（编号递增） |
| `docs/versions/vX.X.X.md` | 版本详情（功能清单、涉及文件） |
| `docs/00-版本记录.md` | 版本列表（表格形式，倒序） |

### 流程步骤

**1. 需求收集**
- 用户提出需求想法
- 记录到 `docs/需求池.md`，状态设为「💡 想法」
- 简要描述背景和初步想法

**2. 需求讨论**
- 与用户讨论需求，理解问题背景和目标
- 提出可行方案，分析利弊
- 用户确认最终方案后，状态改为「📋 待设计」

**3. 编写设计文档**
- 在 `docs/` 目录创建设计文档，编号递增
- 内容包括：背景、方案、数据结构、API 设计、涉及文件
- 需求池状态改为「📝 设计中」

**4. 用户确认**
- 设计文档完成后，让用户审阅
- 用户确认后，创建 `docs/versions/vX.X.X.md` 版本详情文档
- 列出功能清单（TODO List，用 `- [ ]` 格式）
- 需求池状态改为「🚧 开发中」

**5. 开发实现**
- 按版本详情中的 TODO List 顺序执行
- 每完成一项，将 `- [ ]` 改为 `- [x]`
- 遇到问题与用户讨论

**6. 测试验证**
- 开发完成后，编写测试脚本验证接口
- 通知用户进行自测
- 用户验证功能是否符合预期
- 如有问题，修复后重新自测

**7. 版本发布**
- 用户自测通过后：
  - 更新 `docs/00-版本记录.md` 添加版本条目
  - 需求池状态改为「✅ 已完成」，关联版本号
  - 提交代码：`git add . && git commit`
  - 打版本标签：`git tag vX.X.X`

### 注意事项

- **不要跳过流程直接写代码**：先需求池 → 再设计 → 再开发
- **设计文档是开发依据**：先写文档再写代码
- **每个阶段与用户确认**：避免返工
- **发布前必须自测**：确保功能符合预期

## 本地开发与部署

### 部署架构

**本地开发环境通过 Cloudflare Tunnel 暴露到公网：**

```
手机/外部设备
    ↓
Cloudflare Tunnel (secondme.flyooo.uk)
    ↓
本地 localhost:8060 (后端 FastAPI)
    ↓
托管 web/dist (前端静态文件)
```

### Cloudflare Tunnel 配置

**配置文件位置**: `~/.cloudflared/config.yml`

```yaml
tunnel: hapi-tunnel
credentials-file: /Users/jiangjiwei/.cloudflared/xxx.json

ingress:
  - hostname: hapi.flyooo.uk
    service: http://localhost:3006
  - hostname: secondme.flyooo.uk
    service: http://localhost:8060  # 指向后端端口
  - service: http_status:404
```

### 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端服务 | 8060 | FastAPI 服务，托管前端构建文件 |
| 前端开发 | 5173/5174 | Vite 开发服务器（仅本地） |
| 前端预览 | 4173 | Vite 生产预览（仅本地测试） |

**重要**：Cloudflare Tunnel 转发到 8060 端口（后端），后端托管前端静态文件。

### 本地开发流程

#### 1. 启动后端服务
```bash
cd server
python main.py
# 后端启动在 0.0.0.0:8060
# 自动托管 web/dist 目录的前端文件
```

#### 2. 前端开发（两种模式）

**开发模式（热更新）：**
```bash
cd web
npm run dev
# 访问 http://localhost:5173
# 仅用于本地开发，有热更新
```

**生产模式（测试部署）：**
```bash
cd web
npm run build          # 构建到 dist 目录
# 后端自动托管 dist，无需额外操作
# 访问 http://localhost:8060 或 https://secondme.flyooo.uk
```

### PWA 更新机制

**更新流程：**
1. 修改前端代码
2. `npm run build` 重新构建
3. 重启后端服务（让其重新加载 dist 文件）
4. Service Worker 每 10 秒检查更新
5. 检测到新版本后 2 秒自动刷新

**重启后端：**
```bash
# 查找并停止旧进程
lsof -ti:8060 | xargs kill

# 启动新进程
cd server && python main.py
```

### PWA 缓存问题排查

**问题：手机浏览器能看到最新版本，但 PWA 应用显示旧版本**

**原因**：已安装的 PWA 有独立的 Service Worker 缓存。

**解决方案：**

1. **首次安装后**：卸载重装一次 PWA 应用
   - 长按桌面图标 → 卸载
   - 浏览器访问网站 → 重新添加到主屏幕

2. **后续更新**：自动更新机制
   - PWA 每 10 秒检查更新
   - 检测到新版本显示提示："发现新版本，2秒后自动刷新..."
   - 2 秒后自动刷新应用

3. **强制清除缓存（备用方案）**
   - Android: 设置 → 应用 → Evera → 存储 → 清除缓存
   - iOS: 卸载重装

### 常见问题

#### 1. 修改代码后手机看不到更新
**原因**：忘记重启后端或清除 PWA 缓存
**解决**：
```bash
# 1. 重新构建前端
cd web && npm run build

# 2. 重启后端
lsof -ti:8060 | xargs kill && cd server && python main.py

# 3. 等待 10-20 秒，PWA 自动检测更新
```

#### 2. Cloudflare Tunnel 断开
**原因**：tunnel 进程意外停止
**解决**：
```bash
# 重启 cloudflared
cloudflared tunnel run hapi-tunnel
```

#### 3. 端口被占用
```bash
# 查看占用端口的进程
lsof -ti:8060

# 杀死进程
kill <PID>
```

### 部署检查清单

部署新版本时的检查步骤：

- [ ] 前端代码修改完成
- [ ] `npm run build` 构建成功
- [ ] 重启后端服务（`lsof -ti:8060 | xargs kill && python main.py`）
- [ ] 浏览器无痕模式访问，确认更新生效
- [ ] 手机 PWA 等待 10-20 秒，确认自动更新
- [ ] 提交代码 `git add . && git commit`
- [ ] 推送到远程 `git push`
