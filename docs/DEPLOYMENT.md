# Hotak AI — Deployment Guide

This guide covers every way to run Hotak AI: local development, single-server Docker (SQLite), production Docker (PostgreSQL), and hosting on a remote VPS or managed cloud platform.

---

## Table of Contents

1. [Quick Start (Local Dev)](#1-quick-start-local-dev)
2. [Docker — Single Server (SQLite)](#2-docker--single-server-sqlite)
3. [Docker — Production (PostgreSQL)](#3-docker--production-postgresql)
4. [Remote VPS / Cloud Hosting](#4-remote-vps--cloud-hosting)
5. [Managed Database (External PostgreSQL)](#5-managed-database-external-postgresql)
6. [Environment Variable Reference](#6-environment-variable-reference)
7. [Production Checklist](#7-production-checklist)

---

## 1. Quick Start (Local Dev)

Run backend and frontend natively — no Docker required.

```bash
# Backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.sample .env          # fill in OPENAI_API_KEY and secrets
uvicorn app.server:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # opens http://localhost:5173
```

SQLite database is created automatically at `app/data/app.db`.

---

## 2. Docker — Single Server (SQLite)

The default setup. Good for a personal server or a small team (< 20 users).

```bash
cp .env.sample .env          # fill in required vars (see section 6)
docker compose up -d --build
```

| Service   | URL                      |
|-----------|--------------------------|
| Frontend  | http://localhost         |
| Backend   | http://localhost:8000    |
| Ollama    | http://localhost:11434   |

Data is persisted in Docker named volumes (`backend_data`, `backend_logs`, `ollama_data`).

### Pulling Ollama models

```bash
docker exec hotak-ai-ollama ollama pull llama3.2
```

---

## 3. Docker — Production (PostgreSQL)

Swap SQLite for PostgreSQL by:

1. **Uncommenting** the `postgres` service in `docker-compose.yml`
2. **Uncommenting** the `postgres_data` volume
3. **Uncommenting** the `depends_on: postgres` condition under `backend`
4. Setting the required env vars in `.env`:

```env
DATABASE_URL=postgresql://hotakai:yourpassword@postgres:5432/hotakai
POSTGRES_DB=hotakai
POSTGRES_USER=hotakai
POSTGRES_PASSWORD=yourpassword
```

Then rebuild:

```bash
docker compose down
docker compose up -d --build
```

The application auto-creates all tables on first start. No manual migration step needed.

---

## 4. Remote VPS / Cloud Hosting

### Prerequisites

- A Linux VPS (Ubuntu 22.04+ recommended)
- Docker + Docker Compose installed
- A domain name pointed at the server's IP (optional but recommended for HTTPS)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/yourorg/hotak-ai.git
cd hotak-ai

# 2. Configure environment
cp .env.sample .env
nano .env   # set all required vars (see section 6)

# 3. Set the public URLs
# In .env:
VITE_API_BASE_URL=https://api.yourdomain.com   # or http://your-server-ip:8000
CORS_ORIGINS=https://yourdomain.com

# 4. Build and start
docker compose up -d --build
```

### HTTPS with nginx reverse proxy (recommended)

Install `certbot` and `nginx` on the host, then proxy:

```nginx
# /etc/nginx/sites-available/hotak-ai
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Backend API
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # Required for SSE streaming responses
        proxy_buffering off;
        proxy_cache off;
    }
}
```

```bash
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
sudo systemctl reload nginx
```

---

## 5. Managed Database (External PostgreSQL)

Use a managed PostgreSQL provider (Supabase, Railway, Render, AWS RDS, Neon, etc.) instead of running your own.

1. Create a database on your provider and copy the connection string.
2. Set in `.env`:

```env
DATABASE_URL=postgresql://user:password@db.host.example.com:5432/hotakai
```

3. Leave the `postgres` service in `docker-compose.yml` commented out — you don't need it.
4. The `backend_data` volume is still used for ChromaDB (vector store) and file uploads.

> **Note:** ChromaDB (the vector store) always runs embedded inside the backend container and is stored in the `backend_data` volume regardless of which SQL database you use.

---

## 6. Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes (if using OpenAI) | — | OpenAI API key |
| `JWT_SECRET_KEY` | Yes | `change-this-secret-in-production` | Secret for signing JWT tokens. **Change this in production.** |
| `ADMIN_BOOTSTRAP_USERNAME` | Yes | `admin` | First admin account username (created on first run) |
| `ADMIN_BOOTSTRAP_PASSWORD` | Yes | — | First admin account password |
| `ADMIN_BOOTSTRAP_EMAIL` | No | `admin@localhost` | First admin account email |
| `DATABASE_URL` | No | SQLite file | Full SQLAlchemy connection string. Leave blank for SQLite. |
| `POSTGRES_DB` | No | `hotakai` | PostgreSQL database name (docker-compose postgres service only) |
| `POSTGRES_USER` | No | `hotakai` | PostgreSQL user (docker-compose postgres service only) |
| `POSTGRES_PASSWORD` | No | — | PostgreSQL password (docker-compose postgres service only) |
| `VITE_API_BASE_URL` | Yes (Docker) | `http://localhost:8000` | URL the browser uses to reach the backend. Baked into the frontend build. |
| `CORS_ORIGINS` | No | `http://localhost` | Comma-separated list of allowed frontend origins |
| `OLLAMA_BASE_URL` | No | `http://ollama:11434` | Ollama server URL. Leave blank to disable Ollama. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` (7 days) | JWT token lifetime |
| `LLM_MAX_TOKENS` | No | `4096` | Max tokens per LLM response |
| `STREAM_MAX_CHARS` | No | `32000` | Max characters in a streamed response |
| `ENABLE_SUMMARY_MEMORY` | No | `true` | Enable rolling conversation summary for long chats |
| `LOG_LEVEL` | No | `INFO` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LANGSMITH_TRACING` | No | `false` | Enable LangSmith tracing |
| `LANGSMITH_API_KEY` | No | — | LangSmith API key |

---

## 7. Production Checklist

Before going live, verify:

- [ ] `JWT_SECRET_KEY` is a long random string (e.g. `openssl rand -hex 32`)
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` is strong and changed after first login
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite) for multi-user workloads
- [ ] `VITE_API_BASE_URL` is set to your public backend URL (with HTTPS if applicable)
- [ ] `CORS_ORIGINS` is set to your frontend domain only (not `*`)
- [ ] HTTPS is configured via a reverse proxy (nginx + Let's Encrypt)
- [ ] `backend_data` volume is on persistent storage and backed up regularly
- [ ] Ollama GPU passthrough configured if using local LLMs at scale
- [ ] `LOG_LEVEL=WARNING` or `ERROR` in production to reduce noise
- [ ] `LANGSMITH_TRACING=false` unless you need tracing (sends data to LangSmith)
