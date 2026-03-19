"""Document-related API routes."""

from pathlib import Path
from uuid import uuid4
from pydantic import BaseModel
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from ..storage.vector_storage import (
    filter_uncached_sources,
    add_documents_to_store,
    get_all_stored_sources
)
from ..loaders.document_loader import load_documents
from ..utils.text_splitter import split_documents
from ..utils.logger import setup_logger
from ..config.settings import MAX_UPLOAD_FILE_SIZE_BYTES, UPLOADS_DIRECTORY

logger = setup_logger(__name__)
router = APIRouter()
ALLOWED_UPLOAD_SUFFIXES = {".pdf", ".txt", ".md", ".docx"}


class DocumentLoadRequest(BaseModel):
    """Request model for document load endpoint."""
    sources: list[str]


def _sanitize_filename(filename: str | None) -> str:
    if not filename:
        return f"upload-{uuid4().hex}.txt"
    base = Path(filename).name.strip()
    return base or f"upload-{uuid4().hex}.txt"


def _save_upload(file: UploadFile) -> tuple[Path | None, str | None]:
    safe_name = _sanitize_filename(file.filename)
    extension = Path(safe_name).suffix.lower()

    if extension not in ALLOWED_UPLOAD_SUFFIXES:
        return None, f"Unsupported file type: {extension or 'unknown'}"

    UPLOADS_DIRECTORY.mkdir(parents=True, exist_ok=True)
    target_path = (UPLOADS_DIRECTORY / safe_name).resolve()

    total_bytes = 0
    try:
        with open(target_path, "wb") as out_file:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_FILE_SIZE_BYTES:
                    out_file.close()
                    target_path.unlink(missing_ok=True)
                    return None, "File exceeds size limit"
                out_file.write(chunk)
    except Exception as exc:
        return None, str(exc)

    return target_path, None


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

        try:
            all_splits = split_documents(docs)
            add_documents_to_store(http_request.app.state.vector_store, all_splits)
        except ValueError as split_error:
            logger.warning("Document splitting failed, marking uncached sources as failed: %s", split_error)
            combined_failed = list(dict.fromkeys([*failed_sources, *loaded_sources]))
            return {
                "loaded": 0,
                "skipped": len(cached_sources),
                "cached_sources": cached_sources,
                "loaded_sources": [],
                "failed_sources": combined_failed
            }

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


@router.post("/documents/upload")
async def upload_documents_endpoint(http_request: Request, files: list[UploadFile] = File(...)):
    """Upload files, then ingest them into the vector store."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    uploaded_sources: list[str] = []
    failed_files: list[dict[str, str]] = []
    file_results: list[dict[str, str | None]] = []

    for file in files:
        try:
            stored_path, error = _save_upload(file)
            if error or stored_path is None:
                file_name = _sanitize_filename(file.filename)
                failed_files.append({
                    "file_name": file_name,
                    "error": error or "Failed to save file",
                })
                file_results.append({
                    "file_name": file_name,
                    "source": None,
                    "status": "failed_upload",
                    "error": error or "Failed to save file",
                })
                continue
            stored_source = str(stored_path)
            uploaded_sources.append(stored_source)
            file_results.append({
                "file_name": _sanitize_filename(file.filename),
                "source": stored_source,
                "status": "uploaded",
                "error": None,
            })
        finally:
            await file.close()

    if not uploaded_sources:
        return {
            "loaded": 0,
            "skipped": 0,
            "uploaded_sources": [],
            "cached_sources": [],
            "loaded_sources": [],
            "failed_sources": [],
            "failed_files": failed_files,
            "file_results": file_results,
        }

    cached_sources, uncached_sources = filter_uncached_sources(
        http_request.app.state.vector_store,
        uploaded_sources,
    )

    loaded_sources: list[str] = []
    failed_sources: list[str] = []

    if uncached_sources:
        docs, failed_sources = load_documents(uncached_sources)
        loaded_sources = [source for source in uncached_sources if source not in failed_sources]
        if docs:
            all_splits = split_documents(docs)
            add_documents_to_store(http_request.app.state.vector_store, all_splits)

    for item in file_results:
        source = item.get("source")
        if not source:
            continue
        if source in loaded_sources:
            item["status"] = "ingested"
        elif source in cached_sources:
            item["status"] = "cached"
        elif source in failed_sources:
            item["status"] = "failed_load"
            item["error"] = "Failed to parse document"

    return {
        "loaded": len(loaded_sources),
        "skipped": len(cached_sources),
        "uploaded_sources": uploaded_sources,
        "cached_sources": cached_sources,
        "loaded_sources": loaded_sources,
        "failed_sources": failed_sources,
        "failed_files": failed_files,
        "file_results": file_results,
    }
