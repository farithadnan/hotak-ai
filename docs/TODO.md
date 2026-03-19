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
10. [ ] **Backend:** Filter unavailable models from `/models` (prevent selecting inaccessible models).
11. [ ] **Backend:** Silence/patch telemetry warning (`CollectionQueryEvent capture()` mismatch).
12. [ ] **Frontend:** Show model in sidebar chat rows (optional UX enhancement).
13. [x] **Backend/Frontend:** Token-budget context packing + stream timeout safeguards - ✅ Done.
	- [x] Backend packs prior chat history against configurable token budgets.
	- [x] Frontend stream timeout aborts stalled chunk reads and falls back to `/query`.
14. [x] **Frontend:** Assistant markdown rendering + deduped clickable sources - ✅ Done.
	- [x] Assistant text renders markdown lists/links/code instead of raw markdown punctuation.
	- [x] Duplicate sources are collapsed and HTTP sources open in a new tab.
15. [x] **Backend/Frontend:** Chat attachment ingestion baseline (URL + file upload) - ✅ Done.
	- [x] Composer can queue URL/file attachments before send.
	- [x] Send flow ingests URL sources via `/documents/load` and file uploads via `/documents/upload`.
	- [x] User messages persist attachment metadata and render attachment chips.
16. [x] **Frontend:** Replace prompt-based URL attach with inline URL input popover - ✅ Done.
17. [x] **Frontend:** Add explicit attachment error toasts and progress indicators - ✅ Done.
	- [x] Pending attachment chips show queued/uploading/indexing/ready/failed states.
	- [x] Attachment ingest results surface as success/info/error toasts.
18. [ ] **Frontend:** Add drag-and-drop attachment support in composer.
19. [ ] **Frontend:** Replace placeholder "Attach Templates" action with a real template picker.
20. [ ] **Backend:** Optional rolling summary memory block for long conversations.

*Core chat + model workflow is working, including multi-turn model switching and budgeted history packing. Next: model accessibility UX, telemetry cleanup, and summary-memory hardening.*
