# App.tsx — Root Component

> **File:** `frontend/src/App.tsx`
> **Role:** The slim root component that wires together the `useChatEngine` hook, the `Sidebar` component, and the routing layer. After refactoring, App.tsx is ~120 lines — it owns only the shell layout, sidebar collapse toggle, toastr notifications, and the delete-confirmation dialog.

Back to [PROJECT.md](../PROJECT.md)

---

## Table of Contents

- [Architecture After Refactoring](#architecture-after-refactoring)
- [What Moved Where](#what-moved-where)
- [Remaining State in App](#remaining-state-in-app)
- [How App Wires Everything Together](#how-app-wires-everything-together)
- [Rendered Layout](#rendered-layout)
- [Props Passed to Children](#props-passed-to-children)

---

## Architecture After Refactoring

```
App.tsx (wiring & layout)
├── useChatEngine()      ← hook: all chat data, streaming, send/edit/regenerate
├── Sidebar()            ← component: sidebar UI, rename/pin/delete, popovers
├── AppRoutes            ← router: ChatPage or TemplateList
├── ConfirmDialog        ← delete chat confirmation (state from Sidebar)
└── Toastr               ← toast notifications
```

App.tsx no longer contains any chat logic, streaming code, or sidebar JSX. It reads values from `useChatEngine` and `Sidebar` and passes them to `AppRoutes`.

---

## What Moved Where

| Before (in App.tsx) | After | New Location |
|---|---|---|
| `ChatRuntimeState` type, `STREAM_MODEL_FALLBACK_PATTERN` | `useChatEngine` hook | [hooks/useChatEngine.ts](../frontend/hooks.md#usechatengine) |
| `chats`, `isLoadingChats`, `chatRuntime`, `inputValue`, `regeneratingAssistantMessageId`, `textareaRef` | `useChatEngine` hook | [hooks/useChatEngine.ts](../frontend/hooks.md#usechatengine) |
| `markRuntime`, `ensureChatModel`, `streamAssistantText` | `useChatEngine` hook | [hooks/useChatEngine.ts](../frontend/hooks.md#usechatengine) |
| `handleSend`, `handleUpdateUserMessage`, `handleRegenerateAssistantMessage` | `useChatEngine` hook | [hooks/useChatEngine.ts](../frontend/hooks.md#usechatengine) |
| `handleChangeActiveChatModel`, `handleInputChange`, `handleKeyDown` | `useChatEngine` hook | [hooks/useChatEngine.ts](../frontend/hooks.md#usechatengine) |
| `orderedChats`, `profilePopover`, `chatActionsPopover` | `Sidebar` component | [components/layout/Sidebar.tsx](../frontend/components.md#sidebar) |
| `renamingChatId`, `renamingValue`, `activeChatMenuId`, `isProfilePopoverOpen` | `Sidebar` component | [components/layout/Sidebar.tsx](../frontend/components.md#sidebar) |
| `isDeleteConfirmOpen`, `pendingDeleteChatId` | `Sidebar` component | [components/layout/Sidebar.tsx](../frontend/components.md#sidebar) |
| `handleStartRenameChat`, `handleSubmitRenameChat`, `handleTogglePinChat` | `Sidebar` component | [components/layout/Sidebar.tsx](../frontend/components.md#sidebar) |
| `handleRequestDeleteChat`, `handleCancelDeleteChat`, `handleConfirmDeleteChat` | `Sidebar` component | [components/layout/Sidebar.tsx](../frontend/components.md#sidebar) |
| All sidebar JSX (`<aside>`, chat list, popovers, profile menu) | `Sidebar` component | [components/layout/Sidebar.tsx](../frontend/components.md#sidebar) |

---

## Remaining State in App

| State | Type | Purpose |
|---|---|---|
| `isSidebarCollapsed` | `boolean` | Sidebar collapse toggle — shared between sidebar and main panel header |
| `toastr` | `{ open, message, title, type, position }` | Toast notification state |

Everything else is owned by `useChatEngine` or `Sidebar`.

---

## How App Wires Everything Together

```tsx
function App() {
  // 1. Routing
  const { activeChatId, isChatView, openTemplates, openChat, openNewChat } = useAppRouting()

  // 2. Chat engine (all data + operations)
  const engine = useChatEngine(activeChatId, openChat)

  // 3. Sidebar (renders itself, exposes delete dialog state)
  const sidebar = Sidebar({
    chats: engine.chats,
    setChats: engine.setChats,
    isLoadingChats: engine.isLoadingChats,
    chatRuntime: engine.chatRuntime,
    activeChatId,
    isSidebarCollapsed,
    onToggleSidebar: toggleSidebar,
    onOpenChat: openChat,
    onNewChat: handleNewChat,
    onOpenTemplates: openTemplates,
    onShowToastr: showToastr,
  })

  // 4. Return: sidebar.render + main panel + ConfirmDialog + Toastr
}
```

The `Sidebar` function returns an object with:
- `render` — the JSX (backdrop + `<aside>`)
- `isDeleteConfirmOpen`, `pendingDeleteChatId` — state used by the `ConfirmDialog` rendered in App
- `handleConfirmDeleteChat`, `handleCancelDeleteChat` — wired to the dialog buttons

### `showToastr(options)`

```ts
showToastr(options: Partial<typeof toastr>) => void
```

Merge-updates the toastr state and sets `open: true`.

### `handleNewChat()`

Calls `openNewChat()` from routing and `engine.setInputValue('')` to clear the composer.

---

## Rendered Layout

```
div.app-shell
├── {sidebar.render}                   ← Sidebar component output
│   ├── div.sidebar-backdrop           ← Mobile only
│   └── aside.sidebar                  ← Full sidebar UI (see Sidebar docs)
├── main.main-panel
│   ├── header.main-header             ← Templates page only
│   └── AppRoutes                      ← ChatPage or TemplateList
├── ConfirmDialog                      ← "Delete Chat" (state from sidebar)
└── Toastr                             ← Toast notifications
```

---

## Props Passed to Children

`App` passes these props from `engine` through `<AppRoutes>`:

| Prop | Source | Passed To |
|---|---|---|
| `activeChat` | `engine.activeChat` | ChatPage → ChatWindow |
| `isLoadingChats` | `engine.isLoadingChats` | ChatPage → ChatWindow |
| `hasActiveChatId` | `Boolean(activeChatId)` | ChatPage |
| `inputValue` | `engine.inputValue` | ChatPage → Composer |
| `onInputChange` | `engine.handleInputChange` | Composer |
| `onKeyDown` | `engine.handleKeyDown` | Composer |
| `onSend` | `engine.handleSend` | ChatPage, Composer |
| `onChangeActiveChatModel` | `engine.handleChangeActiveChatModel` | ChatPage |
| `onUpdateUserMessage` | `engine.handleUpdateUserMessage` | ChatWindow |
| `onRegenerateAssistantMessage` | `engine.handleRegenerateAssistantMessage` | ChatWindow |
| `regeneratingAssistantMessageId` | `engine.regeneratingAssistantMessageId` | ChatWindow |
| `textareaRef` | `engine.textareaRef` | Composer |
| `username` | `'Avery'` | ChatWindow |
| `onToggleSidebar` | `toggleSidebar` | ChatPage |
