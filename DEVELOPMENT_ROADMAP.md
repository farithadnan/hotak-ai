# Hotak AI - Development Roadmap

## Overview
This roadmap transforms the current prototype into a production-ready RAG application with a user interface.

---

## Phase 0: Foundation & Refactoring (Start Here) 🎯

### Goals
- Clean code structure
- Reusable components
- Better error handling
- Configuration management

### Tasks

#### 1. Project Structure Refactoring
```
app/
├── config/
│   ├── __init__.py
│   ├── settings.py          # All constants and defaults
│   └── prompts.py            # System prompts
├── models/
│   ├── __init__.py
│   └── llm.py                # LLM & embeddings initialization
├── storage/
│   ├── __init__.py
│   └── vector_store.py       # Vector store operations
├── loaders/
│   ├── __init__.py
│   ├── base.py               # Base loader interface
│   └── web_loader.py         # HTML/web loading
├── utils/
│   ├── __init__.py
│   └── text_splitter.py      # Text chunking utilities
├── agents/
│   ├── __init__.py
│   └── rag_agent.py          # Agent setup
├── api/
│   ├── __init__.py
│   └── routes.py             # FastAPI endpoints (future)
├── main.py                   # CLI entry point
└── server.py                 # API server (future)
```

**Priority:** HIGH  
**Time estimate:** 2-3 days  
**Deliverable:** Modular codebase  
**Status:** ✅ Complete!

**Completed Work:**
- [x] Extract LLM initialization to `models/llm.py`
- [x] Move vector store operations to `storage/vector_storage.py`
- [x] Move web loading logic to `loaders/web_loader.py`
- [x] Move text splitting to `utils/text_splitter.py`
- [x] Move agent creation to `agents/rag_agent.py`
- [x] Update main.py to import from new modules

**Results:**
- ✅ main.py reduced from ~270 lines to ~90 lines
- ✅ All modules are reusable and testable
- ✅ Clean separation of concerns
- ✅ Proper error handling in all modules

#### 2. Configuration System
- [x] Create `config/settings.py` and extract constants
- [x] Create `config/prompts.py` for system prompts
- [x] Move all hardcoded values to config
- [ ] (Optional) Upgrade to Pydantic for validation
- [ ] (Optional) Support multiple config profiles (dev, prod)

**Priority:** HIGH  
**Time estimate:** 1 hour (basic) / 1 day (with Pydantic)  
**Status:** ✅ Basic implementation complete!

#### 3. Error Handling & Logging
- [x] Add try/except blocks around critical operations
- [x] Implement structured logging (replace print statements)
- [x] Create logger utility with file and console output
- [ ] Create custom exception classes
- [ ] Add graceful degradation
- [ ] Improve error messages with more context
- [ ] Add retry logic for transient failures (network, API)

**Priority:** MEDIUM  
**Time estimate:** 1 day (basic) / 2 days (complete)  
**Status:** ✅ Basic implementation complete!

**Remaining Issues:**
- **No custom exceptions:** Using generic `Exception` everywhere
- **No retry logic:** Network/API failures immediately fail
- **Limited error context:** Some error messages don't include enough debugging info
- **is_document_cached() errors:** Returns False on error, might mask real issues
- **No graceful degradation:** If one component fails, entire app exits

**⚠️ IMPORTANT NOTE:**  
Current error handling uses `exit(1)` for critical failures (doc loading, splitting, vector store, agent creation). This is fine for CLI/testing but **MUST be refactored for API/UI integration** (Phase 5). When building the FastAPI server:
- Move initialization code (loading, splitting, vector store, agent) to server startup
- Replace `exit(1)` with proper HTTP error responses (500, 400, etc.)
- Only query execution should return errors without crashing the server
- See Phase 5 notes for API error handling strategy

