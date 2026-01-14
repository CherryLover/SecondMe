# 13-TODO 任务管理系统设计

## 1. 背景

用户需要一个集成在 SecondMe 中的任务管理工具，满足以下需求：
- 基础任务管理：分组、优先级、截止日期、状态、备注
- 子任务支持：任务可以包含子任务（最多 2 层嵌套）
- 对话中操作：通过自然语言与 AI 交互，让 AI 帮助管理任务
- 外部 API 调用：支持第三方应用（如移动端 App）通过 API 访问任务数据
- 独立系统：TODO 不与记忆系统集成，也不与 Flowmo 关联

## 2. 方案设计

### 2.1 核心特性

#### 任务基础属性
- **标题**（title）：任务名称，必填
- **描述**（description）：任务备注，可选，纯文本
- **状态**（status）：pending（待处理）、in_progress（进行中）、completed（已完成）、cancelled（已取消）
- **优先级**（priority）：1-5，数字越大优先级越高，可选（默认 3）
- **分组**（group）：字符串，用户自由输入，可选
- **截止日期**（deadline）：ISO 8601 格式，可选
- **父任务 ID**（parent_id）：用于子任务关联，可选

#### 子任务规则
- 最多支持 2 层嵌套（任务 → 子任务，不支持子子任务）
- 子任务可以提升为独立任务（设置 parent_id = null）
- 无子任务的任务可以转为子任务（设置 parent_id）
- **限制**：有子任务的任务不能转为子任务（防止超过 2 层）
- 主任务完成时，所有子任务自动完成
- 子任务全部完成时，主任务**不**自动完成

#### 权限隔离
- 所有任务数据按 user_id 隔离
- 每个用户只能操作自己的任务

### 2.2 外部 API Token 系统

#### 功能描述
- 用户可以创建多个永久有效的 API Token
- 每个 Token 可以自定义名称（如"我的 iOS App"、"测试 Token"）
- Token 永久有效，除非用户主动删除
- Token 可以访问该用户的所有数据（除管理员端点）

#### 权限范围
**✅ API Token 可访问：**
- `/api/todos/*` - TODO 管理
- `/api/topics/*` - 话题管理
- `/api/topics/*/messages` - 消息收发
- `/api/memories/*` - 记忆管理
- `/api/flowmos/*` - Flowmo 管理
- `/api/auth/me` - 获取当前用户信息
- `/api/auth/password` - 修改密码

**❌ API Token 不可访问（仅 Web JWT）：**
- `/api/providers/*` - 服务商管理（管理员）
- `/api/settings` - 系统设置（管理员）
- `/api/admin/*` - 所有管理员端点

#### 使用方式
```bash
# HTTP 请求头
Authorization: Bearer <api_token>
```

### 2.3 对话中操作（规划，暂不实现）

#### 设计思路
用户通过自然语言与 AI 交互，AI 理解意图后调用 TODO 工具完成操作。

#### 示例对话
```
用户: "明天要记得买牛奶"
AI: "好的，我帮你添加了一个待办：买牛奶，截止日期明天。"

用户: "把买牛奶的优先级调到最高"
AI: "已将「买牛奶」的优先级调整为 5（最高）。"

用户: "今天有哪些任务？"
AI: "今天有 3 个待办事项：
1. [进行中] 写设计文档（优先级 4，截止今天 18:00）
2. [待处理] 买牛奶（优先级 5，截止明天）
3. [待处理] 回复邮件（优先级 3，无截止日期）"
```

#### AI 工具设计
后续需要为 AI 设计一组 TODO 操作工具（类似 Function Calling）：
- `add_todo(title, description, priority, group, deadline)` - 添加任务
- `update_todo(todo_id, ...)` - 更新任务
- `complete_todo(todo_id)` - 完成任务
- `delete_todo(todo_id)` - 删除任务
- `list_todos(status, group, deadline_range)` - 查询任务列表

