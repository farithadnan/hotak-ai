# Utils & Routes

> **Directories:** `frontend/src/utils/` and `frontend/src/routes/`
> **Role:** Response parsing utilities and React Router configuration.

Back to [PROJECT.md](../PROJECT.md)

---

## Utils

### `assistantResponse.ts` — Response Parser

**File:** `utils/assistantResponse.ts`

Parses the raw text from the AI assistant into structured content and sources.

#### Type

```ts
type ParsedAssistantResponse = {
  content: string    // The main response text (cleaned)
  sources: string[]  // List of cited source labels
}
```

#### Function: `parseAssistantResponse(raw: string) => ParsedAssistantResponse`

Takes the raw assistant response string and separates it into content and sources.

**Steps:**

1. **Splits** the text on the `Sources:` header (case-insensitive)
2. **Strips prefixes** like `"Question:"` and `"Answer:"` from the content portion
3. **Removes inline citation markers** like `[1]`, `[2]` from the visible text
4. **Parses source lines** from the sources section — handles both bullet (`- [1] ...`) and numbered (`1. ...`) formats
5. **Filters** out `"None"` placeholder sources

**Why is this needed?**
The backend RAG agent returns responses with embedded citation markers and a `Sources:` section. The frontend needs to:
- Display the clean text without `[1]` markers cluttering it
- Show sources separately in a collapsible pill/list under the message

---

## Routes

### `AppRoutes.tsx` — Route Definitions

**File:** `routes/AppRoutes.tsx`

Defines all application routes using React Router.

#### Props (`AppRoutesProps`)

Receives 16 props from `App.tsx` and passes them through to child page components. These are the same props described in the [App.md props section](./App.md#props-passed-to-children).

#### Route Table

| Path | Component | Description |
|---|---|---|
| `/` | `<Navigate to="/chat" replace />` | Redirect root to chat. |
| `/chat` | `<ChatPage {...props} />` | Empty/new chat view. |
| `/chat/:chatId` | `<ChatPage {...props} />` | Existing chat by ID. |
| `/templates` | `<TemplateList />` | Templates management page (no props from App needed). |
| `*` (catch-all) | `<Navigate to="/chat" replace />` | Any unknown path redirects to chat. |

#### How Routing Works

1. `main.tsx` wraps `<App>` in `<BrowserRouter>`
2. `App.tsx` calls `useAppRouting()` to get the `activeChatId` from the URL
3. `App.tsx` renders `<AppRoutes>` which uses `<Routes>` and `<Route>` to decide which page component to show
4. `ChatPage` reads the `:chatId` param internally via React Router's `useParams`

---

## Icons

### `icons/index.ts`

**File:** `icons/index.ts`

A barrel re-export of 24 icons from the `lucide-react` icon library:

`Archive`, `Bot`, `BookType`, `Briefcase`, `ChevronDown`, `Copy`, `FileText`, `Link`, `LoaderCircle`, `LogOut`, `Mic`, `MoreHorizontal`, `PanelRightClose`, `PanelRightOpen`, `Pencil`, `Pin`, `Plus`, `RotateCcw`, `Search`, `SendHorizontal`, `Settings`, `SquarePen`, `Trash2`, `Upload`

All icons are imported from this file rather than directly from `lucide-react`, keeping icon dependencies centralized.

---

## Entry Point

### `main.tsx`

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

Mounts the app into the `#root` DOM element. `StrictMode` enables extra development checks. `BrowserRouter` provides client-side routing.
