"""Module to load docx documents."""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from ..config.settings import UPLOADS_DIRECTORY
from ..utils.logger import setup_logger

from docx import Document as DocxDocument

logger = setup_logger(__name__)

_ALLOWED_ROOT = UPLOADS_DIRECTORY.resolve()


def load_docx_document(file_path: str) -> List[Document]:
    """
    Load a DOCX document from the given file path.

    Args:
        file_path (str): The path to the DOCX file to load.

    Returns:
        List[Document]: Loaded documents.
    """
    resolved_path = Path(file_path).resolve()
    try:
        resolved_path.relative_to(_ALLOWED_ROOT)
    except ValueError:
        logger.warning("Blocked path traversal attempt in DOCX loader: %s", resolved_path)
        raise ValueError("Access denied: file must be inside the uploads directory.")

    try:
        logger.info(f"Loading DOCX document from: {resolved_path}")

        # Read the DOCX file
        docx = DocxDocument(str(resolved_path))
        full_text = []
        for para in docx.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        content = "\n\n".join(full_text)

        # Create a single Document
        file_name = resolved_path.name
        doc = Document(
            page_content=content,
            metadata={
                "source": str(resolved_path),
                "file_name": file_name,
                "source_type": "docx",
            }
        )

        para_count = len(full_text)
        char_count = len(content)
        logger.info(f"Loaded DOCX: {para_count} paragraphs, {char_count} characters")

        return [doc]
    except Exception as e:
        logger.error(f"Failed to load DOCX document from {resolved_path}: {e}")
        raise