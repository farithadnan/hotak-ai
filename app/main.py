# Import configuration
import os
from config.settings import (
    OPENAI_API_KEY,
    LANGSMITH_API_KEY, 
    LANGSMITH_TRACING,
    LANGSMITH_PROJECT,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    EMBEDDING_MODEL,
    COLLECTION_NAME,
    PERSIST_DIRECTORY,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    RETRIEVAL_K
)
from config.prompts import SYSTEM_PROMPT
from utils.logger import setup_logger

from models.llm import initialize_models
from storage.vector_storage import initialize_vector_store, is_document_cached, add_documents_to_store
from loaders.web_loader import load_web_document
from utils.text_splitter import split_documents
from agents.rag_agent import create_rag_agent

# Set up logger
logger = setup_logger()

# Set environment variables
os.environ["LANGSMITH_TRACING"] = LANGSMITH_TRACING
os.environ["LANGSMITH_API_KEY"] = LANGSMITH_API_KEY
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["LANGSMITH_PROJECT"] = LANGSMITH_PROJECT

# Initialize models
llm, embeddings = initialize_models()

# Initialize vector store
vector_store = initialize_vector_store(embeddings)

# Define source URL
source_url = "https://lilianweng.github.io/posts/2023-06-23-agent/"

# CACHING LOGIC: Check if document already processed
if is_document_cached(vector_store, source_url):
    logger.info(f"[CACHED] Document from {source_url} is already cached.")
    logger.info("Skipping document loading, splitting, and embedding.\n")
else:
    # Document is NEW - process it
    logger.info(f"Document from {source_url} not found in cache.")
    logger.info("Processing document...\n")
    
    try:
        # Load document from web
        docs = load_web_document(source_url)
        
        # Split into chunks
        all_splits = split_documents(docs)
        
        # Add to vector store
        add_documents_to_store(vector_store, all_splits)
        
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        exit(1)

# Create RAG agent
try:
    agent = create_rag_agent(llm, vector_store)
except Exception as e:
    logger.error(f"Failed to create agent: {e}")
    exit(1)


# Example query to test the agent
query = (
    "What is the standard method for Task Decomposition?\n\n"
    "Once you get the answer, look up common extensions of that method."
)

try:
    logger.info(f"Processing query: {query}")
    for event in agent.stream(
        {"messages": [{"role": "user", "content": query}]},
        stream_mode="values",
    ):
        event["messages"][-1].pretty_print()
    logger.info("Query processed successfully.")
except Exception as e:
    logger.error(f"Agent failed to process query: {e}")

# Notes for future features:
# - User can input custom queries via UI
# - Option to set number of retrieved documents (k) via UI
