# Types

> **Directory:** `frontend/src/types/`
> **Role:** All shared TypeScript interfaces and type definitions. Mirrors the backend Pydantic models.

Back to [PROJECT.md](../PROJECT.md)

---

## `index.ts` — Re-exports & Aliases

This file re-exports types from `models.ts` with aliased names that are more convenient for frontend usage:

| Export | Original | Purpose |
|---|---|---|
| `ChatMessage` | Alias of `Message` | Represents a single message in a conversation. |
| `ChatThread` | Alias of `Chat` | Represents a full chat session with all its messages. Used everywhere in App.tsx. |
| `Model` | Defined here: `{ id: string; name: string; category: string }` | Represents an available LLM model from the model selector. |

---

## `models.ts` — Core Data Models

The definitive type definitions for the application's data structures.

### Message

```ts
interface MessageAttachment {
  id: string
  kind: 'url' | 'file'
  label: string
  source: string
  status?: 'pending' | 'ingested' | 'failed'
  error?: string
}

interface Message {
  id: string               // UUID
  role: 'user' | 'assistant' | 'system'
  content: string          // The message text (markdown for assistant)
  model?: string           // Model that produced this reply (assistant messages)
  sources?: string[]       // Citation sources (assistant messages only)
  attachments?: MessageAttachment[] // URL/file attachments on user messages
  created_at: string       // ISO datetime
}
```

A single message in a conversation. `role` determines who sent it:
- `user` — the human
- `assistant` — the AI
- `system` — system instructions (not displayed)

`model` is optional and used for message-level provenance when users switch models mid-chat.
`attachments` stores user-attached URL/file metadata and ingestion status for display/debugging.

---

### Chat

```ts
interface Chat {
  id: string               // UUID
  title: string            // Chat title (auto-generated or renamed)
  template_id: string | null  // Linked template, if any
  pinned: boolean          // Whether pinned to top of sidebar
  model?: string | null    // LLM model used (e.g., "gpt-4o-mini")
  messages: Message[]      // Full conversation history
  created_at: string       // ISO datetime
  updated_at: string | null
}
```

A full chat session. In the frontend this is aliased as `ChatThread`.

---

### ChatCreate / ChatUpdate

```ts
interface ChatCreate {
  title?: string           // Default: "New Chat"
  template_id?: string
  model?: string
}

interface ChatUpdate {
  title?: string
  template_id?: string
  pinned?: boolean
  model?: string
  messages?: Message[]     // Full replacement of message array
}
```

Request bodies for creating and updating chats. All fields are optional in `ChatUpdate` (partial update).

---

### TemplateSettings

```ts
interface TemplateSettings {
  model: string            // Default: "gpt-4o-mini"
  temperature: number      // Default: 0.2 (range 0.0–1.0)
  chunk_size: number       // Default: 1000
  chunk_overlap: number    // Default: 200
  retrieval_k: number      // Default: 5 (top-K results)
  system_prompt: string    // The AI's instruction prompt
}
```

Configuration for how a template's RAG pipeline behaves.

---

### Template / TemplateCreate / TemplateUpdate

```ts
interface Template {
  id: string
  name: string
  description: string
  sources: string[]        // Document URLs or file paths
  settings: TemplateSettings
  created_at: string
  updated_at: string | null
  source_count?: number
}

interface TemplateCreate {
  name: string
  description?: string
  sources?: string[]
  settings?: TemplateSettings
}

interface TemplateUpdate {
  name?: string
  description?: string
  sources?: string[]
  settings?: TemplateSettings
}
```

---

### ApiError / PaginatedResponse

```ts
interface ApiError {
  detail: string
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}
```

Utility types for API error handling and paginated list responses.

---

### Type Guards

| Function | Signature | Purpose |
|---|---|---|
| `isTemplate` | `(obj: any) => obj is Template` | Runtime check that an object has the shape of a `Template`. |
| `isTemplateSettings` | `(obj: any) => obj is TemplateSettings` | Runtime check for `TemplateSettings` shape. |

---

### Constants

| Constant | Value | Purpose |
|---|---|---|
| `DEFAULT_TEMPLATE_SETTINGS` | `{ model: "gpt-4o-mini", temperature: 0.2, chunk_size: 1000, chunk_overlap: 200, retrieval_k: 5, system_prompt: "You are a helpful AI assistant..." }` | Defaults used when creating a new template. |
| `AVAILABLE_MODELS` | `[{ id: "gpt-4o-mini", ... }, { id: "gpt-4o", ... }, ...]` | Static fallback list of models with display labels. |
