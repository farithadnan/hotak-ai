# Backend

> **Directory:** `app/`
> **Role:** FastAPI server — API routes, RAG agent, document loading, vector storage, LLM integration, and data persistence.

Back to [PROJECT.md](../PROJECT.md)

---

## Table of Contents

- [Server Setup](#server-setup)
- [Configuration](#configuration)
- [API Routes](#api-routes)
- [RAG Agent](#rag-agent)
- [Services](#services)
- [Storage](#storage)
- [Document Loaders](#document-loaders)
- [Utilities](#utilities)

---

## Server Setup

### `server.py` (root)

A thin re-export: `from app.server import app`. Allows running via `uvicorn app.server:app --reload` from the project root.

### `app/server.py`

The main FastAPI application.

| Item | Detail |
|---|---|
| `app` | `FastAPI(title="Hotak AI Server", version="1.0.0")` |
| CORS | Allows `http://localhost:5173` (Vite dev server), all methods/headers, with credentials |

> **ChromaDB telemetry suppression:** On module load, `server.py` suppresses the `chromadb.telemetry.product.posthog` logger at `ERROR` level. This silences a recurring posthog version-mismatch warning that fires even when `ANONYMIZED_TELEMETRY=False` is set — it is cosmetic only and does not affect functionality.

#### Startup Event

On application boot (`@app.on_event("startup")`):

1. Fixes Windows console encoding to UTF-8
2. Loads all settings from `app.config.settings`
3. Ensures early env defaults are set for `ANONYMIZED_TELEMETRY=False` and `USER_AGENT=Hotak-AI/1.0`
4. Sets runtime environment variables: `OPENAI_API_KEY`, `LANGSMITH_*`
5. Calls `initialize_models()` → creates the LLM and embeddings → stored on `app.state`
6. Calls `initialize_vector_store(embeddings)` → creates the ChromaDB instance → stored on `app.state`
7. Calls `create_rag_agent(llm, vector_store)` → creates the LangChain agent → stored on `app.state`

All routes access these via `request.app.state`.

---

## Configuration

### `app/config/settings.py`

Centralized constants and environment-sourced secrets.

| Constant | Value / Source | Description |
|---|---|---|
| `APP_DIR` | Auto-detected | Root `app/` directory path |
| `LOGS_DIRECTORY` | `APP_DIR / "logs"` | Where log files are written |
| `DATA_DIRECTORY` | `APP_DIR / "data"` | Where JSON + ChromaDB data live |
| `APP_NAME` | `"Hotak AI"` | Application name |
| `LOG_LEVEL` | env `LOG_LEVEL` or `"INFO"` | Logging level |
| `OPENAI_API_KEY` | env `OPENAI_API_KEY` | **Required** — OpenAI secret key |
| `LANGSMITH_API_KEY` | env | LangSmith secret (optional) |
| `LANGSMITH_TRACING` | env or `"true"` | Enable/disable tracing |
| `LANGSMITH_PROJECT` | env or app name | LangSmith project name |
| `LLM_MODEL` | `"gpt-4o-mini"` | Default chat model |
| `LLM_TEMPERATURE` | `0.2` | Default temperature |
| `LLM_MAX_TOKENS` | env or `4096` | Max tokens per response |
| `STREAM_MAX_CHARS` | env or `32000` | Max chars for streaming |
| `CHAT_HISTORY_MAX_TOKENS` | env or `2800` | Approximate token budget reserved for prior chat history |
| `CHAT_HISTORY_MAX_MESSAGE_TOKENS` | env or `700` | Approximate max history tokens for one historical message before truncation |
| `CHAT_HISTORY_MAX_MESSAGES` | env or `10` | Hard cap on how many prior messages are considered before packing |
| `EMBEDDING_MODEL` | `"text-embedding-3-small"` | Embedding model for vector store |
| `COLLECTION_NAME` | `"hotak_ai_collection"` | ChromaDB collection name |
| `PERSIST_DIRECTORY` | `data/chroma_db/` | ChromaDB persistence path |
| `CHUNK_SIZE` | `1000` | Text splitting chunk size |
| `CHUNK_OVERLAP` | `200` | Text splitting overlap |
| `RETRIEVAL_K` | env or `5` | Top-K results for retrieval |
| `UPLOADS_DIRECTORY` | `data/uploads/` | Where multipart file uploads are stored before ingestion |
| `MAX_UPLOAD_FILE_SIZE_BYTES` | env or `10485760` | Per-file upload size limit for `/documents/upload` |

### `app/config/prompts.py`

Contains `SYSTEM_PROMPT` — the system instruction for the RAG agent. Instructs the LLM to:
- Always use the `retrieve_context` tool before answering any question
- Answer based on retrieved context; say "I don't know" if context is insufficient
- Cite sources inline as `[1]`, `[2]`, etc., using only sources that were actually used
- Include a `Sources:` section at the end listing each cited source with its **full filename or URL** (e.g. `- [1] Clean Code (PDFDrive.com).pdf`)
- If no sources were used, write `Sources: None`
- Use fenced code blocks with language tags for code snippets

---

## API Routes

All routes are assembled in `app/api/__init__.py` into a single `APIRouter`, then mounted on the FastAPI app.

### Chats — `app/api/chats.py`

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| POST | `/chats` | `ChatCreate` | `Chat` (201) | Create a new chat session |
| GET | `/chats` | — | `List[Chat]` | Get all chat sessions |
| GET | `/chats/{chat_id}` | — | `Chat` | Get one chat (404 if not found) |
| PUT | `/chats/{chat_id}` | `ChatUpdate` | `Chat` | Update chat metadata (title, model, pinned, messages) |
| DELETE | `/chats/{chat_id}` | — | `{"message": ...}` | Delete a chat |
| POST | `/chats/{chat_id}/messages` | `Message` | `Chat` | Append a message to a chat |
| POST | `/chats/{chat_id}/generate-title` | — | `Chat` | LLM generates a ≤6-word title from the first user message. Truncated to 64 chars. Falls back to "New Chat". |

### Query — `app/api/query.py`

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| GET | `/health` | — | `{"status": "healthy"}` | Health check |
| POST | `/query` | `QueryRequest` | `QueryResponse` | Synchronous RAG query with citation validation |
| POST | `/query/stream` | `QueryRequest` | `StreamingResponse` | Streaming RAG query (text/plain SSE) |

#### `AgentRuntimeConfig`

Internal dataclass that bundles per-request agent configuration resolved from the request and (optionally) an attached template:

| Field | Source |
|---|---|
| `model` | Request `model` field, or template `settings.model`, or global default |
| `system_prompt` | Template `settings.system_prompt`, or global `SYSTEM_PROMPT` |
| `retrieval_k` | Template `settings.retrieval_k`, or global `RETRIEVAL_K` |
| `temperature` | Template `settings.temperature`, or global `LLM_TEMPERATURE` |
| `allowed_sources` | Template `sources` list — filters retrieval to only those documents; `None` = search all |

Agents are cached keyed by all config fields (including a sorted `allowed_sources` key). If all fields match the global defaults and no sources filter is active, the shared startup agent is reused directly.

#### Query Flow (non-streaming `/query`)

1. Resolve `AgentRuntimeConfig` from the request — applying template overrides when `template_id` is set
2. Select or create a cached RAG agent matching the resolved config
3. Build model input messages from `messages` payload (if provided) or persisted `chat_id` history
4. Deduplicate the final user turn when it already matches `question`
5. Pack history into a configurable token budget, truncating oversized older turns when necessary
6. Invoke the agent with the assembled message history
7. Agent uses the `retrieve_context` tool to search ChromaDB (scoped to `allowed_sources` if set)
8. Agent generates response with citation markers
9. `validate_and_format_response()` checks citations against retrieved docs
10. Returns `{ answer, citation_info, model }`

#### Streaming Flow (`/query/stream`)

1. Same agent selection
2. Same message-assembly path (`messages` payload first, then `chat_id` fallback)
3. Calls `agent.astream(payload, stream_mode="messages")` — emits `(AIMessageChunk, metadata)` tuples token-by-token
4. Only `AIMessageChunk` tokens are forwarded — `ToolMessage` chunks (the raw retrieved doc content) are filtered out
5. Each text chunk is yielded as plain text
6. Enforces `STREAM_MAX_CHARS` limit
6. On model permission error: falls back to default model and emits `[[MODEL_FALLBACK:model_name]]`
7. On transient rate limits: waits for the provider retry hint and attempts one delayed fallback invoke
8. On stream failure: falls back to synchronous `invoke()`
9. Handles rate limits (429) with retry-after info

Current limitation:
- Summary-memory compression is still future work; current protection is token-budget packing and truncation.

### Documents — `app/api/documents.py`

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| POST | `/documents/load` | `{ sources: string[] }` | `{ loaded, skipped, cached_sources, loaded_sources, failed_sources }` | Load documents into the vector store. Skips already-cached sources. |
| POST | `/documents/upload` | `multipart/form-data` (`files[]`) | `{ loaded, skipped, uploaded_sources, cached_sources, loaded_sources, failed_sources, failed_files, file_results }` | Upload local files, persist to `data/uploads`, ingest uncached sources, and return per-file status. |
| GET | `/documents` | — | `{ total_sources, sources: [{ source, chunks }] }` | List all documents with chunk counts |

Document ingestion safeguards:
- Web loader first attempts filtered extraction, then automatically falls back to full-page extraction when filtered content is empty.
- Sources that load but produce empty content are marked as failed sources and skipped.
- Split failures for a load batch are returned as failed sources instead of crashing the endpoint with a 500 in this scenario.

### Models — `app/api/models.py`

| Method | Path | Response | Description |
|---|---|---|---|
| GET | `/models` | `{ object: "list", data: [...] }` | Proxy to OpenAI's model list API |
| GET | `/models/{model_id}` | `{ id, created, object, owned_by }` | Retrieve a single model |

### Templates — `app/api/templates.py`

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| POST | `/templates` | `TemplateCreate` | `Template` (201) | Create template (400 on duplicate name) |
| GET | `/templates` | — | `List[Template]` | Get all templates |
| GET | `/templates/{template_id}` | — | `Template` | Get one template (404 if not found) |
| PUT | `/templates/{template_id}` | `TemplateUpdate` | `Template` | Update template (400 on name conflict) |
| DELETE | `/templates/{template_id}` | — | `{ message, id }` | Delete template |

---

## RAG Agent

### `app/agents/rag_agent.py`

The core AI logic — creates the retrieval tool and assembles the LangChain agent.

#### `create_retrieval_tool(vector_store, retrieval_k=None, allowed_sources=None) → tool`

Returns a LangChain `@tool` named `retrieve_context`:
- Takes a `query: str`
- If `allowed_sources` is provided, filters ChromaDB with `{"source": {"$in": allowed_sources}}` — only chunks from those sources are searched
- Otherwise searches all stored documents
- Uses `retrieval_k` (falls back to the global `RETRIEVAL_K` setting) to control how many chunks are returned
- Formats each result as `[index] source_label\nContent: ...`
- Source labels are derived from file names, URLs, or paths (with page numbers if available)
- Returns `(formatted_string, docs_list)`

#### `create_rag_agent(llm, vector_store, system_prompt=None, retrieval_k=None, allowed_sources=None) → agent`

- Creates the retrieval tool (passing through `retrieval_k` and `allowed_sources`)
- Creates a LangChain agent with the LLM, the tool, and the effective system prompt
- Returns the configured agent

#### `validate_and_format_response(answer, retrieved_docs) → (answer, citation_info)`

- Ensures the response has citations (adds `[1]` if missing)
- Appends a `Sources:` section if missing
- Returns the validated answer and citation metadata: `{ is_valid, cited_sources, total_sources }`

---

## Services

### `app/services/llm.py`

#### `initialize_models() → (llm, embeddings)`

- Creates the LLM via `init_chat_model(model=LLM_MODEL, temperature=LLM_TEMPERATURE, max_tokens=LLM_MAX_TOKENS)`
- Creates embeddings via `OpenAIEmbeddings(model=EMBEDDING_MODEL)`
- Returns both as a tuple

---

## Storage

### `app/storage/chat_storage.py` — Chat Persistence

JSON-file-backed CRUD. Data stored in `app/data/chats/chats.json`.

| Function | Description |
|---|---|
| `create_chat(data: ChatCreate) → Chat` | Creates a new chat with a UUID |
| `get_all_chats() → List[Chat]` | Returns all chats |
| `get_chat(chat_id) → Chat \| None` | Find by ID |
| `update_chat(chat_id, data: ChatUpdate) → Chat \| None` | Partial update, sets `updated_at` |
| `add_message_to_chat(chat_id, message) → Chat \| None` | Appends a message |
| `delete_chat(chat_id) → bool` | Removes a chat |

### `app/storage/template_storage.py` — Template Persistence

JSON-file-backed CRUD. Data stored in `app/data/templates/templates.json`.

| Function | Description |
|---|---|
| `create_template(data: TemplateCreate) → Template` | Creates template (raises `ValueError` on duplicate name) |
| `get_all_templates() → List[Template]` | Returns all |
| `get_template(id) → Template \| None` | Find by ID |
| `update_template(id, data: TemplateUpdate) → Template \| None` | Partial update (raises `ValueError` on name conflict) |
| `delete_template(id) → bool` | Removes template |
| `get_template_count() → int` | Total template count |

### `app/storage/vector_storage.py` — Vector Store

ChromaDB operations. Persisted to `app/data/chroma_db/`.

| Function | Description |
|---|---|
| `initialize_vector_store(embeddings) → Chroma` | Creates a `chromadb.PersistentClient` with `anonymized_telemetry=False`, then wraps it in a LangChain `Chroma` instance |
| `is_document_cached(store, source) → bool` | Checks if a source URL/path already has embeddings |
| `filter_uncached_sources(store, sources) → (cached, uncached)` | Partitions sources into cached vs. needs-loading |
| `add_documents_to_store(store, docs) → ids` | Adds document chunks to the store |
| `get_all_stored_sources(store) → dict` | Returns `{ source: chunk_count }` for all stored documents |

---

## Document Loaders

### `app/loaders/document_loader.py` — Router

Detects the source type and calls the right loader:

| Source | Detection | Loader |
|---|---|---|
| Web URL | Starts with `http://` or `https://` | `load_web_document()` |
| PDF | `.pdf` extension | `load_pdf_document()` |
| TXT | `.txt` extension | `load_txt_document()` |
| DOCX | `.docx` extension | `load_docx_document()` |
| Markdown | `.md` extension | `load_md_document()` |

`load_documents(sources)` iterates over all sources, loads each, and collects failures.

### Individual Loaders

| File | Loader | Returns | Notes |
|---|---|---|---|
| `pdf_loader.py` | `load_pdf_document(path)` | `List[Document]` (one per page) | Uses LangChain's `PyPDFLoader` |
| `docx_loader.py` | `load_docx_document(path)` | `[Document]` | Uses `python-docx`, joins paragraphs |
| `txt_loader.py` | `load_txt_document(path)` | `[Document]` | Reads UTF-8 plain text |
| `md_loader.py` | `load_md_document(path)` | `[Document]` | Reads UTF-8 markdown |
| `web_loader.py` | `load_web_document(url)` | `[Document]` | Uses `WebBaseLoader` + BeautifulSoup (filters `post-title`, `post-header`, `post-content` classes) |

All loaders return LangChain `Document` objects with metadata: `{ source, file_name, source_type }`.

---

## Utilities

### `app/utils/citation_extractor.py`

Handles citation validation and formatting for RAG responses.

| Function | Description |
|---|---|
| `extract_citation_numbers(text) → Set[int]` | Finds all `[N]` patterns in text |
| `build_source_map(docs) → dict` | Maps `{ 1: "label", 2: "label" }` from retrieved docs |
| `validate_citations(answer, docs) → (is_valid, cited_numbers, errors)` | Checks if citations exist and are in range |
| `build_sources_section(cited_numbers, docs) → str` | Formats `"Sources:\n- [1] ..."` block |
| `ensure_citations(answer, docs) → (answer, was_valid)` | Adds `[1]` and `Sources:` section if missing |

### `app/utils/logger.py`

| Function | Description |
|---|---|
| `setup_logger(name) → Logger` | Creates a named logger with file (`app/logs/app.log`) and console handlers. Guards against duplicate handlers. |

### `app/utils/text_splitter.py`

| Function | Description |
|---|---|
| `split_documents(docs) → list` | Splits documents into chunks using `RecursiveCharacterTextSplitter` with configured `CHUNK_SIZE` and `CHUNK_OVERLAP`. Validates settings. |

---

## Data Models (Pydantic)

### `app/models/chat.py`

| Model | Key Fields |
|---|---|
| `Message` | `id` (UUID), `role` (user/assistant/system), `content`, `model?`, `sources?`, `created_at` |
| `Chat` | `id` (UUID), `title`, `template_id?`, `pinned`, `model?`, `messages: List[Message]`, timestamps |
| `ChatCreate` | `title?` (default "New Chat"), `template_id?`, `pinned?`, `model?` |
| `ChatUpdate` | All optional: `title?`, `template_id?`, `pinned?`, `model?`, `messages?` |

### `app/models/template.py`

| Model | Key Fields |
|---|---|
| `TemplateSettings` | `model`, `temperature`, `chunk_size`, `chunk_overlap`, `retrieval_k`, `system_prompt` |
| `Template` | `id` (UUID), `name`, `description`, `sources`, `settings: TemplateSettings`, timestamps |
| `TemplateCreate` | `name` (required), `description?`, `sources?`, `settings?` |
| `TemplateUpdate` | All optional |

**Which template settings are active at query time:**

| Setting | Used at query time? | Notes |
|---|---|---|
| `model` | ✅ Yes | Selects the LLM for that chat |
| `temperature` | ✅ Yes | Applied when creating a per-template LLM instance |
| `retrieval_k` | ✅ Yes | Controls how many chunks are retrieved from ChromaDB |
| `system_prompt` | ✅ Yes | Overrides the global system prompt for that session |
| `sources` | ✅ Yes | Filters ChromaDB retrieval to only those documents |
| `chunk_size` | ❌ Not yet | Ingestion-only setting — not applied at query time |
| `chunk_overlap` | ❌ Not yet | Ingestion-only setting — not applied at query time |

> **Side note on `chunk_size` / `chunk_overlap`:** Leave them as-is in the model. They're not useless — just deferred. They're the right place to control ingestion granularity per-template if you ever build per-template document re-ingestion. Removing them now would break existing stored templates and doesn't gain anything.