#### 4. Document Caching
- [x] Check if documents already exist before re-loading
- [x] Add metadata tracking (source URL)
- [ ] Add timestamp metadata (last updated)
- [ ] Implement incremental updates (re-load if source changed)
- [ ] Add collection versioning
- [ ] Add document hash for change detection

**Priority:** HIGH  
**Time estimate:** 2 days  
**Status:** ✅ Basic implementation complete!

**Current Implementation:**
- ✅ `is_document_cached()` checks if source URL exists in vector store
- ✅ Source URL added to document metadata
- ✅ Skips loading/splitting/embedding if cached
- ✅ Logs cache hits for visibility

**Remaining Work:**
- **No timestamp tracking:** Can't detect if source document was updated
- **No hash comparison:** Can't detect content changes
- **No versioning:** Can't manage multiple versions of same document
- **No cache invalidation:** No way to force re-load if document updated

---

## Phase 1: Core Feature Expansion

### Goals
- Support multiple document types
- Better document management
- Flexible text processing

### Tasks

#### 1. Multi-format Document Loading
- [x] PDF loader (pypdf)
- [x] DOCX loader (python-docx)
- [x] TXT loader
- [x] Markdown loader
- [x] Create unified loader interface
- [x] Add file type detection
- [x] Handle loading errors gracefully

**Priority:** HIGH  
**Time estimate:** 3-4 days  
**Dependencies:** Phase 0 refactoring  
**Status:** ✅ Complete!

**⚠️ IMPORTANT NOTE - Scanned PDFs & OCR:**  
Current PDF loader (pypdf) only extracts text from text-based PDFs. For **scanned PDFs** (images), you'll need OCR:
- **Problem:** Scanned documents are just images - no extractable text
- **Solution:** Use OCR (Optical Character Recognition)
- **Recommended libraries:**
  - `pytesseract` + `Tesseract OCR` (free, open-source)
  - `pdf2image` (convert PDF pages to images first)
  - `pdfplumber` (better table extraction)
  - Azure Document Intelligence / AWS Textract (cloud, paid, very accurate)
- **Implementation approach:**
  1. Try pypdf first (fast for text-based PDFs)
  2. If no text extracted, fall back to OCR
  3. Add config option: `USE_OCR = True/False`
- **Future task:** Add to Phase 1 or Phase 2 as enhancement
- **Time estimate:** 1-2 days for basic OCR, 3-4 days for advanced features

**Current Implementation:**
- ✅ PDF loader created (`loaders/pdf_loader.py`)
- ✅ TXT loader created (`loaders/txt_loader.py`)
- ✅ DOCX loader created (`loaders/docx_loader.py`)
- ✅ Markdown loader created (`loaders/md_loader.py`)
- ✅ Unified loader with auto-detection (`loaders/document_loader.py`)
- ✅ Source metadata added to all documents
- ✅ Error handling with proper exceptions
- ✅ Path normalization to prevent duplicates
- ✅ Supports: Web URLs, PDF, TXT, DOCX, MD files

#### 2. Document Management
- [x] Support multiple URLs/files in one run
- [ ] Preview documents before processing
- [x] Extract and store metadata (source)
- [ ] Add document deduplication
- [ ] Implement document update/delete operations

**Priority:** MEDIUM  
**Time estimate:** 3 days  
**Status:** 🔄 Partially Complete

**Current Implementation:**
- ✅ `load_documents()` supports batch loading from list of sources
- ✅ `filter_uncached_sources()` separates cached vs new documents
- ✅ Basic metadata tracking (source URL/path)
- ⏭️ Need: Preview, deduplication, update/delete operations

#### 3. Advanced Text Splitting
- [x] Character-based splitting (RecursiveCharacterTextSplitter)
- [ ] Sentence-based splitting
- [ ] Paragraph-based splitting
- [ ] Semantic chunking
- [ ] Preview splitting results
- [ ] Save/load custom splitting configs

**Priority:** MEDIUM  
**Time estimate:** 2-3 days  
**Status:** 🔄 Partially Complete

