"""
Text document loader for RAG application.

This module loads plain text files (.txt) and prepares them for the RAG system.
"""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from ..config.settings import UPLOADS_DIRECTORY
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

_ALLOWED_ROOT = UPLOADS_DIRECTORY.resolve()


def load_txt_document(file_path: str) -> List[Document]:
    """
    Load a plain text file and return as LangChain Document.

    Args:
        file_path: Path to the .txt file
    Returns:
        List containing a single Document with the text content
    Raises:
        FileNotFoundError: If the file doesn't exist
        PermissionError: If the file can't be read
        Exception: For other loading errors
    """
    # Construct path from trusted root using only the filename component —
    # never use the raw user-provided path directly in open().
    safe_path = (_ALLOWED_ROOT / Path(file_path).name).resolve()
    if not safe_path.is_relative_to(_ALLOWED_ROOT):
        logger.warning("Blocked path traversal attempt in TXT loader: %s", file_path)
        raise ValueError("Access denied: file must be inside the uploads directory.")

    logger.info(f"Loading TXT file: {safe_path}")

    try:
        # Read the entire file
        with open(safe_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Create a single Document
        doc = Document(
            page_content=content,
            metadata={
                "source": str(safe_path),
                "file_name": safe_path.name,
                "source_type": "txt",
            }
        )

        # Log success
        char_count = len(content)
        line_count = content.count('\n') + 1
        logger.info(f"Successfully loaded TXT: {line_count} lines, {char_count} characters")

        return [doc]

    except FileNotFoundError:
        logger.error(f"File not found: {safe_path}")
        raise
    except PermissionError:
        logger.error(f"Permission denied reading file: {safe_path}")
        raise
    except UnicodeDecodeError as e:
        logger.error(f"Failed to decode file (encoding issue): {safe_path}: {e}")
        raise Exception(f"File encoding error. Try saving as UTF-8.")
    except Exception as e:
        logger.error(f"Failed to load TXT file: {e}")
        raise
