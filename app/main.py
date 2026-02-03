
# Import for LangSmith tracing
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set defaults if not in .env
os.environ.setdefault("LANGSMITH_TRACING", "true")
os.environ.setdefault("LANGSMITH_PROJECT", "Hotak AI")


# Define system prompt
SYSTEM_PROMPT = """You are an AI assistant that helps people find information.
You are given the following extracted parts of a long document and a question. Provide a conversational answer based on the context provided.
If you don't know the answer, just say you don't know. Don't try to make up an answer.
If the question is not related to the context, politely inform them that you are tuned to only answer questions that are related to the context.

Use the following format: 

Question: <question here>
Answer: <answer here>
=========
{context}
=========
"""

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

llm = init_chat_model("gpt-4o-mini", temperature=0.2, max_tokens=512)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


# Notes for future features:
# - User can choose model from a list of available models
# - User can set temperature and max tokens via UI
# - System prompt can be customized via UI


# Import Chroma vector store package
from langchain_chroma import Chroma

# Define Chroma vector store parameters
COLLECTION_NAME = "hotak_ai_collection"
PERSIST_DIRECTORY = "data/chroma_db/"

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

# Only keep post title, headers, and content from the full HTML
bs4_strainer = bs4.SoupStrainer(class_=("post-title", "post-header", "post-content"))
loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs={"parse_only": bs4_strainer},
)
docs = loader.load()

# Give error if the docs length is other than 1
assert len(docs) == 1
print(f"Total characters: {len(docs[0].page_content)}")

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

# Define text chunking parameters
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Initialize text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    add_start_index=True, # track index in original document
)

# Split documents into smaller chunks
all_splits = text_splitter.split_documents(docs)
print(f"Split blog post into {len(all_splits)} sub-documents.")

# Notes for future features:
# - User can set chunk size and overlap via UI
# - Option to choose different text splitting strategies (e.g., sentence-based, paragraph-based)
# - Option to preview how a sample text would be split
# - Option to save and load custom text splitting configurations

# Now to embed the chunks and add to vector store
document_ids = vector_store.add_documents(documents=all_splits)
print(document_ids[:3])

# Now the retrieval & generation part
from langchain.tools import tool

# Define a retrieval tool to get relevant documents from the vector store
@tool(response_format="content_and_artifact")
def retrieve_context(query: str):
    """Retrieve information to help answer a query."""
    retrieved_docs = vector_store.similarity_search(query, k=5)
    serialized = "\n\n".join(
        (f"Source: {doc.metadata}\nContent: {doc.page_content}")
        for doc in retrieved_docs
    )
    return serialized, retrieved_docs

# Complete the agent
from langchain.agents import create_agent

tools = [retrieve_context]
agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt=SYSTEM_PROMPT
)

# Example query to test the agent
query = (
    "What is the standard method for Task Decomposition?\n\n"
    "Once you get the answer, look up common extensions of that method."
)

for event in agent.stream(
    {"messages": [{"role": "user", "content": query}]},
    stream_mode="values",
):
    event["messages"][-1].pretty_print()


# Notes for future features:
# - User can input custom queries via UI
# - Option to set number of retrieved documents (k) via UI
