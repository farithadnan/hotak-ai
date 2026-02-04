"""Module to load PDF documents."""

from langchain_community.document_loaders import PyPDFLoader
from utils.logger import setup_logger

logger = setup_logger()

def load_pdf_document(file_path: str) -> list:
    """
    Load a PDF document from the given file path.
    
    Args:
        file_path (str): The path to the PDF file to load.

    Returns:
        list: Loaded documents.
    """
    try:
        logger.info(f"Loading PDF document from: {file_path}")
        
        # Load the PDF document
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        # IMPORTANT: Add source file path to metadata
        # This metadata is stored with each chunk in the vector store
        # It's used later to check if document is cached (via .get(where={"source": path}))
        for doc in docs:
            doc.metadata["source"] = file_path
        
        logger.info(f"Loaded {len(docs)} pages from PDF.")
        logger.info(f"Total characters: {sum(len(doc.page_content) for doc in docs)}")

        return docs
    except Exception as e:
        logger.error(f"Failed to load PDF document from {file_path}: {e}")
        raise