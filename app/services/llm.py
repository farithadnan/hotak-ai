"""Module for managing LLM and Embeddings models."""

from langchain.chat_models import init_chat_model
from langchain_ollama import ChatOllama
from langchain_openai import OpenAIEmbeddings
from ..config.settings import (
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    EMBEDDING_MODEL,
    OLLAMA_BASE_URL,
)
from ..utils.logger import setup_logger

logger = setup_logger(__name__)


def create_llm_for_model(
    model_name: str,
    temperature: float = LLM_TEMPERATURE,
    max_tokens: int = LLM_MAX_TOKENS,
):
    """
    Create an LLM instance for the given model ID.

    Ollama models use the prefix 'ollama/' (e.g. 'ollama/llama3.2').
    All other model IDs are routed to OpenAI via init_chat_model.
    """
    if model_name.startswith("ollama/"):
        ollama_model = model_name.removeprefix("ollama/")
        logger.info("Creating Ollama LLM: %s at %s", ollama_model, OLLAMA_BASE_URL)
        return ChatOllama(
            model=ollama_model,
            base_url=OLLAMA_BASE_URL,
            temperature=temperature,
            num_predict=max_tokens,
        )
    return init_chat_model(
        model=model_name,
        temperature=temperature,
        max_tokens=max_tokens,
    )

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
            max_tokens=LLM_MAX_TOKENS,
        )

        logger.info(f"Initializing embeddings: {EMBEDDING_MODEL}")
        embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)

        logger.info("Models initialized successfully.")
        return llm, embeddings

    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        raise
