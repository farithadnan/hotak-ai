# Hotak AI — Project Documentation

> **Main umbrella document.** This file gives a bird's-eye view of the entire project and links to detailed docs for every module.

---

## What Is Hotak AI?

Hotak AI is a **Retrieval-Augmented Generation (RAG) chat application**. Users can chat with an AI assistant that pulls answers from uploaded or linked documents. The app supports multiple OpenAI models, streaming responses, knowledge templates, and document management.

**Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router, Axios, CSS Modules |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| LLM / Agents | LangChain, OpenAI (GPT-4o-mini default), LangSmith (tracing) |
| Vector Store | ChromaDB (persisted to SQLite) |
| Document Loaders | PDF (PyPDF), DOCX (python-docx), TXT, Markdown, Web (BeautifulSoup) |
| Storage | JSON files on disk (chats, templates), ChromaDB SQLite (embeddings) |

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

---

## Data Flow: Sending a Message

This is the most important flow in the app. Here's what happens step-by-step when a user sends a message:

1. **User types** in the `<Composer>` textarea → `inputValue` state updates
2. **User presses Enter** → `handleSend()` fires
3. If no active chat exists, a **new chat is created** via `POST /chats` → added to `chats` state, URL navigated
4. A **user message** and an **empty pending assistant message** are added to local state immediately (optimistic UI)
5. `chatRuntime[chatId].isResponding` is set to `true` → UI shows typing indicator
6. The **user message is persisted** to the backend via `POST /chats/{id}/messages`
7. **Streaming begins** via `POST /query/stream` → `streamAssistantText()` reads chunks via `ReadableStream`
8. Each chunk **updates the pending assistant's content** in real-time → user sees text appear
9. When streaming finishes, the **pending assistant is replaced** with the finalized message (parsed for sources/citations)
10. The **assistant message is persisted** via `POST /chats/{id}/messages`
11. `chatRuntime[chatId].isResponding` is set to `false` → typing indicator disappears
12. If the chat title is "New Chat", a **title is auto-generated** via `POST /chats/{id}/generate-title`
    - `chatRuntime[chatId].isGeneratingTitle` = `true` → sidebar shows spinner
    - Title updates → spinner disappears

---

## Data Flow: RAG Query (Backend)

When the backend receives `POST /query/stream`:

1. The **RAG agent** is selected (default or model-specific, cached)
2. The agent uses a **retrieval tool** that searches ChromaDB for the top-K most similar document chunks
3. Retrieved context is injected into the **system prompt**
4. The LLM generates a response with **citation markers** like `[1]`, `[2]`
5. Response is **streamed** back chunk-by-chunk as `text/plain`
6. If the requested model has permission/rate-limit issues, it **falls back** to the default model and emits a `[[MODEL_FALLBACK:...]]` token

---

## Key Concepts

### Runtime State vs. Persisted State

- **Persisted state** (`chats`, `templates`): The actual data — messages, titles, settings. Saved to the backend and survives page refreshes.
- **Runtime state** (`chatRuntime`): Temporary UI flags — "is this chat currently streaming?" "is a title being generated?" Lives only in React memory, never saved. Drives loading indicators and prevents duplicate submissions.

### Templates

Templates are pre-configured knowledge bases. Each template has:
- A name and description
- Document sources (files or URLs)
- Settings (model, temperature, chunk size, retrieval K, system prompt)

Templates are managed separately from chats via the `/templates` routes.

### Optimistic UI

The app adds messages to the UI immediately before the backend confirms them. This makes the app feel instant. If something fails, error messages replace the pending content.

---

## Running the Project

**Backend:**
```bash
cd hotak-ai
uvicorn server:app --reload
# Runs on http://localhost:8000
```

**Frontend:**
```bash
cd hotak-ai/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**Environment variables** (in `.env` at project root):
- `OPENAI_API_KEY` — required
- `LANGSMITH_API_KEY` — optional (for tracing)
- `LOG_LEVEL` — optional (default: `INFO`)
