"""SQLite 数据库操作"""
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Optional
from uuid import uuid4

from config import DATABASE_PATH


def _get_table_columns(cursor, table_name: str) -> set[str]:
    """获取表的所有列名"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}


def _migrate_database(cursor):
    """数据库迁移：为已有表添加新字段"""
    # topics 表迁移
    topic_columns = _get_table_columns(cursor, "topics")
    if "last_active_at" not in topic_columns:
        cursor.execute("ALTER TABLE topics ADD COLUMN last_active_at TIMESTAMP")
    if "memory_processed_at" not in topic_columns:
        cursor.execute("ALTER TABLE topics ADD COLUMN memory_processed_at TIMESTAMP")
    if "last_processed_message_id" not in topic_columns:
        cursor.execute("ALTER TABLE topics ADD COLUMN last_processed_message_id TEXT")

    # memories 表迁移
    memory_columns = _get_table_columns(cursor, "memories")
    if "memory_type" not in memory_columns:
        cursor.execute("ALTER TABLE memories ADD COLUMN memory_type TEXT DEFAULT 'chat'")


def get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    """数据库连接上下文管理器"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    """初始化数据库表"""
    with get_db() as conn:
        cursor = conn.cursor()

        # 创建话题表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP,
                memory_processed_at TIMESTAMP,
                last_processed_message_id TEXT
            )
        """)

        # 创建消息表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            )
        """)

        # 创建服务商表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                api_key TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 创建记忆表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                source TEXT NOT NULL CHECK(source IN ('chat', 'manual')),
                source_topic_id TEXT,
                source_message_id TEXT,
                use_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                memory_type TEXT DEFAULT 'chat',
                FOREIGN KEY (source_topic_id) REFERENCES topics(id) ON DELETE SET NULL,
                FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE SET NULL
            )
        """)

        # 创建记忆使用记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_usage (
                id TEXT PRIMARY KEY,
                memory_id TEXT NOT NULL,
                topic_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        """)

        # 创建配置表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        # 数据库迁移：为已有表添加新字段
        _migrate_database(cursor)

        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_updated_at ON topics(updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_topic_id ON messages(topic_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(topic_id, created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_use_count ON memories(use_count DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_last_used ON memories(last_used_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_usage_memory_id ON memory_usage(memory_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_usage_topic_id ON memory_usage(topic_id)")


# ==================== Topics ====================

def create_topic(title: str = "新话题") -> dict:
    """创建话题"""
    topic_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO topics (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (topic_id, title, now, now)
        )

    return {
        "id": topic_id,
        "title": title,
        "created_at": now,
        "updated_at": now
    }


def get_topics() -> list[dict]:
    """获取所有话题"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM topics ORDER BY updated_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def get_topic(topic_id: str) -> Optional[dict]:
    """获取单个话题"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM topics WHERE id = ?", (topic_id,)
        ).fetchone()
    return dict(row) if row else None


def update_topic(topic_id: str, title: str) -> Optional[dict]:
    """更新话题标题"""
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "UPDATE topics SET title = ?, updated_at = ? WHERE id = ?",
            (title, now, topic_id)
        )

    return get_topic(topic_id)


def delete_topic(topic_id: str) -> bool:
    """删除话题"""
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM topics WHERE id = ?", (topic_id,))
    return cursor.rowcount > 0


def touch_topic(topic_id: str):
    """更新话题的更新时间"""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE topics SET updated_at = ? WHERE id = ?",
            (now, topic_id)
        )


# ==================== Messages ====================

def create_message(topic_id: str, role: str, content: str) -> dict:
    """创建消息"""
    message_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (id, topic_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (message_id, topic_id, role, content, now)
        )

    # 更新话题的更新时间
    touch_topic(topic_id)

    return {
        "id": message_id,
        "topic_id": topic_id,
        "role": role,
        "content": content,
        "created_at": now
    }


def get_messages(topic_id: str) -> list[dict]:
    """获取话题的所有消息"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE topic_id = ? ORDER BY created_at ASC",
            (topic_id,)
        ).fetchall()
    return [dict(row) for row in rows]


