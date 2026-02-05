"""Main file for the RAG application."""

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
from storage.vector_storage import (
    initialize_vector_store,
    filter_uncached_sources,
    add_documents_to_store,
)
from loaders.document_loader import load_documents
from utils.text_splitter import split_documents
from agents.rag_agent import create_rag_agent, validate_and_format_response

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

# Define sources - can be URLs, PDFs, or TXT/DOCX files
# Examples:
# "https://lilianweng.github.io/posts/2023-06-23-agent/"  # Web URL
# r"C:\Users\User\Desktop\Dev\hotak-ai\app\data\test\sample.pdf"  # PDF file (raw string)
# "C:/Users/User/Desktop/Dev/hotak-ai/app/data/test/notes.txt"  # TXT file (forward slashes)
# r"C:\Users\User\Desktop\Dev\hotak-ai\app\data\test\sample.docx"  # DOCX file
sources = [
    r"https://lilianweng.github.io/posts/2023-06-23-agent/",
    r"C://Users//User//Desktop//Dev//hotak-ai//app//data//test//sample.docx",
    r"C://Users//User//Desktop//Dev//hotak-ai//app//data//test//test_document.txt",
    r"C://Users//User//Desktop//Dev//hotak-ai//app//data//test//sample.pdf",
]

# CACHING LOGIC: Check which sources are already processed
cached_sources, uncached_sources = filter_uncached_sources(vector_store, sources)

if cached_sources:
    logger.info(f"[CACHED] {len(cached_sources)} source(s) already in vector store.")
    for cached in cached_sources:
        logger.info(f"  - {cached}")

if uncached_sources:
    logger.info(f"Processing {len(uncached_sources)} new source(s)...\n")
    try:
        # Load documents (auto-detects type: web, PDF, TXT, or DOCX)
        docs = load_documents(uncached_sources)

        if docs:
            # Split into chunks
            all_splits = split_documents(docs)

            # Add to vector store
            add_documents_to_store(vector_store, all_splits)
        else:
            logger.warning("No documents loaded from uncached sources.")

    except Exception as e:
        logger.error(f"Error processing documents: {e}")
        exit(1)
else:
    logger.info("All sources are already cached. Skipping loading, splitting, and embedding.\n")

# Create RAG agent
try:
    agent = create_rag_agent(llm, vector_store)
except Exception as e:
    logger.error(f"Failed to create agent: {e}")
    exit(1)


# Example query to test the agent
# Use a direct question to trigger retrieval:
query = "What is in the document? Show me the first few sentences."

try:
    logger.info(f"Processing query: {query}")
    
    # Stream and display agent's response
    final_message = None
    
    for event in agent.stream(
        {"messages": [{"role": "user", "content": query}]},
        stream_mode="values",
    ):
        last_message = event["messages"][-1]
        last_message.pretty_print()
        final_message = last_message  # Keep updating to get the final one
    
    # Extract final response text for citation validation
    full_response = ""
    if final_message and hasattr(final_message, 'content'):
        content = final_message.content
        if isinstance(content, str):
            full_response = content
    
    # Validate citations against top retrieved docs
    top_docs = vector_store.similarity_search(query, k=5)
    
    if top_docs and full_response:
        validated_response, citation_info = validate_and_format_response(
            full_response, top_docs
        )
        logger.info(f"Citation check: {citation_info}")
    
    logger.info("Query processed successfully.")
except Exception as e:
    logger.error(f"Agent failed to process query: {e}")


# Notes for future features:
# - User can input custom queries via UI
# - Option to set number of retrieved documents (k) via UI
