"""Application settings and constants."""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

APP_NAME = "Hotak AI"
LOGS_DIRECTORY = "logs/"

# ==========================================
# SECRETS (from .env file)
# ==========================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY", "")
LANGSMITH_TRACING = os.getenv("LANGSMITH_TRACING", "true")
LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", APP_NAME)

# ==========================================
# LLM SETTINGS
# ==========================================
LLM_MODEL = "gpt-4o-mini"
LLM_TEMPERATURE = 0.2
LLM_MAX_TOKENS = 512

# ==========================================
# EMBEDDING SETTINGS
# ==========================================
EMBEDDING_MODEL = "text-embedding-3-small"

# ==========================================
# VECTOR STORE SETTINGS
# ==========================================
COLLECTION_NAME = "hotak_ai_collection"
PERSIST_DIRECTORY = "data/chroma_db/"

# ==========================================
# TEXT SPLITTING SETTINGS
# ==========================================
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# ==========================================
# RETRIEVAL SETTINGS
# ==========================================
RETRIEVAL_K = 5