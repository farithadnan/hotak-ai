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

## Phase 6: Web UI with Template System ⭐ IN PROGRESS

### Overview
Template-based knowledge management ("Brains") allowing users to create reusable knowledge templates that can be attached to chat sessions. Both ad-hoc chat (no template) and template-based chat (organized knowledge) are supported.

### Architecture
- **Knowledge Template (Brain):** Name, description, attached documents/URLs, custom settings, system prompt
- **Chat Session:** Can bind to a template or run ad-hoc (no template)
- **Ad-hoc Mode:** Quick upload + ask without templates

---

### Backend Status: ✅ COMPLETE (Feb 5, 2026)

#### ✅ Template Data Models
**File:** `app/models/template.py`
- [x] TemplateSettings (model, temperature, chunk_size, chunk_overlap, retrieval_k, system_prompt)
- [x] TemplateCreate (input validation)
- [x] Template (full model with UUID, timestamps)
- [x] TemplateUpdate (partial updates)
- **Completed:** Feb 5, 2026

#### ✅ Template Storage Layer
**File:** `app/storage/template_storage.py`
- [x] JSON file persistence at `app/data/templates/templates.json`
- [x] CRUD functions: create_template, get_all_templates, get_template, update_template, delete_template
- [x] Automatic directory creation
- [x] UUID generation for IDs
- [x] Timestamp tracking
- **Completed:** Feb 5, 2026

#### ✅ Template API Endpoints
**File:** `app/server.py`
- [x] POST /templates - Create new template
- [x] GET /templates - List all templates
- [x] GET /templates/{id} - Get single template
- [x] PUT /templates/{id} - Update template
- [x] DELETE /templates/{id} - Delete template
- [x] Error handling with HTTPException
- [x] Tested via curl successfully
- **Completed:** Feb 5, 2026

#### ✅ Path Configuration Fixes
- [x] Fixed `app/config/settings.py` to use Path objects
- [x] Fixed `app/storage/template_storage.py` path calculation
- [x] Verified files created in `app/data/templates/` not root directory
- [x] Verified logs created in `app/logs/` not root directory
- **Completed:** Feb 5, 2026

---

### Frontend Status: 🔄 IN PROGRESS

#### ✅ TypeScript Models (Step 3)
**File:** `frontend/src/types/models.ts`
- [x] Template, TemplateCreate, TemplateUpdate, TemplateSettings interfaces
- [x] Chat, Message, MessageCreate interfaces (for future use)
- [x] Type guards (isTemplate, isTemplateSettings)
- [x] Default constants (DEFAULT_TEMPLATE_SETTINGS, AVAILABLE_MODELS)
- [x] Comprehensive inline documentation
- **Completed:** Feb 5, 2026

#### ✅ API Service Layer (Step 4)
**File:** `frontend/src/services/api.ts`
- [x] createTemplate(data) - POST /templates
- [x] getTemplates() - GET /templates
- [x] getTemplate(id) - GET /templates/{id}
- [x] updateTemplate(id, data) - PUT /templates/{id}
- [x] deleteTemplate(id) - DELETE /templates/{id}
- [x] Error handling (getErrorMessage utility)
- [x] Backward compatibility with legacy functions
- [x] Comprehensive inline documentation with examples
- **Completed:** Feb 5, 2026

#### ✅ Template Builder Component (Step 5)
**File:** `frontend/src/components/TemplateBuilder.tsx`
- [x] Form with name, description, sources, settings inputs
- [x] Validation (required fields, value ranges)
- [x] API integration (call createTemplate/updateTemplate)
- [x] Loading/error states
- [x] Success notification
- **Completed:** Feb 6, 2026
- **Status:** ✅ Complete and tested

#### ⏭️ Template List Component (Step 6 - NEXT)
**File:** `frontend/src/components/TemplateList.tsx` (Currently working)
- [x] Display all templates from getTemplates() - need to convert to table?
- [ ] Edit and delete operations
- [ ] Create new template button
- [ ] Loading/error states
- **Time Estimate:** 2-3 hours
- **Status:** Currently working

#### ⏭️ Chat Components (Steps 7-8)
**Files:** `ChatWindow.tsx`, `ChatSidebar.tsx` (Not started)
- [ ] Chat window with message display
- [ ] Chat list/sidebar with chat selector
- [ ] Message input and sending
- [ ] Citation display
- **Time Estimate:** 6-8 hours total
- **Depends on:** Backend chat endpoints (not yet implemented)

#### ⏭️ App Layout (Step 9)
**File:** `src/App.tsx` (In progress)
- [x] Initial layout shell (sidebar, header, chat area)
- [x] Empty-state composer centered with greeting
- [x] Input moves to bottom only after send
- [ ] Navigation between templates and chats
- [ ] Responsive design polish
**Time Estimate:** 1-2 hours remaining

#### ⏭️ Styling with Tailwind (Step 10)
**File:** `src/index.css`, component styles (Not started)
- [ ] Install and configure Tailwind CSS
- [ ] Style all components
- [ ] Consistent design system
- [ ] Responsive layout
- **Time Estimate:** 4-5 hours

