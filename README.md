# SecondMe

带有长期记忆能力的 AI 对话助手系统，专为个人单用户使用设计。

## 特性

- **长期记忆** - 基于向量数据库的跨话题记忆检索
- **流式对话** - 实时流式输出，打字机效果
- **多服务商支持** - 兼容 OpenAI、DeepSeek、SiliconFlow 等各种 API
- **本地部署** - 数据完全本地化，无需云服务
- **零依赖前端** - 原生 HTML/CSS/JavaScript，无需构建

## 架构

```
AI 服务商 (OpenAI/DeepSeek/SiliconFlow等)
         ↓ (OpenAI SDK + 自定义 baseUrl)
   Server (FastAPI)
   ├── SQLite - 业务数据
   └── ChromaDB - 向量记忆
         ↓ (REST API)
    Web (原生 HTML/JS)
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI + Uvicorn |
| AI 接口 | OpenAI SDK |
| 向量数据库 | ChromaDB |
| 业务数据库 | SQLite |
| 前端 | 原生 HTML/CSS/JavaScript |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/CherryLover/SecondMe.git
cd SecondMe
```

### 2. 配置环境

创建 `server/.env` 文件：

```env
DEFAULT_PROVIDER_NAME=默认服务商名称
DEFAULT_PROVIDER_BASE_URL=https://api.xxx.com/v1
DEFAULT_PROVIDER_API_KEY=sk-xxx
DEFAULT_CHAT_MODEL=模型名称
DEFAULT_EMBEDDING_MODEL=embedding模型名称
DEFAULT_MEMORY_TOP_K=5
```

### 3. 安装依赖

```bash
cd server
pip install -r requirements.txt
```

### 4. 启动服务

```bash
python main.py
```

### 5. 访问应用

打开浏览器访问 http://localhost:8000

## 目录结构

```
SecondMe/
├── docs/                    # 项目文档
├── server/                  # Python 后端
│   ├── main.py             # FastAPI 主程序
│   ├── config.py           # 配置管理
│   ├── database.py         # SQLite 操作
│   ├── memory.py           # ChromaDB 向量操作
│   ├── ai_client.py        # AI API 封装
│   ├── models.py           # 数据模型
│   └── data/               # 数据目录
└── web/                     # 前端页面
    ├── index.html
    ├── css/
    └── js/
```

## 功能说明

### 对话管理
- 创建、切换、删除话题
- 流式输出对话内容
- 自动生成话题标题

### 记忆系统
- 自动从对话中提取记忆
- 跨话题的相似度检索
- 手动添加/编辑记忆
- 记忆使用统计

### 服务商配置
- 支持多服务商
- 自定义 API 地址
- 动态获取模型列表

## 文档

详细文档请查看 [docs](./docs) 目录：

- [项目概述](./docs/01-项目概述.md)
- [功能清单](./docs/02-功能清单.md)
- [技术架构](./docs/03-技术架构.md)
- [API 设计](./docs/04-API设计.md)
- [数据库设计](./docs/05-数据库设计.md)
- [记忆系统设计](./docs/06-记忆系统设计.md)

## License

MIT
