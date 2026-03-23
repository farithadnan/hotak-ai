"""Module to handle fastAPI server setup."""

from pathlib import Path
import sys
import os

# Support running from inside app/ with: uvicorn server:app --reload
# by ensuring the project root is importable as a package root.
if __package__ in (None, ""):
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

import logging

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

# Set safe defaults as early as possible so downstream imports/tools see them.
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("USER_AGENT", "Hotak-AI/1.0")

# Suppress ChromaDB telemetry warnings caused by a posthog library version mismatch.
# The telemetry is already disabled via ANONYMIZED_TELEMETRY=False and Settings, but
# chromadb still tries to fire events, catches the posthog error, and logs it at WARNING.
logging.getLogger("chromadb.telemetry.product.posthog").setLevel(logging.ERROR)

_START_TIME = datetime.now(timezone.utc)

app = FastAPI(
    title="Hotak AI Server",
    description="API server for Hotak AI application.",
    version="1.0.0"
)

# Add CORS middleware
_cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
_cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add activity-log middleware (must come after CORS so CORS headers appear first)
from app.config.settings import JWT_SECRET_KEY, JWT_ALGORITHM  # noqa: E402
from app.middleware.activity import ActivityLogMiddleware        # noqa: E402
app.add_middleware(ActivityLogMiddleware, jwt_secret=JWT_SECRET_KEY, jwt_algorithm=JWT_ALGORITHM)

async def startup_event():
    """Actions to perform on server startup."""
    try:
        # Fix Windows console encoding for emojis
        sys.stdout.reconfigure(encoding='utf-8')

        from app.config.settings import (
            OPENAI_API_KEY,
            LANGSMITH_API_KEY,
            LANGSMITH_TRACING,
            LANGSMITH_PROJECT,
            LLM_MODEL,
            LLM_TEMPERATURE,
            LLM_MAX_TOKENS,
            EMBEDDING_MODEL,
            COLLECTION_NAME,
            PERSIST_DIRECTORY,
            CHUNK_SIZE,
            CHUNK_OVERLAP,
            RETRIEVAL_K,
        )
        from app.db import create_tables, SessionLocal
        create_tables()

        from app.services.llm import initialize_models
        from app.services.model_catalog import build_accessible_chat_models, get_ollama_models
        from app.storage.vector_storage import initialize_vector_store
        from app.agents.rag_agent import create_rag_agent

        # Set environment variables (MUST be before imports that use them)
        os.environ["ANONYMIZED_TELEMETRY"] = "False"  # Disable ChromaDB telemetry
        os.environ["USER_AGENT"] = "Hotak-AI/1.0"     # Suppress LangChain warning
        os.environ["LANGSMITH_TRACING"] = LANGSMITH_TRACING
        os.environ["LANGSMITH_API_KEY"] = LANGSMITH_API_KEY
        os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
        os.environ["LANGSMITH_PROJECT"] = LANGSMITH_PROJECT

        llm, embeddings = initialize_models()

        vector_store = initialize_vector_store(embeddings)

        rag_agent = create_rag_agent(llm, vector_store)

        from app.services.provider_settings import get_effective_openai_key, get_effective_ollama_url
        openai_models = await build_accessible_chat_models(get_effective_openai_key())
        ollama_models = await get_ollama_models(get_effective_ollama_url())
        accessible_models = openai_models + ollama_models

        # Initialize model settings (enables all if no settings file yet)
        from app.services.model_settings import initialize_model_settings
        accessible_ids = [m["id"] for m in accessible_models]
        initialize_model_settings(accessible_ids)

        # Bootstrap first admin user if no users exist yet
        from app.config.settings import (
            ADMIN_BOOTSTRAP_USERNAME,
            ADMIN_BOOTSTRAP_PASSWORD,
            ADMIN_BOOTSTRAP_EMAIL,
        )
        from app.models.user import UserDB
        from app.services.auth import hash_password
        db = SessionLocal()
        try:
            if not db.query(UserDB).first():
                if ADMIN_BOOTSTRAP_PASSWORD:
                    admin = UserDB(
                        username=ADMIN_BOOTSTRAP_USERNAME,
                        email=ADMIN_BOOTSTRAP_EMAIL,
                        hashed_password=hash_password(ADMIN_BOOTSTRAP_PASSWORD),
                        role="admin",
                    )
                    db.add(admin)
                    db.commit()
                    logger.info("Bootstrap admin user created: %s", ADMIN_BOOTSTRAP_USERNAME)
                else:
                    logger.warning(
                        "No users exist and ADMIN_BOOTSTRAP_PASSWORD is not set. "
                        "Set it in .env to create the first admin account."
                    )
        finally:
            db.close()

        # Store in app.state
        app.state.llm = llm
        app.state.embeddings = embeddings
        app.state.vector_store = vector_store
        app.state.rag_agent = rag_agent
        app.state.accessible_models = accessible_models

        logger.info("Hotak AI Server started successfully!")

    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise


@app.on_event("startup")
async def on_startup():
    await startup_event()


@app.get("/health", tags=["system"])
async def health_check():
    """Return service health status including DB, vector store, and Ollama reachability."""
    import httpx
    from sqlalchemy import text as sa_text
    from app.db import engine

    # Database
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(sa_text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Vector store
    vs_ok = getattr(app.state, "vector_store", None) is not None

    # Ollama
    ollama_ok = False
    try:
        from app.services.provider_settings import get_effective_ollama_url
        url = get_effective_ollama_url()
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{url.rstrip('/')}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass

    uptime_seconds = int((datetime.now(timezone.utc) - _START_TIME).total_seconds())

    status = "ok" if (db_ok and vs_ok) else "degraded"
    return {
        "status": status,
        "version": app.version,
        "uptime_seconds": uptime_seconds,
        "checks": {
            "database": "ok" if db_ok else "error",
            "vector_store": "ok" if vs_ok else "error",
            "ollama": "ok" if ollama_ok else "unreachable",
        },
    }


app.include_router(router)