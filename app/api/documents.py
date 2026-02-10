"""Document-related API routes."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request

from ..storage.vector_storage import (
    filter_uncached_sources,
    add_documents_to_store,
    get_all_stored_sources
)
from ..loaders.document_loader import load_documents
from ..utils.text_splitter import split_documents
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


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
                "loaded": 0,
                "skipped": len(cached_sources),
                "cached_sources": cached_sources,
                "loaded_sources": []
            }

        logger.info(f"Processing {len(uncached_sources)} new source(s)...")
        docs, failed_sources = load_documents(uncached_sources)
        loaded_sources = [
            source for source in uncached_sources
            if source not in failed_sources
        ]

        if not docs:
            logger.warning("No documents loaded from uncached sources.")
            return {
                "loaded": 0,
                "skipped": len(cached_sources),
                "cached_sources": cached_sources,
                "loaded_sources": [],
                "failed_sources": failed_sources
            }

        all_splits = split_documents(docs)
        add_documents_to_store(http_request.app.state.vector_store, all_splits)

        logger.info("Documents loaded and embedded successfully.")

        return {
            "loaded": len(loaded_sources),
            "skipped": len(cached_sources),
            "cached_sources": cached_sources,
            "loaded_sources": loaded_sources,
            "failed_sources": failed_sources
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
        sources = [
            {"source": source, "chunks": count}
            for source, count in source_counts.items()
        ]

        return {
            "total_sources": len(sources),
            "sources": sources
        }

    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))
