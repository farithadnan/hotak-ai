# Hotak AI — RAG Knowledge Assistant

A template-based RAG system. Upload documents/URLs, create reusable knowledge templates ("Brains"), and chat with your data in real-time.

---

## 🐳 Quick Start — Docker (recommended)

```bash
cp .env.sample .env
# Edit .env: set OPENAI_API_KEY, JWT_SECRET_KEY, ADMIN_BOOTSTRAP_PASSWORD
docker compose up --build
```

| Service  | URL |
|----------|-----|
| App (frontend) | http://localhost |
| API docs       | http://localhost:8000/docs |

Log in with the credentials from `ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` in your `.env`.

Data persists in Docker named volumes (`backend_data`, `backend_logs`). To reset, run `docker compose down -v`.

---

## 💻 Quick Start — Local Dev

**Backend (FastAPI)**
```bash
conda activate hotak-ai-venv
uvicorn app.server:app --reload
# API docs: http://localhost:8000/docs
```

**Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## ⚙️ Environment Variables

Copy `.env.sample` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `JWT_SECRET_KEY` | ✅ | `change-this-...` | Secret for signing JWTs — change in production |
| `ADMIN_BOOTSTRAP_PASSWORD` | ✅ | — | Password for the first admin account |
| `ADMIN_BOOTSTRAP_USERNAME` | | `admin` | Username for the first admin account |
| `ADMIN_BOOTSTRAP_EMAIL` | | `admin@localhost` | Email for the first admin account |
| `CORS_ORIGINS` | | `http://localhost:5173` | Comma-separated allowed origins (use `http://localhost` for Docker) |
| `VITE_API_BASE_URL` | | `http://localhost:8000` | Backend URL baked into the frontend bundle (Docker build arg) |
| `LLM_MAX_TOKENS` | | `4096` | Max completion tokens per response |
| `STREAM_MAX_CHARS` | | `32000` | Max characters emitted per streaming response |
| `RETRIEVAL_K` | | `5` | Number of document chunks retrieved as context |
| `CHAT_HISTORY_MAX_TOKENS` | | `2800` | Token budget for prior chat history per request |
| `ENABLE_SUMMARY_MEMORY` | | `true` | Rolling summary block for long conversations |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `10080` | JWT expiry (default 7 days) |
| `LOG_LEVEL` | | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `LANGSMITH_TRACING` | | `false` | Enable LangSmith tracing |
| `LANGSMITH_API_KEY` | | — | LangSmith API key |

---

## 📂 Documentation

- **📖 [Project Documentation](docs/PROJECT.md)** — full architecture docs, every module and function explained
- **🎯 [Current Tasks](docs/TODO.md)** — completed + upcoming work
- **🗺️ [Development Roadmap](docs/ROADMAP.md)** — full phase-by-phase status

---

## 📁 Project Structure

| Layer | Path | Responsibility |
|---|---|---|
| **Frontend** | `frontend/src/` | React 18 + TypeScript + Vite + Tailwind CSS |
| **API** | `app/api/` | FastAPI routes (auth, chats, messages, query, templates, documents, admin) |
| **Agents** | `app/agents/` | LangChain RAG agent (retrieval + LLM) |
| **Services** | `app/services/` | LLM init, model catalog, system settings, summary memory |
| **Ingestion** | `app/loaders/` | Document extractors (PDF, DOCX, URL) |
| **Storage** | `app/storage/` | ChromaDB vector store |
| **Config** | `app/config/` | Settings + system prompts |
| **DB** | `app/db.py` | SQLite via SQLAlchemy (users, chats, messages, templates) |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Axios
- **Backend:** Python 3.13, FastAPI, LangChain, ChromaDB, SQLite
- **LLM:** OpenAI (GPT-4o / GPT-4o-mini) · Ollama (local models)
- **Auth:** JWT (HS256) · bcrypt passwords · RBAC (admin/user roles)
- **Deploy:** Docker + docker-compose; nginx SPA serve for frontend
