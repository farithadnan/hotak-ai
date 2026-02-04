"""Module for managing vector storage."""
import bs4
from utils.logger import setup_logger
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from config.settings import (
    COLLECTION_NAME, 
    PERSIST_DIRECTORY
)
from langchain_community.document_loaders import WebBaseLoader 

logger = setup_logger()

def initialize_vector_store(embeddings: OpenAIEmbeddings) -> Chroma:
    """
    Initialize and return the vector store.
    
    Args:
        embeddings: The embeddings model to use for the vector store.
    
    Returns:
        vector_store: Initialized vector store instance.
    """
    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=PERSIST_DIRECTORY
    )
    logger.info(f"Vector store initialized with collection: {COLLECTION_NAME}")
    return vector_store


def is_document_cached(vector_store: Chroma, source_url: str) -> bool:
    """Check if a doc from the given source URL is already in the vector store."""
    try:

        # Query the vector store for documents with matching source URL
        results = vector_store.get(
            where={"source": source_url},
        )

        # If any documents are found, it is cached
        if results and results['ids']:
            logger.info(f"Document from {source_url} is already cached in vector store.")
            return True
        
        # Otherwise, not cached
        logger.info(f"Document from {source_url} is not cached in vector store.")
        return False

    except Exception as e:
        logger.error(f"Error checking document cache: {e}")
        return False


def add_documents_to_store(vector_store: Chroma, documents: list):
    """
    Add documents to the vector store.
    
    Args:
        vector_store: The vector store instance
        documents: List of document chunks to add
    Returns:
        list: Document IDs of added documents
    Raises:
        Exception: If adding documents fails
    """
    try:
        logger.info(f"Adding {len(documents)} documents to vector store...")
        
        # This is where the magic happens:
        # 1. Each chunk is embedded using the embedding model (costs $$)
        # 2. Embeddings are stored in ChromaDB with metadata (including source URL)
        document_ids = vector_store.add_documents(documents=documents)

        if not document_ids:
            logger.error("No documents were added to the vector store.")
            raise Exception("Failed to add documents - no IDs returned")

        logger.info(f"Successfully added {len(document_ids)} documents to the vector store.")
        logger.info(f"Sample document IDs: {document_ids[:3]}")
        
        return document_ids
        
    except Exception as e:
        logger.error(f"Error adding documents to vector store: {e}")
        raise
