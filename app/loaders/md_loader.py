"""Module for loading Markdown documents."""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from utils.logger import setup_logger

logger = setup_logger(__name__)

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

    try:
        # Read the entire file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Create a single Document
        file_name = Path(file_path).name
        doc = Document(
            page_content=content,
            metadata={
                "source": file_path,
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
        logger.error(f"File not found: {file_path}")
        raise
    except PermissionError:
        logger.error(f"Permission denied reading file: {file_path}")
        raise
    except UnicodeDecodeError as e:
        logger.error(f"Failed to decode file (encoding issue): {file_path}")
        raise Exception(f"File encoding error. Try saving as UTF-8: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to load MD file: {str(e)}")
        raise