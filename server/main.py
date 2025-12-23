"""FastAPI 主入口"""
import json
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

import database
import memory
import ai_client
import config
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin, check_token_refresh
)
from logger import logger
from extraction import extraction_task
from models import (
    TopicCreate, TopicUpdate, TopicResponse, TopicsResponse,
    MessageCreate, MessageResponse, MessagesResponse, SendMessageResponse,
    ProviderCreate, ProviderUpdate, ProviderResponse, ProvidersResponse, ModelsResponse,
    MemoryCreate, MemoryUpdate, MemoryResponse, MemoryDetailResponse, MemoriesResponse,
    FlowmoCreate, FlowmoResponse, FlowmosResponse, FlowmoTopicResponse,
    SettingsResponse, SettingsUpdate,
    SuccessResponse, ErrorResponse,
    UserRegister, UserLogin, UserResponse, TokenResponse, PasswordUpdate,
    InviteCodeCreate, InviteCodeResponse, InviteCodesResponse, UsersResponse
)

# 初始化数据库
database.init_database()


def init_default_provider():
    """从 .env 初始化默认 Provider"""
    if not all([config.DEFAULT_PROVIDER_NAME, config.DEFAULT_PROVIDER_BASE_URL, config.DEFAULT_PROVIDER_API_KEY]):
        logger.info("未配置默认 Provider，跳过初始化")
        return

    # 检查是否已存在同名 Provider
    providers = database.get_providers()
    existing = next((p for p in providers if p["name"] == config.DEFAULT_PROVIDER_NAME), None)

    if existing:
        # 已存在，更新配置
        database.update_provider(
            existing["id"],
            config.DEFAULT_PROVIDER_NAME,
            config.DEFAULT_PROVIDER_BASE_URL,
            config.DEFAULT_PROVIDER_API_KEY,
            True
        )
        provider_id = existing["id"]
        logger.info(f"更新默认 Provider: {config.DEFAULT_PROVIDER_NAME}")
    else:
        # 不存在，创建新的
        provider = database.create_provider(
            config.DEFAULT_PROVIDER_NAME,
            config.DEFAULT_PROVIDER_BASE_URL,
            config.DEFAULT_PROVIDER_API_KEY,
            True
        )
        provider_id = provider["id"]
        logger.info(f"创建默认 Provider: {config.DEFAULT_PROVIDER_NAME}")

    # 设置默认配置（如果未设置）
    all_settings = database.get_all_settings()

    if not all_settings.get("default_chat_provider_id"):
        database.set_setting("default_chat_provider_id", provider_id)
        logger.info(f"设置默认对话服务商: {provider_id}")

    if not all_settings.get("default_chat_model") and config.DEFAULT_CHAT_MODEL:
        database.set_setting("default_chat_model", config.DEFAULT_CHAT_MODEL)
        logger.info(f"设置默认对话模型: {config.DEFAULT_CHAT_MODEL}")

    if not all_settings.get("embedding_provider_id"):
        database.set_setting("embedding_provider_id", provider_id)
        logger.info(f"设置默认向量化服务商: {provider_id}")

    if not all_settings.get("embedding_model") and config.DEFAULT_EMBEDDING_MODEL:
        database.set_setting("embedding_model", config.DEFAULT_EMBEDDING_MODEL)
        logger.info(f"设置默认向量化模型: {config.DEFAULT_EMBEDDING_MODEL}")

    if not all_settings.get("memory_top_k"):
        database.set_setting("memory_top_k", str(config.DEFAULT_MEMORY_TOP_K))


# 初始化默认 Provider
init_default_provider()


def init_default_admin():
    """初始化默认管理员用户"""
    # 检查是否已有用户
    if database.get_user_count() > 0:
        return

    # 创建默认管理员
    password_hash = hash_password(config.ADMIN_PASSWORD)
    user = database.create_user(config.ADMIN_USERNAME, password_hash, "admin")
    logger.info(f"创建默认管理员: {config.ADMIN_USERNAME}")

    # 为管理员创建一个初始邀请码
    invite_code = secrets.token_urlsafe(8)
    database.create_invite_code(invite_code, user["id"], max_uses=10)
    logger.info(f"创建初始邀请码: {invite_code}")


# 初始化默认管理员
init_default_admin()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时：开启后台任务
    await extraction_task.start()
    yield
    # 关闭时：停止后台任务
    await extraction_task.stop()


app = FastAPI(title="SecondMe API", version="1.2.0", lifespan=lifespan)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-New-Token"],  # 暴露自定义响应头给前端
)


