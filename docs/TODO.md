# Hotak AI - 🎯 Immediate Tasks

1. [x] **Backend:** Chat + message persistence (`/chats`, `/messages`) - ✅ Done.
2. [x] **Backend:** Query + streaming query endpoints (`/query`, `/query/stream`) - ✅ Done.
3. [x] **Frontend:** Real-time assistant stream UX + fallback-to-query - ✅ Done.
4. [x] **Frontend:** Assistant thinking state + source/citation rendering - ✅ Done.
5. [x] **Frontend:** Chat actions (edit/copy/regenerate) + delete confirm + toast - ✅ Done.
6. [x] **Frontend:** URL-based routing for chat/templates - ✅ Done.
7. [x] **Backend/Frontend:** Dynamic model listing (`/models`) + per-chat model selection - ✅ Done.
8. [x] **Backend/Frontend:** Permission/rate-limit handling with graceful fallback messaging - ✅ Done.
9. [x] **Backend/Frontend:** Multi-turn context handoff + mid-chat model provenance - ✅ Done.
	- [x] `QueryRequest` now supports `chat_id` + optional `messages` context payload.
	- [x] Backend dedupes duplicate last-user turn when composing LLM history.
	- [x] Assistant messages persist `model` (message-level model tracking).
10. [x] **Backend:** Filter unavailable models from `/models` (prevent selecting inaccessible models) - ✅ Done.
	- [x] `app/services/model_catalog.py` — probes each candidate chat model at startup with `max_tokens=1`.
	- [x] `GET /models` now serves only accessible models from `app.state.accessible_models`.
	- [x] Frontend `isLikelyChatModel` filter removed — backend is authoritative.
11. [x] **Backend:** Silence/patch telemetry warning (`CollectionQueryEvent capture()` mismatch) - ✅ Done.
	- [x] Chroma client now uses explicit `PersistentClient` with `anonymized_telemetry=False`.
	- [x] `chromadb.telemetry.product.posthog` logger suppressed at ERROR level in `server.py` (posthog version bug fires warnings even when telemetry is disabled).
12. [x] **Backend:** Harden web-document ingestion for empty parsed pages - ✅ Done.
	- [x] Web loader now falls back to full-page parse when filtered extraction is empty.
	- [x] Empty extracted documents are marked failed instead of crashing split/embed flow.
13. [x] **Frontend:** Show model in sidebar chat rows (optional UX enhancement). - ✅ Done.
14. [x] **Backend/Frontend:** Token-budget context packing + stream timeout safeguards - ✅ Done.
	- [x] Backend packs prior chat history against configurable token budgets.
	- [x] Frontend stream timeout aborts stalled chunk reads and falls back to `/query`.
15. [x] **Frontend:** Assistant markdown rendering + deduped clickable sources - ✅ Done.
	- [x] Assistant text renders markdown lists/links/code instead of raw markdown punctuation.
	- [x] Duplicate sources are collapsed and HTTP sources open in a new tab.
16. [x] **Backend/Frontend:** Chat attachment ingestion baseline (URL + file upload) - ✅ Done.
	- [x] Composer can queue URL/file attachments before send.
	- [x] Send flow ingests URL sources via `/documents/load` and file uploads via `/documents/upload`.
	- [x] User messages persist attachment metadata and render attachment chips.
17. [x] **Frontend:** Replace prompt-based URL attach with inline URL input popover - ✅ Done.
18. [x] **Frontend:** Add explicit attachment error toasts and progress indicators - ✅ Done.
	- [x] Pending attachment chips show queued/uploading/indexing/ready/failed states.
	- [x] Attachment ingest results surface as success/info/error toasts.
19. [x] **Frontend:** Add pre-upload validation for file type/size - ✅ Done.
	- [x] Reject unsupported extensions before network call.
	- [x] Reject oversized files before network call.
