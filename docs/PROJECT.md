# Hotak AI — Project Documentation

> **Main umbrella document.** This file gives a bird's-eye view of the entire project and links to detailed docs for every module.

---

## What Is Hotak AI?

Hotak AI is a **Retrieval-Augmented Generation (RAG) chat application**. Users can chat with an AI assistant that pulls answers from uploaded or linked documents. The app supports multiple OpenAI models, streaming responses, knowledge templates, and document management.

**Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router, Axios, CSS Modules, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| LLM / Agents | LangChain, OpenAI (GPT-4o-mini default), Ollama (local models), LangSmith (tracing) |
| Vector Store | ChromaDB (embedded, persisted to disk) |
| Database | SQLite (default) or PostgreSQL via `DATABASE_URL` env var |
| Document Loaders | PDF (PyPDF), DOCX (python-docx), TXT, Markdown, Web (BeautifulSoup) |
| Auth | JWT (HS256), bcrypt password hashing, role-based access (admin / user) |
| Deployment | Docker Compose — backend + frontend (nginx) + Ollama; see [DEPLOYMENT.md](./DEPLOYMENT.md) |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│                                                      │
│  App.tsx ─── wires hook + sidebar + routing            │
│  ├── Hooks ─── useChatEngine (data + streaming),      │
│  │             useAppRouting, useFloatingPopover       │
│  ├── Components ─── Sidebar, ChatWindow, Composer,    │
│  │                  Templates                         │
│  ├── Services ─── HTTP / streaming calls to backend   │
│  ├── Utils ─── response parsing                       │
│  └── Types ─── shared interfaces                      │
└──────────────┬───────────────────────────────────────┘
               │  HTTP (REST + SSE streaming)
               │  http://localhost:8000
