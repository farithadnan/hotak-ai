"""Module for RAG agent implementation."""
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_chroma import Chroma
from config.settings import RETRIEVAL_K
from config.prompts import SYSTEM_PROMPT
from utils.logger import setup_logger

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

            serialized = "\n\n".join(
                (f"Source: {doc.metadata}\nContent: {doc.page_content}")
                for doc in retrieved_docs
            )

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