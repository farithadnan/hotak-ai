# Components

> **Directory:** `frontend/src/components/`
> **Role:** All React UI components — organized into `common/` (reusable), `layout/` (structural), and `page/` (route-specific).

Back to [PROJECT.md](../PROJECT.md)

---

## Directory Structure

```
components/
├── common/
│   ├── Composer/          ← Message input bar
│   ├── ConfirmDialog/     ← Yes/No confirmation modal
│   ├── Modal/             ← Generic modal wrapper
│   └── Toastr/            ← Toast notifications
├── layout/
│   ├── Sidebar.tsx        ← Full sidebar: chat list, rename, pin, delete, popovers
│   └── SidebarChatListSkeleton.tsx
└── page/
    ├── ChatPage/          ← Chat view with model selector
    ├── ChatWindow/        ← Message list + composer
    ├── TemplateBuilder/   ← Create/edit template modal
    └── TemplateList/      ← Templates grid page
```

---

## Layout Components

### `Sidebar`

**File:** `components/layout/Sidebar.tsx`

The full sidebar component, extracted from App.tsx. Owns all sidebar-specific state and UI logic.

#### Props

| Prop | Type | Description |
|---|---|---|
| `chats` | `ChatThread[]` | All chat sessions (from `useChatEngine`). |
| `setChats` | `Dispatch` | Chat setter — used for rename, pin, delete operations. |
| `isLoadingChats` | `boolean` | Whether chats are loading. |
| `chatRuntime` | `Record<string, ChatRuntimeState>` | Per-chat runtime flags (for title spinner). |
| `activeChatId` | `string \| null` | Currently active chat ID. |
| `isSidebarCollapsed` | `boolean` | Whether sidebar is collapsed. |
| `onToggleSidebar` | `() => void` | Toggle sidebar collapse. |
| `onOpenChat` | `(chatId?) => void` | Navigate to a chat. |
| `onNewChat` | `() => void` | Navigate to new chat. |
| `onOpenTemplates` | `() => void` | Navigate to templates. |
| `onShowToastr` | `(options) => void` | Show toast notification. |

#### Internal State

| State | Type | Description |
|---|---|---|
| `isProfilePopoverOpen` | `boolean` | Profile menu visibility. |
| `activeChatMenuId` | `string \| null` | Which chat's 3-dot menu is open. |
| `renamingChatId` | `string \| null` | Which chat is in rename mode. |
| `renamingValue` | `string` | Current rename input text. |
| `isDeleteConfirmOpen` | `boolean` | Whether the delete confirmation is shown. |
| `pendingDeleteChatId` | `string \| null` | Chat ID pending deletion. |

#### Returns

Unlike typical components, `Sidebar` returns an **object** (not JSX directly):

| Property | Type | Description |
|---|---|---|
| `render` | `JSX.Element` | The sidebar JSX (backdrop + `<aside>`). |
| `isDeleteConfirmOpen` | `boolean` | Used by `ConfirmDialog` in App.tsx. |
| `pendingDeleteChatId` | `string \| null` | Used by `ConfirmDialog` for the message text. |
| `handleConfirmDeleteChat` | `() => Promise<void>` | Wired to the dialog's confirm button. |
| `handleCancelDeleteChat` | `() => void` | Wired to the dialog's cancel button. |

**Why return an object?** The delete confirmation dialog needs to be rendered at the App level (to appear above all content), but the delete state is owned by the Sidebar. Returning an object lets App access both the render output and the dialog state.

#### Internal Functions

- `handleOpenChat(chatId?)` — navigates + closes menu
- `handleNewChat()` — navigates to new chat + closes menu
- `handleOpenTemplates()` — navigates to templates + closes menu
- `handleStartRenameChat(chatId)` — enters rename mode
- `handleSubmitRenameChat(chatId)` — commits rename via `PUT /chats/{id}` (with double-submit lock)
- `handleTogglePinChat(chatId)` — toggles pin via `PUT /chats/{id}`
- `handleRequestDeleteChat(chatId)` — opens delete confirmation
- `handleCancelDeleteChat()` — closes delete confirmation
- `handleConfirmDeleteChat()` — calls `DELETE /chats/{id}`, updates state, shows toastr

---

## Common Components

### `Composer`

**File:** `components/common/Composer/Composer.tsx`

The message input bar at the bottom of the chat window.

#### Props