def get_message_count(topic_id: str) -> int:
    """获取话题的消息数量"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as count FROM messages WHERE topic_id = ?",
            (topic_id,)
        ).fetchone()
    return row["count"] if row else 0


# ==================== Providers ====================

def create_provider(name: str, base_url: str, api_key: str, enabled: bool = True) -> dict:
    """创建服务商"""
    provider_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO providers (id, name, base_url, api_key, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (provider_id, name, base_url, api_key, 1 if enabled else 0, now)
        )

    return {
        "id": provider_id,
        "name": name,
        "base_url": base_url,
        "enabled": enabled,
        "created_at": now
    }


def get_providers() -> list[dict]:
    """获取所有服务商"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, base_url, enabled, created_at FROM providers ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def get_provider(provider_id: str) -> Optional[dict]:
    """获取单个服务商（包含 api_key）"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM providers WHERE id = ?", (provider_id,)
        ).fetchone()
    return dict(row) if row else None


def update_provider(provider_id: str, name: str, base_url: str, api_key: Optional[str], enabled: bool) -> Optional[dict]:
    """更新服务商"""
    with get_db() as conn:
        if api_key:
            conn.execute(
                "UPDATE providers SET name = ?, base_url = ?, api_key = ?, enabled = ? WHERE id = ?",
                (name, base_url, api_key, 1 if enabled else 0, provider_id)
            )
        else:
            conn.execute(
                "UPDATE providers SET name = ?, base_url = ?, enabled = ? WHERE id = ?",
                (name, base_url, 1 if enabled else 0, provider_id)
            )

    # 返回不含 api_key 的结果
    provider = get_provider(provider_id)
    if provider:
        del provider["api_key"]
    return provider


def delete_provider(provider_id: str) -> bool:
    """删除服务商"""
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM providers WHERE id = ?", (provider_id,))
    return cursor.rowcount > 0


# ==================== Memories ====================

def create_memory(content: str, source: str, source_topic_id: Optional[str] = None, source_message_id: Optional[str] = None) -> dict:
    """创建记忆"""
    memory_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            """INSERT INTO memories (id, content, source, source_topic_id, source_message_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (memory_id, content, source, source_topic_id, source_message_id, now)
        )

    return {
        "id": memory_id,
        "content": content,
        "source": source,
        "source_topic_id": source_topic_id,
        "source_message_id": source_message_id,
        "use_count": 0,
        "created_at": now,
        "last_used_at": None
    }


def get_memories(page: int = 1, page_size: int = 20, source: Optional[str] = None, exclude_raw_chat: bool = True) -> tuple[list[dict], int]:
    """获取记忆列表

    Args:
        page: 页码
        page_size: 每页数量
        source: 过滤来源（chat/manual）
        exclude_raw_chat: 是否排除原始对话记忆（memory_type='chat'），只保留提炼后的记忆
    """
    offset = (page - 1) * page_size

    # 构建过滤条件：排除原始对话记忆（memory_type='chat' 或为空的 source='chat' 记录）
    # 只保留：提炼后的记忆（memory_type in personal/preference/fact/plan）和手动添加的记忆
    if exclude_raw_chat:
        base_condition = "(source = 'manual' OR (source = 'chat' AND memory_type IS NOT NULL AND memory_type != 'chat'))"
    else:
        base_condition = "1=1"

    with get_db() as conn:
        if source:
            where_clause = f"{base_condition} AND source = ?"
            rows = conn.execute(
                f"""SELECT * FROM memories WHERE {where_clause}
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?""",
                (source, page_size, offset)
            ).fetchall()
            total = conn.execute(
                f"SELECT COUNT(*) as count FROM memories WHERE {where_clause}", (source,)
            ).fetchone()["count"]
        else:
            rows = conn.execute(
                f"""SELECT * FROM memories WHERE {base_condition}
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?""",
                (page_size, offset)
            ).fetchall()
            total = conn.execute(f"SELECT COUNT(*) as count FROM memories WHERE {base_condition}").fetchone()["count"]

    return [dict(row) for row in rows], total


def get_memory(memory_id: str) -> Optional[dict]:
    """获取单个记忆"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
    return dict(row) if row else None


def get_memory_usage(memory_id: str) -> list[dict]:
    """获取记忆的使用记录"""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT mu.used_at, t.id as topic_id, t.title as topic_title, mu.message_id
               FROM memory_usage mu
               JOIN topics t ON mu.topic_id = t.id
               WHERE mu.memory_id = ?
               ORDER BY mu.used_at DESC""",
            (memory_id,)
        ).fetchall()
    return [dict(row) for row in rows]


def update_memory(memory_id: str, content: str) -> Optional[dict]:
    """更新记忆内容"""
    with get_db() as conn:
        conn.execute(
            "UPDATE memories SET content = ? WHERE id = ?",
            (content, memory_id)
        )
    return get_memory(memory_id)


def delete_memory(memory_id: str) -> bool:
    """删除记忆"""
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    return cursor.rowcount > 0


def delete_all_memories() -> int:
    """删除所有记忆，返回删除的数量"""
    with get_db() as conn:
        # 先获取所有记忆ID（用于删除向量）
        rows = conn.execute("SELECT id FROM memories").fetchall()
        memory_ids = [row["id"] for row in rows]

        # 删除所有记忆
        cursor = conn.execute("DELETE FROM memories")
        count = cursor.rowcount

    return count, memory_ids