20. [x] **Frontend:** Add drag-and-drop attachment support in composer - ✅ Done.
21. [x] **Frontend:** Replace placeholder "Attach Templates" action with a real template picker - ✅ Done.
	- [x] Template selection queues template sources as URL/file attachments.
22. [x] **Frontend:** Add byte-level upload progress percentages for file attachments. - ✅ Done.
	- [x] `documents.ts` exposes `onUploadProgress` callback via axios `onUploadProgress`.
	- [x] `useChatEngine` updates `uploadProgress` percent on pending attachment during upload.
	- [x] Composer chip renders `{uploadProgress}%` while status is `uploading`.
23. [x] **Templates:** Persist uploaded template files as real saved sources instead of browser-only file names - ✅ Done.
	- [x] TemplateBuilder now calls `POST /documents/upload` immediately when files are selected.
	- [x] Template `sources` stores the full server path returned by the upload endpoint (used for ChromaDB source filtering).
	- [x] File list displays just the filename (basename) but stores the full path.
	- [x] Upload errors shown inline; submit button disabled while uploading.
24. [x] **Backend:** Optional rolling summary memory block for long conversations. - ✅ Done.
25. [x] **Backend:** Fix streaming cut-off and PDF content leaking into stream - ✅ Done.
	- [x] Switched to `stream_mode="messages"` for true token-by-token streaming.
	- [x] Added `AIMessageChunk` filter to exclude tool message content (retrieved docs) from stream output.
	- [x] Raised `LLM_MAX_TOKENS` default to 4096 and `STREAM_MAX_CHARS` to 32000 in settings and `.env.sample`.
26. [x] **Backend:** Template source filtering — query retrieval scoped to template's documents - ✅ Done.
27. [x] **Backend/Frontend:** Chat archive feature - ✅ Done.
	- [x] Added `archived: bool = False` field to `Chat` and `ChatUpdate` Pydantic models.
	- [x] `GET /chats` now returns only non-archived chats; added `GET /chats/archived` endpoint.
	- [x] Archive action added to sidebar chat context menu (Rename / Pin / **Archive** / Delete).
	- [x] Archived Chats modal (via profile popover): search bar, per-item Unarchive + Delete, bulk Unarchive All + Delete All with confirm.
	- [x] `AgentRuntimeConfig` extended with `allowed_sources: list[str] | None`.
	- [x] `create_retrieval_tool` applies ChromaDB `filter={"source": {"$in": allowed_sources}}` when set.
	- [x] Agent cache keyed by sorted sources; falls back to all-docs search when template has no sources.

28. [x] **Backend/Frontend:** Admin panel & RBAC - ✅ Done (Phase 7.2)
	- [x] `role` + `is_active` columns added to `users` table with incremental SQLite migration.
	- [x] Public `/auth/register` removed; first admin bootstrapped from env vars at startup.
	- [x] `get_current_admin` dependency; admin-on-admin lock/delete/edit protection.
	- [x] Admin CRUD: list/create/lock/unlock/delete users; edit user details (`PATCH /admin/users/{id}`); reset password (`POST /admin/users/{id}/reset-password`).
	- [x] Model settings (`GET/PUT /admin/models`); system settings (`GET/PUT /admin/system`) with all tunables inc. `max_upload_file_size_mb` and `access_token_expire_minutes`.
	- [x] Admin panel — Users tab (search, skeleton, EditUserModal with Details/Security tabs), Models tab (search, Enable All/Disable All, last-model protection), System Settings modal (per-field validation, skeleton).
	- [x] `PasswordInput` generic component (eye toggle); `FormField` generic component (label + input slot + error/hint); uniform validation UX across all forms.
	- [x] Validation resets on modal close for CreateUserModal, EditUserModal, and TemplateBuilder.
	- [x] TemplateBuilder tab buttons match admin panel style; cross-tab error notification (auto-switch + red dot badge).

