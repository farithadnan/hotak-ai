# Hotak AI - Development Roadmap (Active)

## 🎯 Current Status: Phase 6 - Web UI with Template System

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
- [ ] **Chat Components (Step 7-8)** - 🔄 **In Progress**
  - [x] Basic UI shell for `ChatWindow.tsx` and `Composer.tsx`.
  - [ ] Message display with citation formatting (needs backend).
  - [ ] Streaming responses (needs backend).
  - [ ] Chat sidebar/session management (needs backend).
- [ ] **App Layout Polish (Step 9)** - 🔄 **In Progress**
  - [x] Initial shell in `App.tsx` (collapsible sidebar, responsive header).
  - [x] Navigation between Chat/Templates views.
  - [ ] Model selector integration.
- [ ] **Tailwind CSS Styling (Step 10)** - Planned

### Backend Status
- [x] Template API Endpoints (CRUD) - Done
- [x] **Chat Session API** - ✅ Done (Basic CRUD & Persistence)
- [ ] **AI Response Integration** - 🎯 **NEXT STEP**
  - [ ] Connect chat endpoint to RAG agent.
  - [ ] Support template-specific knowledge retrieval.


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

---

## 🚀 Phase 7: Production Readiness (Future)

- [ ] Unit & Integration Testing
- [ ] Docker Containerization
- [ ] Authentication (API Keys/JWT)
- [ ] Advanced Monitoring & Observability

---

## 🛠️ Technology Stack (Quick Reference)

- **Frontend:** React 18, TypeScript, Vite, Axios, Tailwind CSS.
- **Backend:** Python 3.12, FastAPI, LangChain, ChromaDB.
- **LLM:** OpenAI (GPT-4o) / Ollama (Llama3).