| Prop | Type | Description |
|---|---|---|
| `inputValue` | `string` | Controlled textarea value. |
| `onInputChange` | `(e: ChangeEvent<HTMLTextAreaElement>) => void` | Change handler. |
| `onKeyDown` | `(e: KeyboardEvent<HTMLTextAreaElement>) => void` | Key handler (Enter to send). |
| `onSend` | `() => void` | Send button click handler. |
| `onCancel?` | `() => void` | Cancel button handler (edit mode only). |
| `textareaRef` | `RefObject<HTMLTextAreaElement \| null>` | Ref for auto-resize. |
| `className?` | `string` | Additional CSS class. |
| `mode?` | `'default' \| 'edit'` | Display mode. Default shows full toolbar; edit shows Cancel + Send. |
| `pendingAttachments?` | `Array<{ id, kind, label }>` | Composer-level queued URL/file attachments (before send). |
| `availableTemplates?` | `Array<{ id, name, sourceCount }>` | Template choices shown in the attach popover. |
| `isAttaching?` | `boolean` | Disables send while attachment ingestion/upload is in progress. |
| `onAttachFiles?` | `(files: File[]) => void` | Adds file attachments selected from local disk. |
| `onAttachTemplate?` | `(templateId: string) => void` | Queues all sources from a selected template. |
| `onRemoveAttachment?` | `(attachmentId: string) => void` | Removes one queued attachment from the composer. |

#### State

| State | Type | Description |
|---|---|---|
| `isAttachPopoverOpen` | `boolean` | Whether the attach menu (Upload Files / Attach Templates) is visible. |

#### Behavior

- **Default mode:** Shows a Plus button (opens attach popover with Upload Files and Attach Templates), Briefcase button (tools), Mic button, and a Send button (visible only when input is non-empty).
- URLs pasted directly into the composer text are detected during send in `useChatEngine` and ingested automatically.
- Attach Templates now opens a searchable inline template picker and adds that template's sources into the queue.
- Dragging files over the composer highlights a drop zone; dropping files queues them like the file picker.
- Queued attachment chips use compact pills with status coloring and cap visible chips with a `+N more` summary; clicking a chip removes it when ingestion is not running.
- **Edit mode:** Uses the same composer attach control (plus menu) as default mode for upload consistency, while keeping Cancel/Send edit actions.
- The attach popover uses `useFloatingPopover` for positioning.

---

### `ConfirmDialog`

**File:** `components/common/ConfirmDialog/ConfirmDialog.tsx`

A modal overlay with a message and two buttons (Cancel / Confirm).

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Whether the dialog is visible. |
| `title?` | `string` | `'Confirm'` | Dialog title. |
| `message` | `ReactNode` | — | Body content. |
| `confirmText?` | `string` | `'Confirm'` | Label for the confirm button. |
| `cancelText?` | `string` | `'Cancel'` | Label for the cancel button. |
| `onConfirm` | `() => void` | — | Called when confirm is clicked. |
| `onCancel` | `() => void` | — | Called when cancel is clicked. |

Returns `null` when `!open`. Used in App.tsx for the "Delete Chat" confirmation.

---

### `Modal`

**File:** `components/common/Modal/Modal.tsx`

A generic modal wrapper with backdrop and close button.

#### Props

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Whether the modal is visible. |
| `onClose` | `() => void` | Called when clicking backdrop or close (×) button. |
| `title?` | `string` | Optional header text. |
| `children` | `ReactNode` | Modal body content. |

Clicking the backdrop calls `onClose`. Content area stops click propagation to prevent accidental dismissal.

---

### `Toastr`

**File:** `components/common/Toastr/Toastr.tsx`

A toast notification that auto-dismisses.

#### Types

```ts
type ToastrType = 'success' | 'error' | 'info'
type ToastrPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Whether the toast is visible. |
| `message` | `string` | — | Body text. |
| `title?` | `string` | — | Optional bold header. |
| `type?` | `ToastrType` | `'info'` | Color/icon variant. |
| `duration?` | `number` | `3000` | Auto-dismiss time (ms). |
| `position?` | `ToastrPosition` | `'top-right'` | Screen corner. |
| `onClose` | `() => void` | — | Called on dismiss (auto or manual). |

Uses `useEffect` + `setTimeout` to auto-dismiss after `duration` milliseconds.

---

## Layout Components

### `SidebarChatListSkeleton`

**File:** `components/layout/SidebarChatListSkeleton.tsx`

A shimmer loading placeholder for the sidebar chat list.

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows?` | `number` | `6` | Number of skeleton rows to render. |