29. [x] **Backend:** Per-user ChromaDB data isolation - ✅ Done (Phase 7.3)
	- [x] `user_id` stamped into every document chunk's metadata at ingest (`add_documents_to_store`).
	- [x] Cache check (`is_document_cached`) and `filter_uncached_sources` scoped to `user_id`.
	- [x] Retrieval filter in `create_retrieval_tool` scoped to `user_id`; combined with `allowed_sources` via `$and`.
	- [x] Citation validation `similarity_search` in `/query` scoped to `user_id`.
	- [x] `AgentRuntimeConfig.user_id` carries user identity into agent cache; cache key includes `user_id`.
	- [x] `GET /documents` filtered by `user_id`; all document endpoints use `current_user` (not `_current_user`).

30. [x] **Backend/Frontend:** User Settings (Phase 7.4) - ✅ Done
	- [x] `preferences` JSON column + incremental migration; `DEFAULT_PREFERENCES` constant.
	- [x] `PATCH /auth/me`, `POST /auth/me/change-password`, `GET/PATCH /auth/me/preferences` endpoints.
	- [x] Frontend types (`AccentColor`, `ThemeMode`, `ChatBackground`, `UserPreferences`), auth service, and `AuthContext` with `updateUser`, `changePassword`, `updatePreferences`.
	- [x] `utils/theme.ts` — `applyTheme()` with 6 accent palettes × dark/light; applied on login, logout, preference change.
	- [x] `UserSettingsModal` — Account / Security / Preferences / Appearance tabs; avatar upload (canvas 200×200 base64); theme toggle; accent color grid; chat background grid.
	- [x] Auth pages split layout (brand panel left + form right; mobile responsive); login placeholders added.
	- [x] Settings button wired in profile popover → `UserSettingsModal` mounted in `AppShell`.
	- [x] Avatar shown in sidebar profile button + popover header; chat bg class applied to scroll container.
	- [x] Glass sidebar + header with directional fade; full-viewport bg via `app-shell`; all modals/dialogs/forms glass.
	- [x] Sidebar/header popovers portaled to `document.body` to fix `backdrop-filter` stacking context bug.
	- [x] Theme-adaptive gradient backgrounds (`color-mix` with `var(--color-bg)`); accent on range/checkbox/radio globally.
	- [x] App logo switched to `hotak-ai-logo.webp`; cyberpunk login bg image; favicon suite in `public/`; title "Hotak AI".

31. [x] **Docker:** Phase 7.5 containerisation - ✅ Done
	- [x] `requirements.txt` pinning all backend Python deps.
	- [x] `Dockerfile` (backend) — Python 3.13-slim, uvicorn entrypoint, named volumes for `data/` + `logs/`.
	- [x] `frontend/Dockerfile` — multi-stage Node 22 build → nginx 1.27 serve; `VITE_API_BASE_URL` build arg.
	- [x] `frontend/nginx.conf` — SPA fallback + static asset cache headers.
	- [x] `docker-compose.yml` — both services, env var pass-through, `CORS_ORIGINS` + `VITE_API_BASE_URL`.
	- [x] `.dockerignore` for root and `frontend/`.
	- [x] `.env.sample` updated with all Docker vars.
	- [x] Fixed production asset paths (`/src/assets/...` → `public/` files served as `/...`).
	- [x] Ollama service added to `docker-compose.yml` (`ollama/ollama:latest`, `ollama_data` volume, port 11434).
	- [x] `CORS_ORIGINS` fix — must include both `http://localhost:5173` (dev) and `http://localhost` (Docker).

33. [x] **Backend/Frontend:** Ollama multi-provider support - ✅ Done
	- [x] `get_ollama_models()` in `model_catalog.py` — hits `/api/tags`, gracefully skips if Ollama unreachable.
	- [x] `create_llm_for_model()` in `llm.py` — routes `ollama/*` to `ChatOllama`, everything else to OpenAI.
	- [x] `initialize_model_settings` merges new models on every restart — Ollama models auto-appear without wiping settings.
	- [x] `OLLAMA_BASE_URL` env var — `http://ollama:11434` in Docker, `http://localhost:11434` for local dev.
	- [x] Pull models with: `docker exec hotak-ai-ollama ollama pull llama3.2`

