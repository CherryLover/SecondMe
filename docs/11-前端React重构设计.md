# 前端 React 重构设计

> 将前端从原生 HTML/JS 迁移到 React，并集成官网页面，统一技术栈和设计语言。

## 一、背景与目标

### 1.1 现状

- **现有前端**：原生 HTML/CSS/JavaScript，4 个 JS 文件（auth.js、api.js、ui.js、app.js）
- **官网页面**：React 19 + Vite + Tailwind，设计风格文艺、简约
- **问题**：
  - 技术栈不统一，维护成本高
  - 原生 JS 组件化程度低，代码复用困难
  - 设计风格不一致

### 1.2 目标

1. 将对话应用迁移到 React，与官网统一技术栈
2. 采用官网的设计语言（配色、字体、动效）
3. 单域名部署，不同路径访问不同页面
4. 保持现有功能完整性

## 二、技术方案

### 2.1 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.x | 官网已用 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具，官网已用 |
| Tailwind CSS | 3.x | 样式方案，官网已用 |
| shadcn/ui | latest | UI 组件库，可定制 |
| React Router | 6.x | 路由管理 |
| lucide-react | latest | 图标库，官网已用 |

### 2.2 路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | LandingPage | 官网首页 |
| `/login` | LoginPage | 登录/注册页 |
| `/app` | ChatPage | 对话应用（需登录） |

**路由守卫逻辑**：
- 访问 `/app` 时，未登录自动跳转到 `/login`
- 登录成功后自动跳转到 `/app`
- 官网 CTA 按钮：已登录跳 `/app`，未登录跳 `/login`

### 2.3 项目结构

```
web/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/           # 组件
│   │   ├── ui/              # shadcn/ui 组件（自动生成）
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── common/          # 通用业务组件
│   │   │   ├── Logo.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── landing/         # 官网组件
│   │   │   ├── AmbientBackground.tsx
│   │   │   ├── FadeIn.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   ├── OriginSection.tsx
│   │   │   ├── DefineSection.tsx
│   │   │   ├── BoundarySection.tsx
│   │   │   ├── VisionSection.tsx
│   │   │   ├── PrivacySection.tsx
│   │   │   └── Footer.tsx
│   │   ├── chat/            # 对话组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopicList.tsx
│   │   │   ├── TopicItem.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── ChatMessages.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── TypingIndicator.tsx
│   │   ├── memory/          # 记忆组件
│   │   │   ├── MemoryList.tsx
│   │   │   ├── MemoryItem.tsx
│   │   │   ├── MemoryModal.tsx
│   │   │   ├── MemoryDetailModal.tsx
│   │   │   └── AddMemoryModal.tsx
│   │   ├── flowmo/          # Flowmo 组件
│   │   │   ├── FlowmoList.tsx
│   │   │   ├── FlowmoItem.tsx
│   │   │   └── FlowmoModal.tsx
│   │   ├── settings/        # 设置组件
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── ProviderList.tsx
│   │   │   ├── ProviderForm.tsx
│   │   │   └── ExtractionSettings.tsx
│   │   └── admin/           # 管理员组件
│   │       ├── AdminModal.tsx
│   │       ├── InviteCodeList.tsx
│   │       └── UserList.tsx
│   ├── pages/               # 页面
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ChatPage.tsx
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useTopics.ts
│   │   ├── useMessages.ts
│   │   ├── useMemories.ts
│   │   ├── useFlowmos.ts
│   │   ├── useSettings.ts
│   │   └── useIntersectionObserver.ts
│   ├── contexts/            # Context
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── services/            # API 服务
│   │   └── api.ts
│   ├── lib/                 # 工具函数
│   │   ├── utils.ts
│   │   └── translations.ts
│   ├── types/               # 类型定义
│   │   └── index.ts
│   ├── styles/              # 样式
│   │   └── globals.css
│   ├── App.tsx              # 根组件
│   ├── main.tsx             # 入口
│   └── vite-env.d.ts
├── components.json          # shadcn/ui 配置
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
├── package.json
└── index.html
```

## 三、设计语言

### 3.1 配色方案

沿用官网的配色，定义 CSS 变量：

