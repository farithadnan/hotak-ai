"""Module to load docx documents."""

from typing import List
from pathlib import Path
from langchain_core.documents import Document
from utils.logger import setup_logger

from docx import Document as DocxDocument

logger = setup_logger(__name__)


def load_docx_document(file_path: str) -> List[Document]:
    """
    Load a DOCX document from the given file path.
    
    Args:
        file_path (str): The path to the DOCX file to load.

    Returns:
        List[Document]: Loaded documents.
    """
    try:
        logger.info(f"Loading DOCX document from: {file_path}")
        
        # Read the DOCX file
        docx = DocxDocument(file_path)
        full_text = []
        for para in docx.paragraphs:
            if para.text.strip():  # Filter out empty paragraphs
                full_text.append(para.text)
        content = "\n\n".join(full_text)  # Double newline for better separation
        
        # Create a single Document
        file_name = Path(file_path).name
        doc = Document(
            page_content=content,
            metadata={
                "source": file_path,
                "file_name": file_name,
                "source_type": "docx",
            }
        )
        
        # Log success with stats
        para_count = len(full_text)
        char_count = len(content)
        logger.info(f"Loaded DOCX: {para_count} paragraphs, {char_count} characters")
        
        return [doc]
    except Exception as e:
        logger.error(f"Failed to load DOCX document from {file_path}: {e}")
        raise