**Current Implementation:**
- ✅ `text_splitter.py` module created
- ✅ Uses RecursiveCharacterTextSplitter
- ✅ Configurable chunk size and overlap
- ✅ Input validation for chunk parameters
- ⏭️ Need: Semantic chunking, sentence/paragraph-based splitting

#### 4. Citation & References
- [x] Add source references to chunks
- [x] Include citations in agent responses
- [x] Link chunks to original documents
- [x] Implement "view source" functionality

**Priority:** HIGH  
**Time estimate:** 2 days  
**Status:** ✅ Complete!

**Current Implementation:**
- ✅ `citation_extractor.py` module created
- ✅ Auto-numbers sources as [1], [2], [3]
- ✅ Validates citations exist in retrieved docs
- ✅ Auto-adds citations if agent forgets
- ✅ Appends "Sources:" section with cited documents
- ✅ Shows filename and page numbers in sources

---

## Phase 2: Vector Store Management

### Goals
- Flexible vector store operations
- Better observability
- Data portability

### Tasks

#### 1. Collection Management
- [ ] Create new collections
- [ ] List all collections
- [ ] Switch between collections
- [ ] Delete collections
- [ ] View collection statistics

**Priority:** MEDIUM  
**Time estimate:** 2 days

#### 2. Vector Store Operations
- [ ] Clear and reinitialize store
- [ ] View document count
- [ ] Export collection to file
- [ ] Import collection from file
- [ ] Backup/restore functionality

**Priority:** MEDIUM  
**Time estimate:** 2-3 days

#### 3. Alternative Vector Stores (Optional)
- [ ] Add Pinecone support
- [ ] Add Weaviate support
- [ ] Add FAISS support
- [ ] Create abstraction layer for easy switching

**Priority:** LOW  
**Time estimate:** 4-5 days

---

## Phase 3: LLM & Model Management

### Goals
- Model flexibility
- Cost optimization
- Better control

### Tasks

#### 1. Model Selection
- [ ] List available Ollama models
- [ ] List available OpenAI models
- [ ] Switch between models at runtime
- [ ] Model performance comparison

**Priority:** MEDIUM  
**Time estimate:** 2 days

#### 2. Configurable Parameters
- [ ] Adjust temperature
- [ ] Adjust max tokens
- [ ] Modify system prompt
- [ ] Save/load parameter presets

**Priority:** LOW  
**Time estimate:** 1-2 days

#### 3. Embedding Model Management
- [ ] Switch embedding models
- [ ] Handle dimension mismatches
- [ ] Track which model created which collection

**Priority:** MEDIUM  
**Time estimate:** 2 days

---

## Phase 4: CLI Interface

### Goals
- User-friendly command line interface
- Interactive mode
- Batch processing

### Tasks

#### 1. CLI Commands
- [ ] `hotak load <url/file>` - Load documents
- [ ] `hotak query "<question>"` - Ask questions
- [ ] `hotak list` - List collections/documents
- [ ] `hotak config` - View/edit configuration
- [ ] `hotak clear` - Clear vector store

**Priority:** MEDIUM  
**Time estimate:** 2-3 days

#### 2. Interactive Mode
- [ ] REPL-style query interface
- [ ] Command history
- [ ] Auto-completion
- [ ] Pretty-printed results

**Priority:** LOW  
**Time estimate:** 2 days

---

## Phase 5: Web API (FastAPI)

### Goals
- RESTful API
- Async operations
- API documentation

**Status:** ✅ Complete!

### Tasks

#### 1. Core Endpoints
- [x] `POST /documents/load` - Load documents
- [x] `POST /query` - Ask questions
- [x] `GET /documents` - List documents
- [x] `GET /health` - Health check
- [ ] `GET /collections` - List collections (future - multi-collection support)
- [ ] `DELETE /documents/{id}` - Delete document (future enhancement)