### 2.4 UI 设计

#### 对话页面集成（ChatPage 右侧边栏）

```
┌─────────────┬──────────────────┬────────────────┐
│  话题列表   │   消息对话区域    │   TODO 列表    │
│  Sidebar    │                  │                │
│             │                  │  [新建任务]    │
│  - 话题1    │  用户: ...       │  ☐ 任务1 (优先级5) │
│  - 话题2    │  AI: ...         │  ☑ 任务2 (已完成) │
│  - 话题3    │                  │    ☐ 子任务1   │
│             │  [输入框]        │  ☐ 任务3       │
└─────────────┴──────────────────┴────────────────┘
```

#### TODO 列表功能
- 显示当前用户的任务列表
- 支持按状态筛选（全部、待处理、进行中、已完成）
- 支持按优先级、截止日期排序
- 快速操作：
  - 勾选复选框 → 切换完成状态
  - 点击任务 → 展开详情面板
  - 拖拽排序（可选，后续实现）
- 子任务缩进显示
- 快速新建任务（标题输入框）

#### 任务详情面板
- 编辑标题、描述
- 修改优先级（1-5 选择器）
- 修改状态（下拉选择）
- 设置分组（自由输入，支持自动补全）
- 设置截止日期（日期时间选择器）
- 添加子任务
- 删除任务

## 3. 数据库设计

### 3.1 todos 表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INTEGER | 主键 | PRIMARY KEY |
| user_id | INTEGER | 所属用户 | NOT NULL, FOREIGN KEY |
| parent_id | INTEGER | 父任务 ID | NULL, FOREIGN KEY (self) |
| title | TEXT | 任务标题 | NOT NULL |
| description | TEXT | 任务描述 | NULL |
| status | TEXT | 状态 | NOT NULL, DEFAULT 'pending' |
| priority | INTEGER | 优先级 1-5 | NULL, DEFAULT 3 |
| group_name | TEXT | 分组名称 | NULL |
| deadline | TIMESTAMP | 截止日期 | NULL |
| completed_at | TIMESTAMP | 完成时间 | NULL |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |
| updated_at | TIMESTAMP | 更新时间 | NOT NULL |

**索引：**
```sql
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_parent_id ON todos(parent_id);
CREATE INDEX idx_todos_user_status ON todos(user_id, status);
CREATE INDEX idx_todos_deadline ON todos(deadline) WHERE deadline IS NOT NULL;
```

**外键约束：**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
```

### 3.2 api_tokens 表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INTEGER | 主键 | PRIMARY KEY |
| user_id | INTEGER | 所属用户 | NOT NULL, FOREIGN KEY |
| name | TEXT | Token 名称 | NOT NULL |
| token | TEXT | Token 字符串 | NOT NULL, UNIQUE |
| created_at | TIMESTAMP | 创建时间 | NOT NULL |
| last_used_at | TIMESTAMP | 最后使用时间 | NULL |

**索引：**
```sql
CREATE UNIQUE INDEX idx_api_tokens_token ON api_tokens(token);
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);
```

**外键约束：**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Token 格式：**
- 前缀：`smt_`（SecondMe Token）
- 长度：32 字节随机字符串（Base62 编码）
- 示例：`smt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## 4. API 设计

### 4.1 TODO 管理端点

#### 获取任务列表
```http
GET /api/todos
Authorization: Bearer <token>

Query 参数：
- status: pending|in_progress|completed|cancelled（可选）
- group: 分组名称（可选）
- parent_id: 父任务 ID，null 表示只返回顶层任务（可选）
- include_children: true|false，是否包含子任务（默认 true）

响应：
{
  "todos": [
    {
      "id": 1,
      "user_id": 1,
      "parent_id": null,
      "title": "准备旅行",
      "description": "春节假期旅行准备",
      "status": "in_progress",
      "priority": 4,
      "group_name": "生活",
      "deadline": "2026-02-01T00:00:00Z",
      "completed_at": null,
      "created_at": "2026-01-14T10:00:00Z",
      "updated_at": "2026-01-14T12:00:00Z",
      "children": [
        {
          "id": 2,
          "parent_id": 1,
          "title": "订机票",
          "status": "completed",
          "priority": 5,
          "completed_at": "2026-01-14T11:00:00Z",
          ...
        }
      ]
    }
  ]
}
```

