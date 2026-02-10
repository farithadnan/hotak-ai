"""Module for managing LLM and Embeddings models."""

from langchain.chat_models import init_chat_model
from langchain_openai import OpenAIEmbeddings
from config.settings import (
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    EMBEDDING_MODEL
)
from utils.logger import setup_logger

logger = setup_logger(__name__)

def initialize_models():
    """
    Initialize and return the LLM and Embeddings models.

    Returns:
        tuple: (llm, embeddings) - Initialized LLM and embeddings models

    Raises:
        Exception: If model initialization fails
    """
    try:
        logger.info(f"Initializing LLM: {LLM_MODEL}")
        llm = init_chat_model(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS
        )

        logger.info(f"Initializing embeddings: {EMBEDDING_MODEL}")
        embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)

        logger.info("Models initialized successfully.")
        return llm, embeddings

    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        raise
