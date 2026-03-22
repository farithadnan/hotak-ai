"""Module for managing vector storage."""
from ..utils.logger import setup_logger
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.config import Settings
from ..config.settings import (
    COLLECTION_NAME,
    PERSIST_DIRECTORY
)

logger = setup_logger(__name__)

def initialize_vector_store(embeddings: OpenAIEmbeddings) -> Chroma:
    """
    Initialize and return the vector store.

    Args:
        embeddings: The embeddings model to use for the vector store.

    Returns:
        vector_store: Initialized vector store instance.
    """
    chroma_client = chromadb.PersistentClient(
        path=PERSIST_DIRECTORY,
        settings=Settings(anonymized_telemetry=False),
    )
    vector_store = Chroma(
        client=chroma_client,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )
    logger.info(f"Vector store initialized with collection: {COLLECTION_NAME}")
    return vector_store


def is_document_cached(vector_store: Chroma, source_url: str, user_id: str) -> bool:
    """Check if a doc from the given source URL is already in the vector store for this user."""
    try:
        results = vector_store.get(
            where={"$and": [{"source": source_url}, {"user_id": user_id}]},
        )
        if results and results['ids']:
            logger.info(f"Document from {source_url} is already cached for user {user_id}.")
            return True
        logger.info(f"Document from {source_url} is not cached for user {user_id}.")
        return False
    except Exception as e:
        logger.error(f"Error checking document cache: {e}")
        return False


def filter_uncached_sources(vector_store: Chroma, sources: list, user_id: str) -> tuple[list, list]:
    """
    Split sources into cached and uncached lists for a specific user.

    Args:
        vector_store: The vector store instance
        sources: List of source URLs or file paths
        user_id: The user whose cached documents to check

    Returns:
        tuple: (cached_sources, uncached_sources)
    """
    cached_sources = []
    uncached_sources = []

    for source in sources:
        if is_document_cached(vector_store, source, user_id):
            cached_sources.append(source)
        else:
            uncached_sources.append(source)

    return cached_sources, uncached_sources


def add_documents_to_store(vector_store: Chroma, documents: list, user_id: str):
    """
    Add documents to the vector store, stamping each chunk with user_id.

    Args:
        vector_store: The vector store instance
        documents: List of document chunks to add
        user_id: The owner of these documents
    Returns:
        list: Document IDs of added documents
    Raises:
        Exception: If adding documents fails
    """
    try:
        for doc in documents:
            if doc.metadata is None:
                doc.metadata = {}
            doc.metadata["user_id"] = user_id

        logger.info(f"Adding {len(documents)} documents to vector store for user {user_id}...")
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


def get_all_stored_sources(vector_store: Chroma, user_id: str | None = None) -> dict:
    """
    Retrieve all sources from the vector store with chunk counts.
    When user_id is provided, only returns sources belonging to that user.

    Args:
        vector_store: The vector store instance
        user_id: If set, filter to this user's documents only
    Returns:
        dict: {source_url: chunk_count}
    """
    try:
        logger.info("Retrieving all stored sources from vector store...")

        if user_id:
            results = vector_store.get(where={"user_id": user_id})
        else:
            results = vector_store.get()

        source_counts = {}
        for metadata in results.get('metadatas', []):
            if metadata and 'source' in metadata:
                source = metadata['source']
                source_counts[source] = source_counts.get(source, 0) + 1

        logger.info(f"Found {len(source_counts)} unique sources with {sum(source_counts.values())} total chunks.")
        return source_counts

    except Exception as e:
        logger.error(f"Error retrieving stored sources: {e}")
        return {}
