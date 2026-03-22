# Hotak AI - Development Roadmap (Active)

## 🎯 Current Status: Phase 6 Complete — Entering Phase 7 (Production Readiness)

We are building a template-based knowledge management system ("Brains") allowing users to create reusable knowledge templates for chat sessions.

### Architecture Overview
- **Knowledge Template (Brain):** Name, description, attached documents/URLs, custom settings, system prompt.
- **Chat Session:** Bind to a template or run ad-hoc (no template).
- **Ad-hoc Mode:** Quick upload + ask without templates.

---

## 🔄 Phase 6: Web UI Development (In Progress)

### Frontend Status
- [x] TypeScript Models (Step 3) - Done
- [x] API Service Layer (Step 4) - Done
- [x] Template Builder Component (Step 5) - Done
- [x] Generic Modal/Form/Input Components (Step 5.5) - Done
- [x] **Template List Component (Step 6)** - ✅ Done
  - Display all templates as cards.
  - Implement Edit/Delete operations.
- [x] **Chat Components (Step 7-8)** - ✅ Done
  - [x] Chat shell for `ChatWindow.tsx` and `Composer.tsx`.
  - [x] Message display with source/citation rendering.
  - [x] Markdown rendering for assistant replies.
  - [x] Deduped clickable source links.
  - [x] URL/file attachment ingestion baseline with per-message attachment chips.
  - [x] Streaming responses with graceful fallback.
  - [x] Sidebar chat/session management (rename, pin, delete).
- [x] **App Layout Polish (Step 9)** - ✅ Done
  - [x] `App.tsx` shell (collapsible sidebar, responsive header).
  - [x] Navigation between Chat/Templates views.
  - [x] Model selector integration.
- [x] **Tailwind CSS Styling (Step 10)** - ✅ Done
  - [x] Installed `tailwindcss` + `@tailwindcss/vite` (v4) and wired into `vite.config.ts`.
  - [x] Mapped all CSS custom property design tokens to a Tailwind `@theme` block in `index.css`.
  - [x] Migrated `App.css` (global layout) to use `@apply` directives throughout.
  - [x] Migrated all 7 CSS module files to use `@apply` directives (`Modal`, `ConfirmDialog`, `Toastr`, `ArchivedChatsModal`, `Composer`, `TemplateBuilder`, `TemplateList`).

### Backend Status
- [x] Template API Endpoints (CRUD) - Done
- [x] **Chat Session API** - ✅ Done (CRUD + Persistence)
- [x] **AI Response Integration** - ✅ Done
  - [x] Query endpoint connected to RAG agent.
  - [x] Streaming query endpoint connected to RAG agent.
  - [x] Rate-limit and permission-denied handling.
- [x] **Model Catalog API** - ✅ Done
  - [x] `GET /models` list endpoint.
  - [x] `GET /models/{model_id}` retrieve endpoint.
- [x] **Multi-Turn Query Context Baseline** - ✅ Done
  - [x] `QueryRequest` supports `chat_id` and optional `messages` payload.
  - [x] Query/stream endpoints compose history for the selected model.
  - [x] Duplicate last-user-turn guard in history assembly.
- [x] **Context Packing Hardening** - ✅ Baseline Done
  - [x] Replaced fixed message-count window with token-budget history packing.
  - [x] Added per-message truncation guard for oversized historical turns.
  - [x] Added one-shot delayed retry for transient stream 429s.
- [x] **Attachment API Baseline** - ✅ Done
  - [x] Added `/documents/upload` multipart endpoint for file ingestion.
  - [x] Persisted message-level attachment metadata (`url`/`file`, status, source).
- [x] **Ingestion Reliability Hardening** - ✅ Done
  - [x] Web loader falls back to full-page parse when filtered parse is empty.
  - [x] Empty extracted sources are marked failed instead of crashing split/embed with 500.
- [x] **Telemetry Noise Mitigation** - ✅ Done
  - [x] Chroma client initialized via explicit `PersistentClient` with `anonymized_telemetry=False`.
  - [x] `chromadb.telemetry.product.posthog` logger suppressed at ERROR level in `server.py` (workaround for posthog version-mismatch bug that fires even with telemetry disabled).
- [x] **Template Source Filtering** - ✅ Done
  - [x] Template `sources` list passed through `AgentRuntimeConfig.allowed_sources`.
  - [x] `create_retrieval_tool` applies ChromaDB `{"source": {"$in": ...}}` filter when sources are set.
  - [x] Agent cache key includes sorted sources to isolate per-template agents.
  - [x] Falls back to searching all documents when template has no sources.