34. [ ] **Frontend:** Composer Tools integration *(future feature — button disabled/stubbed)*
	- [ ] Define tool schema and backend tool-call routing.
	- [ ] Composer Tools button (`Briefcase` icon) is currently disabled with `title="Tools (coming soon)"`.
	- [ ] Planned: web search, calculator, code execution, and user-defined tool plugins.

---

## Phase 8 — Power User & Data Portability

### 8.1 Export & Import
35. [ ] **Chat export** — `GET /chats/{id}/export?format=md|pdf|json`; frontend "Export" option in chat context menu
	- [ ] Markdown: render message history with model, timestamps, sources
	- [ ] PDF: server-side or browser print-to-PDF via CSS `@media print`
	- [ ] JSON: full raw chat object for programmatic use / re-import
36. [ ] **Template export/import**
	- [ ] `GET /templates/{id}/export` → `.json` download (name, description, settings, source list)
	- [ ] `POST /templates/import` → parse uploaded `.json`, create template (admin or owner only)
	- [ ] TemplateBuilder UI: "Export" button per template card; "Import from file" button on template list
37. [ ] **Full admin backup/restore**
	- [ ] `GET /admin/backup` → ZIP archive: system settings JSON, provider config (keys masked), model settings, all template definitions
	- [ ] `POST /admin/restore` → upload ZIP; validate and apply each component with a dry-run preview
	- [ ] Admin panel: "Backup" and "Restore" buttons in System Settings modal

### 8.2 Document Management
38. [ ] **User document library** — `/documents` list page showing all ingested sources per user
	- [ ] Columns: file name / URL, type, size, date ingested, status
	- [ ] Per-row delete: removes document record + purges ChromaDB vectors scoped to that source
	- [ ] Bulk delete with confirmation
39. [ ] **Deduplication** — hash-based skip on re-ingest; show "Already indexed" status in UI
40. [ ] **Scheduled URL re-ingestion** — configurable refresh interval on URL sources; background task re-fetches + re-embeds
41. [ ] **Admin document view** — admin sees all users' documents; can purge for compliance / storage management

### 8.3 Collaboration & Sharing
42. [ ] **Shared/published templates** — admin publishes templates to all users; users browse a library and clone
	- [ ] `is_public: bool` field on Template model; `GET /templates/library` returns admin-published templates
	- [ ] "Clone to My Templates" action in template library modal
43. [ ] **Read-only chat sharing** — shareable link to a conversation (public or expiring token-gated)
	- [ ] `POST /chats/{id}/share` → returns a `share_token`; `GET /share/{token}` → public read-only view
	- [ ] No account required for viewer; share can be revoked
44. [ ] **Team workspaces** *(larger scope)* — group users with shared templates and document pools

### 8.4 Usage & Quotas
45. [ ] **Token usage tracking** — record prompt + completion tokens per message in DB
	- [ ] Add `prompt_tokens`, `completion_tokens` columns to messages table
	- [ ] Aggregate `GET /admin/usage` endpoint: by user / model / day
46. [ ] **Per-user token quotas** — admin sets monthly token budget per user; 429 enforced before limit
47. [ ] **Usage dashboard** — admin UI: token spend table per user/model/day; CSV export

### 8.5 Advanced AI Features
48. [ ] **Vision / image attachments** — attach images to messages; route to GPT-4o vision / Ollama multimodal
49. [ ] **Conversation branching** — fork from any message; creates new chat from that point in history
	- [ ] "Fork from here" action on assistant/user message context menu
50. [ ] **Custom system prompt per chat** — override global system prompt at chat level (not just via templates)
51. [ ] **Global chat search** — full-text search across all user conversation history
	- [ ] `GET /chats/search?q=...` → ranked results with snippet preview
	- [ ] Search bar in sidebar accessible via keyboard shortcut
