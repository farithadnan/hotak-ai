"""Module for loading Markdown documents."""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from ..config.settings import UPLOADS_DIRECTORY
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

_ALLOWED_ROOT = UPLOADS_DIRECTORY.resolve()


def load_md_document(file_path: str) -> List[Document]:
    """
    Load a Markdown document from a file path.

    Args:
        file_path: Path to the .md file

    Returns:
        List containing a single Document with the markdown content

    Raises:
        FileNotFoundError: If file doesn't exist
        Exception: For reading errors
    """
    logger.info(f"Loading MD file: {file_path}")

    resolved_path = Path(file_path).resolve()
    try:
        resolved_path.relative_to(_ALLOWED_ROOT)
    except ValueError:
        logger.warning("Blocked path traversal attempt in MD loader: %s", resolved_path)
        raise ValueError("Access denied: file must be inside the uploads directory.")

    try:
        # Read the entire file
        with open(resolved_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Create a single Document
        file_name = resolved_path.name
        doc = Document(
            page_content=content,
            metadata={
                "source": str(resolved_path),
                "file_name": file_name,
                "source_type": "md",
            }
        )

        # Log success
        char_count = len(content)
        line_count = content.count('\n') + 1
        logger.info(f"Successfully loaded MD: {line_count} lines, {char_count} characters")

        return [doc]

    except FileNotFoundError:
        logger.error(f"File not found: {resolved_path}")
        raise
    except PermissionError:
        logger.error(f"Permission denied reading file: {resolved_path}")
        raise
    except UnicodeDecodeError as e:
        logger.error(f"Failed to decode file (encoding issue): {resolved_path}")
        raise Exception(f"File encoding error. Try saving as UTF-8: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to load MD file: {str(e)}")
        raise