**Priority:** HIGH (for UI)  
**Time estimate:** 3-4 days  
**Status:** ✅ Complete!

**Completed Work:**
- ✅ FastAPI server with proper startup/shutdown lifecycle
- ✅ Error handling with HTTPException (replaced exit(1) pattern)
- ✅ POST /query - Non-streaming queries with citation validation
- ✅ POST /documents/load - Batch document loading with caching
- ✅ GET /documents - List all cached sources with chunk counts
- ✅ GET /health - Server health check
- ✅ Startup initialization moved to @app.on_event("startup")
- ✅ Path normalization to prevent duplicate sources
- ✅ Auto-generated API docs at /docs (Swagger UI)
- ✅ Logging configuration with uvicorn integration

#### 2. Advanced Features
- [x] Streaming responses (POST /query/stream)
- [ ] Background tasks for long operations
- [ ] Rate limiting
- [ ] Authentication (API keys)
- [ ] CORS configuration

**Priority:** MEDIUM  
**Time estimate:** 3 days  
**Status:** 🔄 Partially Complete (Streaming implemented)

**Completed Work:**
- ✅ POST /query/stream - Server-sent events for streaming responses

#### 3. WebSocket Support
- [ ] Real-time query streaming
- [ ] Progress updates for loading
- [ ] Live agent thinking process

**Priority:** LOW  
**Time estimate:** 2 days

---

## Phase 6: Web UI with Template System

### Goals
- Template-based knowledge management ("Brains")
- Chat sessions with/without templates
- User-friendly interface

### Architecture Overview

**Knowledge Template (Brain):**
- Name, description, custom prompt
- Attached documents/URLs
- Settings: model, temperature, chunk size, retrieval_k
- Reusable across multiple chats
- Always persistent

**Chat Session:**
- Optional template binding
- Conversation history
- If template → always use its docs/settings
- If no template → ad-hoc mode

**Ad-hoc Mode:**
- Quick upload + ask
- No template, no persistence
- Session-only memory

---

### Backend Tasks

#### 1. Template Management API
- [ ] Database schema for templates (SQLite or JSON files)
- [ ] `POST /templates` - Create template
- [ ] `GET /templates` - List all templates
- [ ] `GET /templates/{id}` - Get template details
- [ ] `PUT /templates/{id}` - Update template
- [ ] `DELETE /templates/{id}` - Delete template
- [ ] Template model: name, description, sources[], settings{}

**Priority:** HIGH  
**Time estimate:** 2-3 days  
**Dependencies:** Phase 5 complete

#### 2. Chat Session API
- [ ] Database schema for chat sessions
- [ ] `POST /chats` - Create new chat (with/without template_id)
- [ ] `GET /chats` - List all chats
- [ ] `GET /chats/{id}` - Get chat history
- [ ] `POST /chats/{id}/message` - Send message to chat
- [ ] `DELETE /chats/{id}` - Delete chat
- [ ] Chat model: template_id (optional), messages[], created_at

**Priority:** HIGH  
**Time estimate:** 2-3 days  
**Dependencies:** Template API complete

#### 3. Context Management
- [ ] Load template's documents on chat creation
- [ ] Use template's settings (prompt, retrieval_k, etc.)
- [ ] Maintain conversation history per chat
- [ ] Support ad-hoc document upload in non-template chats
- [ ] Clear template cache when template updated

**Priority:** HIGH  
**Time estimate:** 2 days

---

### Frontend Tasks

#### 1. Template Builder UI
- [ ] Template list page
- [ ] Create/edit template form:
  - Name, description
  - Documents/URLs input (multi-line)
  - System prompt editor (textarea)
  - Settings panel (temperature, retrieval_k, chunk size)
  - Save/cancel buttons
- [ ] Template card component (shows name, doc count, settings)
- [ ] Delete template confirmation
- [ ] Loading/error states

**Priority:** HIGH  
**Time estimate:** 2-3 days