#### 获取单个任务详情
```http
GET /api/todos/{id}
Authorization: Bearer <token>

响应：
{
  "id": 1,
  "user_id": 1,
  "parent_id": null,
  "title": "准备旅行",
  "description": "春节假期旅行准备",
  "status": "in_progress",
  "priority": 4,
  "group_name": "生活",
  "deadline": "2026-02-01T00:00:00Z",
  "completed_at": null,
  "created_at": "2026-01-14T10:00:00Z",
  "updated_at": "2026-01-14T12:00:00Z",
  "children": [...]
}
```

#### 创建任务
```http
POST /api/todos
Authorization: Bearer <token>
Content-Type: application/json

请求体：
{
  "title": "买牛奶",
  "description": "要买有机牛奶",
  "priority": 3,
  "group_name": "购物",
  "deadline": "2026-01-15T18:00:00Z",
  "parent_id": null
}

响应：
{
  "id": 10,
  "user_id": 1,
  "parent_id": null,
  "title": "买牛奶",
  "status": "pending",
  ...
}
```

#### 更新任务
```http
PUT /api/todos/{id}
Authorization: Bearer <token>
Content-Type: application/json

请求体（所有字段可选）：
{
  "title": "买有机牛奶",
  "description": "去超市买",
  "status": "in_progress",
  "priority": 5,
  "group_name": "购物",
  "deadline": "2026-01-15T20:00:00Z",
  "parent_id": null
}

特殊逻辑：
- 如果 status 从非 completed 变为 completed：
  - 设置 completed_at = 当前时间
  - 所有子任务自动完成
- 如果 parent_id 变化：
  - 验证是否有子任务（有子任务则不允许设置 parent_id）
  - 验证新父任务是否已有父任务（防止超过 2 层）

响应：
{
  "id": 10,
  "user_id": 1,
  "title": "买有机牛奶",
  "status": "in_progress",
  ...
}
```

#### 批量更新任务状态
```http
PATCH /api/todos/batch
Authorization: Bearer <token>
Content-Type: application/json

请求体：
{
  "ids": [1, 2, 3],
  "status": "completed"
}

响应：
{
  "updated_count": 3,
  "todos": [...]
}
```

#### 删除任务
```http
DELETE /api/todos/{id}
Authorization: Bearer <token>

逻辑：
- 删除任务时，所有子任务也会被级联删除（数据库外键约束）

响应：
{
  "success": true,
  "message": "任务及其所有子任务已删除"
}
```

#### 获取分组列表
```http
GET /api/todos/groups
Authorization: Bearer <token>

响应：
{
  "groups": [
    {"name": "工作", "count": 5},
    {"name": "生活", "count": 3},
    {"name": "购物", "count": 2}
  ]
}
```

### 4.2 API Token 管理端点

#### 获取 Token 列表
```http
GET /api/tokens
Authorization: Bearer <jwt_token>  // 注意：这里用 JWT，不是 API Token

响应：
{
  "tokens": [
    {
      "id": 1,
      "name": "我的 iOS App",
      "token": "smt_a1b2c3...",  // 只在创建时返回完整 Token
      "token_preview": "smt_a1b2...****",  // 列表中只显示前缀
      "created_at": "2026-01-14T10:00:00Z",
      "last_used_at": "2026-01-14T12:00:00Z"
    }
  ]
}
```