┌──────────────▼───────────────────────────────────────┐
│                   Backend (FastAPI)                    │
│                                                      │
│  server.py ─── app setup, CORS, startup init          │
│  ├── API routes ─── /chats, /query, /templates, etc.  │
│  ├── Agents ─── RAG agent (LangChain)                 │
│  ├── Services ─── LLM + embeddings initialization     │
│  ├── Storage ─── JSON file CRUD + ChromaDB vectors    │
│  ├── Loaders ─── PDF, DOCX, TXT, MD, Web             │
│  ├── Config ─── settings, prompts, env vars           │
│  └── Utils ─── citations, logging, text splitting     │
└──────────────────────────────────────────────────────┘
```

---

## Module Index

Each module has its own detailed documentation. Click to navigate.

### Frontend (`frontend/src/`)

| Document | Covers |
|---|---|
| [App.md](./frontend/App.md) | `App.tsx` — root component: all state variables, functions, rendering, and data flow |
| [types.md](./frontend/types.md) | `types/` — TypeScript interfaces: Chat, Message, Template, Model, etc. |
| [services.md](./frontend/services.md) | `services/` — API client, chat CRUD, query/streaming, documents, models, templates |
| [hooks.md](./frontend/hooks.md) | `hooks/` — `useAppRouting`, `useClickOutside`, `useFloatingPopover` |
| [components.md](./frontend/components.md) | `components/` — Composer, ChatWindow, ChatPage, TemplateBuilder, TemplateList, Modal, ConfirmDialog, Toastr, skeletons |
| [utils-and-routes.md](./frontend/utils-and-routes.md) | `utils/` and `routes/` — response parsing, routing setup |

### Backend (`app/`)

| Document | Covers |
|---|---|
| [backend.md](./backend/backend.md) | Full backend: server setup, API routes, agents, services, storage, loaders, config, utils |

### Operations

| Document | Covers |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Local dev, Docker (SQLite + PostgreSQL), VPS + nginx/HTTPS, managed DB, env vars, backups, production checklist |
| [ROADMAP.md](./ROADMAP.md) | Feature roadmap, phase completion status, planned work |

---

## Data Flow: Sending a Message

This is the most important flow in the app. Here's what happens step-by-step when a user sends a message:

1. **User types** in the `<Composer>` textarea → `inputValue` state updates
2. **User presses Enter** → `handleSend()` fires
3. If no active chat exists, a **new chat is created** via `POST /chats` → added to `chats` state, URL navigated
4. Pending composer attachments are ingested first:
    - URLs via `POST /documents/load`
    - Files via `POST /documents/upload`
5. A **user message** (including attachment metadata and ingestion status) and an **empty pending assistant message** are added to local state immediately (optimistic UI)
6. `chatRuntime[chatId].isResponding` is set to `true` → UI shows typing indicator
7. The **user message is persisted** to the backend via `POST /chats/{id}/messages`
8. **Streaming begins** via `POST /query/stream` with `question`, `chat_id`, selected `model`, and context `messages` (when available) → `streamAssistantText()` reads chunks via `ReadableStream`
9. Each chunk **updates the pending assistant's content** in real-time → user sees text appear
10. When streaming finishes, the **pending assistant is replaced** with the finalized message (parsed for sources/citations and stamped with the resolved model)
11. The **assistant message is persisted** via `POST /chats/{id}/messages`
12. `chatRuntime[chatId].isResponding` is set to `false` → typing indicator disappears
13. If the chat title is "New Chat", a **title is auto-generated** via `POST /chats/{id}/generate-title`
    - `chatRuntime[chatId].isGeneratingTitle` = `true` → sidebar shows spinner
    - Title updates → spinner disappears

---

## Data Flow: RAG Query (Backend)

When the backend receives `POST /query/stream`:

1. **`AgentRuntimeConfig`** is resolved from the request — applying template overrides (model, temperature, system prompt, retrieval K, and source filter) when a `template_id` is set
2. The **RAG agent** is selected from cache (or created) matching the resolved config
3. LLM history is assembled from frontend `messages` payload when provided, otherwise from persisted `chat_id` history
4. Duplicate final user turn is filtered to avoid sending the same turn twice
5. Prior history is packed against a token budget, with oversized historical turns truncated before send
6. The agent uses a **retrieval tool** that searches ChromaDB for the top-K most similar document chunks — scoped to `allowed_sources` when the template specifies documents
7. The LLM generates a response with **citation markers** like `[1]`, `[2]` and a `Sources:` section with full file names / URLs
8. Response is **streamed** back token-by-token using `stream_mode="messages"` — only `AIMessageChunk` tokens are forwarded (retrieved doc content from tool messages is filtered out)
9. If streaming stalls or rate-limits briefly, the app retries/falls back before surfacing an error

Current limitation:
- Summary-memory compression is still planned as a follow-up for very long conversations; current protection is token-budget packing + truncation.

---

## Key Concepts

### Runtime State vs. Persisted State

- **Persisted state** (`chats`, `templates`): The actual data — messages, titles, settings. Saved to the backend and survives page refreshes.
- **Runtime state** (`chatRuntime`): Temporary UI flags — "is this chat currently streaming?" "is a title being generated?" Lives only in React memory, never saved. Drives loading indicators and prevents duplicate submissions.

### Templates

Templates are pre-configured knowledge bases. Each template has:
- A name and description
- Document sources (files or URLs)
- Settings: `model`, `temperature`, `retrieval_k`, `system_prompt`, `chunk_size`, `chunk_overlap`

When a chat has an attached template, the backend applies all of the template's active settings at query time:
- The specified **model** and **temperature** are used for the LLM
- The **system prompt** overrides the global default
- The **retrieval_k** controls how many chunks are retrieved
- The **sources** list scopes ChromaDB retrieval — only chunks from those documents are searched

`chunk_size` and `chunk_overlap` are stored but currently deferred — they are intended for per-template re-ingestion support in the future.

Templates are managed separately from chats via the `/templates` routes.

### Chat Archiving

Chats can be archived rather than deleted. Archived chats:
- Are hidden from the main sidebar chat list (`GET /chats` returns only non-archived)
- Are accessible via the profile popover → "Archived Chats" → opens a searchable modal
- Can be individually unarchived (restored to the sidebar) or permanently deleted
- Support bulk "Unarchive All" and "Delete All Archived" actions with confirmation
- Archive/unarchive is done via `PUT /chats/{id}` with `{ "archived": true/false }`

### Chat Attachments vs Assistant Sources

- A user attachment means "this source was attached and ingested for retrieval."
- Assistant **Sources** only list documents that were actually retrieved/cited in that answer.
- Therefore, an attachment may be visible in the user message but absent from assistant Sources if it was not used by retrieval for that specific reply.
- The composer now supports inline URL entry, file picker, drag-and-drop, and attaching a template's stored sources.
- Current progress feedback is phase-based (`Queued`, `Uploading`, `Indexing`, `Ready`, `Failed`), not byte-percentage upload progress.
- Template attachment works best for templates whose sources are URLs or persisted file paths. Older templates that only store a browser file name (without an uploaded saved file) still need a follow-up migration/improved template upload flow.

### Optimistic UI

The app adds messages to the UI immediately before the backend confirms them. This makes the app feel instant. If something fails, error messages replace the pending content.

### Frontend Configuration Split

- **TypeScript runtime constants** (timeouts, default model IDs, popover dimensions) should live in frontend constants modules.
- **Shared UI runtime constants** (toast duration, generic popover defaults, viewport gaps) should live in a generic frontend constants module.
- **Layout/styling values** that repeat across chat screens should live in CSS custom properties.
- **Backend runtime limits** (history token budgets, retrieval settings, output tokens) should stay in `app/config/settings.py`.

---

## Running the Project

For full deployment instructions (Docker, PostgreSQL, VPS, HTTPS, backups) see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

**Quick local start:**

```bash
# Backend
cp .env.sample .env          # fill in OPENAI_API_KEY + JWT_SECRET_KEY
pip install -r requirements.txt
uvicorn app.server:app --reload   # http://localhost:8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