```css
:root {
  /* 浅色主题 */
  --paper: #faf8f5;           /* 背景色 - 纸张白 */
  --paper-dark: #f0ede8;      /* 次级背景 */
  --ink: #1a1a1a;             /* 主文字 - 墨黑 */
  --sub-ink: #4a4a4a;         /* 次级文字 */
  --muted: #9a9a9a;           /* 弱化文字 */
  --accent: #8b7355;          /* 强调色 - 棕褐 */
  --border: rgba(0,0,0,0.1);  /* 边框 */

  /* 深色主题 */
  --dark-paper: #1a1a1a;
  --dark-ink: #e8e8e8;
  --dark-sub-ink: #b0b0b0;
  --dark-accent: #c4a77d;
}
```

### 3.2 字体

```css
font-family: 'Noto Serif SC', 'Source Serif Pro', Georgia, serif;
```

### 3.3 动效原则

- 渐入动画：FadeIn 组件，延迟错落
- 过渡时长：300-500ms
- 缓动函数：ease-out
- 微交互：hover 放大、颜色渐变

### 3.4 shadcn/ui 定制

需要定制的组件及风格调整：

| 组件 | 定制点 |
|------|--------|
| Button | 圆角改小(rounded-sm)、边框细化、hover 过渡 |
| Dialog | 背景模糊、圆角、阴影 |
| Input | 背景透明、下划线风格可选 |
| Toast | 位置居中、样式简约 |
| Select | 与整体风格统一 |

## 四、功能模块设计

### 4.1 认证模块

**AuthContext**：
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => void;
}
```

**Token 管理**：
- 存储在 localStorage
- API 请求自动携带 Authorization Header
- 支持 Token 自动刷新（响应头 X-New-Token）
- 401 响应自动跳转登录页

### 4.2 对话模块

**数据流**：
```
用户输入 → 发送消息 → 显示用户消息 → 显示打字指示器
    ↓
流式响应 → 逐字显示 AI 回复 → 更新话题标题（如有）
    ↓
完成 → 移除指示器 → 启用输入
```

**useMessages Hook**：
```typescript
interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  loadMessages: (topicId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}
```

### 4.3 记忆模块

**功能点**：
- 记忆列表（分页、按类型筛选）
- 添加/编辑/删除记忆
- 查看记忆详情（使用记录）
- 批量删除

### 4.4 Flowmo 模块

**功能点**：
- Flowmo 话题（特殊话题，对话式记录）
- Flowmo 列表（直接添加的随想）
- 添加/删除 Flowmo

### 4.5 设置模块（管理员）

**功能点**：
- 服务商管理（增删改）
- 默认配置（对话模型、向量化模型）
- 记忆提炼配置

### 4.6 管理员模块

**功能点**：
- 邀请码管理
- 用户管理

## 五、API 服务层

将现有 api.js 迁移为 TypeScript，保持接口不变：

```typescript
// services/api.ts
class ApiService {
  private baseUrl = '/api';

  private async request<T>(path: string, options?: RequestInit): Promise<T>;

  // Topics
  async createTopic(): Promise<Topic>;
  async getTopics(): Promise<{ topics: Topic[] }>;
  async getTopic(id: string): Promise<Topic>;
  async deleteTopic(id: string): Promise<void>;

  // Messages
  async getMessages(topicId: string): Promise<{ messages: Message[] }>;
  async sendMessageStream(
    topicId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onDone: (data: StreamDoneData) => void,
    onError: (error: string) => void
  ): Promise<void>;

  // Memories
  async getMemories(page?: number, pageSize?: number): Promise<{ memories: Memory[], total: number }>;
  async createMemory(content: string): Promise<Memory>;
  async updateMemory(id: string, content: string): Promise<Memory>;
  async deleteMemory(id: string): Promise<void>;
  async deleteAllMemories(): Promise<{ deleted_count: number }>;

  // Flowmos
  async getFlowmoTopic(): Promise<Topic>;
  async getFlowmos(page?: number, pageSize?: number): Promise<{ flowmos: Flowmo[] }>;
  async createFlowmo(content: string): Promise<Flowmo>;
  async deleteFlowmo(id: string): Promise<void>;
  async deleteAllFlowmos(): Promise<{ deleted_count: number }>;

  // Settings
  async getSettings(): Promise<Settings>;
  async updateSettings(settings: Partial<Settings>): Promise<Settings>;

  // Providers
  async getProviders(): Promise<{ providers: Provider[] }>;
  async createProvider(data: ProviderInput): Promise<Provider>;
  async updateProvider(id: string, data: ProviderInput): Promise<Provider>;
  async deleteProvider(id: string): Promise<void>;

