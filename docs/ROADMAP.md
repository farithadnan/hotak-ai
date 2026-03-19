# Hotak AI - Development Roadmap (Active)

## 🎯 Current Status: Phase 6.8 - Chat Attachment Ingestion Baseline

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
- [ ] **Tailwind CSS Styling (Step 10)** - Planned

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
- [ ] **Model Access UX Hardening** - 🎯 **NEXT STEP**
  - [ ] Filter inaccessible models from `GET /models`.
  - [ ] Remove telemetry warning noise in logs.
- [ ] **Context Memory Hardening** - Planned (after UX hardening)
  - [ ] Add optional rolling summary memory block for long chats.
  - [ ] Tune retrieval reduction based on remaining token budget.
- [ ] **Attachment UX Hardening** - Planned
  - [x] Replace prompt-based URL entry with an inline composer URL field.
  - [x] Add per-attachment progress indicators during ingestion.
  - [x] Add toast feedback for attach success/partial failure/failure.
  - [ ] Add pre-upload validation feedback for file size/type before network call.
  - [ ] Add drag-and-drop attachment support.


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

## 🚀 Phase 7: Production Readiness (Future)

- [ ] Unit & Integration Testing
- [ ] Docker Containerization
- [ ] Authentication (API Keys/JWT)
- [ ] Advanced Monitoring & Observability
- [ ] Token-estimation quality tuning and summary refresh strategy tests

---

## 🛠️ Technology Stack (Quick Reference)

- **Frontend:** React 18, TypeScript, Vite, Axios, Tailwind CSS.
- **Backend:** Python 3.12, FastAPI, LangChain, ChromaDB.
- **LLM:** OpenAI (GPT-4o) / Ollama (Llama3).