#### 创建 API Token
```http
POST /api/tokens
Authorization: Bearer <jwt_token>
Content-Type: application/json

请求体：
{
  "name": "我的 Android App"
}

响应：
{
  "id": 2,
  "name": "我的 Android App",
  "token": "smt_x1y2z3...",  // 完整 Token，只返回一次
  "created_at": "2026-01-14T13:00:00Z",
  "last_used_at": null
}
```

#### 删除 API Token
```http
DELETE /api/tokens/{id}
Authorization: Bearer <jwt_token>

响应：
{
  "success": true,
  "message": "Token 已删除"
}
```

## 5. 后端实现

### 5.1 数据库操作（database.py）

新增函数：

```python
# TODO 管理
def create_todo(user_id, title, description, priority, group_name, deadline, parent_id)
def get_todo(todo_id, user_id)  # 验证所有权
def get_todos(user_id, status=None, group=None, parent_id=None)
def update_todo(todo_id, user_id, **kwargs)
def delete_todo(todo_id, user_id)
def get_todo_groups(user_id)
def complete_todo_with_children(todo_id, user_id)  # 完成任务及其所有子任务
def verify_todo_parent_hierarchy(parent_id, user_id)  # 验证父子关系是否超过 2 层

# API Token 管理
def create_api_token(user_id, name)
def get_api_tokens(user_id)
def get_api_token_by_token(token)
def delete_api_token(token_id, user_id)
def update_token_last_used(token)
```

### 5.2 认证中间件（auth.py）

新增 API Token 验证：

```python
def verify_api_token(token: str) -> dict:
    """验证 API Token，返回用户信息"""
    if not token.startswith("smt_"):
        raise HTTPException(status_code=401, detail="无效的 Token 格式")

    token_data = database.get_api_token_by_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Token 不存在或已失效")

    # 更新最后使用时间
    database.update_token_last_used(token)

    return token_data['user']

def get_current_user_flexible(authorization: str = Header(None)) -> dict:
    """支持 JWT 和 API Token 两种认证方式"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证信息")

    token = authorization.replace("Bearer ", "")

    # 判断是 JWT 还是 API Token
    if token.startswith("smt_"):
        return verify_api_token(token)
    else:
        return verify_token(token)  # 原有的 JWT 验证
```

### 5.3 API 路由（main.py）

新增路由：

```python
# TODO 管理
@app.get("/api/todos")
@app.get("/api/todos/{todo_id}")
@app.post("/api/todos")
@app.put("/api/todos/{todo_id}")
@app.patch("/api/todos/batch")
@app.delete("/api/todos/{todo_id}")
@app.get("/api/todos/groups")

# API Token 管理
@app.get("/api/tokens")
@app.post("/api/tokens")
@app.delete("/api/tokens/{token_id}")
```

认证依赖更新：
```python
# 原有端点继续使用 JWT
current_user: dict = Depends(get_current_user)

# TODO 端点支持两种认证方式
current_user: dict = Depends(get_current_user_flexible)
```

### 5.4 数据模型（models.py）

新增 Pydantic 模型：

```python
class TodoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[int] = 3
    group_name: Optional[str] = None
    deadline: Optional[datetime] = None
    parent_id: Optional[int] = None

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    group_name: Optional[str] = None
    deadline: Optional[datetime] = None
    parent_id: Optional[int] = None

class TodoResponse(BaseModel):
    id: int
    user_id: int
    parent_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    priority: int
    group_name: Optional[str]
    deadline: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    children: List['TodoResponse'] = []

class ApiTokenCreate(BaseModel):
    name: str

class ApiTokenResponse(BaseModel):
    id: int
    name: str
    token: Optional[str]  # 只在创建时返回
    token_preview: str
    created_at: datetime
    last_used_at: Optional[datetime]
```

## 6. 前端实现

### 6.1 新增组件

#### TodoSidebar 组件（components/todo/TodoSidebar.tsx）
- 显示在 ChatPage 右侧
- TODO 列表展示（支持嵌套子任务）
- 快速添加任务
- 筛选和排序
- 点击任务打开详情面板

