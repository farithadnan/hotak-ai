"""Module to handle fastAPI server setup."""

from pydantic import BaseModel
from .utils.logger import setup_logger
from .agents.rag_agent import validate_and_format_response
from .storage.vector_storage import (
    filter_uncached_sources, 
    add_documents_to_store,
    get_all_stored_sources
)
from .loaders.document_loader import load_documents
from .utils.text_splitter import split_documents

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

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

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.on_event("startup")
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
        from .models.llm import initialize_models
        llm, embeddings = initialize_models()

        # Initialize vector store
        from .storage.vector_storage import (
            initialize_vector_store,
            filter_uncached_sources,
            add_documents_to_store,
        )
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



class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str


@app.post("/query")
async def query_endpoint(request: QueryRequest):
    """Endpoint to handle user queries."""
    try:
        logger.info(f"Processing query: {request.question}")
        
        # Invoke the RAG agent
        response = app.state.rag_agent.invoke(
            {"messages": [{"role": "user", "content": request.question}]}
        )
        
        # Extract final message
        final_message = response["messages"][-1]
        
        # Extract response text
        full_response = ""
        if hasattr(final_message, 'content'):
            content = final_message.content
            if isinstance(content, str):
                full_response = content
        
        # Validate citations against top retrieved docs
        top_docs = app.state.vector_store.similarity_search(request.question, k=5)
        
        validated_response = full_response
        citation_info = "No citations validated"
        
        if top_docs and full_response:
            validated_response, citation_info = validate_and_format_response(
                full_response, top_docs
            )
            logger.info(f"Citation check: {citation_info}")
        
        logger.info("Query processed successfully.")
        
        return {
            "answer": validated_response,
            "citation_info": citation_info
        }
        
    except Exception as e:
        logger.error(f"Agent failed to process query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/stream")
async def query_stream_endpoint(request: QueryRequest):
    """Endpoint to handle streaming user queries."""
    try:
        logger.info(f"Processing streaming query: {request.question}")
        
        # Stream response from RAG agent
        async def event_generator():
            async for event in app.state.rag_agent.stream(
                {"messages": [{"role": "user", "content": request.question}]},
                stream_mode="values",
            ):
                last_message = event["messages"][-1]
                if hasattr(last_message, 'content'):
                    content = last_message.content
                    if isinstance(content, str):
                        yield content
        
        return StreamingResponse(event_generator(), media_type="text/plain")
    
    except Exception as e:
        logger.error(f"Agent failed to process streaming query: {e}")
        raise HTTPException(status_code=500, detail=str(e))



class DocumentLoadRequest(BaseModel):
    """Request model for document load endpoint."""
    sources: list[str]

@app.post("/documents/load")
async def load_documents_endpoint(request: DocumentLoadRequest):
    """Endpoint to load documents from URLs or file paths."""
    try:
        logger.info(f"Received request to load {len(request.sources)} source(s)")
        
        # Get cached and uncached sources
        cached_sources, uncached_sources = filter_uncached_sources(
            app.state.vector_store, 
            request.sources
        )

        # Log cached sources
        if cached_sources:
            logger.info(f"[CACHED] {len(cached_sources)} source(s) already in vector store.")
            for cached in cached_sources:
                logger.info(f"  - {cached}")

        # Early return if all cached
        if not uncached_sources:
            logger.info("All sources already cached.")
            return {
                "status": "success",
                "message": "All sources already cached",
                "cached_sources": len(cached_sources)
            }

        # Process uncached sources
        logger.info(f"Processing {len(uncached_sources)} new source(s)...")
        docs = load_documents(uncached_sources)

        # Early return if no docs loaded
        if not docs:
            logger.warning("No documents loaded from uncached sources.")
            return {
                "status": "warning",
                "message": "No documents could be loaded from the provided sources",
                "cached_sources": len(cached_sources)
            }

        # Split and add to vector store
        all_splits = split_documents(docs)
        add_documents_to_store(app.state.vector_store, all_splits)
        
        logger.info("Documents loaded and embedded successfully.")
        
        return {
            "status": "success",
            "cached_sources": len(cached_sources),
            "new_sources_loaded": len(uncached_sources),
            "total_chunks_added": len(all_splits)
        }
        
    except Exception as e:
        logger.error(f"Failed to load documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents_endpoint():
    """Endpoint to list all documents in the vector store."""
    try:
        logger.info("Listing all documents in vector store...")
        
        # Get source counts from vector store
        source_counts = get_all_stored_sources(app.state.vector_store)
        
        # Return summary
        return {
            "total_sources": len(source_counts),
            "total_chunks": sum(source_counts.values()),
            "sources": source_counts
        }
        
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))