# Token 滑动过期中间件
@app.middleware("http")
async def token_refresh_middleware(request: Request, call_next):
    response = await call_next(request)

    # 检查请求是否携带 Authorization 头
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        # 检查是否需要刷新 token
        new_token = check_token_refresh(token)
        if new_token:
            response.headers["X-New-Token"] = new_token

    return response


# 请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # 跳过 OPTIONS 请求的详细日志
    if request.method == "OPTIONS":
        return await call_next(request)

    logger.info(f">>> {request.method} {request.url.path}")

    try:
        response = await call_next(request)
        duration = (time.time() - start_time) * 1000
        logger.info(f"<<< {request.method} {request.url.path} - {response.status_code} ({duration:.0f}ms)")
        return response
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"<<< {request.method} {request.url.path} - ERROR ({duration:.0f}ms): {str(e)}")
        raise


logger.info("SecondMe API 服务启动")


# ==================== Health Check ====================

@app.get("/health")
def health_check():
    """健康检查端点（无需认证）"""
    return {"status": "ok"}


# ==================== Auth ====================

@app.post("/api/auth/register", response_model=TokenResponse)
def register(body: UserRegister):
    """用户注册"""
    # 验证邀请码
    if not database.is_invite_code_valid(body.invite_code):
        raise HTTPException(status_code=400, detail="Invalid or expired invite code")

    # 检查用户名是否已存在
    if database.get_user_by_username(body.username):
        raise HTTPException(status_code=400, detail="Username already exists")

    # 创建用户
    password_hash = hash_password(body.password)
    user = database.create_user(body.username, password_hash)

    # 使用邀请码
    invite = database.get_invite_code_by_code(body.invite_code)
    database.use_invite_code(invite["id"], user["id"])

    # 生成 token
    token = create_token(user["id"], user["role"])

    logger.info(f"[Auth] 新用户注册: {body.username}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login(body: UserLogin):
    """用户登录"""
    user = database.get_user_by_username(body.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # 更新登录时间
    database.update_user_login_time(user["id"])

    # 生成 token
    token = create_token(user["id"], user["role"])

    logger.info(f"[Auth] 用户登录: {body.username}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "created_at": user["created_at"],
            "last_login_at": user["last_login_at"]
        }
    }


@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """获取当前用户信息"""
    user = database.get_user(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "created_at": user["created_at"],
        "last_login_at": user["last_login_at"]
    }


@app.put("/api/auth/password", response_model=SuccessResponse)
def update_password(body: PasswordUpdate, current_user: dict = Depends(get_current_user)):
    """修改密码"""
    user = database.get_user(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    new_hash = hash_password(body.new_password)
    database.update_user_password(user["id"], new_hash)

    logger.info(f"[Auth] 用户修改密码: {user['username']}")
    return {"success": True}


# ==================== Admin ====================

@app.post("/api/admin/invite-codes", response_model=InviteCodeResponse)
def create_invite_code(body: InviteCodeCreate, current_user: dict = Depends(require_admin)):
    """创建邀请码（管理员）"""
    code = secrets.token_urlsafe(8)
    expires_at = None
    if body.expires_days:
        expires_at = (datetime.now() + timedelta(days=body.expires_days)).isoformat()

    invite = database.create_invite_code(code, current_user["user_id"], body.max_uses, expires_at)
    logger.info(f"[Admin] 创建邀请码: {code}")
    return invite


@app.get("/api/admin/invite-codes", response_model=InviteCodesResponse)
def get_invite_codes(current_user: dict = Depends(require_admin)):
    """获取邀请码列表（管理员）"""
    codes = database.get_invite_codes()
    return {"invite_codes": codes}


@app.delete("/api/admin/invite-codes/{code_id}", response_model=SuccessResponse)
def delete_invite_code(code_id: str, current_user: dict = Depends(require_admin)):
    """删除邀请码（管理员）"""
    success = database.delete_invite_code(code_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invite code not found")
    return {"success": True}


@app.get("/api/admin/users", response_model=UsersResponse)
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin)
):
    """获取用户列表（管理员）"""
    users, total = database.get_users(page, page_size)
    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@app.delete("/api/admin/users/{user_id}", response_model=SuccessResponse)
def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """删除用户（管理员）"""
    # 不能删除自己
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    success = database.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True}


# ==================== Topics ====================

@app.post("/api/topics", response_model=TopicResponse)
def create_topic(body: TopicCreate = None, current_user: dict = Depends(get_current_user)):
    """创建话题"""
    topic = database.create_topic(current_user["user_id"])
    return topic


