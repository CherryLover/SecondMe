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
    if "is_flowmo" not in topic_columns:
        cursor.execute("ALTER TABLE topics ADD COLUMN is_flowmo INTEGER DEFAULT 0")

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
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP,
                memory_processed_at TIMESTAMP,
                last_processed_message_id TEXT,
                is_flowmo INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL CHECK(source IN ('chat', 'manual')),
                source_topic_id TEXT,
                source_message_id TEXT,
                use_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                memory_type TEXT DEFAULT 'chat',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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

        # 创建用户表（需要在其他表之前创建，因为其他表依赖它）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP
            )
        """)

        # 创建邀请码表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invite_codes (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                max_uses INTEGER DEFAULT 1,
                used_count INTEGER DEFAULT 0,
                created_by TEXT NOT NULL,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)

        # 创建邀请码使用记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invite_code_usage (
                id TEXT PRIMARY KEY,
                invite_code_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # 创建 Flowmo 表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flowmos (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL CHECK(source IN ('chat', 'direct')),
                topic_id TEXT,
                message_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
            )
        """)

        # 创建 TODO 表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                parent_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
                priority INTEGER DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
                group_name TEXT,
                deadline TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
            )
        """)

        # 创建 API Tokens 表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 数据库迁移：为已有表添加新字段
        _migrate_database(cursor)

        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_updated_at ON topics(updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_user_updated ON topics(user_id, updated_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_topic_id ON messages(topic_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(topic_id, created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_use_count ON memories(use_count DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_last_used ON memories(last_used_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_usage_memory_id ON memory_usage(memory_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memory_usage_topic_id ON memory_usage(topic_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flowmos_created_at ON flowmos(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flowmos_user_id ON flowmos(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_user_status ON todos(user_id, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_todos_deadline ON todos(deadline) WHERE deadline IS NOT NULL")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id)")


# ==================== Topics ====================

def create_topic(user_id: str, title: str = "新话题") -> dict:
    """创建话题"""
    topic_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO topics (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (topic_id, user_id, title, now, now)
        )

    return {
        "id": topic_id,
        "user_id": user_id,
        "title": title,
        "created_at": now,
        "updated_at": now
    }


def get_topics(user_id: str) -> list[dict]:
    """获取用户的所有话题"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM topics WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,)
        ).fetchall()
    return [dict(row) for row in rows]


def get_topic(topic_id: str) -> Optional[dict]:
    """获取单个话题"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM topics WHERE id = ?", (topic_id,)
        ).fetchone()
    return dict(row) if row else None


def verify_topic_owner(topic_id: str, user_id: str) -> bool:
    """验证话题是否属于指定用户"""
    topic = get_topic(topic_id)
    return topic is not None and topic.get("user_id") == user_id


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

def create_memory(user_id: str, content: str, source: str, source_topic_id: Optional[str] = None, source_message_id: Optional[str] = None) -> dict:
    """创建记忆"""
    memory_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            """INSERT INTO memories (id, user_id, content, source, source_topic_id, source_message_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (memory_id, user_id, content, source, source_topic_id, source_message_id, now)
        )

    return {
        "id": memory_id,
        "user_id": user_id,
        "content": content,
        "source": source,
        "source_topic_id": source_topic_id,
        "source_message_id": source_message_id,
        "use_count": 0,
        "created_at": now,
        "last_used_at": None
    }


def get_memories(user_id: str, page: int = 1, page_size: int = 20, source: Optional[str] = None, exclude_raw_chat: bool = True) -> tuple[list[dict], int]:
    """获取用户的记忆列表

    Args:
        user_id: 用户ID
        page: 页码
        page_size: 每页数量
        source: 过滤来源（chat/manual）
        exclude_raw_chat: 是否排除原始对话记忆（memory_type='chat'），只保留提炼后的记忆
    """
    offset = (page - 1) * page_size

    # 构建过滤条件：排除原始对话记忆（memory_type='chat' 或为空的 source='chat' 记录）
    # 只保留：提炼后的记忆（memory_type in personal/preference/fact/plan）和手动添加的记忆
    if exclude_raw_chat:
        base_condition = "user_id = ? AND (source = 'manual' OR (source = 'chat' AND memory_type IS NOT NULL AND memory_type != 'chat'))"
    else:
        base_condition = "user_id = ?"

    with get_db() as conn:
        if source:
            where_clause = f"{base_condition} AND source = ?"
            rows = conn.execute(
                f"""SELECT * FROM memories WHERE {where_clause}
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?""",
                (user_id, source, page_size, offset)
            ).fetchall()
            total = conn.execute(
                f"SELECT COUNT(*) as count FROM memories WHERE {where_clause}", (user_id, source)
            ).fetchone()["count"]
        else:
            rows = conn.execute(
                f"""SELECT * FROM memories WHERE {base_condition}
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?""",
                (user_id, page_size, offset)
            ).fetchall()
            total = conn.execute(
                f"SELECT COUNT(*) as count FROM memories WHERE {base_condition}", (user_id,)
            ).fetchone()["count"]

    return [dict(row) for row in rows], total


