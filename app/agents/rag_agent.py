"""Module for RAG agent implementation."""
from pathlib import Path
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_chroma import Chroma
from config.settings import RETRIEVAL_K
from config.prompts import SYSTEM_PROMPT
from utils.logger import setup_logger
from utils.citation_extractor import ensure_citations, validate_citations

logger = setup_logger()

def create_retrieval_tool(vector_store: Chroma):
    """
    Create a retrieval tool using the provided vector store.
    
    Args:
        vector_store: The Chroma vector store instance
        
    Returns:
        tool: A LangChain tool for retrieving context from the vector store
    """
    @tool(response_format="content_and_artifact")
    def retrieve_context(query: str):
        """Retrieve information to help answer a query."""
        try:
            if not query:
                raise ValueError("Query cannot be empty.")

            k = int(RETRIEVAL_K)
            if k <= 0:
                logger.warning(f"Invalid RETRIEVAL_K value: {RETRIEVAL_K}. Defaulting to 5.")
                k = 5
        
            retrieved_docs = vector_store.similarity_search(query, k=k)

            if not retrieved_docs:
                logger.warning("No documents retrieved from vector store.")
                return "", []

            def format_source_label(doc_metadata: dict, index: int) -> str:
                source = doc_metadata.get("source", "unknown")
                file_name = doc_metadata.get("file_name")
                page = doc_metadata.get("page")
                page_label = f", page {page}" if page is not None else ""
                if file_name:
                    return f"[{index}] {file_name}{page_label}"
                if source.startswith("http"):
                    return f"[{index}] {source}{page_label}"
                return f"[{index}] {Path(source).name}{page_label}"

            serialized_chunks = []
            for i, doc in enumerate(retrieved_docs, start=1):
                source_label = format_source_label(doc.metadata or {}, i)
                serialized_chunks.append(
                    f"{source_label}\nContent: {doc.page_content}"
                )

            serialized = "\n\n".join(serialized_chunks)

            if not serialized:
                logger.warning("Serialized retrieved documents is empty.")
            
            return serialized, retrieved_docs

        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            return "", []
    
    return retrieve_context


def create_rag_agent(llm, vector_store: Chroma):
    """
    Create a RAG agent with retrieval capabilities.
    
    Args:
        llm: The language model instance
        vector_store: The Chroma vector store instance
        
    Returns:
        agent: A LangChain agent configured for RAG
        
    Raises:
        Exception: If agent creation fails
    """
    try:
        logger.info("Creating RAG agent...")
        
        # Create retrieval tool
        retrieval_tool = create_retrieval_tool(vector_store)
        tools = [retrieval_tool]
        
        # Create agent
        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=SYSTEM_PROMPT
        )
        
        logger.info("RAG agent created successfully.")
        return agent
        
    except Exception as e:
        logger.error(f"Failed to create agent: {e}")
        raise

def validate_and_format_response(answer: str, retrieved_docs: list) -> tuple[str, dict]:
    """
    Validate citations in the agent's answer and ensure they're grounded in sources.
    
    Args:
        answer: The agent's answer text
        retrieved_docs: List of documents that were retrieved
        
    Returns:
        Tuple of (validated_answer, citation_info)
        - validated_answer: Answer with enforced citations
        - citation_info: Dict with validation details
    """
    # ensure_citations() already validates internally, so just call it once
    validated_answer, has_valid_citations = ensure_citations(answer, retrieved_docs)
    
    # Extract citation numbers from the validated answer
    from utils.citation_extractor import extract_citation_numbers
    cited_numbers = extract_citation_numbers(validated_answer)
    
    # Log results
    if has_valid_citations:
        logger.info(f"Citation validation passed. Found {len(cited_numbers)} citation(s).")
    else:
        logger.warning(f"Citation validation failed. Citations were auto-added.")
    
    citation_info = {
        "is_valid": has_valid_citations,
        "cited_sources": len(cited_numbers),
        "total_sources": len(retrieved_docs),
    }
    
    return validated_answer, citation_info