#### 2. Chat Interface UI
- [ ] Chat list sidebar (show all chats)
- [ ] Create new chat modal:
  - Option 1: Select template
  - Option 2: Start without template (ad-hoc)
- [ ] Chat window:
  - Message list
  - Input box
  - Send button
  - Template badge (if using template)
  - Document upload button (ad-hoc mode only)
- [ ] Citation display with sources
- [ ] Delete chat option

**Priority:** HIGH  
**Time estimate:** 3-4 days

#### 3. Layout & Navigation
- [ ] Three-panel layout:
  - Left: Templates + Chats list
  - Center: Active chat
  - Right: Template/chat info (collapsible)
- [ ] Responsive design
- [ ] Navigation between templates and chats
- [ ] Active state indicators

**Priority:** MEDIUM  
**Time estimate:** 2 days

#### 4. Advanced UI Features
- [ ] Template preview (show loaded docs)
- [ ] Citation highlighting in answers
- [ ] Export chat history
- [ ] Search templates/chats
- [ ] Dark mode
- [ ] Keyboard shortcuts

**Priority:** LOW  
**Time estimate:** 3-5 days

---

## Phase 7: Production Readiness

### Goals
- Deployment ready
- Monitoring
- Testing

### Tasks

#### 1. Testing
- [ ] Unit tests for all modules
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Load testing

**Priority:** HIGH  
**Time estimate:** 4-5 days

#### 2. Deployment
- [ ] Docker containerization
- [ ] Docker Compose setup
- [ ] Environment-based configuration
- [ ] Health check endpoints

**Priority:** MEDIUM  
**Time estimate:** 2-3 days

#### 3. Monitoring & Observability
- [ ] Metrics collection
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Usage analytics

**Priority:** MEDIUM  
**Time estimate:** 2-3 days

#### 4. Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide
- [ ] Deployment guide
- [ ] Architecture documentation

**Priority:** MEDIUM  
**Time estimate:** 2-3 days

---

## Current Progress Summary

**✅ Completed:**
- Phase 0: Foundation & Refactoring (Configuration, Logging, Error Handling, Caching)
- Phase 1, Task 1: Multi-format Document Loading (Web, PDF, TXT, DOCX, MD)
- Phase 1, Task 2: Multiple Documents Support (Batch loading, caching)
- Phase 1, Task 3: Basic Text Splitting (RecursiveCharacterTextSplitter)
- Phase 1, Task 4: Citation & References (Auto-validation, source attribution)
- Phase 5: Web API (FastAPI) - Core endpoints, streaming, error handling

**🎯 Next Recommended:** Phase 6 - Build Template-Based Web UI

**Current Focus:**
1. Backend: Template Management API (Phase 6, Backend Task 1)
2. Frontend: Template Builder UI (Phase 6, Frontend Task 1)
3. Then: Chat Session API + UI

**Alternative Options (Lower Priority):**
- Phase 1, Task 3: Semantic Chunking (Better text splitting)
- Phase 2: Vector Store Management (Collection management, backup/restore)
- Phase 3: LLM Model Management (Switch models at runtime)

---

## Technology Stack Recommendations

### Current
- ✅ Python 3.12
- ✅ LangChain
- ✅ ChromaDB
- ✅ FastAPI (installed)
- ✅ OpenAI / Ollama

### Additions Needed
- **Logging:** `loguru` or Python's `logging`
- **Config:** `pydantic-settings`
- **CLI:** `click` or `typer`
- **Testing:** `pytest`
- **PDF:** `pypdf` or `pdfplumber`
- **DOCX:** `python-docx`
- **UI (if chosen):** `streamlit` (easiest) or `React` (more flexible)

---

## Notes

- **Start small:** Don't try to implement everything at once
- **Test as you go:** Write tests for each module
- **Document changes:** Keep this roadmap updated
- **Get feedback:** Test with real use cases early
- **Iterate:** Refine based on what you learn

Good luck! 🚀