  // Admin
  async getInviteCodes(): Promise<{ invite_codes: InviteCode[] }>;
  async createInviteCode(maxUses: number, expiresDays?: number): Promise<InviteCode>;
  async deleteInviteCode(id: string): Promise<void>;
  async getUsers(): Promise<{ users: User[] }>;
  async deleteUser(id: string): Promise<void>;
}

export const api = new ApiService();
```

## 六、类型定义

```typescript
// types/index.ts

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface Topic {
  id: string;
  title: string;
  is_flowmo: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  topic_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Memory {
  id: string;
  content: string;
  memory_type: 'personal' | 'preference' | 'fact' | 'plan' | 'manual' | 'chat';
  source: 'chat' | 'manual';
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  usage_records?: MemoryUsageRecord[];
}

interface MemoryUsageRecord {
  topic_title: string;
  used_at: string;
}

interface Flowmo {
  id: string;
  content: string;
  source: 'chat' | 'direct';
  created_at: string;
}

interface Provider {
  id: string;
  name: string;
  base_url: string;
  enabled: boolean;
}

interface Settings {
  default_chat_provider_id: string | null;
  default_chat_model: string | null;
  embedding_provider_id: string | null;
  embedding_model: string | null;
  memory_top_k: number;
  memory_extraction_enabled: boolean;
  memory_silent_minutes: number;
  memory_context_messages: number;
}

interface InviteCode {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}
```

## 七、部署方案

### 7.1 开发环境

#### 一键启动（推荐）

```bash
# 在项目根目录执行
python run.py

# 或者使用 make
make dev
```

访问 `http://localhost:8000` 即可看到前端页面，API 也正常工作。

#### 启动脚本实现

**run.py**（项目根目录）：
```python
#!/usr/bin/env python3
"""
开发环境一键启动脚本
同时启动 Vite 前端开发服务器和 FastAPI 后端服务
"""
import subprocess
import sys
import os
import signal
import time

def main():
    processes = []

    try:
        # 启动 Vite 开发服务器
        print("🚀 启动前端开发服务器...")
        vite_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="web",
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        processes.append(vite_process)

        # 等待 Vite 启动
        time.sleep(2)

        # 启动 FastAPI
        print("🚀 启动后端服务...")
        fastapi_process = subprocess.Popen(
            [sys.executable, "main.py"],
            cwd="server",
        )
        processes.append(fastapi_process)

        print("\n✅ 开发服务已启动!")
        print("   前端: http://localhost:5173 (Vite)")
        print("   后端: http://localhost:8000 (FastAPI)")
        print("   推荐访问: http://localhost:8000 (统一入口)\n")
        print("按 Ctrl+C 停止所有服务...\n")

        # 等待进程
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print("\n🛑 正在停止服务...")
        for p in processes:
            p.terminate()
        print("✅ 已停止")

if __name__ == "__main__":
    main()
```

**Makefile**（项目根目录）：
```makefile
.PHONY: dev build install

# 一键启动开发环境
dev:
	python run.py

# 构建前端
build:
	cd web && npm run build

# 安装依赖
install:
	cd web && npm install
	cd server && pip install -r requirements.txt
```

#### FastAPI 开发模式配置

**server/main.py** 需要添加开发模式下的前端代理：

```python
import httpx
from fastapi import Request
from fastapi.responses import StreamingResponse

# 开发模式：代理前端请求到 Vite
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"
VITE_DEV_SERVER = "http://localhost:5173"

if DEV_MODE:
    @app.api_route("/{path:path}", methods=["GET"])
    async def proxy_to_vite(request: Request, path: str):
        # API 路由不代理
        if path.startswith("api/"):
            raise HTTPException(status_code=404)

        # 代理到 Vite 开发服务器
        async with httpx.AsyncClient() as client:
            url = f"{VITE_DEV_SERVER}/{path}"
            response = await client.get(url, headers=dict(request.headers))
            return StreamingResponse(
                iter([response.content]),
                status_code=response.status_code,
                headers=dict(response.headers),
            )
```

#### 分别启动（可选）

如果需要单独调试，也可以分别启动：

```bash
# 终端 1：启动前端
cd web
npm run dev  # localhost:5173

# 终端 2：启动后端
cd server
python main.py  # localhost:8000
```

**Vite 代理配置**（vite.config.ts）：
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 7.2 生产环境

1. **构建前端**：
   ```bash
   cd web
   npm run build  # 输出到 dist/
   ```

2. **FastAPI 托管静态文件**：
   ```python
   # server/main.py
   from fastapi.staticfiles import StaticFiles

   # 挂载静态资源
   app.mount("/assets", StaticFiles(directory="../web/dist/assets"), name="assets")

   # SPA 路由 fallback
   @app.get("/{path:path}")
   async def serve_spa(path: str):
       # API 路由已在上面处理
       # 其他路由返回 index.html
       return FileResponse("../web/dist/index.html")
   ```

3. **路由处理**：
   - `/api/*` → FastAPI 处理
   - `/assets/*` → 静态资源
   - 其他 → 返回 index.html（React Router 处理）

## 八、迁移步骤

### Phase 1：项目初始化
- [ ] 备份原 HTML 版本
- [ ] 初始化 Vite + React + TypeScript 项目
- [ ] 配置 Tailwind CSS
- [ ] 安装配置 shadcn/ui
- [ ] 定义设计 tokens（颜色、字体等）

### Phase 2：基础设施
- [ ] 配置 React Router
- [ ] 实现 AuthContext
- [ ] 实现 ThemeContext
- [ ] 迁移 API 服务层
- [ ] 定义 TypeScript 类型

### Phase 3：官网页面
- [ ] 迁移官网组件（从 secondme.zip）
- [ ] 适配路由和设计 tokens
- [ ] 实现 CTA 按钮跳转逻辑

### Phase 4：登录页面
- [ ] 实现 LoginPage
- [ ] 登录/注册表单
- [ ] 错误处理和提示

### Phase 5：对话页面 - 布局
- [ ] 实现 ChatPage 整体布局
- [ ] Sidebar 组件
- [ ] ChatHeader 组件
- [ ] 响应式适配

### Phase 6：对话页面 - 话题
- [ ] TopicList 组件
- [ ] TopicItem 组件
- [ ] 创建/删除/选择话题

### Phase 7：对话页面 - 消息
- [ ] ChatMessages 组件
- [ ] MessageItem 组件
- [ ] ChatInput 组件
- [ ] TypingIndicator 组件
- [ ] 流式响应处理

### Phase 8：记忆模块
- [ ] MemoryModal 组件
- [ ] MemoryList 组件
- [ ] AddMemoryModal 组件
- [ ] MemoryDetailModal 组件

### Phase 9：Flowmo 模块
- [ ] FlowmoModal 组件
- [ ] FlowmoList 组件
- [ ] Flowmo 话题功能

### Phase 10：设置模块
- [ ] SettingsModal 组件
- [ ] ProviderList/ProviderForm
- [ ] 默认配置表单
- [ ] 记忆提炼配置

### Phase 11：管理员模块
- [ ] AdminModal 组件
- [ ] InviteCodeList 组件
- [ ] UserList 组件

### Phase 12：收尾
- [ ] 全面测试
- [ ] 性能优化
- [ ] 生产环境部署配置
- [ ] 更新 CLAUDE.md 文档

## 九、涉及文件

### 新增文件

```
web/                          # 整个前端目录重建
├── src/
│   ├── components/           # ~30 个组件文件
│   ├── pages/               # 3 个页面文件
│   ├── hooks/               # ~7 个 Hook 文件
│   ├── contexts/            # 2 个 Context 文件
│   ├── services/            # 1 个 API 文件
│   ├── lib/                 # 2 个工具文件
│   ├── types/               # 1 个类型文件
│   └── styles/              # 1 个样式文件
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── index.html
```

### 修改文件

```
server/main.py               # 添加静态文件托管和 SPA fallback
CLAUDE.md                    # 更新项目结构和启动命令
```

### 删除/归档文件

```
web/                         # 原 HTML 版本打包归档
├── index.html              → backup/web-html-v1.zip
├── login.html              → backup/web-html-v1.zip
├── css/style.css           → backup/web-html-v1.zip
└── js/                     → backup/web-html-v1.zip
    ├── api.js
    ├── app.js
    ├── auth.js
    └── ui.js
```

## 十、风险与注意事项

1. **功能完整性**：迁移过程需确保所有现有功能正常工作
2. **流式响应**：React 中处理 SSE 需要特别注意状态更新
3. **Token 刷新**：确保 API 层正确处理 X-New-Token 响应头
4. **样式覆盖**：shadcn/ui 默认样式需要按设计语言调整
5. **打包体积**：注意代码分割，避免首屏加载过大

## 十一、验收标准

1. 所有现有功能正常工作
2. 官网与对话应用设计风格统一
3. 路由正确：`/` 官网、`/login` 登录、`/app` 对话
4. 响应式布局正常
5. 深色/浅色主题切换正常
6. 生产环境部署成功
