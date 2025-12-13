"""SQLite 数据库操作"""
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Optional
from uuid import uuid4

from config import DATABASE_PATH


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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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


def get_memories(page: int = 1, page_size: int = 20, source: Optional[str] = None) -> tuple[list[dict], int]:
    """获取记忆列表"""
    offset = (page - 1) * page_size

    with get_db() as conn:
        if source:
            rows = conn.execute(
                """SELECT * FROM memories WHERE source = ?
                   ORDER BY use_count DESC, last_used_at DESC
                   LIMIT ? OFFSET ?""",
                (source, page_size, offset)
            ).fetchall()
            total = conn.execute(
                "SELECT COUNT(*) as count FROM memories WHERE source = ?", (source,)
            ).fetchone()["count"]
        else:
            rows = conn.execute(
                """SELECT * FROM memories
                   ORDER BY use_count DESC, last_used_at DESC
                   LIMIT ? OFFSET ?""",
                (page_size, offset)
            ).fetchall()
            total = conn.execute("SELECT COUNT(*) as count FROM memories").fetchone()["count"]

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
