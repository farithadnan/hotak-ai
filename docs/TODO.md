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
	- [x] `get_current_admin` dependency; admin-on-admin lock/delete protection.
	- [x] Admin CRUD endpoints: list/create/lock/unlock/delete users.
	- [x] Model settings endpoints (`GET/PUT /admin/models`); `/models` filtered by enabled list.
	- [x] System settings endpoints (`GET/PUT /admin/system`); JSON persistence via `app/services/system_settings.py`.
	- [x] Admin panel at `/admin` — Users tab (table + CreateUserModal), Models tab (auto-save), System Settings modal.
	- [x] `AdminRoute` guard; Admin Panel nav hidden from non-admins.

*Phase 7.2 Admin & RBAC complete. Next: Phase 7.3 — Per-user ChromaDB namespace isolation.*
