# Hooks

> **Directory:** `frontend/src/hooks/`
> **Role:** Custom React hooks for routing, popover positioning, click detection, and the chat engine.

Back to [PROJECT.md](../PROJECT.md)

---

## `useChatEngine`

**File:** `hooks/useChatEngine.ts`

The core hook that owns **all chat data and operations**. Extracted from App.tsx to keep the root component slim.

### Parameters

| Param | Type | Description |
|---|---|---|
| `activeChatId` | `string \| null` | The currently active chat ID (from routing). |
| `openChat` | `(chatId?: string) => void` | Navigation callback to open a chat. |

### State Owned

| State | Type | Description |
|---|---|---|
| `chats` | `ChatThread[]` | All chat sessions, loaded from backend on mount. |
| `isLoadingChats` | `boolean` | Whether the initial `GET /chats` is still loading. |
| `chatRuntime` | `Record<string, ChatRuntimeState>` | Per-chat ephemeral flags (`isResponding`, `isGeneratingTitle`). |
| `inputValue` | `string` | Current text in the composer textarea. |
| `regeneratingAssistantMessageId` | `string \| null` | ID of the assistant message being regenerated. |
| `textareaRef` | `Ref<HTMLTextAreaElement>` | Ref for auto-resize of the composer. |
| `pendingAttachments` | `Array<{ id, kind, label, source }>` | Composer-queued URL/file attachments for the next send. |
| `isAttachingSources` | `boolean` | Whether URL/file ingestion is currently in progress. |
| `attachmentFeedback` | `{ title?, message, type } \| null` | Latest attachment feedback toast payload. |
| `availableTemplates` | `Template[]` | Template catalog used by the composer template attach picker. |

### Returns

| Property | Type | Description |
|---|---|---|
| `chats` | `ChatThread[]` | All chats. |
| `setChats` | `Dispatch` | Setter — shared with Sidebar for rename/pin/delete. |
| `isLoadingChats` | `boolean` | Loading state. |
| `chatRuntime` | `Record<string, ChatRuntimeState>` | Runtime flags. |
| `inputValue` | `string` | Composer text. |
| `activeChat` | `ChatThread \| null` | Derived: `chats.find(c => c.id === activeChatId)`. |
| `regeneratingAssistantMessageId` | `string \| null` | Which message is regenerating. |
| `textareaRef` | `RefObject` | Textarea ref. |
| `handleInputChange` | `(e) => void` | Updates `inputValue`. |
| `handleKeyDown` | `(e, modelId?) => void` | Enter to send, Shift+Enter for newline. |
| `setInputValue` | `Dispatch` | Direct setter (used by App for `handleNewChat`). |
| `pendingAttachments` | `Array<{ id, kind, label }>` | Pending attachment chips shown in composer. |
| `isAttachingSources` | `boolean` | Disables send while attachment ingestion runs. |
| `handleAttachFiles` | `(files: File[]) => void` | Queue local file attachments for next send. |
| `handleAttachTemplate` | `(templateId: string) => void` | Queue all sources from a selected template. |
| `handleRemovePendingAttachment` | `(attachmentId: string) => void` | Remove one queued attachment. |
| `clearPendingAttachments` | `() => void` | Clear queue after successful user-message persist. |
| `clearAttachmentFeedback` | `() => void` | Dismiss attachment success/error toast. |
| `handleSend` | `(modelId?) => Promise<void>` | Full send flow: create chat → optimistic UI → stream → persist → title. |
| `handleUpdateUserMessage` | `(messageId, content, attachments?, modelId?) => void` | Edit user message, persist optional attachment changes, and re-stream assistant response. |
| `handleRegenerateAssistantMessage` | `(assistantMessageId, modelId?) => void` | Re-stream an existing assistant response. |
| `handleChangeActiveChatModel` | `(modelId) => void` | Update active chat's model (optimistic + persist). |

### Internal Functions (not exposed)

- `markRuntime(chatId, patch)` — updates `chatRuntime` for a specific chat
- `ensureChatModel(chatId, modelId?)` — syncs chat model with optimistic update
- `buildLlmContext(messages)` — converts local chat messages to a compact request payload for backend context handoff
- `streamAssistantText(question, onPartial, chatId?, modelId?, onModelResolved?, contextMessages?)` — streaming engine with fallback and explicit context payload
- `extractUrlsFromText(input)` — detects HTTP/HTTPS links in the user prompt so pasted URLs are auto-ingested on send.
- `ingestPendingAttachments(extraUrlSources?)` — ingests queued/template URLs plus auto-detected prompt URLs via `/documents/load`, ingests files via `/documents/upload`, updates per-chip progress (`queued` → `uploading` / `ingesting` → `ready` / `failed`), and returns message-level attachment metadata with status.
- During message edit, newly introduced URLs are also auto-ingested and merged into that message's attachment list.
- `handleAttachFiles()` performs frontend validation first (allowed extension + max size) before any upload request is sent.