def get_memory(memory_id: str) -> Optional[dict]:
    """获取单个记忆"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
    return dict(row) if row else None


def verify_memory_owner(memory_id: str, user_id: str) -> bool:
    """验证记忆是否属于指定用户"""
    mem = get_memory(memory_id)
    return mem is not None and mem.get("user_id") == user_id


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


# ==================== Users ====================

def create_user(username: str, password_hash: str, role: str = "user") -> dict:
    """创建用户"""
    user_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, username, password_hash, role, now)
        )

    return {
        "id": user_id,
        "username": username,
        "role": role,
        "created_at": now,
        "last_login_at": None
    }


def get_user_by_username(username: str) -> Optional[dict]:
    """通过用户名获取用户"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
    return dict(row) if row else None


def get_user(user_id: str) -> Optional[dict]:
    """获取用户"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def update_user_login_time(user_id: str):
    """更新登录时间"""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET last_login_at = ? WHERE id = ?",
            (now, user_id)
        )


def get_users(page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
    """获取用户列表"""
    offset = (page - 1) * page_size

    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, username, role, created_at, last_login_at FROM users
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?""",
            (page_size, offset)
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()["count"]

    return [dict(row) for row in rows], total


def delete_user(user_id: str) -> bool:
    """删除用户"""
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return cursor.rowcount > 0


def update_user_password(user_id: str, password_hash: str) -> bool:
    """更新用户密码"""
    with get_db() as conn:
        cursor = conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id)
        )
    return cursor.rowcount > 0


def get_user_count() -> int:
    """获取用户总数"""
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()
    return row["count"] if row else 0


# ==================== Invite Codes ====================

def create_invite_code(code: str, created_by: str, max_uses: int = 1, expires_at: Optional[str] = None) -> dict:
    """创建邀请码"""
    code_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            """INSERT INTO invite_codes (id, code, max_uses, created_by, expires_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (code_id, code, max_uses, created_by, expires_at, now)
        )

    return {
        "id": code_id,
        "code": code,
        "max_uses": max_uses,
        "used_count": 0,
        "expires_at": expires_at,
        "created_at": now
    }


def get_invite_code_by_code(code: str) -> Optional[dict]:
    """通过邀请码获取记录"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM invite_codes WHERE code = ?", (code,)
        ).fetchone()
    return dict(row) if row else None


def get_invite_codes() -> list[dict]:
    """获取所有邀请码"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM invite_codes ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def use_invite_code(code_id: str, user_id: str) -> bool:
    """使用邀请码"""
    usage_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        # 记录使用
        conn.execute(
            "INSERT INTO invite_code_usage (id, invite_code_id, user_id, used_at) VALUES (?, ?, ?, ?)",
            (usage_id, code_id, user_id, now)
        )
        # 增加使用次数
        conn.execute(
            "UPDATE invite_codes SET used_count = used_count + 1 WHERE id = ?",
            (code_id,)
        )
    return True


def delete_invite_code(code_id: str) -> bool:
    """删除邀请码"""
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM invite_codes WHERE id = ?", (code_id,))
    return cursor.rowcount > 0


def is_invite_code_valid(code: str) -> bool:
    """检查邀请码是否有效"""
    invite = get_invite_code_by_code(code)
    if not invite:
        return False

    # 检查使用次数（0 表示无限制）
    if invite["max_uses"] > 0 and invite["used_count"] >= invite["max_uses"]:
        return False

    # 检查过期时间
    if invite["expires_at"]:
        expires_at = datetime.fromisoformat(invite["expires_at"])
        if datetime.now() > expires_at:
            return False

    return True


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
    user_id: str,
    content: str,
    memory_type: str,
    source_topic_id: Optional[str] = None
) -> dict:
    """创建提炼的记忆"""
    memory_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            """INSERT INTO memories (id, user_id, content, source, source_topic_id, memory_type, created_at)
               VALUES (?, ?, ?, 'chat', ?, ?, ?)""",
            (memory_id, user_id, content, source_topic_id, memory_type, now)
        )

    return {
        "id": memory_id,
        "user_id": user_id,
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


# ==================== Flowmo ====================

def get_or_create_flowmo_topic(user_id: str) -> dict:
    """获取或创建用户的 Flowmo 话题"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM topics WHERE user_id = ? AND is_flowmo = 1",
            (user_id,)
        ).fetchone()

        if row:
            return dict(row)

        # 创建新的 Flowmo 话题
        topic_id = str(uuid4())
        now = datetime.now().isoformat()
        conn.execute(
            "INSERT INTO topics (id, user_id, title, created_at, updated_at, is_flowmo) VALUES (?, ?, ?, ?, ?, 1)",
            (topic_id, user_id, "Flowmo", now, now)
        )

    return {
        "id": topic_id,
        "user_id": user_id,
        "title": "Flowmo",
        "created_at": now,
        "updated_at": now,
        "is_flowmo": 1
    }


