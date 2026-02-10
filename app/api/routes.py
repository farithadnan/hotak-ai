"""FastAPI routes and endpoints."""

from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from models.template import TemplateCreate, TemplateUpdate, Template
from agents.rag_agent import validate_and_format_response
from storage.vector_storage import (
    filter_uncached_sources,
    add_documents_to_store,
    get_all_stored_sources
)
from loaders.document_loader import load_documents
from utils.text_splitter import split_documents
from utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# ============================================================
# Template Management Endpoints
# ============================================================

@router.post("/templates", status_code=201)
async def create_template_endpoint(template_data: TemplateCreate):
    """
    Create a new knowledge template.

    A template is a reusable "brain" that contains:
    - Documents/sources to search
    - Custom settings (model, temperature, prompt, etc.)
    """
    try:
        from storage.template_storage import create_template

        logger.info(f"Creating template: {template_data.name}")
        template = create_template(template_data)
        logger.info(f"Template created successfully: {template.id}")

        return template

    except ValueError as e:
        logger.error(f"Validation error creating template: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates", response_model=list[Template])
async def list_templates_endpoint():
    """Get all knowledge templates."""
    try:
        from storage.template_storage import get_all_templates

        logger.info("Listing all templates")
        templates = get_all_templates()

        return templates

    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_id}")
async def get_template_endpoint(template_id: str):
    """Get a specific template by ID."""
    try:
        from storage.template_storage import get_template

        logger.info(f"Getting template: {template_id}")
        template = get_template(template_id)

        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        return template

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/templates/{template_id}")
async def update_template_endpoint(template_id: str, update_data: TemplateUpdate):
    """Update an existing template. Only provided fields are updated."""
    try:
        from storage.template_storage import update_template

        logger.info(f"Updating template: {template_id}")
        template = update_template(template_id, update_data)

        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        logger.info(f"Template updated successfully: {template_id}")
        return template

    except ValueError as e:
        logger.error(f"Validation error updating template: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/templates/{template_id}")
async def delete_template_endpoint(template_id: str):
    """Delete a template by ID. This is permanent."""
    try:
        from storage.template_storage import delete_template

        logger.info(f"Deleting template: {template_id}")
        deleted = delete_template(template_id)

        if not deleted:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        logger.info(f"Template deleted successfully: {template_id}")
        return {"message": "Template deleted successfully", "id": template_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Query Endpoints
# ============================================================

class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str


@router.post("/query")
async def query_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle user queries."""
    try:
        logger.info(f"Processing query: {request.question}")

        response = http_request.app.state.rag_agent.invoke(
            {"messages": [{"role": "user", "content": request.question}]}
        )

        final_message = response["messages"][-1]

        full_response = ""
        if hasattr(final_message, "content"):
            content = final_message.content
            if isinstance(content, str):
                full_response = content

        top_docs = http_request.app.state.vector_store.similarity_search(request.question, k=5)

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


@router.post("/query/stream")
async def query_stream_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle streaming user queries."""
    try:
        logger.info(f"Processing streaming query: {request.question}")

        async def event_generator():
            async for event in http_request.app.state.rag_agent.stream(
                {"messages": [{"role": "user", "content": request.question}]},
                stream_mode="values",
            ):
                last_message = event["messages"][-1]
                if hasattr(last_message, "content"):
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


@router.post("/documents/load")
async def load_documents_endpoint(request: DocumentLoadRequest, http_request: Request):
    """Endpoint to load documents from URLs or file paths."""
    try:
        logger.info(f"Received request to load {len(request.sources)} source(s)")

        cached_sources, uncached_sources = filter_uncached_sources(
            http_request.app.state.vector_store,
            request.sources
        )

        if cached_sources:
            logger.info(f"[CACHED] {len(cached_sources)} source(s) already in vector store.")
            for cached in cached_sources:
                logger.info(f"  - {cached}")

        if not uncached_sources:
            logger.info("All sources already cached.")
            return {
                "status": "success",
                "message": "All sources already cached",
                "cached_sources": len(cached_sources)
            }

        logger.info(f"Processing {len(uncached_sources)} new source(s)...")
        docs = load_documents(uncached_sources)

        if not docs:
            logger.warning("No documents loaded from uncached sources.")
            return {
                "status": "warning",
                "message": "No documents could be loaded from the provided sources",
                "cached_sources": len(cached_sources)
            }

        all_splits = split_documents(docs)
        add_documents_to_store(http_request.app.state.vector_store, all_splits)

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


@router.get("/documents")
async def list_documents_endpoint(http_request: Request):
    """Endpoint to list all documents in the vector store."""
    try:
        logger.info("Listing all documents in vector store...")

        source_counts = get_all_stored_sources(http_request.app.state.vector_store)

        return {
            "total_sources": len(source_counts),
            "total_chunks": sum(source_counts.values()),
            "sources": source_counts
        }

    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))
