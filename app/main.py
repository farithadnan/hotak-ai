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

# Set up logger
logger = setup_logger()

# Set environment variables
os.environ["LANGSMITH_TRACING"] = LANGSMITH_TRACING
os.environ["LANGSMITH_API_KEY"] = LANGSMITH_API_KEY
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["LANGSMITH_PROJECT"] = LANGSMITH_PROJECT

# Import Ollama LLM and Embeddings packages
# from langchain_ollama import ChatOllama, OllamaEmbeddings

# # Define model parameters
# LLM_MODEL = "llama2"
# EMBEDDING_MODEL = "llama2"
# TEMPERATURE = 0.2
# MAX_TOKENS = 1024

# # Initialize llm and embeddings
# llm = ChatOllama(
#     model=LLM_MODEL,
#     validate_model_on_init=True,
#     temperature=TEMPERATURE,
#     num_predict=MAX_TOKENS
# )

# embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

# Import OpenAI LLM and Embeddings packages
# OPENAI_API_KEY is loaded from .env via load_dotenv()
from langchain.chat_models import init_chat_model
from langchain_openai import OpenAIEmbeddings

llm = init_chat_model(LLM_MODEL, temperature=LLM_TEMPERATURE, max_tokens=LLM_MAX_TOKENS)
embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)


# Notes for future features:
# - User can choose model from a list of available models
# - User can set temperature and max tokens via UI
# - System prompt can be customized via UI


# Import Chroma vector store package
from langchain_chroma import Chroma

vector_store = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=PERSIST_DIRECTORY
)

# Notes for future features:
# - User can set collection name and persist directory via UI (But set base folder to data/)
# - Option to clear and reinitialize the vector store
# - Option to manage multiple collections
# - Option to view number of documents and vectors in the collection
# - Option to export/import vector store data
# - Option to choose different vector store backends

# Loading document from html (Document Loader) - only covers html for now
import bs4
from langchain_community.document_loaders import WebBaseLoader 

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

# Only keep post title, headers, and content from the full HTML
bs4_strainer = bs4.SoupStrainer(class_=("post-title", "post-header", "post-content"))
loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs={"parse_only": bs4_strainer},
)

# Get source URL for caching check
source_url = loader.web_paths[0]

# CACHING LOGIC:
# Check if we've already processed this URL before.
# If YES → Skip loading/splitting/embedding (saves time & API costs)
# If NO → Process normally
if is_document_cached(vector_store, source_url):
    logger.info(f"✓ Document from {source_url} is already cached.")
    logger.info("Skipping document loading, splitting, and embedding.")
    logger.info("Proceeding directly to query processing...\n")
else:
    # Document is NEW - process it
    logger.info(f"Document from {source_url} not found in cache.")
    logger.info("Loading and processing document...\n")
    
    try:
        # Load the document from the web
        docs = loader.load()

        # Validate we got exactly one document
        if len(docs) != 1:
            logger.error(f"Expected 1 document, got {len(docs)}")
            exit(1)

        # IMPORTANT: Add source URL to metadata
        # This metadata is stored with each chunk in the vector store
        # It's used later to check if document is cached (via .get(where={"source": url}))
        for doc in docs:
            doc.metadata["source"] = source_url
        
        logger.info(f"Loaded {len(docs)} document(s) from the web.")
        logger.info(f"Total characters: {len(docs[0].page_content)}")
    except Exception as e:
        logger.error(f"Error loading document: {e}")
        exit(1)

    # Notes for future features:
    # - Will cover not just html, but also pdf, docx, txt, etc.
    # - User can input multiple URLs or file uploads via UI
    # - Option to preview loaded documents before processing
    # - Option to fetch metadata like title, author, date, etc.
    # - Need to handle loading errors and invalid URLs/files
    # - Need to add references to the docs then somehow interconnect with vector store
    # - The reference will be used as a citation when answering questions

    # Import text splitter package
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    try:
        # Validate chunk size and overlap
        if CHUNK_SIZE <= 0 or CHUNK_OVERLAP < 0 or CHUNK_OVERLAP >= CHUNK_SIZE:
            logger.error("Invalid chunk size or overlap settings.")
            exit(1)

        # Initialize text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            add_start_index=True, # track index in original document
        )

        # Split documents into smaller chunks
        all_splits = text_splitter.split_documents(docs)

        if not all_splits:
            logger.error("No document splits were created.")
            exit(1)

        logger.info(f"Split blog post into {len(all_splits)} sub-documents.")

    except Exception as e:
        logger.error(f"Error splitting documents: {e}")
        exit(1)

    # Notes for future features:
    # - User can set chunk size and overlap via UI
    # - Option to choose different text splitting strategies (e.g., sentence-based, paragraph-based)
    # - Option to preview how a sample text would be split
    # - Option to save and load custom text splitting configurations

    # Now to embed the chunks and add to vector store
    try:
        # This is where the magic happens:
        # 1. Each chunk is embedded using OpenAI's embedding model (costs $$)
        # 2. Embeddings are stored in ChromaDB with metadata (including source URL)
        # 3. Next time we run, is_document_cached() will find these and skip this step!
        document_ids = vector_store.add_documents(documents=all_splits)

        if not document_ids:
            logger.error("No documents were added to the vector store.")
            exit(1)

        logger.info(f"Added {len(document_ids)} documents to the vector store.")
        logger.info(f"Sample document IDs: {document_ids[:3]}")

    except Exception as e:
        logger.error(f"Error adding documents to vector store: {e}")
        exit(1)

# END OF CACHING IF/ELSE BLOCK
# From here on, code runs whether document was cached or not

# Now the retrieval & generation part
from langchain.tools import tool

# Define a retrieval tool to get relevant documents from the vector store
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
    
# Complete the agent
from langchain.agents import create_agent

tools = [retrieve_context]

try:
    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=SYSTEM_PROMPT
    )
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
