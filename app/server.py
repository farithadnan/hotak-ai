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

app = FastAPI(
    title="Hotak AI Server",
    description="API server for Hotak AI application.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        from app.services.model_catalog import build_accessible_chat_models
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

        accessible_models = await build_accessible_chat_models(OPENAI_API_KEY)

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


app.include_router(router)