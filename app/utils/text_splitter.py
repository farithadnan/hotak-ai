"""Module for splitting text into smaller chunks."""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from utils.logger import setup_logger
from config.settings import (
    CHUNK_SIZE,
    CHUNK_OVERLAP
)

logger = setup_logger()

def split_documents(documents: list) -> list:
    """
    Split documents into smaller chunks for processing.
    
    Args:
        documents (list): List of documents to split.
    
    Returns:
        list: List of document chunks.
    """
    try:
        # Validate chunk size and overlap
        if CHUNK_SIZE <= 0 or CHUNK_OVERLAP < 0 or CHUNK_OVERLAP >= CHUNK_SIZE:
            error_msg = f"Invalid chunk settings: CHUNK_SIZE={CHUNK_SIZE}, CHUNK_OVERLAP={CHUNK_OVERLAP}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Initialize text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            add_start_index=True, # track index in original document
        )

        # Split documents into smaller chunks
        all_splits = text_splitter.split_documents(documents)

        if not all_splits:
            error_msg = "No document splits were created. Documents may be empty."
            logger.error(error_msg)
            raise ValueError(error_msg)

        logger.info(f"Split documents into {len(all_splits)} chunks.")
        return all_splits

    except Exception as e:
        logger.error(f"Error splitting documents: {e}")
        raise