@app.get("/api/topics", response_model=TopicsResponse)
def get_topics(current_user: dict = Depends(get_current_user)):
    """获取话题列表"""
    topics = database.get_topics(current_user["user_id"])
    return {"topics": topics}


@app.get("/api/topics/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: str, current_user: dict = Depends(get_current_user)):
    """获取单个话题"""
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return topic


@app.patch("/api/topics/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: str, body: TopicUpdate, current_user: dict = Depends(get_current_user)):
    """更新话题标题"""
    if not database.verify_topic_owner(topic_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    topic = database.update_topic(topic_id, body.title)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@app.delete("/api/topics/{topic_id}", response_model=SuccessResponse)
def delete_topic(topic_id: str, current_user: dict = Depends(get_current_user)):
    """删除话题"""
    if not database.verify_topic_owner(topic_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    # 删除相关的记忆向量
    messages = database.get_messages(topic_id)
    for msg in messages:
        memory.delete_memory_vector(msg["id"])

    success = database.delete_topic(topic_id)
    if not success:
        raise HTTPException(status_code=404, detail="Topic not found")
    return {"success": True}


# ==================== Messages ====================

@app.get("/api/topics/{topic_id}/messages", response_model=MessagesResponse)
def get_messages(topic_id: str, current_user: dict = Depends(get_current_user)):
    """获取话题的消息列表"""
    if not database.verify_topic_owner(topic_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    messages = database.get_messages(topic_id)
    return {"messages": messages}


@app.post("/api/topics/{topic_id}/messages", response_model=SendMessageResponse)
def send_message(topic_id: str, body: MessageCreate, current_user: dict = Depends(get_current_user)):
    """发送消息（同步）"""
    if not database.verify_topic_owner(topic_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    user_id = current_user["user_id"]

    # 判断是否是 Flowmo 话题
    is_flowmo_topic = bool(topic.get("is_flowmo", 0))

    # 获取配置
    settings = _get_settings()
    provider_id = body.provider_id or settings.get("default_chat_provider_id")
    model = body.model or settings.get("default_chat_model")

    if not provider_id or not model:
        logger.error("未配置服务商或模型")
        raise HTTPException(status_code=400, detail="No provider or model configured")

    log_prefix = "[Flowmo]" if is_flowmo_topic else "[Chat]"
    logger.info(f"{log_prefix} 话题={topic_id[:8]}... 模型={model}")
    logger.info(f"{log_prefix} 用户消息: {body.content[:100]}{'...' if len(body.content) > 100 else ''}")

    # 保存用户消息
    user_message = database.create_message(topic_id, "user", body.content)

    # 更新话题活跃时间（用于记忆提炼的静默检测）
    database.update_topic_active_time(topic_id)

    # Flowmo 话题特殊处理
    if is_flowmo_topic:
        # 处理 Flowmo 记录
        _handle_flowmo_record(topic_id, user_message, settings, user_id)

        # 获取 Flowmo 上下文（不受 MAX_CONTEXT_MESSAGES 限制）
        chat_messages = _get_flowmo_context_messages(topic_id, user_message)
        logger.debug(f"{log_prefix} 上下文消息数: {len(chat_messages)}")

        # Flowmo 使用专门的 System Prompt
        system_prompt = FLOWMO_SYSTEM_PROMPT
        memories_used = []
    else:
        # 普通话题：获取历史消息
        messages = database.get_messages(topic_id)
        logger.info(f"{log_prefix} 原始消息数: {len(messages)}, 限制: {config.MAX_CONTEXT_MESSAGES}")
        # 截取最近 N 条消息
        if len(messages) > config.MAX_CONTEXT_MESSAGES:
            messages = messages[-config.MAX_CONTEXT_MESSAGES:]
            logger.info(f"{log_prefix} 消息已截取，保留最近 {config.MAX_CONTEXT_MESSAGES} 条")
        chat_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
        logger.info(f"{log_prefix} 发送给 AI 的消息数: {len(chat_messages)}")
        # 打印实际发送的第一条和最后一条消息内容（用于验证截取是否生效）
        if chat_messages:
            first_msg = chat_messages[0]["content"][:80].replace("\n", " ")
            last_msg = chat_messages[-1]["content"][:80].replace("\n", " ")
            logger.info(f"{log_prefix} 第一条: {first_msg}...")
            logger.info(f"{log_prefix} 最后一条: {last_msg}...")

        # 检索相关记忆
        memories_used = []
        system_prompt = None
        if settings.get("embedding_provider_id") and settings.get("embedding_model"):
            try:
                retrieved_memories = _retrieve_memories(body.content, settings, user_id)
                if retrieved_memories:
                    memories_used = [m["id"] for m in retrieved_memories]
                    logger.info(f"[Memory] 检索到 {len(retrieved_memories)} 条相关记忆")
                    for i, m in enumerate(retrieved_memories):
                        logger.debug(f"[Memory] #{i+1}: {m['content'][:50]}...")
                    memory_text = "\n".join([f"- {m['content']}" for m in retrieved_memories])
                    system_prompt = f"""你是一个有记忆能力的 AI 助手。

以下是与当前问题相关的历史记忆：
---
{memory_text}
---

请结合这些记忆和当前对话来回答用户的问题。如果记忆中有相关信息，可以主动提及。"""
                else:
                    logger.info("[Memory] 未检索到相关记忆")
            except Exception as e:
                logger.warning(f"[Memory] 记忆检索失败: {str(e)}")

    # 调用 AI
    try:
        start_time = time.time()
        ai_response = ai_client.chat_completion(provider_id, model, chat_messages, system_prompt)
        duration = (time.time() - start_time) * 1000
        logger.info(f"[AI] 响应耗时: {duration:.0f}ms, 长度: {len(ai_response)} 字符")
        logger.info(f"[AI] 回复: {ai_response[:100]}{'...' if len(ai_response) > 100 else ''}")
    except Exception as e:
        logger.error(f"[AI] 调用失败: {str(e)}")
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")

    # 保存 AI 回复
    assistant_message = database.create_message(topic_id, "assistant", ai_response)

    # 更新话题活跃时间
    database.update_topic_active_time(topic_id)

    # 记录记忆使用
    for memory_id in memories_used:
        database.record_memory_usage(memory_id, topic_id, assistant_message["id"])

    # 判断是否需要生成标题（Flowmo 话题不生成标题）
    topic_title_updated = False
    if not is_flowmo_topic and database.get_message_count(topic_id) == 2:  # 第一轮对话
        try:
            title = ai_client.generate_title(provider_id, model, body.content)
            database.update_topic(topic_id, title)
            topic_title_updated = True
            logger.info(f"[Topic] 生成标题: {title}")
        except Exception as e:
            logger.warning(f"[Topic] 标题生成失败: {str(e)}")

    return {
        "user_message": user_message,
        "assistant_message": assistant_message,
        "topic_title_updated": topic_title_updated,
        "memories_used": memories_used
    }


@app.post("/api/topics/{topic_id}/messages/stream")
async def send_message_stream(topic_id: str, body: MessageCreate, current_user: dict = Depends(get_current_user)):
    """发送消息（流式）"""
    if not database.verify_topic_owner(topic_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    user_id = current_user["user_id"]

    # 判断是否是 Flowmo 话题
    is_flowmo_topic = bool(topic.get("is_flowmo", 0))

    # 获取配置
    settings = _get_settings()
    provider_id = body.provider_id or settings.get("default_chat_provider_id")
    model = body.model or settings.get("default_chat_model")

    if not provider_id or not model:
        logger.error("未配置服务商或模型")
        raise HTTPException(status_code=400, detail="No provider or model configured")

    log_prefix = "[Flowmo-Stream]" if is_flowmo_topic else "[Stream]"
    logger.info(f"{log_prefix} 话题={topic_id[:8]}... 模型={model}")
    logger.info(f"{log_prefix} 用户消息: {body.content[:100]}{'...' if len(body.content) > 100 else ''}")

    # 保存用户消息
    user_message = database.create_message(topic_id, "user", body.content)

    # 更新话题活跃时间（用于记忆提炼的静默检测）
    database.update_topic_active_time(topic_id)

    # Flowmo 话题特殊处理
    if is_flowmo_topic:
        # 处理 Flowmo 记录
        _handle_flowmo_record(topic_id, user_message, settings, user_id)

        # 获取 Flowmo 上下文（不受 MAX_CONTEXT_MESSAGES 限制）
        chat_messages = _get_flowmo_context_messages(topic_id, user_message)
        logger.debug(f"{log_prefix} 上下文消息数: {len(chat_messages)}")

        # Flowmo 使用专门的 System Prompt
        system_prompt = FLOWMO_SYSTEM_PROMPT
        memories_used = []
    else:
        # 普通话题：获取历史消息
        messages = database.get_messages(topic_id)
        logger.info(f"{log_prefix} 原始消息数: {len(messages)}, 限制: {config.MAX_CONTEXT_MESSAGES}")
        # 截取最近 N 条消息
        if len(messages) > config.MAX_CONTEXT_MESSAGES:
            messages = messages[-config.MAX_CONTEXT_MESSAGES:]
            logger.info(f"{log_prefix} 消息已截取，保留最近 {config.MAX_CONTEXT_MESSAGES} 条")
        chat_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
        logger.info(f"{log_prefix} 发送给 AI 的消息数: {len(chat_messages)}")
        # 打印实际发送的第一条和最后一条消息内容（用于验证截取是否生效）
        if chat_messages:
            first_msg = chat_messages[0]["content"][:80].replace("\n", " ")
            last_msg = chat_messages[-1]["content"][:80].replace("\n", " ")
            logger.info(f"{log_prefix} 第一条: {first_msg}...")
            logger.info(f"{log_prefix} 最后一条: {last_msg}...")

        # 检索相关记忆
        memories_used = []
        system_prompt = None
        if settings.get("embedding_provider_id") and settings.get("embedding_model"):
            try:
                retrieved_memories = _retrieve_memories(body.content, settings, user_id)
                if retrieved_memories:
                    memories_used = [m["id"] for m in retrieved_memories]
                    logger.info(f"[Memory] 检索到 {len(retrieved_memories)} 条相关记忆")
                    memory_text = "\n".join([f"- {m['content']}" for m in retrieved_memories])
                    system_prompt = f"""你是一个有记忆能力的 AI 助手。

以下是与当前问题相关的历史记忆：
---
{memory_text}
---

请结合这些记忆和当前对话来回答用户的问题。如果记忆中有相关信息，可以主动提及。"""
                else:
                    logger.info("[Memory] 未检索到相关记忆")
            except Exception as e:
                logger.warning(f"[Memory] 记忆检索失败: {str(e)}")

    async def generate():
        full_response = ""
        start_time = time.time()

        # 发送用户消息
        yield f"data: {json.dumps({'type': 'user_message', 'message': user_message})}\n\n"

        # 流式生成 AI 回复
        try:
            async for chunk in ai_client.chat_completion_stream(provider_id, model, chat_messages, system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        except Exception as e:
            logger.error(f"{log_prefix} AI 调用失败: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        duration = (time.time() - start_time) * 1000
        logger.info(f"{log_prefix} 响应耗时: {duration:.0f}ms, 长度: {len(full_response)} 字符")
        logger.info(f"{log_prefix} 回复: {full_response[:100]}{'...' if len(full_response) > 100 else ''}")

        # 保存 AI 回复
        assistant_message = database.create_message(topic_id, "assistant", full_response)

        # 更新话题活跃时间
        database.update_topic_active_time(topic_id)

        # 记录记忆使用
        for memory_id in memories_used:
            database.record_memory_usage(memory_id, topic_id, assistant_message["id"])

        # 判断是否需要生成标题（Flowmo 话题不生成标题）
        topic_title_updated = False
        new_title = None
        if not is_flowmo_topic and database.get_message_count(topic_id) == 2:
            try:
                new_title = ai_client.generate_title(provider_id, model, body.content)
                database.update_topic(topic_id, new_title)
                topic_title_updated = True
                logger.info(f"[Topic] 生成标题: {new_title}")
            except Exception as e:
                logger.warning(f"[Topic] 标题生成失败: {str(e)}")

        # 发送完成消息
        yield f"data: {json.dumps({'type': 'done', 'message': assistant_message, 'memories_used': memories_used, 'topic_title_updated': topic_title_updated, 'new_title': new_title})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ==================== Providers ====================

@app.post("/api/providers", response_model=ProviderResponse)
def create_provider(body: ProviderCreate, current_user: dict = Depends(require_admin)):
    """创建服务商（管理员）"""
    provider = database.create_provider(body.name, body.base_url, body.api_key, body.enabled)
    return provider


@app.get("/api/providers", response_model=ProvidersResponse)
def get_providers(current_user: dict = Depends(get_current_user)):
    """获取服务商列表"""
    providers = database.get_providers()
    return {"providers": providers}


@app.put("/api/providers/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: str, body: ProviderUpdate, current_user: dict = Depends(require_admin)):
    """更新服务商（管理员）"""
    provider = database.update_provider(provider_id, body.name, body.base_url, body.api_key, body.enabled)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


@app.delete("/api/providers/{provider_id}", response_model=SuccessResponse)
def delete_provider(provider_id: str, current_user: dict = Depends(require_admin)):
    """删除服务商（管理员）"""
    success = database.delete_provider(provider_id)
    if not success:
        raise HTTPException(status_code=404, detail="Provider not found")
    return {"success": True}


@app.get("/api/providers/{provider_id}/models", response_model=ModelsResponse)
def get_provider_models(provider_id: str, current_user: dict = Depends(get_current_user)):
    """获取服务商的模型列表"""
    try:
        models = ai_client.get_models(provider_id)
        return {"models": models}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ==================== Memories ====================

@app.get("/api/memories", response_model=MemoriesResponse)
def get_memories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """获取记忆列表"""
    memories, total = database.get_memories(current_user["user_id"], page, page_size, source)
    return {
        "memories": memories,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@app.get("/api/memories/{memory_id}", response_model=MemoryDetailResponse)
def get_memory(memory_id: str, current_user: dict = Depends(get_current_user)):
    """获取记忆详情"""
    mem = database.get_memory(memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if mem.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    usage_records = database.get_memory_usage(memory_id)
    return {**mem, "usage_records": usage_records}


@app.post("/api/memories", response_model=MemoryResponse)
def create_memory(body: MemoryCreate, current_user: dict = Depends(get_current_user)):
    """手动添加记忆"""
    user_id = current_user["user_id"]

    # 创建记忆记录
    mem = database.create_memory(user_id, body.content, "manual")

    # 存储向量
    settings = _get_settings()
    if settings.get("embedding_provider_id") and settings.get("embedding_model"):
        try:
            embedding = ai_client.get_embedding(
                settings["embedding_provider_id"],
                settings["embedding_model"],
                body.content
            )
            memory.store_memory_vector(mem["id"], body.content, embedding, "manual", user_id)
        except Exception:
            pass  # 向量存储失败不影响记忆创建

    return mem


@app.put("/api/memories/{memory_id}", response_model=MemoryResponse)
def update_memory(memory_id: str, body: MemoryUpdate, current_user: dict = Depends(get_current_user)):
    """更新记忆"""
    if not database.verify_memory_owner(memory_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    mem = database.update_memory(memory_id, body.content)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    # 更新向量
    settings = _get_settings()
    if settings.get("embedding_provider_id") and settings.get("embedding_model"):
        try:
            embedding = ai_client.get_embedding(
                settings["embedding_provider_id"],
                settings["embedding_model"],
                body.content
            )
            memory.update_memory_vector(memory_id, body.content, embedding)
        except Exception:
            pass

    return mem


@app.delete("/api/memories/all")
def delete_all_memories():
    """删除所有记忆"""
    # 删除数据库记录
    count, _ = database.delete_all_memories()

    # 清空整个向量集合（包括旧版本用消息ID存储的向量）
    memory.clear_all_vectors()

    logger.info(f"Deleted all memories: {count} records, cleared all vectors")
    return {"success": True, "deleted_count": count}


@app.delete("/api/memories/{memory_id}", response_model=SuccessResponse)
def delete_memory(memory_id: str, current_user: dict = Depends(get_current_user)):
    """删除记忆"""
    if not database.verify_memory_owner(memory_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    # 删除向量
    memory.delete_memory_vector(memory_id)

    # 删除数据库记录
    success = database.delete_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True}


# ==================== Settings ====================

@app.get("/api/settings", response_model=SettingsResponse)
def get_settings(current_user: dict = Depends(get_current_user)):
    """获取配置"""
    return _get_settings()


@app.put("/api/settings", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate, current_user: dict = Depends(require_admin)):
    """更新配置"""
    if body.default_chat_provider_id is not None:
        database.set_setting("default_chat_provider_id", body.default_chat_provider_id)
    if body.default_chat_model is not None:
        database.set_setting("default_chat_model", body.default_chat_model)
    if body.embedding_provider_id is not None:
        database.set_setting("embedding_provider_id", body.embedding_provider_id)
    if body.embedding_model is not None:
        database.set_setting("embedding_model", body.embedding_model)
    if body.memory_top_k is not None:
        database.set_setting("memory_top_k", str(body.memory_top_k))
    if body.memory_silent_minutes is not None:
        database.set_setting("memory_silent_minutes", str(body.memory_silent_minutes))
    if body.memory_extraction_enabled is not None:
        database.set_setting("memory_extraction_enabled", str(body.memory_extraction_enabled).lower())
    if body.memory_context_messages is not None:
        database.set_setting("memory_context_messages", str(body.memory_context_messages))

    return _get_settings()


# ==================== Flowmo ====================

@app.get("/api/flowmo/topic", response_model=FlowmoTopicResponse)
def get_flowmo_topic(current_user: dict = Depends(get_current_user)):
    """获取或创建 Flowmo 话题"""
    topic = database.get_or_create_flowmo_topic(current_user["user_id"])
    return {
        "id": topic["id"],
        "title": topic["title"],
        "is_flowmo": bool(topic.get("is_flowmo", 1)),
        "created_at": topic["created_at"],
        "updated_at": topic["updated_at"]
    }


@app.get("/api/flowmos", response_model=FlowmosResponse)
def get_flowmos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """获取 Flowmo 列表"""
    flowmos, total = database.get_flowmos(current_user["user_id"], page, page_size)
    return {
        "flowmos": flowmos,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@app.post("/api/flowmos", response_model=FlowmoResponse)
def create_flowmo(body: FlowmoCreate, current_user: dict = Depends(get_current_user)):
    """直接添加 Flowmo（不经过对话）"""
    # 创建 Flowmo 记录
    flowmo = database.create_flowmo(current_user["user_id"], body.content, "direct")

    # 向量化存储
    settings = _get_settings()
    if settings.get("embedding_provider_id") and settings.get("embedding_model"):
        try:
            embedding = ai_client.get_embedding(
                settings["embedding_provider_id"],
                settings["embedding_model"],
                body.content
            )
            memory.store_flowmo_vector(flowmo["id"], body.content, embedding)
            logger.info(f"[Flowmo] 向量化成功: {flowmo['id'][:8]}...")
        except Exception as e:
            logger.warning(f"[Flowmo] 向量化失败: {str(e)}")

    return flowmo


@app.delete("/api/flowmos/all")
def delete_all_flowmos(current_user: dict = Depends(get_current_user)):
    """删除所有 Flowmo"""
    count, flowmo_ids = database.delete_all_flowmos(current_user["user_id"])

    # 删除向量
    for flowmo_id in flowmo_ids:
        memory.delete_flowmo_vector(flowmo_id)

    logger.info(f"[Flowmo] 删除所有 Flowmo: {count} 条")
    return {"success": True, "deleted_count": count}


@app.delete("/api/flowmos/{flowmo_id}", response_model=SuccessResponse)
def delete_flowmo(flowmo_id: str, current_user: dict = Depends(get_current_user)):
    """删除 Flowmo"""
    # 验证所有权
    if not database.verify_flowmo_owner(flowmo_id, current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    # 删除向量
    memory.delete_flowmo_vector(flowmo_id)

    # 删除数据库记录
    success = database.delete_flowmo(flowmo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Flowmo not found")
    return {"success": True}


# ==================== Helper Functions ====================

def _get_settings() -> dict:
    """获取设置字典"""
    all_settings = database.get_all_settings()
    return {
        "default_chat_provider_id": all_settings.get("default_chat_provider_id"),
        "default_chat_model": all_settings.get("default_chat_model"),
        "embedding_provider_id": all_settings.get("embedding_provider_id"),
        "embedding_model": all_settings.get("embedding_model"),
        "memory_top_k": int(all_settings.get("memory_top_k", str(config.DEFAULT_MEMORY_TOP_K))),
        "memory_silent_minutes": int(all_settings.get("memory_silent_minutes", str(config.DEFAULT_MEMORY_SILENT_MINUTES))),
        "memory_extraction_enabled": all_settings.get("memory_extraction_enabled", str(config.DEFAULT_MEMORY_EXTRACTION_ENABLED).lower()) == "true",
        "memory_context_messages": int(all_settings.get("memory_context_messages", str(config.DEFAULT_MEMORY_CONTEXT_MESSAGES)))
    }


def _retrieve_memories(query: str, settings: dict, user_id: str) -> list[dict]:
    """检索用户的相关记忆（包括记忆和 Flowmo）"""
    if not settings.get("embedding_provider_id") or not settings.get("embedding_model"):
        return []

    # 获取查询向量
    embedding = ai_client.get_embedding(
        settings["embedding_provider_id"],
        settings["embedding_model"],
        query
    )

    # 联合搜索记忆和 Flowmo
    top_k = settings.get("memory_top_k", 5)
    return memory.search_memories_and_flowmos(embedding, user_id, top_k)


def _is_new_flowmo(topic_id: str, last_message_time: str) -> bool:
    """判断是否是新的 Flowmo 记录（距离上一条消息 >= FLOWMO_INTERVAL_MINUTES 分钟）"""
    if not last_message_time:
        return True

    last_time = datetime.fromisoformat(last_message_time)
    now = datetime.now()
    interval = timedelta(minutes=config.FLOWMO_INTERVAL_MINUTES)

    return (now - last_time) >= interval


def _get_flowmo_context_messages(topic_id: str, current_message: dict) -> list[dict]:
    """获取 Flowmo 话题的上下文消息

    规则：
    - 如果是新的 Flowmo（距离上条消息 >= 5分钟），只返回当前消息
    - 否则返回从上一条 Flowmo 开始到现在的所有消息
    """
    # 获取上一条消息的时间（不包括当前消息）
    messages = database.get_messages(topic_id)
    if len(messages) <= 1:
        # 只有当前消息
        return [{"role": current_message["role"], "content": current_message["content"]}]

    # 排除当前消息后的最后一条消息时间
    previous_messages = messages[:-1]
    last_message_time = previous_messages[-1]["created_at"] if previous_messages else None

    if _is_new_flowmo(topic_id, last_message_time):
        # 新的 Flowmo，只返回当前消息
        return [{"role": current_message["role"], "content": current_message["content"]}]

    # 继续聊天，找到最近一条 Flowmo 的时间
    latest_flowmo_time = database.get_latest_flowmo_time(topic_id)

    if not latest_flowmo_time:
        # 没有 Flowmo 记录，返回所有消息
        return [{"role": m["role"], "content": m["content"]} for m in messages]

    # 返回从最近 Flowmo 时间之后的所有消息（包括那条 Flowmo 对应的消息）
    context_messages = []
    for m in messages:
        if m["created_at"] >= latest_flowmo_time:
            context_messages.append({"role": m["role"], "content": m["content"]})

    return context_messages if context_messages else [{"role": current_message["role"], "content": current_message["content"]}]


def _handle_flowmo_record(topic_id: str, user_message: dict, settings: dict, user_id: str) -> bool:
    """处理 Flowmo 记录

    返回：是否创建了新的 Flowmo 记录
    """
    # 获取上一条消息的时间
    messages = database.get_messages(topic_id)
    if len(messages) <= 1:
        last_message_time = None
    else:
        last_message_time = messages[-2]["created_at"]  # 倒数第二条（当前消息是最后一条）

    if _is_new_flowmo(topic_id, last_message_time):
        # 创建 Flowmo 记录
        flowmo = database.create_flowmo(
            user_id=user_id,
            content=user_message["content"],
            source="chat",
            topic_id=topic_id,
            message_id=user_message["id"]
        )
        logger.info(f"[Flowmo] 创建记录: {flowmo['id'][:8]}...")

        # 向量化
        if settings.get("embedding_provider_id") and settings.get("embedding_model"):
            try:
                embedding = ai_client.get_embedding(
                    settings["embedding_provider_id"],
                    settings["embedding_model"],
                    user_message["content"]
                )
                memory.store_flowmo_vector(flowmo["id"], user_message["content"], embedding, user_id)
                logger.info(f"[Flowmo] 向量化成功")
            except Exception as e:
                logger.warning(f"[Flowmo] 向量化失败: {str(e)}")

        return True

    return False


# Flowmo 话题的 System Prompt
FLOWMO_SYSTEM_PROMPT = """你是一个善于倾听的伙伴。用户在记录自己的想法、情绪或日常。
请以温和、共情的方式回应，可以简短也可以展开聊聊。
不要急于给建议，先理解和陪伴。"""


# ==================== 静态文件托管 ====================

# Web 目录路径
WEB_DIR = Path(__file__).parent.parent / "web"
DIST_DIR = WEB_DIR / "dist"

# 检查是否为生产模式（dist 目录存在）
IS_PRODUCTION = DIST_DIR.exists() and (DIST_DIR / "index.html").exists()

if IS_PRODUCTION:
    # 生产模式：服务 React 构建后的静态文件
    logger.info("生产模式：托管 React 构建文件")

    # 挂载静态资源
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA 路由 - 所有非 API 路由返回 index.html"""
        # 如果是 API 路由，跳过
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        # 检查是否请求静态文件
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # 其他所有请求返回 index.html（SPA 路由）
        return FileResponse(DIST_DIR / "index.html")
else:
    # 开发模式：前端由 Vite 开发服务器处理
    logger.info("开发模式：前端请访问 http://localhost:5173")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.SERVER_HOST, port=config.SERVER_PORT)