def get_last_message_time(topic_id: str) -> Optional[str]:
    """获取话题最后一条消息的时间"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT created_at FROM messages WHERE topic_id = ? ORDER BY created_at DESC LIMIT 1",
            (topic_id,)
        ).fetchone()
    return row["created_at"] if row else None


def get_messages_since(topic_id: str, since_time: str) -> list[dict]:
    """获取指定时间之后的消息"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE topic_id = ? AND created_at > ? ORDER BY created_at ASC",
            (topic_id, since_time)
        ).fetchall()
    return [dict(row) for row in rows]


def create_flowmo(user_id: str, content: str, source: str, topic_id: Optional[str] = None, message_id: Optional[str] = None) -> dict:
    """创建 Flowmo 记录"""
    flowmo_id = str(uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO flowmos (id, user_id, content, source, topic_id, message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (flowmo_id, user_id, content, source, topic_id, message_id, now)
        )

    return {
        "id": flowmo_id,
        "user_id": user_id,
        "content": content,
        "source": source,
        "topic_id": topic_id,
        "message_id": message_id,
        "created_at": now
    }


def get_flowmos(user_id: str, page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
    """获取用户的 Flowmo 列表（分页）"""
    offset = (page - 1) * page_size

    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM flowmos WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (user_id, page_size, offset)
        ).fetchall()
        total = conn.execute(
            "SELECT COUNT(*) as count FROM flowmos WHERE user_id = ?", (user_id,)
        ).fetchone()["count"]

    return [dict(row) for row in rows], total


def get_flowmo(flowmo_id: str) -> Optional[dict]:
    """获取单个 Flowmo"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM flowmos WHERE id = ?", (flowmo_id,)
        ).fetchone()
    return dict(row) if row else None


def verify_flowmo_owner(flowmo_id: str, user_id: str) -> bool:
    """验证 Flowmo 是否属于指定用户"""
    flowmo = get_flowmo(flowmo_id)
    return flowmo is not None and flowmo.get("user_id") == user_id


def delete_flowmo(flowmo_id: str) -> bool:
    """删除 Flowmo"""
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM flowmos WHERE id = ?", (flowmo_id,))
    return cursor.rowcount > 0


def delete_all_flowmos(user_id: str) -> tuple[int, list[str]]:
    """删除用户的所有 Flowmo，返回删除的数量和ID列表"""
    with get_db() as conn:
        rows = conn.execute("SELECT id FROM flowmos WHERE user_id = ?", (user_id,)).fetchall()
        flowmo_ids = [row["id"] for row in rows]
        cursor = conn.execute("DELETE FROM flowmos WHERE user_id = ?", (user_id,))
        count = cursor.rowcount

    return count, flowmo_ids


def get_latest_flowmo_time(topic_id: str) -> Optional[str]:
    """获取话题中最新 Flowmo 记录的时间（用于判断是否是新的 Flowmo）"""
    with get_db() as conn:
        row = conn.execute(
            """SELECT f.created_at FROM flowmos f
               WHERE f.topic_id = ?
               ORDER BY f.created_at DESC LIMIT 1""",
            (topic_id,)
        ).fetchone()
    return row["created_at"] if row else None


# ==================== TODOs ====================

def create_todo(
    user_id: str,
    title: str,
    description: Optional[str] = None,
    priority: int = 3,
    group_name: Optional[str] = None,
    deadline: Optional[str] = None,
    parent_id: Optional[str] = None
) -> dict:
    """创建任务"""
    todo_id = str(uuid4())
    now = datetime.now().isoformat()

    # 验证优先级范围
    if not (1 <= priority <= 5):
        priority = 3

    with get_db() as conn:
        conn.execute(
            """INSERT INTO todos (id, user_id, parent_id, title, description, priority, group_name, deadline, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (todo_id, user_id, parent_id, title, description, priority, group_name, deadline, now, now)
        )

    return {
        "id": todo_id,
        "user_id": user_id,
        "parent_id": parent_id,
        "title": title,
        "description": description,
        "status": "pending",
        "priority": priority,
        "group_name": group_name,
        "deadline": deadline,
        "completed_at": None,
        "created_at": now,
        "updated_at": now
    }


def get_todo(todo_id: str) -> Optional[dict]:
    """获取单个任务"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM todos WHERE id = ?", (todo_id,)
        ).fetchone()
    return dict(row) if row else None


def verify_todo_owner(todo_id: str, user_id: str) -> bool:
    """验证任务是否属于指定用户"""
    todo = get_todo(todo_id)
    return todo is not None and todo.get("user_id") == user_id


def get_todos(
    user_id: str,
    status: Optional[str] = None,
    group: Optional[str] = None,
    parent_id: Optional[str] = None,
    include_children: bool = True
) -> list[dict]:
    """获取任务列表

    Args:
        user_id: 用户ID
        status: 筛选状态
        group: 筛选分组
        parent_id: 筛选父任务（None 表示只返回顶层任务）
        include_children: 是否包含子任务
    """
    with get_db() as conn:
        # 构建查询条件
        conditions = ["user_id = ?"]
        params = [user_id]

        if status:
            conditions.append("status = ?")
            params.append(status)

        if group:
            conditions.append("group_name = ?")
            params.append(group)

        # parent_id 为 None 时，只返回顶层任务
        if parent_id is None:
            conditions.append("parent_id IS NULL")
        elif parent_id:  # 如果指定了 parent_id，筛选子任务
            conditions.append("parent_id = ?")
            params.append(parent_id)

        where_clause = " AND ".join(conditions)

        rows = conn.execute(
            f"SELECT * FROM todos WHERE {where_clause} ORDER BY priority DESC, created_at ASC",
            params
        ).fetchall()

    todos = [dict(row) for row in rows]

    # 如果包含子任务，递归获取
    if include_children:
        for todo in todos:
            todo["children"] = _get_todo_children(todo["id"])
    else:
        for todo in todos:
            todo["children"] = []

    return todos


def _get_todo_children(parent_id: str) -> list[dict]:
    """递归获取子任务"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM todos WHERE parent_id = ? ORDER BY priority DESC, created_at ASC",
            (parent_id,)
        ).fetchall()

    children = []
    for row in rows:
        child = dict(row)
        # 递归获取子子任务（虽然限制只有 2 层，但代码支持递归）
        child["children"] = _get_todo_children(child["id"])
        children.append(child)

    return children


