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
- [ ] Create custom exception classes
- [ ] Add graceful degradation

**Priority:** MEDIUM  
**Time estimate:** 1 day  
**Status:** ✅ Basic implementation complete!

**⚠️ IMPORTANT NOTE:**  
Current error handling uses `exit(1)` for critical failures (doc loading, splitting, vector store, agent creation). This is fine for CLI/testing but **MUST be refactored for API/UI integration** (Phase 5). When building the FastAPI server:
- Move initialization code (loading, splitting, vector store, agent) to server startup
- Replace `exit(1)` with proper HTTP error responses (500, 400, etc.)
- Only query execution should return errors without crashing the server
- See Phase 5 notes for API error handling strategy

#### 4. Document Caching
- [ ] Check if documents already exist before re-loading
- [ ] Add metadata tracking (last updated, source URL)
- [ ] Implement incremental updates
- [ ] Add collection versioning

**Priority:** HIGH  
**Time estimate:** 2 days

---

## Phase 1: Core Feature Expansion

### Goals
- Support multiple document types
- Better document management
- Flexible text processing

### Tasks

#### 1. Multi-format Document Loading
- [ ] PDF loader (PyPDF2 or pdfplumber)
- [ ] DOCX loader (python-docx)
- [ ] TXT loader
- [ ] Markdown loader
- [ ] Create unified loader interface
- [ ] Add file type detection
- [ ] Handle loading errors gracefully

**Priority:** HIGH  
**Time estimate:** 3-4 days  
**Dependencies:** Phase 0 refactoring

#### 2. Document Management
- [ ] Support multiple URLs/files in one run
- [ ] Preview documents before processing
- [ ] Extract and store metadata (title, author, date, source)
- [ ] Add document deduplication
- [ ] Implement document update/delete operations

**Priority:** MEDIUM  
**Time estimate:** 3 days

#### 3. Advanced Text Splitting
- [ ] Sentence-based splitting
- [ ] Paragraph-based splitting
- [ ] Semantic chunking
- [ ] Preview splitting results
- [ ] Save/load custom splitting configs

**Priority:** MEDIUM  
**Time estimate:** 2-3 days

#### 4. Citation & References
- [ ] Add source references to chunks
- [ ] Include citations in agent responses
- [ ] Link chunks to original documents
- [ ] Implement "view source" functionality

**Priority:** HIGH  
**Time estimate:** 2 days

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

**⚠️ CRITICAL REFACTORING NEEDED:**  
Before building the API, refactor error handling from Phase 0:
- **Current:** Script uses `exit(1)` for errors (doc loading, splitting, vector store, agent creation)
- **Needed:** Move initialization to `@app.on_event("startup")` and replace `exit(1)` with HTTP exceptions
- **Strategy:**
  - Server startup: Load docs/create agent once. If fails, server won't start
  - Query endpoint: Return `HTTPException(500)` on error, don't crash server
  - Frontend can handle 500 errors and let user retry

### Tasks

#### 1. Core Endpoints
- [ ] `POST /documents/load` - Load documents
- [ ] `POST /query` - Ask questions
- [ ] `GET /collections` - List collections
- [ ] `GET /documents` - List documents
- [ ] `DELETE /documents/{id}` - Delete document

**Priority:** HIGH (for UI)  
**Time estimate:** 3-4 days

#### 2. Advanced Features
- [ ] Streaming responses
- [ ] Background tasks for long operations
- [ ] Rate limiting
- [ ] Authentication (API keys)
- [ ] CORS configuration

**Priority:** MEDIUM  
**Time estimate:** 3 days

#### 3. WebSocket Support
- [ ] Real-time query streaming
- [ ] Progress updates for loading
- [ ] Live agent thinking process

**Priority:** LOW  
**Time estimate:** 2 days

---

## Phase 6: Web UI (Optional)

### Goals
- User-friendly interface
- Visual document management
- Interactive querying

### Tasks

#### 1. Basic UI (React/Vue/Streamlit)
- [ ] Document upload interface
- [ ] Query input and results display
- [ ] Collection management
- [ ] Settings panel

**Priority:** MEDIUM  
**Time estimate:** 5-7 days

#### 2. Advanced UI Features
- [ ] Document preview
- [ ] Citation highlighting
- [ ] Query history
- [ ] Export conversations
- [ ] Dark mode

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

## Recommended Starting Path

### Week 1-2: Foundation
1. 🔄 Phase 0, Task 1: Refactor into modules (folders created, configs extracted ✅)
2. ✅ Phase 0, Task 2: Configuration system (basic implementation complete)
3. ⏭️ Phase 0, Task 4: Document caching

### Week 3-4: Core Features
4. ✅ Phase 1, Task 1: Multi-format loaders
5. ✅ Phase 1, Task 4: Citations
6. ✅ Phase 0, Task 3: Error handling

### Week 5-6: API Layer
7. ✅ Phase 5, Task 1: Core API endpoints
8. ✅ Phase 2, Task 1: Collection management

### Week 7+: Choose Your Path
- **Backend-focused:** Phase 2 & 3 (vector stores & models)
- **User-focused:** Phase 4 & 6 (CLI & UI)
- **Production-focused:** Phase 7 (testing & deployment)

---

## Quick Wins (Do These First)

1. ✅ **Extract config to settings.py** (1 hour) - DONE!
2. **Replace hardcoded values in main.py with imports** (30 min) - IN PROGRESS
3. **Add logging instead of print** (30 min)
4. **Add error handling for document loading** (1 hour)
5. **Check if docs exist before re-embedding** (2 hours)
6. **Add PDF support** (2-3 hours)

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