**Style Direction (Open WebUI inspired):**
- Dark mode first; deep gray/near-black backgrounds (e.g., #1a1a1a)
- Subtle borders over heavy shadows
- Accent color: soft off-white or muted electric blue/purple
- Clean sans-serif stack (Inter, Geist, or system default)

---

### Notes for Next Session (Continue Here 👈)

**✅ What's Been Completed (Feb 6, 2026):**
1. ✅ Fixed import issues (changed all relative → absolute imports in backend)
2. ✅ Template Builder component fully working
3. ✅ Can create templates via UI (tested successfully)
4. ✅ Templates saved to `app/data/templates/templates.json`
5. ✅ Form validation, error handling, success messages all working

**✅ Update (Feb 11, 2026):**
1. ✅ Chose Open WebUI-inspired UI direction (dark, minimal, utility-first)
2. ✅ Sidebar always collapsible; model selector in top-right header
3. ✅ Input bar uses rounded style with + menu (anchored dropdown) and tools icon
4. ✅ Hover actions on last user message (copy/edit inline)
5. ✅ Empty state: greeting + centered composer; session starts only on send
6. ✅ Removed composer top divider; + icon used for the attach menu

**📋 Immediate Next Step: Template List Component**

Build `frontend/src/components/TemplateList.tsx` to:
1. **Fetch templates:** Use `getTemplates()` from API service
2. **Display as cards:** Show name, description, source count for each
3. **Add Edit button:** Click → load template data into TemplateBuilder in edit mode
4. **Add Delete button:** Click → confirm → call `deleteTemplate(id)`
5. **Add "Create New" button:** Opens TemplateBuilder in create mode
6. **Loading state:** Show "Loading..." while fetching
7. **Empty state:** Show "No templates yet" if list is empty

**Then:**
8. Wire mock "new chat" creation on send (optional, UI-only)
9. Finish App layout navigation between Templates and Chat views

**🚀 Implementation Tips:**
```typescript
// 1. Fetch templates on component mount
const [templates, setTemplates] = useState<Template[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  getTemplates()
    .then(setTemplates)
    .catch(err => setError(err.message))
    .finally(() => setIsLoading(false));
}, []);

// 2. Map templates to list/grid
{templates.map(template => (
  <div key={template.id}>
    <h3>{template.name}</h3>
    <p>{template.description}</p>
    <button onClick={() => handleEdit(template.id)}>Edit</button>
    <button onClick={() => handleDelete(template.id)}>Delete</button>
  </div>
))}
```

**⏸️ When to Pause:**
- After Step 6 works (can list, edit, delete templates)
- Before chat features (those need backend chat endpoints first)

---

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
- **Phase 6 Backend:** Template system complete (models, storage, API endpoints)
- **Phase 6 Frontend Foundation:** TypeScript models, API service layer
- **Phase 6 Frontend Step 5:** Template Builder component ✅ (Feb 6, 2026)

**🎯 Next Session (2-3 Hours):**
- Phase 6 Frontend Step 6: Template List Component (display/edit/delete templates)

**📋 Ready Next:**
- Template List component (displays all templates)
- Chat components (require backend chat endpoints first)

**Alternative Options (Lower Priority):**
- Phase 1, Task 3: Semantic Chunking (Better text splitting)
- Phase 2: Vector Store Management (Collection management, backup/restore)
- Phase 3: LLM Model Management (Switch models at runtime)
- Backend Chat API (required before chat UI works)

---

## Session Summary (February 5, 2026)

### What Was Accomplished

**Backend Foundation:**
1. ✅ Fixed path configuration issues in `app/config/settings.py` and `app/storage/template_storage.py`
2. ✅ Verified template API working correctly (tested with curl)
3. ✅ Confirmed files created in correct directories (`app/data/templates/`, `app/logs/`)

**Frontend Foundation:**
1. ✅ Created `frontend/src/types/models.ts` - Complete TypeScript interfaces mirroring Python models
   - Templates, Chats, Messages with full documentation
   - Type guards for runtime checking
   - Default constants for UI forms
   - Detailed explanations of each concept

2. ✅ Enhanced `frontend/src/services/api.ts` - API service layer with CRUD functions
   - 5 new template functions (create, read, update, delete, list)
   - Error handling with standardized messages
   - Axios generics for type safety
   - Comprehensive documentation with examples

### Key Learnings Explained

**TypeScript Concepts:**
- Interfaces vs Types
- Optional properties (`?`)
- Union types (`|`)
- Generic types (`<T>`)
- Type guards for runtime safety
- Default constants and exports

**API Patterns:**
- CRUD operations (Create, Read, Update, Delete)
- Axios instance setup and configuration
- Error handling pyramid (multiple error sources)
- Promise chaining with async/await
- Type-safe HTTP requests with generics

**Project Architecture:**
- Service layer abstraction
- Separation of concerns (Models, Storage, API)
- Type safety at multiple layers (TypeScript, Python, JSON)
- Error handling consistency

### Code Quality
- ✅ Over 500 lines of detailed inline documentation
- ✅ All concepts explained step-by-step
- ✅ Real-world code examples provided
- ✅ Learning-focused with "WHY" explanations

### Handoff Notes for Next Session

**What's Ready:**
```typescript
✅ Models defined (frontend/src/types/models.ts)
✅ API functions written (frontend/src/services/api.ts)
✅ Backend working (POST/GET/PUT/DELETE /templates)
✅ Path issues fixed (files in right directories)
```

**What to Build Next:**
```typescript
⏭️ TemplateBuilder.tsx - Form component
   Location: frontend/src/components/TemplateBuilder.tsx
   Time: 3-4 hours
   Difficulty: Medium
   Uses: createTemplate(), updateTemplate() from api.ts
```

**Quick Reference:**
- Frontend dev server: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Templates stored at: app/data/templates/templates.json
- Logs at: app/logs/app.log

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

---

## Session Summary (February 6, 2026)

### Issues Resolved
1. **Import Error Fixed:**
   - Problem: Server crashed with "attempted relative import with no known parent package"
   - Root cause: `server.py` as entry point can't use relative imports (`.utils.logger`)
   - Solution: Changed ALL imports in `app/` from relative to absolute (removed leading dots)
   - Changed files: `server.py`, all modules in `utils/`, `models/`, `storage/`, `loaders/`, `agents/`
   - Result: Backend now starts successfully with `uvicorn server:app --reload`

2. **Cross-Computer Import Consistency:**
   - Explained why imports work differently on different computers (PYTHONPATH, run location)
   - Standardized on absolute imports + always run from `app/` directory
   - This is the correct, standard approach for uvicorn

### Frontend Progress

**Step 5 Complete: Template Builder Component ✅**

Built `frontend/src/components/TemplateBuilder.tsx` with:

**All Form Fields Implemented:**
- ✅ Name input (required validation)
- ✅ Description textarea (optional)
- ✅ Sources textarea (one per line, converts to array)
- ✅ Model dropdown (gpt-4o-mini, gpt-4o, etc.)
- ✅ Temperature slider (0.0-1.0 with live value display)
- ✅ Chunk size input (number validation)
- ✅ Chunk overlap input (number validation)
- ✅ Retrieval K input (number validation)
- ✅ System prompt textarea (optional, large)

**Form Features:**
- ✅ Controlled inputs (React state management)
- ✅ Form validation (name required, can't submit empty)
- ✅ Submit handler with async API call
- ✅ Loading state (button shows "Creating...", disabled during submission)
- ✅ Error handling (red error box with message)
- ✅ Success handling (green success box, form reset)
- ✅ Proper TypeScript types throughout

**Integration:**
- ✅ Uses `createTemplate()` from API service
- ✅ Uses `DEFAULT_TEMPLATE_SETTINGS` from models
- ✅ Imported into `App.tsx` and rendered
- ✅ Tested end-to-end: form → API → backend → templates.json

**Testing Results:**
- ✅ Created test template via UI
- ✅ Verified saved to `app/data/templates/templates.json`
- ✅ Backend logs show successful creation
- ✅ Success message displayed in UI

### Learning Points Covered

**React Concepts:**
- `useState` for form data, loading, error, success states
- Event handlers (`onChange`, `onSubmit`)
- Controlled inputs (value from state, update state on change)
- Async/await with try/catch/finally pattern
- Conditional rendering (`{error && <div>...</div>}`)
- Disabled state based on conditions
- Form prevention of default behavior

**TypeScript:**
- Interface usage (`TemplateCreate`, `Template`)
- Type annotations (`React.FormEvent`, `e: React.ChangeEvent<HTMLInputElement>`)
- Optional chaining and null coalescing (`formData.description || ''`)
- Type imports (`import type { ... }`)

**Data Flow:**
- User input → React state → API service → Backend → Database
- Nested object updates (settings within formData)
- Array handling (sources split/join operations)
- Number parsing (`parseInt`, `parseFloat`, `.toFixed()`)

**Why Bottom-Up Approach:**
- Validate core functionality early (form → API → backend)
- See immediate results (templates created)
- Fail fast (catch API issues before building fancy layout)
- Learning focused (understand data flow first)
- Backend was ready (template API complete)

### File Structure Now

```
frontend/src/
├── components/
│   └── TemplateBuilder.tsx  ← NEW (Step 5 ✅)
├── types/
│   └── models.ts            ← Complete (Step 3 ✅)
├── services/
│   └── api.ts               ← Complete (Step 4 ✅)
├── App.tsx                  ← Updated (imports TemplateBuilder)
└── ...
```

### What's Next (Step 6)

**Template List Component** (`frontend/src/components/TemplateList.tsx`)
- Fetch all templates using `getTemplates()`
- Display as cards/list with name, description, source count
- Edit button → populate TemplateBuilder with existing data
- Delete button → confirm → call `deleteTemplate(id)`
- "Create New" button
- Loading/empty/error states

**Time estimate:** 2-3 hours  
**Status:** Ready to start (all dependencies met)

### Commands Updated

Added to `README.md`:
```bash
# Backend (FastAPI)
cd app
conda activate hotak-ai-venv
uvicorn server:app --reload

# Frontend (React)
cd frontend
npm run dev
```

---

Good luck! 🚀