def update_todo(
    todo_id: str,
    user_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[int] = None,
    group_name: Optional[str] = None,
    deadline: Optional[str] = None,
    parent_id: Optional[str] = None
) -> Optional[dict]:
    """更新任务

    特殊逻辑：
    1. 如果状态变为 completed，设置 completed_at 并完成所有子任务
    2. 如果 parent_id 变化，验证层级限制
    """
    # 验证所有权
    if not verify_todo_owner(todo_id, user_id):
        return None

    todo = get_todo(todo_id)
    if not todo:
        return None

    now = datetime.now().isoformat()
    updates = {"updated_at": now}

    # 更新字段
    if title is not None:
        updates["title"] = title
    if description is not None:
        updates["description"] = description
    if priority is not None:
        if 1 <= priority <= 5:
            updates["priority"] = priority
    if group_name is not None:
        updates["group_name"] = group_name
    if deadline is not None:
        updates["deadline"] = deadline

    # 处理状态变化
    if status is not None and status != todo["status"]:
        updates["status"] = status
        # 如果从非完成状态变为完成状态
        if status == "completed" and todo["status"] != "completed":
            updates["completed_at"] = now
            # 完成所有子任务
            _complete_todo_children(todo_id)
        # 如果从完成状态变为其他状态，清除完成时间
        elif status != "completed":
            updates["completed_at"] = None

    # 处理 parent_id 变化
    if parent_id is not None and parent_id != todo.get("parent_id"):
        # 检查是否有子任务（有子任务不能转为子任务）
        if _has_children(todo_id):
            raise ValueError("该任务有子任务，不能转为子任务")

        # 如果设置了新的 parent_id，验证新父任务是否已有父任务
        if parent_id:
            parent_todo = get_todo(parent_id)
            if not parent_todo:
                raise ValueError("父任务不存在")
            if parent_todo.get("parent_id"):
                raise ValueError("父任务已经是子任务，不能超过 2 层嵌套")

        updates["parent_id"] = parent_id

    # 执行更新
    set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
    values = list(updates.values()) + [todo_id]

    with get_db() as conn:
        conn.execute(
            f"UPDATE todos SET {set_clause} WHERE id = ?",
            values
        )

    return get_todo(todo_id)


