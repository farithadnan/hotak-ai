# Hotak AI - Development Roadmap (Active)

## 🎯 Current Status: Phase 7.6 Complete (Testing) — Next: Phase 7.7 (Observability)

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

### Phase 7.1 — Authentication & User Identity ✅ Done
- [x] **Backend:** SQLite DB (`app/db.py`) + `UserDB` SQLAlchemy model + Pydantic schemas
- [x] **Backend:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me` endpoints (JWT HS256)
- [x] **Backend:** `get_current_user` FastAPI dependency (Bearer token validation via `python-jose` + `passlib/bcrypt`)
- [x] **Backend:** All routes protected — `/chats`, `/messages`, `/query`, `/query/stream`, `/templates`, `/documents`
- [x] **Backend:** Chats and templates scoped to `user_id` — each user sees only their own data
- [x] **Frontend:** `AuthContext` with login/register/logout + token persisted in `localStorage`
- [x] **Frontend:** Axios interceptor attaches Bearer token on every request; 401 redirects to `/login`
- [x] **Frontend:** `/login` and `/register` pages with form validation and error display
- [x] **Frontend:** `ProtectedRoute` wrapper — unauthenticated users redirected to `/login`
- [x] **Frontend:** Logout wired to profile popover; avatar/name/email show real user data

### Phase 7.2 — Admin & RBAC ✅ Done
- [x] **Backend:** Added `role` (`admin`/`user`) + `is_active` fields to `UserDB` model; incremental SQLite migration via `PRAGMA table_info` + `ALTER TABLE`
- [x] **Backend:** First admin bootstrapped from env vars (`ADMIN_BOOTSTRAP_USERNAME/PASSWORD/EMAIL`) at startup; public `/auth/register` removed
- [x] **Backend:** `get_current_admin` dependency for admin-only endpoints; admin-on-admin protection (lock/delete blocked)
- [x] **Backend:** Admin CRUD — `GET/POST /admin/users`, `PUT /admin/users/{id}/lock`, `PUT /admin/users/{id}/unlock`, `DELETE /admin/users/{id}`
- [x] **Backend:** Edit user — `PATCH /admin/users/{id}` (username, email, role); self + other-admin protected
- [x] **Backend:** Reset password — `POST /admin/users/{id}/reset-password`; self + other-admin protected
- [x] **Backend:** Model settings — `GET/PUT /admin/models` (enabled list + default); `GET /models` filters by admin-enabled list
- [x] **Backend:** System settings — `GET/PUT /admin/system`; all tunables including `max_upload_file_size_mb` and `access_token_expire_minutes` persisted as JSON; `app/services/system_settings.py`
- [x] **Frontend:** Admin panel page at `/admin` (two tabs: Users + Models; System Settings modal via header button)
- [x] **Frontend:** Users tab — table with role/status badges, search bar, Lock/Unlock/Edit/Delete per row; empty state for no search results; skeleton loading
- [x] **Frontend:** Edit User modal — tabbed (Details / Security); edit username/email/role; reset password with inline success feedback
- [x] **Frontend:** Create User modal — per-field validation (username/email/password); validation resets on modal close
- [x] **Frontend:** Models tab — checkbox list, search bar, Enable All / Disable All (last-model protected); auto-saves on every change (400 ms debounce); skeleton loading
- [x] **Frontend:** System Settings modal — all tunables in a responsive two-column grid; per-field validation; explicit Save button; skeleton loading
- [x] **Frontend:** `AdminRoute` guard — non-admins redirected to `/chat`; Admin Panel nav item shown only to admins
- [x] **Frontend:** `PasswordInput` generic component — show/hide eye icon toggle; used across Login, Register, Create User, Reset Password
- [x] **Frontend:** `FormField` generic component — label + input slot + inline error/hint display; used in TemplateBuilder and extensible to all forms
- [x] **Frontend:** Uniform validation UX — always-enabled submit, per-field inline errors on submit, `has-error` red border, clears on field change, resets on modal close

### Phase 7.3 — Per-User Data Isolation ✅ Done
- [x] **Backend:** `user_id` stamped into every document chunk's ChromaDB metadata at ingest time (`add_documents_to_store`)
- [x] **Backend:** Cache check (`is_document_cached`) scoped by `user_id` — each user's copy of a source is stored independently
- [x] **Backend:** Retrieval filter scoped to `user_id`; combined with `allowed_sources` template filter via ChromaDB `$and` operator
- [x] **Backend:** Citation validation `similarity_search` in `/query` also scoped to `user_id` — no cross-user doc leakage
- [x] **Backend:** `AgentRuntimeConfig` carries `user_id`; agent cache key includes `user_id` so each user gets an isolated retrieval agent
- [x] **Backend:** `/documents` list endpoint filtered by `user_id` — users only see their own ingested sources

### Phase 7.4 — User Settings + Branding ✅ Done
- [x] **Backend:** `preferences` JSON column on `users` table (incremental SQLite migration); `DEFAULT_PREFERENCES` constant
- [x] **Backend:** `PATCH /auth/me` — update username/email with uniqueness checks
- [x] **Backend:** `POST /auth/me/change-password` — verify current password, hash + store new (204)
- [x] **Backend:** `GET /auth/me/preferences` + `PATCH /auth/me/preferences` — merge-patch JSON preferences
- [x] **Backend:** `UpdateProfile`, `ChangePassword`, `UpdatePreferences` Pydantic schemas; preferences deserialized with defaults via `@field_validator`
- [x] **Frontend:** `types/auth.ts` — `AccentColor`, `ThemeMode`, `ChatBackground`, `UserPreferences`, `AuthUser` with preferences field
- [x] **Frontend:** `services/auth.ts` — `updateProfileApi`, `changePasswordApi`, `getPreferencesApi`, `updatePreferencesApi`
- [x] **Frontend:** `AuthContext` — `updateUser`, `changePassword`, `updatePreferences` in context value; applies theme on login and preference change; resets to defaults on logout
- [x] **Frontend:** `utils/theme.ts` — `applyTheme()` sets CSS custom properties for 6 accent palettes × dark/light; `ACCENT_LABELS`, `ACCENT_SWATCHES`
- [x] **Frontend:** `UserSettingsModal` — 4-tab modal (Account / Security / Preferences / Appearance); avatar upload with canvas resize to 200×200 base64; theme toggle; accent color grid; chat background grid; per-tab save with inline success/error feedback
- [x] **Frontend:** Auth pages redesigned with split layout (branding left panel + form right panel; mobile stacks); missing login placeholders added
- [x] **Frontend:** Settings button in profile popover wired to open `UserSettingsModal` mounted in `AppShell`
- [x] **Frontend:** Avatar base64 image rendered in sidebar profile button + profile popover header
- [x] **Frontend:** Chat scroll container gets `chat-bg-{value}` class from user preferences (dots / grid / gradient-warm / cool / purple)
- [x] **Frontend:** Custom app logo (`hotak-ai-logo.webp`) replaces "HA" text in sidebar and auth brand panel
- [x] **Frontend:** Favicon suite (ico, 16/32px png, apple-touch-icon, android-chrome 192/512, webmanifest) wired into `index.html`; page title set to "Hotak AI"
- [x] **Frontend:** Cyberpunk background image on login brand panel with dark overlay and strong text shadows
- [x] **Frontend:** Glass sidebar/header (directional fade + backdrop-blur); background applied to full `app-shell`; all panels use glass treatment
- [x] **Frontend:** Sidebar/header popovers rendered via `createPortal` to escape `backdrop-filter` stacking context
- [x] **Frontend:** Theme-adaptive gradient backgrounds using `color-mix` with `var(--color-bg)`; works in dark and light mode
- [x] **Frontend:** Accent color on native form controls (`input[type=range/checkbox/radio]`), template card hover, and action buttons
- [x] **Frontend:** Composer Tools button disabled/stubbed (coming soon)

### Phase 7.5 — Docker ✅ Done
- [x] `requirements.txt` pinning all backend dependencies
- [x] `Dockerfile` for backend (Python 3.13-slim, FastAPI + uvicorn, data/logs volumes)
- [x] `frontend/Dockerfile` — multi-stage: Node 22 build → nginx 1.27 serve
- [x] `frontend/nginx.conf` — SPA fallback (`try_files $uri /index.html`) + static asset cache headers
- [x] `docker-compose.yml` — both services wired with named volumes, env var pass-through
- [x] `.dockerignore` (root) + `frontend/.dockerignore`
- [x] `VITE_API_BASE_URL` build arg — backend URL baked into frontend bundle; configurable per-env
- [x] `CORS_ORIGINS` env var — backend CORS origins comma-separated; must include `http://localhost` for Docker and `http://localhost:5173` for local dev
- [x] `.env.sample` updated with all Docker-relevant vars and comments
- [x] Production asset paths fixed (`/src/assets/...` → `/...` via `public/`)
- [x] **Ollama service** added to `docker-compose.yml` (`ollama/ollama:latest`; `ollama_data` volume; port 11434)
- [x] `OLLAMA_BASE_URL` env var — defaults to `http://ollama:11434` (internal Docker service); override for local dev
- [x] `app/services/model_catalog.py` — `get_ollama_models()` probes `GET /api/tags`; graceful no-op if Ollama unreachable
- [x] `app/services/llm.py` — `create_llm_for_model()` routes `ollama/*` model IDs to `ChatOllama`, others to OpenAI
- [x] `app/services/model_settings.py` — `initialize_model_settings` now merges newly discovered models into existing settings on every restart (prevents Ollama models being invisible after first-run)
- [x] Pull models with: `docker exec hotak-ai-ollama ollama pull llama3.2`

