# Services (API Layer)

> **Directory:** `frontend/src/services/`
> **Role:** All HTTP communication with the backend. Each file handles one resource. Re-exported via `services/index.ts`.

Back to [PROJECT.md](../PROJECT.md)

---

## `api.ts` — HTTP Client

The foundation all other services build on.

| Export | Type | Description |
|---|---|---|
| `API_BASE_URL` | `string` | `'http://localhost:8000'` — the backend origin. |
| `default` (api) | `AxiosInstance` | Pre-configured Axios instance with `baseURL` and JSON headers. |
| `getErrorMessage(error)` | `(any) => string` | Extracts a human-readable error message from Axios errors, generic `Error` objects, or unknown values. |
| `healthCheck()` | `() => Promise<{ status: string }>` | Calls `GET /health` to check backend availability. |

All other services import this default `api` instance for their requests.

---

## `chats.ts` — Chat CRUD + Messaging

Manages chat sessions and their messages.

| Function | Signature | Endpoint | Description |
|---|---|---|---|
| `createChat` | `(data: ChatCreate) => Promise<Chat>` | `POST /chats` | Creates a new chat session. Typically called with `{ title: 'New Chat', model }`. |
| `getChats` | `() => Promise<Chat[]>` | `GET /chats` | Fetches all chats. Called once on app mount to populate the sidebar. |
| `getChat` | `(id: string) => Promise<Chat>` | `GET /chats/{id}` | Fetches a single chat by ID. |
| `updateChat` | `(id: string, data: ChatUpdate) => Promise<Chat>` | `PUT /chats/{id}` | Partial update — can change `title`, `model`, `pinned`, `messages`, or `template_id`. |
| `deleteChat` | `(id: string) => Promise<void>` | `DELETE /chats/{id}` | Permanently deletes a chat and all its messages. |
| `addMessage` | `(chatId: string, message: Message) => Promise<Chat>` | `POST /chats/{chatId}/messages` | Appends a single message (user or assistant) to a chat. |
| `generateChatTitle` | `(chatId: string) => Promise<Chat>` | `POST /chats/{chatId}/generate-title` | Asks the LLM to generate a short title based on the first user message. Returns the updated chat. |

### Usage Flow (sending a message)

```
createChat()  →  addMessage(userMsg)  →  [stream response]  →  addMessage(assistantMsg)  →  generateChatTitle()
```

---

## `query.ts` — RAG Query + Streaming

The core AI interaction layer.

### Types

| Type | Fields | Purpose |
|---|---|---|
| `QueryRequest` | `question: string, model?: string, stream?: boolean` | Sent to `/query` or `/query/stream`. |
| `QueryResponse` | `answer: string, citation_info: string, model?: string, warning?: string` | Returned by `/query` (non-streaming). |

### Functions

| Function | Signature | Endpoint | Description |
|---|---|---|---|
| `queryAgent` | `(request: QueryRequest) => Promise<QueryResponse>` | `POST /query` | Standard (non-streaming) query. Used as a fallback when streaming fails. |
| `streamQuery` | `(request: QueryRequest) => AsyncGenerator<string>` | `POST /query/stream` | Streams the AI response chunk-by-chunk. |

### How `streamQuery` Works

1. Uses `fetch()` (not Axios) because Axios doesn't support browser `ReadableStream`
2. Sends `POST /query/stream` with `{ question, model, stream: true }`
3. Reads the response body as a `ReadableStream` via `getReader()`
4. Decodes each `Uint8Array` chunk to text with `TextDecoder`
5. `yield`s each decoded chunk — the caller iterates with `for await...of`
6. Handles connection errors by throwing, which `streamAssistantText` catches to fall back to `queryAgent`

### Usage in App.tsx

```ts
for await (const chunk of streamQuery({ question, model: modelId })) {
  streamedContent += chunk
  onPartial(streamedContent) // updates UI in real-time
}
```

---

## `documents.ts` — Document Management

Manages the vector store's document sources.

### Types

| Type | Fields |
|---|---|
| `DocumentLoadRequest` | `sources: string[], chunk_size?: number, chunk_overlap?: number` |
| `DocumentLoadResponse` | `loaded: number, skipped: number, cached_sources: string[], loaded_sources: string[], failed_sources: string[]` |
| `DocumentSource` | `source: string, chunks: number` |
| `DocumentListResponse` | `total_sources: number, sources: DocumentSource[]` |

### Functions

| Function | Signature | Endpoint | Description |
|---|---|---|---|
| `loadDocuments` | `(request: DocumentLoadRequest) => Promise<DocumentLoadResponse>` | `POST /documents/load` | Loads documents into the vector store. Skips already-cached sources. Returns counts of loaded/skipped/failed. |
| `listDocuments` | `() => Promise<DocumentListResponse>` | `GET /documents` | Lists all document sources currently in the vector store with their chunk counts. |

---

## `models.ts` — Available Models

Fetches and filters the list of OpenAI models the user can select from.

### Types

| Type | Fields |
|---|---|
| `OpenAIModel` | `id: string, created: number, object: 'model', owned_by: string` |
| `OpenAIModelListResponse` | `object: 'list', data: OpenAIModel[]` |

### Helper Functions (internal)

| Function | Logic |
|---|---|
| `isLikelyChatModel(modelId)` | Returns `true` for models starting with `gpt-`, `o1`, `o3`, `o4`, `chatgpt-`. Excludes embeddings, TTS, whisper, DALL-E, etc. |
| `prettifyModelName(modelId)` | Replaces dashes with spaces and title-cases (`gpt-4o-mini` → `Gpt 4o Mini`). |

### Exported Function

| Function | Signature | Endpoint | Description |
|---|---|---|---|
| `getAvailableModels` | `() => Promise<Model[]>` | `GET /models` | Fetches all OpenAI models, filters to chat-capable ones, sorts most recent first, returns `{ id, name, category }`. |

---

## `templates.ts` — Template CRUD

Manages knowledge templates.

| Function | Signature | Endpoint | Description |
|---|---|---|---|
| `createTemplate` | `(data: TemplateCreate) => Promise<Template>` | `POST /templates` | Creates a new template with name, sources, and settings. |
| `getTemplates` | `() => Promise<Template[]>` | `GET /templates` | Fetches all templates. |
| `getTemplate` | `(id: string) => Promise<Template>` | `GET /templates/{id}` | Fetches one template by ID. |
| `updateTemplate` | `(id: string, data: TemplateUpdate) => Promise<Template>` | `PUT /templates/{id}` | Partial update of template fields. |
| `deleteTemplate` | `(id: string) => Promise<void>` | `DELETE /templates/{id}` | Permanently deletes a template. |

---

## `index.ts` — Barrel Export

```ts
export * from './templates'
export * from './documents'
export * from './query'
export * from './chats'
export * from './models'
```

Allows importing any service function from `'./services'` directly.
