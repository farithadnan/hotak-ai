# Hotak AI - RAG System with Template Management

## 🚀 Quick Start

### Backend (FastAPI)
```bash
conda activate hotak-ai-venv
uvicorn app.server:app --reload
# API Docs: http://localhost:8000/docs
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# App URL: http://localhost:5173
```

---

## 📂 Documentation & Progress

- **🎯 [Current Tasks](docs/TODO.md):** The next 3 things to work on.
- **🗺️ [Development Roadmap](docs/ROADMAP.md):** Full project status and architecture.

---

## ⚙️ Runtime Settings

- `STREAM_MAX_CHARS` (default: `6000`): Maximum characters emitted by `/query/stream` per response.
- `LLM_MAX_TOKENS` (default: `512`): Max completion tokens per model response.
- `RETRIEVAL_K` (default: `5`): Number of chunks retrieved as context; lowering reduces token usage.

---

## 📁 Project Structure

| Layer | Folder | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | `frontend/src` | React UI (Vite + TS + Tailwind). |
| **API** | `app/api/` | FastAPI routes for docs, queries, and templates. |
| **Logic** | `app/agents/` | RAG logic (LLM + Vector Search). |
| **Ingestion** | `app/loaders/` | Document extractors (PDF, URL, DOCX). |
| **Storage** | `app/storage/` | Template storage (JSON) and Vectors (ChromaDB). |
| **Config** | `app/config/` | System prompts and environment settings. |