Shown while `isLoadingChats` is `true`.

---

## Page Components

### `ChatPage`

**File:** `components/page/ChatPage/ChatPage.tsx`

The main chat view. Contains the model selector header and delegates message rendering to `ChatWindow`.

#### Props

Same 16 props from `AppRoutes` — `activeChat`, `isLoadingChats`, `hasActiveChatId`, `inputValue`, `onInputChange`, `onKeyDown`, `onSend`, `onChangeActiveChatModel`, `onUpdateUserMessage`, `onRegenerateAssistantMessage`, `regeneratingAssistantMessageId`, `textareaRef`, `username`, `onToggleSidebar`.

#### State

| State | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `'gpt-4o-mini'` | Currently selected model in the dropdown. |
| `isLoadingModels` | `boolean` | `false` | Whether the models list is being fetched. |
| `isModelPopoverOpen` | `boolean` | `false` | Whether the model dropdown is open. |
| `modelSearch` | `string` | `''` | Search text to filter the model list. |
| `availableModels` | `Model[]` | `[{ id: 'gpt-4o-mini', ... }]` | Available models fetched from `GET /models`. |

#### Behavior

- Fetches available models on mount via `getAvailableModels()`.
- Renders a header with a model selector (search + dropdown) using `useClickOutside` to close on outside click.
- When the active chat changes, syncs the model dropdown to `activeChat.model`.
- Wraps `handleSend` and `handleKeyDown` to inject the currently selected `model`.
- Computes `persistedChatModelLabel` — the human-readable name of the chat's saved model.
- Delegates all message rendering to `<ChatWindow>`.

---

### `ChatWindow`

**File:** `components/page/ChatWindow/ChatWindow.tsx`

The scrollable conversation view — renders all messages and the composer.

#### Chat Rendering Notes

- Assistant replies are rendered through a markdown renderer (`react-markdown` + `remark-gfm`), so lists, emphasis, code blocks, and links display as formatted content instead of raw markdown characters.
- Ordered and unordered lists are styled so list items read naturally without extra paragraph-sized gaps between the number marker and the text.
- Sources are deduplicated before display, so repeated citations collapse to one visible item.
- HTTP/HTTPS sources render as clickable links that open in a new browser tab.
- Attachment ingest feedback is shown through a toast in the chat view after send (success, partial success, or failure).
- Shared UI defaults such as toast duration and floating popover defaults are centralized in frontend constants modules instead of being repeated inside components/hooks.

#### Props

| Prop | Type | Description |
|---|---|---|
| `chat` | `ChatThread \| null` | The current chat. `null` = empty/new chat state. |
| `isLoadingChats` | `boolean` | Show loading skeleton. |
| `hasActiveChatId` | `boolean` | Whether a chat ID is in the URL. |
| `activeModelLabel?` | `string` | Display label for the chat's model (shown on assistant messages). |
| `inputValue` | `string` | Composer input value. |
| `onInputChange` | handler | Composer change handler. |
| `onKeyDown` | handler | Composer key handler. |
| `onSend` | `() => void` | Composer send handler. |
| `onUpdateUserMessage` | `(messageId, content, attachments?) => void` | Edit user message callback with optional attachment override. |
| `onRegenerateAssistantMessage` | `(messageId) => void` | Regenerate callback. |
| `regeneratingAssistantMessageId` | `string \| null` | Which message is regenerating. |
| `textareaRef` | ref | Composer textarea ref. |
| `pendingAttachments` | `Array<{ id, kind, label }>` | Queued URL/file attachments shown in composer before send. |
| `isAttachingSources` | `boolean` | Whether attachment ingestion is currently running. |
| `onAttachFiles` | `(files) => void` | Queues local file attachments in chat engine. |
| `onRemovePendingAttachment` | `(attachmentId) => void` | Removes one queued attachment. |
| `username?` | `string` | Display name for user bubbles. |

#### State

| State | Type | Default | Description |
|---|---|---|---|
| `editingMessageId` | `string \| null` | `null` | The user message currently being inline-edited. |
| `editingContent` | `string` | `''` | Current text in the edit textarea. |
| `toastrOpen` | `boolean` | `false` | "Copied to clipboard" toast. |
| `toastrMessage` | `string` | `'Copied to clipboard'` | Toast message text. |
| `openSourcesMessageId` | `string \| null` | `null` | Which assistant message has its sources panel expanded. |

#### Three Rendering States

