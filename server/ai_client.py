"""AI 服务客户端"""
from typing import Optional, AsyncGenerator
from openai import OpenAI, AsyncOpenAI

import database


def get_ai_client(provider_id: str) -> tuple[OpenAI, str]:
    """获取 AI 客户端和默认模型"""
    provider = database.get_provider(provider_id)
    if not provider:
        raise ValueError(f"Provider {provider_id} not found")

    client = OpenAI(
        base_url=provider["base_url"],
        api_key=provider["api_key"]
    )
    return client, provider["name"]


def get_async_ai_client(provider_id: str) -> tuple[AsyncOpenAI, str]:
    """获取异步 AI 客户端"""
    provider = database.get_provider(provider_id)
    if not provider:
        raise ValueError(f"Provider {provider_id} not found")

    client = AsyncOpenAI(
        base_url=provider["base_url"],
        api_key=provider["api_key"]
    )
    return client, provider["name"]


def get_embedding(provider_id: str, model: str, text: str) -> list[float]:
    """获取文本的向量表示"""
    client, _ = get_ai_client(provider_id)
    response = client.embeddings.create(
        model=model,
        input=text
    )
    return response.data[0].embedding


def get_embeddings(provider_id: str, model: str, texts: list[str]) -> list[list[float]]:
    """批量获取文本的向量表示"""
    client, _ = get_ai_client(provider_id)
    response = client.embeddings.create(
        model=model,
        input=texts
    )
    return [item.embedding for item in response.data]


def chat_completion(
    provider_id: str,
    model: str,
    messages: list[dict],
    system_prompt: Optional[str] = None
) -> str:
    """同步对话生成"""
    client, _ = get_ai_client(provider_id)

    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    response = client.chat.completions.create(
        model=model,
        messages=full_messages
    )
    return response.choices[0].message.content


async def chat_completion_stream(
    provider_id: str,
    model: str,
    messages: list[dict],
    system_prompt: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """流式对话生成"""
    client, _ = get_async_ai_client(provider_id)

    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    stream = await client.chat.completions.create(
        model=model,
        messages=full_messages,
        stream=True
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


def generate_title(provider_id: str, model: str, first_message: str) -> str:
    """根据首条消息生成话题标题"""
    client, _ = get_ai_client(provider_id)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "根据用户的消息，生成一个简短的话题标题（不超过20个字），只返回标题文本，不要加引号或其他符号。"
            },
            {"role": "user", "content": first_message}
        ]
    )
    return response.choices[0].message.content.strip()


def get_models(provider_id: str) -> list[dict]:
    """获取服务商的模型列表"""
    client, _ = get_ai_client(provider_id)

    try:
        response = client.models.list()
        models = []
        for model in response.data:
            models.append({
                "id": model.id,
                "name": model.id  # 大多数 API 没有单独的 name 字段
            })
        return models
    except Exception as e:
        # 某些服务商可能不支持 models.list
        raise ValueError(f"Failed to get models: {str(e)}")