def record_memory_usage(memory_id: str, topic_id: str, message_id: str):
    """记录记忆使用"""
    usage_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        # 插入使用记录
        conn.execute(
            "INSERT INTO memory_usage (id, memory_id, topic_id, message_id, used_at) VALUES (?, ?, ?, ?, ?)",
            (usage_id, memory_id, topic_id, message_id, now)
        )
        # 更新统计
        conn.execute(
            "UPDATE memories SET use_count = use_count + 1, last_used_at = ? WHERE id = ?",
            (now, memory_id)
        )


# ==================== Settings ====================

def get_setting(key: str) -> Optional[str]:
    """获取配置"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ).fetchone()
    return row["value"] if row else None


def set_setting(key: str, value: str):
    """设置配置"""
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )


def get_all_settings() -> dict:
    """获取所有配置"""
    with get_db() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {row["key"]: row["value"] for row in rows}


# ==================== 记忆提炼相关 ====================

def update_topic_active_time(topic_id: str):
    """更新话题的活跃时间"""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE topics SET last_active_at = ?, updated_at = ? WHERE id = ?",
            (now, now, topic_id)
        )


def find_topics_need_processing(threshold_iso: str) -> list[dict]:
    """
    查找需要提炼记忆的话题
    条件：
    1. last_active_at < threshold（静默超过阈值）
    2. last_active_at > memory_processed_at 或 memory_processed_at 为空（有新消息）
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT * FROM topics
            WHERE last_active_at IS NOT NULL
              AND last_active_at < ?
              AND (memory_processed_at IS NULL OR last_active_at > memory_processed_at)
        """, (threshold_iso,)).fetchall()
    return [dict(row) for row in rows]


def get_unprocessed_messages(topic: dict) -> list[dict]:
    """获取话题中未处理的消息"""
    last_processed_id = topic.get("last_processed_message_id")

    with get_db() as conn:
        if last_processed_id:
            # 获取该消息之后的所有消息
            rows = conn.execute("""
                SELECT * FROM messages
                WHERE topic_id = ?
                  AND created_at > (SELECT created_at FROM messages WHERE id = ?)
                ORDER BY created_at ASC
            """, (topic["id"], last_processed_id)).fetchall()
        else:
            # 获取话题所有消息
            rows = conn.execute("""
                SELECT * FROM messages
                WHERE topic_id = ?
                ORDER BY created_at ASC
            """, (topic["id"],)).fetchall()

    return [dict(row) for row in rows]


def get_context_messages(topic_id: str, last_processed_message_id: Optional[str], limit: int = 6) -> list[dict]:
    """获取上下文消息（用于理解新消息的背景）"""
    with get_db() as conn:
        if last_processed_message_id:
            # 获取上次处理位置之前的最近 N 条消息
            rows = conn.execute("""
                SELECT * FROM messages
                WHERE topic_id = ?
                  AND created_at <= (SELECT created_at FROM messages WHERE id = ?)
                ORDER BY created_at DESC
                LIMIT ?
            """, (topic_id, last_processed_message_id, limit)).fetchall()
        else:
            # 没有上次处理记录，返回空（所有消息都是新消息）
            return []

    # 反转顺序，按时间正序返回
    return [dict(row) for row in reversed(rows)]


def mark_topic_processed(topic_id: str, last_message_id: str):
    """标记话题记忆处理完成"""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute("""
            UPDATE topics
            SET memory_processed_at = ?, last_processed_message_id = ?
            WHERE id = ?
        """, (now, last_message_id, topic_id))


def create_extracted_memory(
    content: str,
    memory_type: str,
    source_topic_id: Optional[str] = None
) -> dict:
    """创建提炼的记忆"""
    memory_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            """INSERT INTO memories (id, content, source, source_topic_id, memory_type, created_at)
               VALUES (?, ?, 'chat', ?, ?, ?)""",
            (memory_id, content, source_topic_id, memory_type, now)
        )

    return {
        "id": memory_id,
        "content": content,
        "source": "chat",
        "source_topic_id": source_topic_id,
        "memory_type": memory_type,
        "use_count": 0,
        "created_at": now,
        "last_used_at": None
    }


def update_memory_content(memory_id: str, content: str) -> Optional[dict]:
    """更新记忆内容（用于记忆提炼的更新操作）"""
    with get_db() as conn:
        conn.execute(
            "UPDATE memories SET content = ? WHERE id = ?",
            (content, memory_id)
        )
    return get_memory(memory_id)