1. **Loading** (`isLoadingChats && hasActiveChatId`): Shows `<ChatLoadingSkeleton>`
2. **Empty** (no chat or no messages): Shows greeting ("Hi, {username}") + centered `<Composer>`
3. **Chat** (chat with messages): Scrollable message list + bottom `<Composer>`

#### Message Rendering

**User messages:**
- Displayed as right-aligned bubbles
- Show timestamp, edit button, copy button
- Attached files/URLs are rendered above the user bubble as compact file cards (icon + extension + truncated name), similar to OpenAI/Gemini style.
- When editing: shows a textarea with Cancel/Save buttons plus source controls (upload via composer plus menu + remove per source)

**Assistant messages:**
- Displayed as left-aligned blocks with a Bot icon
- Show model badge (e.g., "Gpt 4o Mini"), timestamp
- While streaming: show "thinking" dots animation (3 bouncing dots)
- After complete: show full content, copy button, regenerate button
- If sources exist: show a "Sources" pill that toggles a numbered source list

---

### `ChatLoadingSkeleton`

**File:** `components/page/ChatWindow/ChatLoadingSkeleton.tsx`

A shimmer placeholder for the chat area. Renders 3 rows (assistant/user/assistant pattern) with varying line widths and a placeholder composer bar at the bottom.

---

### `TemplateBuilder`

**File:** `components/page/TemplateBuilder/TemplateBuilder.tsx`

A modal form for creating or editing templates.

#### Props

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Whether the modal is visible. |
| `onClose` | `() => void` | Close handler. |
| `mode` | `'create' \| 'edit'` | Determines title and submit behavior. |
| `initialData?` | `TemplateCreate` | Pre-filled data for edit mode. |
| `onSuccess?` | `(template: TemplateCreate) => void` | Called after successful create/update. |

#### State

| State | Type | Default | Description |
|---|---|---|---|
| `formData` | `TemplateCreate` | `initialData` or empty | Form field values. |
| `isLoading` | `boolean` | `false` | Submit in progress. |
| `error` | `string \| null` | `null` | Validation or API error. |
| `success` | `string \| null` | `null` | Success message. |
| `activeTab` | `'basic' \| 'settings'` | `'basic'` | Which tab is active. |

#### Tabs

- **Basic Info tab:** Name input, description textarea, document sources (file upload + URL add/remove list)
- **Settings tab:** System prompt textarea, model dropdown, temperature slider, chunk_size input, chunk_overlap input, retrieval_k input

Calls `createTemplate` or `updateTemplate` on submit. Wrapped in the `<Modal>` component.

---

### `TemplateList`

**File:** `components/page/TemplateList/TemplateList.tsx`

The `/templates` page — a grid of template cards.

#### State

| State | Type | Default | Description |
|---|---|---|---|
| `showBuilder` | `boolean` | `false` | Whether the TemplateBuilder modal is open. |
| `builderMode` | `'create' \| 'edit'` | `'create'` | Mode for the builder. |
| `editTemplate` | `Template \| null` | `null` | Template being edited. |
| `templates` | `Template[]` | `[]` | All templates fetched from backend. |
| `isLoading` | `boolean` | `true` | Loading state. |
| `error` | `string \| null` | `null` | Error message. |
| `searchValue` | `string` | `''` | Search filter text. |
| `confirmOpen` | `boolean` | `false` | Delete confirmation dialog. |
| `pendingDelete` | `Template \| null` | `null` | Template awaiting delete confirmation. |
| `toastr` | `{ open, message, title, type, position }` | default | Toast notification state. |

#### Helper Functions (module-level)

| Function | Purpose |
|---|---|
| `badgePalette` | 6-color array for card initials badges. |
| `hashString(value)` | Deterministic hash for color assignment. |
| `hexToRgba(hex, alpha)` | Converts hex color to rgba string. |
| `getInitials(name)` | Returns first+last initials (or first 2 chars). |
| `formatDate(value)` | Formats ISO date as "Mon DD, YYYY" or "Never edited". |

#### Rendering

- Header with search input + "New Template" button
- Grid of template cards, each showing: colored initials badge, name, description, source count, date, edit/delete action buttons
- `<TemplateBuilder>` modal for create/edit
- `<ConfirmDialog>` for delete confirmation
- `<Toastr>` for notifications

Also imports `<TemplateSkeleton>` from `TemplateSkeleton.tsx` — renders 3 skeleton card placeholders during loading.
