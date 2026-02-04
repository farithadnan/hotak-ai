"""
Unified document loader with automatic file type detection.

This module detects the document type (web URL, PDF, TXT, etc.) and routes 
to the appropriate loader automatically.
"""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from loaders.web_loader import load_web_document
from loaders.pdf_loader import load_pdf_document
from loaders.txt_loader import load_txt_document
from loaders.docx_loader import load_docx_document

from utils.logger import setup_logger

logger = setup_logger(__name__)


def load_document(source: str) -> List[Document]:
    """
    Load a document from any source (URL or file path).
    
    Automatically detects the source type and uses the appropriate loader:
    - URLs (http/https) → WebBaseLoader
    - .pdf files → PyPDFLoader  
    - .txt files → Text file reader
    
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
    
    # It's a file path - check if it exists
    file_path = Path(source)
    if not file_path.exists():
        logger.error(f"File not found: {source}")
        raise FileNotFoundError(f"File does not exist: {source}")
    
    # Check file extension
    extension = file_path.suffix.lower()
    
    if extension == ".pdf":
        logger.info("Detected: PDF file")
        return load_pdf_document(source)
    
    elif extension == ".txt":
        logger.info("Detected: TXT file")
        return load_txt_document(source)

    elif extension == ".docx":
        logger.info("Detected: DOCX file")
        return load_docx_document(source)
    
    else:
        supported = [".pdf", ".txt", ".docx", "http://", "https://"]
        logger.error(f"Unsupported file type: {extension}")
        raise ValueError(
            f"Unsupported file type: {extension}. "
            f"Supported types: {', '.join(supported)}"
        )


def load_documents(sources: List[str]) -> List[Document]:
    """
    Load documents from multiple sources (URLs or file paths).

    Args:
        sources: List of URLs or file paths to load

    Returns:
        Combined list of LangChain Documents
    """
    all_docs: List[Document] = []

    for source in sources:
        try:
            docs = load_document(source)
            all_docs.extend(docs)
        except Exception as e:
            logger.error(f"Skipping source due to error: {source}. Error: {e}")
            continue

    logger.info(f"Loaded total documents from batch: {len(all_docs)}")
    return all_docs