### Multi-Turn Model Switching Notes

- On send/edit/regenerate, the hook can pass in-memory `messages` context to `/query` and `/query/stream` to avoid stale persistence races.
- Assistant messages are persisted with `message.model` so each reply records which model produced it.
- The backend still keeps `chat.model` as the active default model for next turns.
- If streaming stalls, `streamQuery` aborts after a timeout and the hook falls back to non-stream `/query` automatically.

### Effects

1. **Load chats on mount** — `GET /chats` → sets `chats` and `isLoadingChats`
2. **Auto-resize textarea** — fires when `inputValue` changes, adjusts height

---

## `useAppRouting`

**File:** `hooks/useAppRouting.ts`

Wraps React Router's `useNavigate` and `useParams` to provide a clean navigation API for the app.

### Returns

| Property | Type | Description |
|---|---|---|
| `activeChatId` | `string \| null` | The chat ID from the URL (`/chat/:chatId`). `null` if on `/chat` with no ID. |
| `isChatView` | `boolean` | `true` if the current route is `/chat` or `/chat/:chatId`. |
| `openTemplates` | `() => void` | Navigates to `/templates`. |
| `openChat` | `(chatId?: string) => void` | Navigates to `/chat/{chatId}` or `/chat` if no ID. |
| `openNewChat` | `() => void` | Navigates to `/chat` (no ID = fresh empty chat view). |

### Usage in App.tsx

```ts
const { activeChatId, isChatView, openTemplates, openChat, openNewChat } = useAppRouting()
```

`activeChatId` drives which chat is displayed. `isChatView` controls whether to show the chat header or the templates header.

---

## `useClickOutside`

**File:** `hooks/useClickOutside.ts`

Detects clicks outside a referenced element and fires a callback. Used to close popovers and dropdowns.

### Parameters

| Param | Type | Description |
|---|---|---|
| `ref` | `RefObject<HTMLElement \| null>` | The element to monitor. |
| `callback` | `() => void` | Called when a click lands outside `ref.current`. |
| `isActive` | `boolean` | When `false`, the listener is not attached. |

### How It Works

1. When `isActive` is `true`, attaches a `mousedown` listener on `document`
2. On each click, checks if the target is inside `ref.current`
3. If outside, calls `callback`
4. Cleans up the listener when `isActive` becomes `false` or on unmount

### Usage

```ts
useClickOutside(dropdownRef, () => setOpen(false), isOpen)
```

---

## `useFloatingPopover`

**File:** `hooks/useFloatingPopover.ts`

Positions a floating popover panel relative to a trigger element, handling viewport clamping, scroll/resize repositioning, and outside-click dismissal.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | — | Whether the popover is currently visible. |
| `onClose` | `() => void` | — | Called to dismiss the popover. |
| `placement` | `'top-start' \| 'bottom-start' \| 'left-start' \| 'right-start'` | `'bottom-start'` | Where to position the panel relative to the anchor. |
| `panelWidth` | `number` | `240` | Width of the popover panel (px). |
| `panelHeight` | `number` | `180` | Height of the popover panel (px). Used for viewport clamping. |
| `offset` | `number` | `8` | Gap between the anchor and the panel (px). |

### Returns

| Property | Type | Description |
|---|---|---|
| `popoverRef` | `RefObject<HTMLDivElement>` | Attach to the popover container `<div>`. |
| `position` | `{ top: number; left: number }` | Raw pixel position. |
| `floatingStyle` | `CSSProperties` | Ready-to-apply style: `{ position: 'fixed', top, left, width }`. |
| `openFromElement` | `(element: HTMLElement) => void` | Call this with the trigger element to compute position and open. |

### How It Works

1. `openFromElement(trigger)` reads the trigger's `getBoundingClientRect()`
2. Computes position based on `placement`:
   - `bottom-start`: below the trigger, left-aligned
   - `top-start`: above the trigger, left-aligned
   - `right-start`: to the right of the trigger, top-aligned
   - `left-start`: to the left of the trigger, top-aligned
3. Clamps to viewport edges so the panel never overflows the screen
4. Listens for `scroll` and `resize` to reposition
5. Uses `useClickOutside` to close when clicking outside the popover

### Usage in App.tsx

Two instances are created:

```ts
// Profile menu in sidebar footer
const profilePopover = useFloatingPopover({
  isOpen: isProfilePopoverOpen,
  onClose: () => setIsProfilePopoverOpen(false),
  placement: isSidebarCollapsed ? 'right-start' : 'top-start',
  panelWidth: 240,
  panelHeight: 200,
})

// 3-dot menu on each chat row
const chatActionsPopover = useFloatingPopover({
  isOpen: Boolean(activeChatMenuId),
  onClose: () => setActiveChatMenuId(null),
  placement: 'right-start',
  panelWidth: 152,
  panelHeight: 176,
})
```
