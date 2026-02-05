"""
Text document loader for RAG application.

This module loads plain text files (.txt) and prepares them for the RAG system.
"""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from utils.logger import setup_logger

logger = setup_logger(__name__)


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
    logger.info(f"Loading TXT file: {file_path}")
    
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
                "source_type": "txt",
            }
        )
        
        # Log success
        char_count = len(content)
        line_count = content.count('\n') + 1
        logger.info(f"Successfully loaded TXT: {line_count} lines, {char_count} characters")
        
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
        logger.error(f"Failed to load TXT file: {str(e)}")
        raise
