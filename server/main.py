"""FastAPI 主入口"""
import json
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import database
import memory
import ai_client
import config
from logger import logger
from extraction import extraction_task
from models import (
    TopicCreate, TopicUpdate, TopicResponse, TopicsResponse,
    MessageCreate, MessageResponse, MessagesResponse, SendMessageResponse,
    ProviderCreate, ProviderUpdate, ProviderResponse, ProvidersResponse, ModelsResponse,
    MemoryCreate, MemoryUpdate, MemoryResponse, MemoryDetailResponse, MemoriesResponse,
    SettingsResponse, SettingsUpdate,
    SuccessResponse, ErrorResponse
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时：开启后台任务
    await extraction_task.start()
    yield
    # 关闭时：停止后台任务
    await extraction_task.stop()


app = FastAPI(title="SecondMe API", version="1.1.0", lifespan=lifespan)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ==================== Topics ====================

@app.post("/api/topics", response_model=TopicResponse)
def create_topic(body: TopicCreate = None):
    """创建话题"""
    topic = database.create_topic()
    return topic


@app.get("/api/topics", response_model=TopicsResponse)
def get_topics():
    """获取话题列表"""
    topics = database.get_topics()
    return {"topics": topics}


@app.get("/api/topics/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: str):
    """获取单个话题"""
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@app.patch("/api/topics/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: str, body: TopicUpdate):
    """更新话题标题"""
    topic = database.update_topic(topic_id, body.title)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@app.delete("/api/topics/{topic_id}", response_model=SuccessResponse)
def delete_topic(topic_id: str):
    """删除话题"""
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
def get_messages(topic_id: str):
    """获取话题的消息列表"""
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    messages = database.get_messages(topic_id)
    return {"messages": messages}


@app.post("/api/topics/{topic_id}/messages", response_model=SendMessageResponse)
def send_message(topic_id: str, body: MessageCreate):
    """发送消息（同步）"""
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # 获取配置
    settings = _get_settings()
    provider_id = body.provider_id or settings.get("default_chat_provider_id")
    model = body.model or settings.get("default_chat_model")

    if not provider_id or not model:
        logger.error("未配置服务商或模型")
        raise HTTPException(status_code=400, detail="No provider or model configured")

    logger.info(f"[Chat] 话题={topic_id[:8]}... 模型={model}")
    logger.info(f"[Chat] 用户消息: {body.content[:100]}{'...' if len(body.content) > 100 else ''}")

    # 保存用户消息
    user_message = database.create_message(topic_id, "user", body.content)

    # 更新话题活跃时间（用于记忆提炼的静默检测）
    database.update_topic_active_time(topic_id)

    # 获取历史消息
    messages = database.get_messages(topic_id)
    chat_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    logger.debug(f"[Chat] 历史消息数: {len(chat_messages)}")

    # 检索相关记忆
    memories_used = []
    system_prompt = None
    if settings.get("embedding_provider_id") and settings.get("embedding_model"):
        try:
            retrieved_memories = _retrieve_memories(body.content, settings)
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

    # 判断是否需要生成标题
    topic_title_updated = False
    if database.get_message_count(topic_id) == 2:  # 第一轮对话
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
async def send_message_stream(topic_id: str, body: MessageCreate):
    """发送消息（流式）"""
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # 获取配置
    settings = _get_settings()
    provider_id = body.provider_id or settings.get("default_chat_provider_id")
    model = body.model or settings.get("default_chat_model")

    if not provider_id or not model:
        logger.error("未配置服务商或模型")
        raise HTTPException(status_code=400, detail="No provider or model configured")

    logger.info(f"[Stream] 话题={topic_id[:8]}... 模型={model}")
    logger.info(f"[Stream] 用户消息: {body.content[:100]}{'...' if len(body.content) > 100 else ''}")

    # 保存用户消息
    user_message = database.create_message(topic_id, "user", body.content)

    # 更新话题活跃时间（用于记忆提炼的静默检测）
    database.update_topic_active_time(topic_id)

    # 获取历史消息
    messages = database.get_messages(topic_id)
    chat_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    logger.debug(f"[Stream] 历史消息数: {len(chat_messages)}")

    # 检索相关记忆
    memories_used = []
    system_prompt = None
    if settings.get("embedding_provider_id") and settings.get("embedding_model"):
        try:
            retrieved_memories = _retrieve_memories(body.content, settings)
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
            logger.error(f"[Stream] AI 调用失败: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        duration = (time.time() - start_time) * 1000
        logger.info(f"[Stream] 响应耗时: {duration:.0f}ms, 长度: {len(full_response)} 字符")
        logger.info(f"[Stream] 回复: {full_response[:100]}{'...' if len(full_response) > 100 else ''}")

        # 保存 AI 回复
        assistant_message = database.create_message(topic_id, "assistant", full_response)

        # 更新话题活跃时间
        database.update_topic_active_time(topic_id)

        # 记录记忆使用
        for memory_id in memories_used:
            database.record_memory_usage(memory_id, topic_id, assistant_message["id"])

        # 判断是否需要生成标题
        topic_title_updated = False
        new_title = None
        if database.get_message_count(topic_id) == 2:
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
def create_provider(body: ProviderCreate):
    """创建服务商"""
    provider = database.create_provider(body.name, body.base_url, body.api_key, body.enabled)
    return provider


@app.get("/api/providers", response_model=ProvidersResponse)
def get_providers():
    """获取服务商列表"""
    providers = database.get_providers()
    return {"providers": providers}


@app.put("/api/providers/{provider_id}", response_model=ProviderResponse)
def update_provider(provider_id: str, body: ProviderUpdate):
    """更新服务商"""
    provider = database.update_provider(provider_id, body.name, body.base_url, body.api_key, body.enabled)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


@app.delete("/api/providers/{provider_id}", response_model=SuccessResponse)
def delete_provider(provider_id: str):
    """删除服务商"""
    success = database.delete_provider(provider_id)
    if not success:
        raise HTTPException(status_code=404, detail="Provider not found")
    return {"success": True}


@app.get("/api/providers/{provider_id}/models", response_model=ModelsResponse)
def get_provider_models(provider_id: str):
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
    source: Optional[str] = Query(None)
):
    """获取记忆列表"""
    memories, total = database.get_memories(page, page_size, source)
    return {
        "memories": memories,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@app.get("/api/memories/{memory_id}", response_model=MemoryDetailResponse)
def get_memory(memory_id: str):
    """获取记忆详情"""
    mem = database.get_memory(memory_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    usage_records = database.get_memory_usage(memory_id)
    return {**mem, "usage_records": usage_records}


@app.post("/api/memories", response_model=MemoryResponse)
def create_memory(body: MemoryCreate):
    """手动添加记忆"""
    # 创建记忆记录
    mem = database.create_memory(body.content, "manual")

    # 存储向量
    settings = _get_settings()
    if settings.get("embedding_provider_id") and settings.get("embedding_model"):
        try:
            embedding = ai_client.get_embedding(
                settings["embedding_provider_id"],
                settings["embedding_model"],
                body.content
            )
            memory.store_memory_vector(mem["id"], body.content, embedding, "manual")
        except Exception:
            pass  # 向量存储失败不影响记忆创建

    return mem


@app.put("/api/memories/{memory_id}", response_model=MemoryResponse)
def update_memory(memory_id: str, body: MemoryUpdate):
    """更新记忆"""
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
def delete_memory(memory_id: str):
    """删除记忆"""
    # 删除向量
    memory.delete_memory_vector(memory_id)

    # 删除数据库记录
    success = database.delete_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"success": True}


# ==================== Settings ====================

@app.get("/api/settings", response_model=SettingsResponse)
def get_settings():
    """获取配置"""
    return _get_settings()


@app.put("/api/settings", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate):
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


def _retrieve_memories(query: str, settings: dict) -> list[dict]:
    """检索相关记忆"""
    if not settings.get("embedding_provider_id") or not settings.get("embedding_model"):
        return []

    # 获取查询向量
    embedding = ai_client.get_embedding(
        settings["embedding_provider_id"],
        settings["embedding_model"],
        query
    )

    # 搜索相关记忆
    top_k = settings.get("memory_top_k", 5)
    return memory.search_memories(embedding, top_k)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.SERVER_HOST, port=config.SERVER_PORT)
