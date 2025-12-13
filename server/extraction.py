"""记忆提炼模块 - 后台自动提炼有价值的记忆"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional

import database
import ai_client
import memory
from logger import logger
from config import (
    DEFAULT_MEMORY_SILENT_MINUTES,
    DEFAULT_MEMORY_EXTRACTION_ENABLED,
    DEFAULT_MEMORY_CONTEXT_MESSAGES
)


# 提炼 Prompt
EXTRACTION_PROMPT = """你是记忆管理助手。分析对话内容，提取值得长期记住的信息。

## 已有相关记忆
{existing_memories}

## 最近对话（上下文，仅供理解）
{context_messages}

## 新对话内容（从这里提取）
{new_messages}

## 提取规则
1. 只提取有长期价值的信息
2. 忽略：闲聊、问候、感谢、临时性讨论
3. 用简洁的陈述句，每条记忆独立完整
4. 与已有记忆对比：
   - 完全重复 → 跳过
   - 信息更新/补充 → 标记更新（提供原记忆ID）
   - 全新信息 → 添加

## 记忆类型
- personal: 个人信息（姓名、职业、家庭等）
- preference: 偏好习惯（喜好、风格、习惯）
- fact: 重要事实（项目信息、技术栈等）
- plan: 计划决定（待办、目标、承诺）

## 输出格式（严格 JSON）
{{
  "add": [
    {{"type": "personal", "content": "用户叫张三，是后端开发工程师"}},
    {{"type": "fact", "content": "用户正在开发一个 AI 对话助手项目，使用 FastAPI"}}
  ],
  "update": [
    {{"id": "原记忆ID", "content": "更新后的完整内容"}}
  ],
  "reason": "简要说明提取/跳过的原因"
}}

