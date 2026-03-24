# Hotak AI — Deployment Guide

This guide covers every way to run Hotak AI: local development, single-server Docker (SQLite), production Docker (PostgreSQL), and hosting on a remote VPS or managed cloud platform.

---

## Table of Contents

1. [Quick Start (Local Dev)](#1-quick-start-local-dev)
2. [Docker — Single Server (SQLite)](#2-docker--single-server-sqlite)
3. [Docker — Production (PostgreSQL)](#3-docker--production-postgresql)
4. [Remote VPS / Cloud Hosting](#4-remote-vps--cloud-hosting)
5. [Managed Database (External PostgreSQL)](#5-managed-database-external-postgresql)
6. [Updating & Redeploying](#6-updating--redeploying)
7. [Backups](#7-backups)
8. [Environment Variable Reference](#8-environment-variable-reference)
9. [Production Checklist](#9-production-checklist)

---

## 1. Quick Start (Local Dev)

Run backend and frontend natively — no Docker required.

**Prerequisites:** Python 3.11+, Node 20+

```bash
# 1. Copy and fill in environment variables
cp .env.sample .env
# Edit .env — at minimum set OPENAI_API_KEY and JWT_SECRET_KEY

# 2. Backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.server:app --reload --port 8000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

SQLite database is created automatically at `app/data/app.db`.
The admin account is bootstrapped from `ADMIN_BOOTSTRAP_*` env vars on first start.

---

## 2. Docker — Single Server (SQLite)

The default setup. Suitable for personal use or a small team (up to ~20 users).

```bash
cp .env.sample .env
# Edit .env — fill in required vars (see section 8)
docker compose up -d --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost       |
| Backend  | http://localhost:8000  |
| Ollama   | http://localhost:11434 |

Data is persisted in Docker named volumes (`backend_data`, `backend_logs`, `ollama_data`).

### Pulling Ollama models

```bash
docker exec hotak-ai-ollama ollama pull llama3.2
```

---

## 3. Docker — Production (PostgreSQL)

Swap SQLite for PostgreSQL by:

1. **Uncommenting** the `postgres` service block in `docker-compose.yml`
2. **Uncommenting** the `postgres_data` volume
3. **Uncommenting** the `depends_on: postgres` condition under `backend`
4. Setting these vars in `.env`:

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

All tables are created automatically on first start — no manual migration step needed.

---

## 4. Remote VPS / Cloud Hosting

### Prerequisites

- Linux VPS (Ubuntu 22.04+ recommended)
- Docker + Docker Compose installed (`apt install docker.io docker-compose-plugin`)
- A domain pointed at the server IP (needed for HTTPS)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/yourorg/hotak-ai.git
cd hotak-ai

# 2. Configure environment
cp .env.sample .env
nano .env    # fill in all required vars (section 8)
```

> ⚠️ **`VITE_API_BASE_URL` is a build-time variable.** It is baked into the frontend
> JavaScript bundle when you run `docker compose up --build`. Set it to the public URL
> of your backend *before* building. If you change it later, you must rebuild with
> `docker compose up -d --build frontend`.

```env
# Example for a remote server at my-server.example.com
VITE_API_BASE_URL=https://api.my-server.example.com
CORS_ORIGINS=https://my-server.example.com
```

```bash
# 3. Build and start
docker compose up -d --build
```

### HTTPS with nginx reverse proxy

When deploying to a remote server, run nginx on the host as a reverse proxy in front
of the Docker containers. Change the docker-compose port bindings so they don't
conflict with the host nginx:

**`docker-compose.yml` — change exposed ports on the host side:**
```yaml
frontend:
  ports:
    - "3000:80"    # nginx proxies to localhost:3000

backend:
  ports:
    - "8000:8000"  # nginx proxies to localhost:8000
```

**Install certbot + nginx on the host:**
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

**`/etc/nginx/sites-available/hotak-ai`:**
```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name my-server.example.com api.my-server.example.com;
    return 301 https://$host$request_uri;
}

# Frontend
server {
    listen 443 ssl;
    server_name my-server.example.com;

    ssl_certificate     /etc/letsencrypt/live/my-server.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/my-server.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}

# Backend API
server {
    listen 443 ssl;
    server_name api.my-server.example.com;

    ssl_certificate     /etc/letsencrypt/live/api.my-server.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.my-server.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        # Required for SSE streaming responses
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hotak-ai /etc/nginx/sites-enabled/
sudo certbot --nginx -d my-server.example.com -d api.my-server.example.com
sudo systemctl reload nginx
```

### Single-domain setup (no subdomain for API)

If you only have one domain and want the API at `/api/`:

```nginx
server {
    listen 443 ssl;
    server_name my-server.example.com;

    # ...ssl certs...

    # Backend API at /api/
    location /api/ {
        rewrite ^/api(/.*)$ $1 break;
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 300s;
    }

    # Frontend — everything else
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
    }
}
```

Then set:
```env
VITE_API_BASE_URL=https://my-server.example.com/api
CORS_ORIGINS=https://my-server.example.com
```

---

## 5. Managed Database (External PostgreSQL)

Use a managed PostgreSQL provider (Supabase, Railway, Render, AWS RDS, Neon, etc.)
instead of running your own Postgres container.

1. Create a database on your provider and copy the connection string.
2. Set in `.env`:

```env
DATABASE_URL=postgresql://user:password@db.host.example.com:5432/hotakai
```

3. Leave the `postgres` service in `docker-compose.yml` commented out.
4. The `backend_data` Docker volume is still used for ChromaDB (vector store) and uploaded files — that's always local to the backend container.

> **Note:** ChromaDB runs embedded inside the backend container regardless of which
> SQL database you use. Only user/chat/template/settings data goes to PostgreSQL.

---

## 6. Updating & Redeploying

To pull new code and redeploy with zero downtime:

```bash
git pull origin master

# Rebuild only changed services (Docker layer cache speeds this up)
docker compose up -d --build

# Or rebuild a specific service only
docker compose up -d --build backend
docker compose up -d --build frontend
```

> ⚠️ If you changed any `.env` variable that affects the **frontend build**
> (`VITE_API_BASE_URL`), you must rebuild the frontend: `docker compose up -d --build frontend`.

Schema migrations run automatically at backend startup via `create_tables()` — no
manual `ALTER TABLE` needed.

---

## 7. Backups

### SQLite (default)

The database lives inside the `backend_data` Docker volume:

```bash
# Dump to a local file
docker run --rm \
  -v hotak-ai_backend_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

### PostgreSQL

```bash
docker exec hotak-ai-postgres pg_dump -U hotakai hotakai > backup-$(date +%Y%m%d).sql
```

### ChromaDB & Uploads

Both live in the `backend_data` volume. Back it up with the tar command above —
it covers the database, vector store, and uploaded files in one shot.

---

## 8. Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes\* | — | OpenAI API key. \*Not required if only using Ollama. |
| `JWT_SECRET_KEY` | **Yes** | `change-this-secret-in-production` | Signs JWT tokens. **Generate a strong secret: `openssl rand -hex 32`** |
| `ADMIN_BOOTSTRAP_USERNAME` | Yes | `admin` | First admin username (created on first run only) |
| `ADMIN_BOOTSTRAP_PASSWORD` | **Yes** | — | First admin password (change after first login) |
| `ADMIN_BOOTSTRAP_EMAIL` | No | `admin@localhost` | First admin email |
| `DATABASE_URL` | No | SQLite file | SQLAlchemy connection string. Leave blank for SQLite. See sections 3–5. |
| `POSTGRES_DB` | No | `hotakai` | Postgres DB name (only for the bundled compose postgres service) |
| `POSTGRES_USER` | No | `hotakai` | Postgres user (only for the bundled compose postgres service) |
| `POSTGRES_PASSWORD` | No | — | Postgres password (only for the bundled compose postgres service) |
| `VITE_API_BASE_URL` | **Yes (Docker)** | `http://localhost:8000` | ⚠️ **Build-time only.** Public URL the browser uses to reach the backend. Must be set before `--build`. |
| `CORS_ORIGINS` | No | `http://localhost` | Comma-separated allowed frontend origins. Set to your domain in production. |
| `OLLAMA_BASE_URL` | No | `http://ollama:11434` | Ollama URL. Leave blank to disable Ollama integration. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` (7 days) | JWT token lifetime |
| `LLM_MAX_TOKENS` | No | `4096` | Max tokens per LLM response |
| `STREAM_MAX_CHARS` | No | `32000` | Max characters in a streamed response |
| `ENABLE_SUMMARY_MEMORY` | No | `true` | Rolling summary for long chat history |
| `LOG_LEVEL` | No | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `LANGSMITH_TRACING` | No | `false` | Enable LangSmith tracing (sends data to LangSmith) |
| `LANGSMITH_API_KEY` | No | — | LangSmith API key |

---

## 9. Production Checklist

Before going live:

- [ ] `JWT_SECRET_KEY` set to a long random secret (`openssl rand -hex 32`)
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` is strong; change it after first login
- [ ] `VITE_API_BASE_URL` set to the **public HTTPS URL** of the backend before building
- [ ] `CORS_ORIGINS` set to your frontend domain only (never `*`)
- [ ] `DATABASE_URL` set to PostgreSQL for multi-user deployments
- [ ] HTTPS configured (nginx + Let's Encrypt — see section 4)
- [ ] `backend_data` volume is on persistent storage and included in regular backups
- [ ] Ollama GPU passthrough configured if running local LLMs under load (see docker-compose comments)
- [ ] `LOG_LEVEL=WARNING` in production to reduce log noise
- [ ] `LANGSMITH_TRACING=false` unless actively debugging (sends conversation data to LangSmith)
- [ ] Run the test suite before deploying: `pytest` (backend) + `npm run test` (frontend)
