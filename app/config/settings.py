"""Application settings and constants."""

import os
from pathlib import Path
from dotenv import load_dotenv


def _get_int_env(name: str, default: int) -> int:
	value = os.getenv(name)
	if value is None:
		return default
	try:
		return int(value)
	except ValueError:
		return default

# Load environment variables from .env file
load_dotenv()

# Base paths - all data stored in app/ directory
APP_DIR = Path(__file__).parent.parent  # f:/dev/hotak-ai/app/
LOGS_DIRECTORY = APP_DIR / "logs"
DATA_DIRECTORY = APP_DIR / "data"

APP_NAME = "Hotak AI"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")  # DEBUG, INFO, WARNING, ERROR

# ==========================================
# SECRETS (from .env file)
# ==========================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY", "")
LANGSMITH_TRACING = os.getenv("LANGSMITH_TRACING", "true")
LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", APP_NAME)

# ==========================================
# LLM SETTINGS
# ==========================================
LLM_MODEL = "gpt-4o-mini"
LLM_TEMPERATURE = 0.2
LLM_MAX_TOKENS = _get_int_env("LLM_MAX_TOKENS", 4096)
STREAM_MAX_CHARS = _get_int_env("STREAM_MAX_CHARS", 32000)
CHAT_HISTORY_MAX_TOKENS = _get_int_env("CHAT_HISTORY_MAX_TOKENS", 2800)
CHAT_HISTORY_MAX_MESSAGE_TOKENS = _get_int_env("CHAT_HISTORY_MAX_MESSAGE_TOKENS", 700)
CHAT_HISTORY_MAX_MESSAGES = _get_int_env("CHAT_HISTORY_MAX_MESSAGES", 10)

# ==========================================
# EMBEDDING SETTINGS
# ==========================================
EMBEDDING_MODEL = "text-embedding-3-small"

# ==========================================
# VECTOR STORE SETTINGS
# ==========================================
COLLECTION_NAME = "hotak_ai_collection"
PERSIST_DIRECTORY = str(DATA_DIRECTORY / "chroma_db")  # Convert Path to string for ChromaDB

# ==========================================
# TEXT SPLITTING SETTINGS
# ==========================================
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# ==========================================
# SUMMARY MEMORY SETTINGS
# ==========================================
ENABLE_SUMMARY_MEMORY = os.getenv("ENABLE_SUMMARY_MEMORY", "true").lower() == "true"
SUMMARY_MAX_TOKENS = _get_int_env("SUMMARY_MAX_TOKENS", 200)

# ==========================================
# RETRIEVAL SETTINGS
# ==========================================
RETRIEVAL_K = _get_int_env("RETRIEVAL_K", 5)

# ==========================================
# DOCUMENT UPLOAD SETTINGS
# ==========================================
UPLOADS_DIRECTORY = DATA_DIRECTORY / "uploads"
MAX_UPLOAD_FILE_SIZE_BYTES = _get_int_env("MAX_UPLOAD_FILE_SIZE_BYTES", 10 * 1024 * 1024)

# ==========================================
# AUTH / JWT SETTINGS
# ==========================================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-secret-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = _get_int_env("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7)  # 7 days default

# ==========================================
# ADMIN BOOTSTRAP SETTINGS
# ==========================================
ADMIN_BOOTSTRAP_USERNAME = os.getenv("ADMIN_BOOTSTRAP_USERNAME", "admin")
ADMIN_BOOTSTRAP_PASSWORD = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "")
ADMIN_BOOTSTRAP_EMAIL = os.getenv("ADMIN_BOOTSTRAP_EMAIL", "admin@localhost")