#### TodoDetailPanel 组件（components/todo/TodoDetailPanel.tsx）
- Modal 或 Drawer 形式
- 编辑任务所有字段
- 添加子任务
- 删除任务

#### TodoItem 组件（components/todo/TodoItem.tsx）
- 单个任务展示
- 复选框（切换完成状态）
- 优先级标记
- 截止日期显示（超期高亮）
- 子任务嵌套显示

#### TokenManagement 组件（components/settings/TokenManagement.tsx）
- 在 SettingsPage 中新增标签页
- Token 列表（名称、创建时间、最后使用时间）
- 创建新 Token
- 删除 Token
- 复制 Token 到剪贴板

### 6.2 API Service 扩展（services/api.ts）

新增方法：

```typescript
class ApiService {
  // TODO 管理
  async getTodos(params?: {
    status?: string;
    group?: string;
    parent_id?: number | null;
    include_children?: boolean;
  }): Promise<Todo[]>

  async getTodo(id: number): Promise<Todo>

  async createTodo(data: TodoCreate): Promise<Todo>

  async updateTodo(id: number, data: TodoUpdate): Promise<Todo>

  async batchUpdateTodos(ids: number[], status: string): Promise<void>

  async deleteTodo(id: number): Promise<void>

  async getTodoGroups(): Promise<{ name: string; count: number }[]>

  // API Token 管理
  async getApiTokens(): Promise<ApiToken[]>

  async createApiToken(name: string): Promise<ApiToken>

  async deleteApiToken(id: number): Promise<void>
}
```

### 6.3 类型定义（types/index.ts）

```typescript
interface Todo {
  id: number;
  user_id: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  group_name: string | null;
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  children: Todo[];
}

interface TodoCreate {
  title: string;
  description?: string;
  priority?: number;
  group_name?: string;
  deadline?: string;
  parent_id?: number;
}

interface TodoUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  group_name?: string;
  deadline?: string;
  parent_id?: number;
}

interface ApiToken {
  id: number;
  name: string;
  token?: string;
  token_preview: string;
  created_at: string;
  last_used_at: string | null;
}
```

### 6.4 ChatPage 改造

```tsx
// web/src/pages/ChatPage.tsx
const ChatPage = () => {
  const [showTodoSidebar, setShowTodoSidebar] = useState(true);

  return (
    <div className="flex h-screen">
      {/* 左侧：话题列表 */}
      <Sidebar ... />

      {/* 中间：对话区域 */}
      <div className="flex-1">
        <ChatMessages ... />
        <ChatInput ... />
      </div>

      {/* 右侧：TODO 列表（新增） */}
      {showTodoSidebar && (
        <TodoSidebar onClose={() => setShowTodoSidebar(false)} />
      )}
    </div>
  );
};
```

### 6.5 SettingsPage 改造

新增 "API Tokens" 标签页：

```tsx
// web/src/pages/SettingsPage.tsx
const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('providers');

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="providers">服务商</TabsTrigger>
          <TabsTrigger value="models">模型配置</TabsTrigger>
          <TabsTrigger value="memory">记忆设置</TabsTrigger>
          <TabsTrigger value="tokens">API Tokens</TabsTrigger> {/* 新增 */}
          <TabsTrigger value="account">账号</TabsTrigger>
        </TabsList>

        <TabsContent value="providers">...</TabsContent>
        <TabsContent value="models">...</TabsContent>
        <TabsContent value="memory">...</TabsContent>
        <TabsContent value="tokens">
          <TokenManagement /> {/* 新增 */}
        </TabsContent>
        <TabsContent value="account">...</TabsContent>
      </Tabs>
    </div>
  );
};
```

## 7. 涉及文件

### 后端文件（新增/修改）

**新增：**
无（所有功能在现有文件中添加）

