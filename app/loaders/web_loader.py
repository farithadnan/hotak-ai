"""Module for loading web documents."""

import bs4
from langchain_community.document_loaders import WebBaseLoader
from utils.logger import setup_logger

logger = setup_logger(__name__)

def load_web_document(source_url: str) -> list:
    """
    Load a web document from the given URL.
    
    Args:
        source_url (str): The URL of the web document to load.

    Returns:
        list: Loaded documents.
    """
    try:
        logger.info(f"Loading web document from: {source_url}")

        # Only keep post title, headers, and content from the full HTML

        # NEED TO MAKE THIS MORE GENERIC LATER
        bs4_strainer = bs4.SoupStrainer(class_=("post-title", "post-header", "post-content"))
        loader = WebBaseLoader(
            web_paths=(source_url,),
            bs_kwargs={"parse_only": bs4_strainer},
        )

        # Load the document from the web
        docs = loader.load()

        # Validate we got exactly one document
        if len(docs) != 1:
            error_msg = f"Expected 1 document, got {len(docs)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        # IMPORTANT: Add source URL to metadata
        # This metadata is stored with each chunk in the vector store
        # It's used later to check if document is cached (via .get(where={"source": url}))
        for doc in docs:
            doc.metadata["source"] = source_url
            doc.metadata["source_type"] = "web"
        
        logger.info(f"Loaded {len(docs)} document(s) from the web.")
        logger.info(f"Total characters: {len(docs[0].page_content)}")

        return docs
    except Exception as e:
        logger.error(f"Failed to load web document from {source_url}: {e}")
        raise