- [x] **Streaming Mode Fix** - ✅ Done
  - [x] Switched from `stream_mode="values"` (full-state snapshots) to `stream_mode="messages"` (true token streaming).
  - [x] Added `isinstance(token, AIMessageChunk)` filter to exclude retrieved doc content from stream output.
  - [x] Raised `LLM_MAX_TOKENS` default to 4096 and `STREAM_MAX_CHARS` to 32000.
- [x] **Model Access UX Hardening** - ✅ Done
  - [x] `app/services/model_catalog.py` probes each chat model candidate at startup with a `max_tokens=1` request.
  - [x] `GET /models` serves only confirmed-accessible models from `app.state.accessible_models`.
  - [x] Frontend `isLikelyChatModel` client-side filter removed — backend is now authoritative.
- [x] **Context Memory Hardening** - ✅ Done
  - [x] Add optional rolling summary memory block for long chats.
  - [ ] Tune retrieval reduction based on remaining token budget.
- [x] **Attachment UX Hardening** - ✅ Done
  - [x] Replace prompt-based URL entry with an inline composer URL field.
  - [x] Add per-attachment progress indicators during ingestion.
  - [x] Add toast feedback for attach success/partial failure/failure.
  - [x] Add pre-upload validation feedback for file size/type before network call.
  - [x] Add drag-and-drop attachment support.
  - [x] Replace placeholder template action with real template source selection.
  - [x] Add Archive action to chat context menu (sidebar chat rows).
  - [x] Archived Chats modal — searchable list with per-item Unarchive/Delete and bulk Unarchive All / Delete All.
  - [x] Add byte-level upload progress percentages.
  - [x] Persist template-uploaded local files as reusable saved sources for template attach parity.


---

## 🔄 UI Architecture Reference

### Components Location
- **Templates:** `src/components/page/TemplateList/TemplateList.tsx`
- **Chat:** `src/components/page/ChatWindow/ChatWindow.tsx` and `src/components/common/Composer/Composer.tsx`
- **Common:** `src/components/common/Modal/Modal.tsx` and `src/components/common/ConfirmDialog/ConfirmDialog.tsx`

### Visual & Layout Style
- **Sidebar:** Always collapsible.
- **Header:** Model selector in top-right.
- **Input Bar:** Rounded corners, left action cluster (+ for templates/files).
- **Empty State:** Greeting + centered composer; send starts session.
- **Model Visibility:** Active model badge appears next to assistant name per chat.
- **Message Provenance:** Assistant bubble can display the model used for that specific reply.
- **Source UX:** Source chips expand into deduped links that open external documents in a new tab.
- **User Attachment UX:** User bubbles show attached URL/file chips with ingestion status.

---

## 🚀 Phase 7: Production Readiness

### Phase 7.1 — Authentication & User Identity
- [ ] **Backend:** User model + register/login endpoints (JWT access + refresh tokens)
- [ ] **Backend:** Auth middleware — protect all `/chats`, `/messages`, `/query`, `/templates`, `/documents` routes
- [ ] **Frontend:** Login / Register pages
- [ ] **Frontend:** Auth context (store token, auto-refresh, redirect to login on 401)
- [ ] **Frontend:** Logout action in profile popover

### Phase 7.2 — Per-User Data Isolation
- [ ] **Backend:** Scope chats, templates, and uploaded documents to authenticated user (DB foreign keys + query filters)
- [ ] **Backend:** ChromaDB namespace per user (prevent cross-user document retrieval)

### Phase 7.3 — User Settings
- [ ] **Backend:** User settings model (default model, system prompt override, etc.)
- [ ] **Frontend:** Settings page/modal accessible from profile popover
- [ ] **Frontend:** Persist model preference per user (instead of per-session only)

### Phase 7.4 — Docker
- [ ] `Dockerfile` for backend (FastAPI + ChromaDB volume mount)
- [ ] `Dockerfile` for frontend (Vite build → nginx)
- [ ] `docker-compose.yml` with env var wiring for both services

### Phase 7.5 — Testing
- [ ] **Backend:** Unit tests for core services (query, ingestion, model catalog)
- [ ] **Backend:** Integration tests hitting real FastAPI + real ChromaDB
- [ ] **Frontend:** Component tests for critical flows (send message, attach file, template picker)
- [ ] Token-estimation quality tuning and summary refresh strategy tests

### Phase 7.6 — Observability
- [ ] Structured logging (request IDs, user IDs, latency)
- [ ] Token usage tracking per user/chat
- [ ] Health check endpoint (`/health`)
- [ ] Advanced monitoring & alerting

---

## 🛠️ Technology Stack (Quick Reference)

- **Frontend:** React 18, TypeScript, Vite, Axios, Tailwind CSS.
- **Backend:** Python 3.12, FastAPI, LangChain, ChromaDB.
- **LLM:** OpenAI (GPT-4o) / Ollama (Llama3).