def _has_children(todo_id: str) -> bool:
    """检查任务是否有子任务"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as count FROM todos WHERE parent_id = ?",
            (todo_id,)
        ).fetchone()
    return row["count"] > 0


def _complete_todo_children(parent_id: str):
    """递归完成所有子任务"""
    now = datetime.now().isoformat()

    with get_db() as conn:
        # 获取所有子任务
        rows = conn.execute(
            "SELECT id FROM todos WHERE parent_id = ?",
            (parent_id,)
        ).fetchall()

        for row in rows:
            child_id = row["id"]
            # 更新子任务状态
            conn.execute(
                "UPDATE todos SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
                (now, now, child_id)
            )
            # 递归完成子子任务
            _complete_todo_children(child_id)


def batch_update_todos(todo_ids: list[str], user_id: str, status: str) -> int:
    """批量更新任务状态

    Returns:
        更新的任务数量
    """
    if not todo_ids:
        return 0

    now = datetime.now().isoformat()
    count = 0

    for todo_id in todo_ids:
        if verify_todo_owner(todo_id, user_id):
            todo = get_todo(todo_id)
            if todo:
                with get_db() as conn:
                    if status == "completed":
                        conn.execute(
                            "UPDATE todos SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
                            (status, now, now, todo_id)
                        )
                        # 完成所有子任务
                        _complete_todo_children(todo_id)
                    else:
                        conn.execute(
                            "UPDATE todos SET status = ?, updated_at = ? WHERE id = ?",
                            (status, now, todo_id)
                        )
                count += 1

    return count


def delete_todo(todo_id: str, user_id: str) -> bool:
    """删除任务（级联删除所有子任务）"""
    # 验证所有权
    if not verify_todo_owner(todo_id, user_id):
        return False

    with get_db() as conn:
        cursor = conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    return cursor.rowcount > 0


def get_todo_groups(user_id: str) -> list[dict]:
    """获取用户的任务分组列表"""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT group_name, COUNT(*) as count
               FROM todos
               WHERE user_id = ? AND group_name IS NOT NULL
               GROUP BY group_name
               ORDER BY count DESC, group_name ASC""",
            (user_id,)
        ).fetchall()
    return [{"name": row["group_name"], "count": row["count"]} for row in rows]


# ==================== API Tokens ====================

def create_api_token(user_id: str, name: str) -> dict:
    """创建 API Token

    Token 格式：smt_ + 32 字节随机字符串
    """
    import secrets

    token_id = str(uuid4())
    # 生成 Token：smt_ 前缀 + 32 字节随机字符串
    token = f"smt_{secrets.token_urlsafe(32)}"
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO api_tokens (id, user_id, name, token, created_at) VALUES (?, ?, ?, ?, ?)",
            (token_id, user_id, name, token, now)
        )

    return {
        "id": token_id,
        "user_id": user_id,
        "name": name,
        "token": token,  # 完整 Token，只在创建时返回
        "token_preview": f"{token[:10]}...{token[-4:]}",
        "created_at": now,
        "last_used_at": None
    }


def get_api_tokens(user_id: str) -> list[dict]:
    """获取用户的 API Token 列表"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()

    tokens = []
    for row in rows:
        token_dict = dict(row)
        # 生成预览版本（不返回完整 Token）
        full_token = token_dict["token"]
        token_dict["token_preview"] = f"{full_token[:10]}...{full_token[-4:]}"
        del token_dict["token"]  # 删除完整 Token
        tokens.append(token_dict)

    return tokens


def get_api_token_by_token(token: str) -> Optional[dict]:
    """通过 Token 字符串查询（用于认证）

    Returns:
        包含 user 信息的字典
    """
    with get_db() as conn:
        row = conn.execute(
            """SELECT t.*, u.id as user_id, u.username, u.role
               FROM api_tokens t
               JOIN users u ON t.user_id = u.id
               WHERE t.token = ?""",
            (token,)
        ).fetchone()

    if not row:
        return None

    return {
        "token_id": row["id"],
        "user": {
            "id": row["user_id"],
            "username": row["username"],
            "role": row["role"]
        }
    }


def delete_api_token(token_id: str, user_id: str) -> bool:
    """删除 API Token"""
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM api_tokens WHERE id = ? AND user_id = ?",
            (token_id, user_id)
        )
    return cursor.rowcount > 0


def update_token_last_used(token: str):
    """更新 Token 最后使用时间"""
    now = datetime.now().isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE api_tokens SET last_used_at = ? WHERE token = ?",
            (now, token)
        )