**Key environment variables** (in `.env` at project root):

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes\* | \*Not needed if using Ollama only |
| `JWT_SECRET_KEY` | Yes | Use `openssl rand -hex 32` in production |
| `ADMIN_BOOTSTRAP_PASSWORD` | Yes | Admin account created on first start |
| `DATABASE_URL` | No | Leave blank for SQLite; set to `postgresql://...` for Postgres |
| `OLLAMA_BASE_URL` | No | e.g. `http://localhost:11434`; leave blank to disable |
| `VITE_API_BASE_URL` | Docker | Build-time — baked into the frontend bundle |

**Running tests:**

```bash
# Backend
pytest

# Frontend
cd frontend && npm run test
```

---

## 💡 Newcomer's Guide: Demystifying the "Magic"

If you are new to RAG or Streaming, these two areas are the "engine room" of the project. Here is how to understand them quickly:

### 1. The AI Brain (RAG & Vector Store)

- **The Concept:** Think of this as a **"Search Engine + a Smart Reader."**
    - **Vector Store (ChromaDB):** A library where every page is stored by its "meaning" (coordinates) rather than alphabetical order.
    - **Retrieval:** We search for the 5 most relevant pages.
    - **Generation:** We give those pages to the LLM and say, "Answer using *only* this text."
- **Where to look:** `app/agents/rag_agent.py` → `retrieve_context`.
- **How to see it:** Enable **LangSmith** in your `.env`. It provides a visual tree of every search and LLM prompt.

### 2. The Garden Hose (Streaming Logic)

- **The Concept:** Standard APIs are like **ordering a bucket of water** (you wait until it's full). Our API is a **garden hose** (water flows as soon as the tap is turned).
    - **SSE (Server-Sent Events):** The protocol that keeps the "hose" open.
    - **AsyncGenerators:** The JavaScript tool used to "pump" each drop of data to the UI.
- **Where to look:** `frontend/src/services/query.ts` → `streamQuery`.
- **How to see it:** Open **Browser DevTools > Network tab**. Send a message and click the `/query/stream` request. Watch the "EventStream" tab to see tokens arriving in real-time.

