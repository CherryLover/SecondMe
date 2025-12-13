"""记忆系统 - ChromaDB 向量存储"""
import chromadb
from chromadb.config import Settings
from typing import Optional

from config import CHROMA_PATH

# 全局 ChromaDB 客户端
_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None


def get_chroma_client() -> chromadb.PersistentClient:
    """获取 ChromaDB 客户端"""
    global _client
    if _client is None:
        CHROMA_PATH.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
            settings=Settings(anonymized_telemetry=False)
        )
    return _client


def get_collection() -> chromadb.Collection:
    """获取记忆 collection"""
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name="memories",
            metadata={"description": "Long-term memories for chat"}
        )
    return _collection


def store_memory_vector(memory_id: str, content: str, embedding: list[float], source: str):
    """存储记忆向量"""
    collection = get_collection()
    collection.add(
        ids=[memory_id],
        documents=[content],
        embeddings=[embedding],
        metadatas=[{"source": source}]
    )


def update_memory_vector(memory_id: str, content: str, embedding: list[float]):
    """更新记忆向量"""
    collection = get_collection()
    collection.update(
        ids=[memory_id],
        documents=[content],
        embeddings=[embedding]
    )


def delete_memory_vector(memory_id: str):
    """删除记忆向量"""
    collection = get_collection()
    try:
        collection.delete(ids=[memory_id])
    except Exception:
        pass  # 向量可能不存在


def search_memories(query_embedding: list[float], top_k: int = 5, exclude_ids: Optional[list[str]] = None) -> list[dict]:
    """搜索相关记忆"""
    collection = get_collection()

    # 获取结果
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k + (len(exclude_ids) if exclude_ids else 0)
    )

    # 格式化结果
    memories = []
    if results and results["ids"] and results["ids"][0]:
        for i, memory_id in enumerate(results["ids"][0]):
            # 排除指定的 ID
            if exclude_ids and memory_id in exclude_ids:
                continue

            memories.append({
                "id": memory_id,
                "content": results["documents"][0][i] if results["documents"] else "",
                "source": results["metadatas"][0][i].get("source", "unknown") if results["metadatas"] else "unknown",
                "distance": results["distances"][0][i] if results["distances"] else 0
            })

            if len(memories) >= top_k:
                break

    return memories


def get_memory_count() -> int:
    """获取记忆总数"""
    collection = get_collection()
    return collection.count()


def clear_all_vectors():
    """清空所有向量"""
    global _collection
    client = get_chroma_client()
    # 删除并重建 collection
    client.delete_collection("memories")
    _collection = None
    # 重新创建
    get_collection()