如果没有值得记忆的内容：
{{
  "add": [],
  "update": [],
  "reason": "对话内容为日常闲聊，无需记忆"
}}"""


def _format_messages(messages: list[dict]) -> str:
    """格式化消息列表"""
    if not messages:
        return "（无）"

    lines = []
    for msg in messages:
        role = "用户" if msg["role"] == "user" else "AI"
        lines.append(f"{role}：{msg['content']}")
    return "\n".join(lines)


def _format_existing_memories(memories: list[dict]) -> str:
    """格式化已有记忆"""
    if not memories:
        return "（无）"

    lines = []
    for mem in memories:
        lines.append(f"[ID:{mem['id']}] {mem['content']}")
    return "\n".join(lines)


def _parse_extraction_result(response: str) -> dict:
    """解析 AI 返回的提炼结果"""
    try:
        # 尝试直接解析
        return json.loads(response)
    except json.JSONDecodeError:
        # 尝试提取 JSON 部分
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

    # 解析失败，返回空结果
    logger.warning(f"Failed to parse extraction result: {response[:200]}")
    return {"add": [], "update": [], "reason": "解析失败"}


class MemoryExtractionTask:
    """记忆提炼后台任务"""

    def __init__(self):
        self.check_interval = 30  # 检查间隔（秒）
        self.running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """启动后台任务"""
        if self.running:
            return

        self.running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Memory extraction task started")

    async def stop(self):
        """停止后台任务"""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Memory extraction task stopped")

    async def _run_loop(self):
        """后台循环"""
        while self.running:
            try:
                await self._check_and_extract()
            except Exception as e:
                logger.error(f"Memory extraction error: {e}")

            await asyncio.sleep(self.check_interval)

    async def _check_and_extract(self):
        """检查并提炼记忆"""
        settings = database.get_all_settings()

        # 检查是否启用
        extraction_enabled = settings.get("memory_extraction_enabled", str(DEFAULT_MEMORY_EXTRACTION_ENABLED))
        if extraction_enabled.lower() != "true":
            return

        # 获取配置
        silent_minutes = int(settings.get("memory_silent_minutes", DEFAULT_MEMORY_SILENT_MINUTES))
        threshold = datetime.now() - timedelta(minutes=silent_minutes)

        # 查找需要处理的话题
        topics = database.find_topics_need_processing(threshold.isoformat())

        for topic in topics:
            try:
                await self._extract_topic_memories(topic, settings)
            except Exception as e:
                logger.error(f"Failed to extract memories for topic {topic['id']}: {e}")

    async def _extract_topic_memories(self, topic: dict, settings: dict):
        """提炼单个话题的记忆"""
        # 1. 获取新消息
        new_messages = database.get_unprocessed_messages(topic)
        if not new_messages:
            return

        logger.info(f"Extracting memories from topic {topic['id']}, {len(new_messages)} new messages")

        # 2. 获取上下文消息
        context_limit = int(settings.get("memory_context_messages", DEFAULT_MEMORY_CONTEXT_MESSAGES))
        context_messages = database.get_context_messages(
            topic["id"],
            topic.get("last_processed_message_id"),
            limit=context_limit
        )

        # 3. 搜索相关的已有记忆
        query_text = " ".join([m["content"] for m in new_messages[:5]])  # 取前5条构建查询
        existing_memories = await self._search_related_memories(query_text, settings, top_k=10)

        # 4. 构建 prompt 并调用 AI
        prompt = EXTRACTION_PROMPT.format(
            existing_memories=_format_existing_memories(existing_memories),
            context_messages=_format_messages(context_messages),
            new_messages=_format_messages(new_messages)
        )

        # 获取对话用的 provider 和 model
        provider_id = settings.get("default_chat_provider_id")
        model = settings.get("default_chat_model")

        if not provider_id or not model:
            logger.warning("No chat provider/model configured, skipping extraction")
            return

        try:
            response = ai_client.chat_completion(
                provider_id=provider_id,
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
        except Exception as e:
            logger.error(f"AI extraction call failed: {e}")
            return

        # 5. 解析结果
        result = _parse_extraction_result(response)
        logger.info(f"Extraction result: add={len(result.get('add', []))}, update={len(result.get('update', []))}, reason={result.get('reason', '')}")

        # 6. 处理新增记忆
        for mem in result.get("add", []):
            if not mem.get("content"):
                continue

            memory_type = mem.get("type", "fact")
            if memory_type not in ("personal", "preference", "fact", "plan"):
                memory_type = "fact"

            # 创建记忆
            new_memory = database.create_extracted_memory(
                content=mem["content"],
                memory_type=memory_type,
                source_topic_id=topic["id"]
            )

            # 存储向量
            try:
                embedding_provider_id = settings.get("embedding_provider_id")
                embedding_model = settings.get("embedding_model")
                if embedding_provider_id and embedding_model:
                    embedding = ai_client.get_embedding(
                        embedding_provider_id,
                        embedding_model,
                        mem["content"]
                    )
                    memory.store_memory_vector(
                        new_memory["id"],
                        mem["content"],
                        embedding,
                        "chat"
                    )
            except Exception as e:
                logger.error(f"Failed to store memory vector: {e}")

        # 7. 处理更新记忆
        for mem in result.get("update", []):
            if not mem.get("id") or not mem.get("content"):
                continue

            # 更新内容
            database.update_memory_content(mem["id"], mem["content"])

            # 更新向量
            try:
                embedding_provider_id = settings.get("embedding_provider_id")
                embedding_model = settings.get("embedding_model")
                if embedding_provider_id and embedding_model:
                    embedding = ai_client.get_embedding(
                        embedding_provider_id,
                        embedding_model,
                        mem["content"]
                    )
                    memory.update_memory_vector(mem["id"], mem["content"], embedding)
            except Exception as e:
                logger.error(f"Failed to update memory vector: {e}")

        # 8. 标记处理完成
        database.mark_topic_processed(topic["id"], new_messages[-1]["id"])

    async def _search_related_memories(self, query_text: str, settings: dict, top_k: int = 10) -> list[dict]:
        """搜索相关的已有记忆"""
        embedding_provider_id = settings.get("embedding_provider_id")
        embedding_model = settings.get("embedding_model")

        if not embedding_provider_id or not embedding_model:
            return []

        try:
            query_embedding = ai_client.get_embedding(
                embedding_provider_id,
                embedding_model,
                query_text
            )
            return memory.search_memories(query_embedding, top_k=top_k)
        except Exception as e:
            logger.error(f"Failed to search related memories: {e}")
            return []


# 全局任务实例
extraction_task = MemoryExtractionTask()
