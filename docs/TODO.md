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
13. [ ] **Backend/Frontend:** Token-budget context packing per model (replace fixed message-count window).
14. [ ] **Backend:** Optional rolling summary memory block for long conversations.

*Core chat + model workflow is working, including multi-turn model switching. Next: model accessibility UX, telemetry cleanup, and token-budget/summarization hardening.*
