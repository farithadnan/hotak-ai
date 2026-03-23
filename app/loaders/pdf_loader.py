"""Module to load PDF documents."""

from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from ..config.settings import UPLOADS_DIRECTORY
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

_ALLOWED_ROOT = UPLOADS_DIRECTORY.resolve()


def load_pdf_document(file_path: str) -> list:
    """
    Load a PDF document from the given file path.

    Args:
        file_path (str): The path to the PDF file to load.

    Returns:
        list: Loaded documents.
    """
    # Construct path from trusted root using only the filename component.
    safe_path = (_ALLOWED_ROOT / Path(file_path).name).resolve()
    if not safe_path.is_relative_to(_ALLOWED_ROOT):
        logger.warning("Blocked path traversal attempt in PDF loader: %s", file_path)
        raise ValueError("Access denied: file must be inside the uploads directory.")

    try:
        logger.info(f"Loading PDF document from: {safe_path}")

        # Load the PDF document
        loader = PyPDFLoader(str(safe_path))
        docs = loader.load()

        # IMPORTANT: Add source file path to metadata
        for doc in docs:
            doc.metadata["source"] = str(safe_path)
            doc.metadata["file_name"] = safe_path.name
            doc.metadata["source_type"] = "pdf"

        logger.info(f"Loaded {len(docs)} pages from PDF.")
        logger.info(f"Total characters: {sum(len(doc.page_content) for doc in docs)}")

        return docs
    except Exception as e:
        logger.error(f"Failed to load PDF document from {safe_path}: {e}")
        raise