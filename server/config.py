"""配置管理"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 项目路径
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# 加载 .env 文件
load_dotenv(BASE_DIR / ".env")

# 数据库路径
DATABASE_PATH = DATA_DIR / "chat.db"

# ChromaDB 路径
CHROMA_PATH = DATA_DIR / "chroma"

# 确保数据目录存在
DATA_DIR.mkdir(exist_ok=True)

# 服务器配置
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))

# 默认 Provider 配置（从 .env 读取）
DEFAULT_PROVIDER_NAME = os.getenv("DEFAULT_PROVIDER_NAME")
DEFAULT_PROVIDER_BASE_URL = os.getenv("DEFAULT_PROVIDER_BASE_URL")
DEFAULT_PROVIDER_API_KEY = os.getenv("DEFAULT_PROVIDER_API_KEY")

# 默认模型配置
DEFAULT_CHAT_MODEL = os.getenv("DEFAULT_CHAT_MODEL")
DEFAULT_EMBEDDING_MODEL = os.getenv("DEFAULT_EMBEDDING_MODEL")

# 记忆配置
DEFAULT_MEMORY_TOP_K = int(os.getenv("DEFAULT_MEMORY_TOP_K", "5"))

# 记忆提炼配置
DEFAULT_MEMORY_SILENT_MINUTES = int(os.getenv("DEFAULT_MEMORY_SILENT_MINUTES", "2"))
DEFAULT_MEMORY_EXTRACTION_ENABLED = os.getenv("DEFAULT_MEMORY_EXTRACTION_ENABLED", "true").lower() == "true"
DEFAULT_MEMORY_CONTEXT_MESSAGES = int(os.getenv("DEFAULT_MEMORY_CONTEXT_MESSAGES", "6"))

# 上下文消息限制
MAX_CONTEXT_MESSAGES = int(os.getenv("MAX_CONTEXT_MESSAGES", "100"))

# Flowmo 配置
FLOWMO_INTERVAL_MINUTES = int(os.getenv("FLOWMO_INTERVAL_MINUTES", "5"))
