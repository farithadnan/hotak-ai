"""Module to handle fastAPI server setup."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .utils.logger import setup_logger

logger = setup_logger(__name__)

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
        import os
        import sys
        
        # Fix Windows console encoding for emojis
        sys.stdout.reconfigure(encoding='utf-8')
        
        from .config.settings import (
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
            RETRIEVAL_K
        )

        # Set environment variables (MUST be before imports that use them)
        os.environ["ANONYMIZED_TELEMETRY"] = "False"  # Disable ChromaDB telemetry
        os.environ["USER_AGENT"] = "Hotak-AI/1.0"     # Suppress LangChain warning
        os.environ["LANGSMITH_TRACING"] = LANGSMITH_TRACING
        os.environ["LANGSMITH_API_KEY"] = LANGSMITH_API_KEY
        os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
        os.environ["LANGSMITH_PROJECT"] = LANGSMITH_PROJECT

        # Initialize models
        from .services.llm import initialize_models
        llm, embeddings = initialize_models()

        # Initialize vector store
        from .storage.vector_storage import initialize_vector_store
        vector_store = initialize_vector_store(embeddings)
        
        # Initialize RAG agent
        from .agents.rag_agent import create_rag_agent
        rag_agent = create_rag_agent(llm, vector_store)
        
        # Store in app.state
        app.state.llm = llm
        app.state.embeddings = embeddings
        app.state.vector_store = vector_store
        app.state.rag_agent = rag_agent
        
        logger.info("Hotak AI Server started successfully!")

    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise


@app.on_event("startup")
async def on_startup():
    await startup_event()


app.include_router(router)