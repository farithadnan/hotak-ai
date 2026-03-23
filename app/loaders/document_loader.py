"""
Unified document loader with automatic file type detection.

This module detects the document type (web URL, PDF, TXT, etc.) and routes
to the appropriate loader automatically.
"""

import os
from typing import List, Tuple
from langchain_core.documents import Document
from .web_loader import load_web_document
from .pdf_loader import load_pdf_document
from .txt_loader import load_txt_document
from .docx_loader import load_docx_document
from .md_loader import load_md_document

from ..config.settings import UPLOADS_DIRECTORY
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

# Trusted root — all file access must stay within this directory.
# Trailing sep ensures startswith() check won't match a sibling dir with a shared prefix.
_ALLOWED_ROOT = str(UPLOADS_DIRECTORY.resolve()) + os.sep


def load_document(source: str) -> List[Document]:
    """
    Load a document from any source (URL or file path).

    Automatically detects the source type and uses the appropriate loader:
    - URLs (http/https) → WebBaseLoader
    - .pdf files → PyPDFLoader
    - .txt files → Text file reader
    - .docx files → DOCX file reader
    - .md files → Markdown file reader

    Args:
        source: URL or file path to load
    Returns:
        List of LangChain Documents with content and metadata
    Raises:
        ValueError: If source type is unsupported
        FileNotFoundError: If file doesn't exist
        Exception: For loading errors
    """
    logger.info(f"Detecting document type: {source}")

    # Check if it's a URL
    if source.startswith("http://") or source.startswith("https://"):
        logger.info("Detected: Web URL")
        return load_web_document(source)

    # It's a file path — normalise and verify it stays inside the uploads directory.
    # Uses os.path.normpath + startswith — the pattern CodeQL recognises as safe.
    full_path = os.path.normpath(os.path.join(_ALLOWED_ROOT, os.path.basename(source)))
    if not full_path.startswith(_ALLOWED_ROOT):
        logger.warning("Blocked path traversal attempt: %s", source)
        raise ValueError("Access denied: file must be inside the uploads directory.")

    if not os.path.exists(full_path):
        logger.error("File not found: %s", full_path)
        raise FileNotFoundError(f"File does not exist: {full_path}")

    # Check file extension
    extension = os.path.splitext(full_path)[1].lower()

    if extension == ".pdf":
        logger.info("Detected: PDF file")
        return load_pdf_document(full_path)

    elif extension == ".txt":
        logger.info("Detected: TXT file")
        return load_txt_document(full_path)

    elif extension == ".docx":
        logger.info("Detected: DOCX file")
        return load_docx_document(full_path)

    elif extension == ".md":
        logger.info("Detected: Markdown file")
        return load_md_document(full_path)

    else:
        supported = [".pdf", ".txt", ".docx", ".md", "http://", "https://"]
        logger.error("Unsupported file type: %s", extension)
        raise ValueError(
            f"Unsupported file type: {extension}. "
            f"Supported types: {', '.join(supported)}"
        )


def load_documents(sources: List[str]) -> Tuple[List[Document], List[str]]:
    """
    Load documents from multiple sources (URLs or file paths).

    Args:
        sources: List of URLs or file paths to load

    Returns:
        Tuple of (documents, failed_sources)
    """
    all_docs: List[Document] = []
    failed_sources: List[str] = []

    for source in sources:
        try:
            docs = load_document(source)
            non_empty_docs = [
                doc for doc in docs
                if doc.page_content and doc.page_content.strip()
            ]

            if not non_empty_docs:
                failed_sources.append(source)
                logger.warning("Skipping source with empty extracted content: %s", source)
                continue

            all_docs.extend(non_empty_docs)
        except Exception as e:
            failed_sources.append(source)
            logger.error(f"Skipping source due to error: {source}. Error: {e}")
            continue

    logger.info(
        "Loaded total documents from batch: %s (failed: %s)",
        len(all_docs),
        len(failed_sources)
    )
    return all_docs, failed_sources