**修改：**
- `server/database.py` - 新增 todos 表、api_tokens 表及相关 CRUD 函数
- `server/auth.py` - 新增 API Token 验证逻辑
- `server/main.py` - 新增 TODO 和 API Token 路由
- `server/models.py` - 新增 TODO 和 API Token 相关数据模型
- `server/config.py` - 可能需要新增配置项（如 Token 前缀）

### 前端文件（新增/修改）

**新增：**
- `web/src/components/todo/TodoSidebar.tsx` - TODO 侧边栏
- `web/src/components/todo/TodoDetailPanel.tsx` - 任务详情面板
- `web/src/components/todo/TodoItem.tsx` - 单个任务项
- `web/src/components/settings/TokenManagement.tsx` - API Token 管理

**修改：**
- `web/src/pages/ChatPage.tsx` - 集成 TodoSidebar
- `web/src/pages/SettingsPage.tsx` - 新增 API Tokens 标签页
- `web/src/services/api.ts` - 新增 TODO 和 API Token 相关 API 方法
- `web/src/types/index.ts` - 新增 TODO 和 API Token 类型定义

### 数据库迁移
- `server/database.py` 的 `init_db()` 函数需要新增表创建和自动迁移逻辑

## 8. 实施计划（版本规划）

### v2.0.0 - TODO 基础功能（当前版本）

**后端：**
- [x] 数据库表设计（todos、api_tokens）
- [ ] database.py 实现 TODO CRUD
- [ ] database.py 实现 API Token CRUD
- [ ] auth.py 实现 API Token 认证
- [ ] main.py 新增 TODO API 端点
- [ ] main.py 新增 API Token 管理端点
- [ ] models.py 新增数据模型

**前端：**
- [ ] TodoSidebar 组件（列表展示、筛选、排序）
- [ ] TodoItem 组件（任务项、子任务嵌套）
- [ ] TodoDetailPanel 组件（任务编辑）
- [ ] TokenManagement 组件（Token 管理）
- [ ] ChatPage 集成 TodoSidebar
- [ ] SettingsPage 新增 API Tokens 标签页
- [ ] API Service 扩展
- [ ] 类型定义

**测试：**
- [ ] API 端点测试
- [ ] 子任务层级限制测试
- [ ] 权限隔离测试
- [ ] API Token 认证测试

### v2.1.0 - 对话中操作 TODO（后续版本）

- [ ] 设计 AI 工具集（Function Calling）
- [ ] 实现自然语言意图识别
- [ ] System Prompt 集成 TODO 上下文
- [ ] 对话中 TODO 操作反馈优化

### v2.2.0 - 高级功能（可选）

- [ ] 拖拽排序
- [ ] 重复任务
- [ ] 任务标签系统
- [ ] 任务搜索
- [ ] 任务导出（JSON/CSV）

## 9. 注意事项

### 安全性
- API Token 使用安全随机数生成（`secrets.token_urlsafe()`）
- Token 存储前不需要加密（Token 本身就是随机字符串）
- API Token 只返回一次完整内容，后续只显示前缀
- 验证父子任务关系时防止循环引用

### 性能
- 为 user_id、parent_id、deadline 添加索引
- 获取任务列表时默认不加载已完成任务（可通过参数控制）
- 子任务嵌套最多 2 层，避免递归查询性能问题

### 兼容性
- API Token 和 JWT Token 共存，互不干扰
- 前端统一使用 `get_current_user_flexible` 依赖，自动识别 Token 类型

### 数据一致性
- 使用外键级联删除（ON DELETE CASCADE）
- 完成主任务时，事务中批量更新所有子任务
- 验证父子关系变更时检查层级限制

## 10. 后续优化方向

1. **通知提醒**：到期提醒、浏览器通知、邮件提醒
2. **协作功能**：任务分享、任务评论
3. **统计分析**：任务完成率、时间分布
4. **AI 智能建议**：基于对话内容主动建议创建任务
5. **移动端 App**：原生 iOS/Android 应用（基于 API Token）