### Phase 7.6 — Testing
- [x] **Backend:** Unit tests for core services (query, ingestion, model catalog)
- [x] **Backend:** Integration tests hitting real FastAPI + in-memory SQLite
- [x] **Frontend:** Component tests for critical flows (send message, attach file, template picker)
- [x] Token-estimation quality tuning and summary refresh strategy tests

### Phase 7.7 — Observability ✅ Done
- [x] **Request ID middleware** — UUID stamped on every request; returned as `X-Request-ID` response header
- [x] **Activity log table** — every API request recorded with user_id, username, method, path, status, latency_ms
- [x] **`last_login_at` tracking** — timestamp updated on every successful login; shown in Admin → Users table
- [x] **Admin user logs viewer** — per-user activity log modal (timestamp, method, path, status, latency)
- [x] **Enhanced `/health` endpoint** — reports DB, vector store, Ollama reachability + uptime + version
- [ ] Token usage tracking per user/chat
- [ ] Advanced monitoring & alerting

---

## 🚀 Phase 8: Power User & Data Portability

### Phase 8.1 — Export & Import
- [ ] **Chat export** — download a conversation as Markdown, PDF, or JSON (full history + sources + metadata)
- [ ] **Template export/import** — export a template (settings + source list) as a `.json` file; import on any instance
- [ ] **Full admin backup/restore** — one-click export of all system settings, provider config, model settings, and template library as a single archive; importable on a fresh instance

### Phase 8.2 — Document Management
- [ ] **User document library** — dedicated page listing all a user's ingested sources (file name, type, size, date, status); delete individual sources and purge their vectors from ChromaDB
- [ ] **Deduplication** — detect and skip re-ingestion of identical content (hash-based); show cache hit status in UI
- [ ] **Scheduled URL re-ingestion** — set a refresh interval on URL sources; backend re-fetches and re-embeds on schedule
- [ ] **Admin document view** — admin can view/purge any user's documents (for compliance / storage management)

### Phase 8.3 — Collaboration & Sharing
- [ ] **Shared/published templates** — admin can publish templates to all users; users browse a "template library" and clone to their own workspace
- [ ] **Read-only chat sharing** — generate a shareable link to a conversation (public or token-gated); viewer sees the full thread without an account
- [ ] **Team workspaces** — group users into workspaces with shared templates and document pools (multi-tenant)

### Phase 8.4 — Usage & Quotas
- [ ] **Token usage tracking** — record prompt + completion tokens per message; aggregate by user/day/model in the DB
- [ ] **Per-user token quotas** — admin sets a monthly token budget per user; backend enforces with a 429 before the limit is hit
- [ ] **Usage dashboard** — admin view of token spend per user, per model, per day; export as CSV

### Phase 8.5 — Advanced AI Features
- [ ] **Vision / image attachments** — attach images to messages; routed to GPT-4o / Ollama multimodal models
- [ ] **Conversation branching** — fork from any message in history (creates a new chat from that point); useful for exploring different follow-ups
- [ ] **Custom system prompt per chat** — override the global system prompt at the chat level, not just via templates
- [ ] **Composer Tools** — web search, calculator, code execution, user-defined tool plugins (button already stubbed in UI)
- [ ] **Global chat search** — full-text search across all of a user's conversation history

---

## 🛠️ Technology Stack (Quick Reference)

- **Frontend:** React 18, TypeScript, Vite, Axios, Tailwind CSS.
- **Backend:** Python 3.12, FastAPI, LangChain, ChromaDB.
- **LLM:** OpenAI (GPT-4o) / Ollama (Llama3).

