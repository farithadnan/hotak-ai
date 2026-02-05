# React UI Development Plan

## Overview
Building a professional React + TypeScript UI for Hotak AI with FastAPI backend integration.

---

## ✅ Completed Steps

### Step 1: Project Setup
- [x] Initialize React app with Vite
- [x] Install axios for API calls
- [x] Verify dev server runs at http://localhost:5173

### Step 2: API Service Layer
- [x] Create `src/services/api.ts`
- [x] Configure axios client with base URL
- [x] Define TypeScript interfaces for all API requests/responses
- [x] Implement API functions: `healthCheck()`, `queryAgent()`, `loadDocuments()`, `listDocuments()`

### Step 1.5: Backend CORS Configuration
- [x] Add CORS middleware to FastAPI backend
- [x] Allow requests from http://localhost:5173
- [x] Test connection (health check shows "status: healthy")

---

## 🔄 Remaining Steps

### Step 3: Document Upload Component
**Goal:** Allow users to load documents into the vector store

**Create:** `src/components/DocumentUpload.tsx`

**Features:**
- Input field(s) for URLs or file paths (support multiple sources)
- "Load Documents" button
- Loading state indicator while processing
- Display results:
  - Number of documents loaded
  - Number of documents skipped (already cached)
  - List of loaded sources
  - List of cached sources
- Error handling with user-friendly messages

**API Integration:** Uses `loadDocuments()` function

---

### Step 4: Query Interface Component
**Goal:** Allow users to ask questions and view answers

**Create:** `src/components/QueryInterface.tsx`

**Features:**
- Text input for questions
- "Ask" button
- Loading state while waiting for response
- Display answer with proper formatting
- Show sources/citations below answer
- Format citations as clickable references
- Error handling

**API Integration:** Uses `queryAgent()` function

**Advanced (Optional):**
- Streaming support for real-time responses
- Query history
- Copy answer to clipboard

---

### Step 5: Document List Component
**Goal:** Display all loaded documents from vector store

**Create:** `src/components/DocumentList.tsx`

**Features:**
- List all document sources
- Display chunk count for each source
- Show total sources count
- Auto-refresh after uploading new documents
- Empty state when no documents loaded
- Loading state

**API Integration:** Uses `listDocuments()` function

**Advanced (Optional):**
- Search/filter documents
- Delete documents (requires new backend endpoint)
- Document details on click

---

### Step 6: Layout & Navigation
**Goal:** Organize components into a cohesive interface

**Update:** `src/App.tsx`

**Layout Structure:**
```
┌─────────────────────────────────────┐
│         Header / Title Bar          │
├──────────────┬──────────────────────┤
│              │                      │
│   Sidebar    │    Main Content      │
│              │                      │
│  - Upload    │   Query Interface    │
│  - Docs List │   (Ask questions)    │
│              │                      │
└──────────────┴──────────────────────┘
```

**Features:**
- Responsive layout (sidebar collapses on mobile)
- Clear visual separation between sections
- Navigation between components
- Consistent spacing and alignment

---

### Step 7: Tailwind CSS Styling
**Goal:** Make the UI professional and polished

**Tasks:**
1. Install Tailwind CSS:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. Configure Tailwind in `tailwind.config.js`

3. Add Tailwind directives to `src/index.css`

4. Style all components:
   - Clean, modern design
   - Consistent color scheme
   - Proper spacing and typography
   - Hover/focus states
   - Loading animations
   - Error/success states
   - Responsive design

**Optional:**
- Dark mode toggle
- Custom theme colors
- Animations and transitions
- Icons (install `lucide-react` or `react-icons`)

---

## Technology Stack

**Frontend:**
- React 18
- TypeScript
- Vite (dev server + build tool)
- Axios (HTTP client)
- Tailwind CSS (styling)

**Backend:**
- FastAPI (already built)
- Python 3.12
- LangChain + OpenAI
- ChromaDB vector store

**Development:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── DocumentUpload.tsx    (Step 3)
│   │   ├── QueryInterface.tsx    (Step 4)
│   │   └── DocumentList.tsx      (Step 5)
│   ├── services/
│   │   └── api.ts                (Step 2 ✅)
│   ├── App.tsx                   (Step 6 - Layout)
│   ├── App.css                   (Step 7 - Styling)
│   ├── index.css                 (Step 7 - Tailwind)
│   └── main.tsx
├── public/
├── package.json
├── tailwind.config.js            (Step 7)
├── tsconfig.json
└── vite.config.ts
```

---

## Next Action

**Current Step:** Step 3 - Document Upload Component

Build `src/components/DocumentUpload.tsx` to allow users to load documents into the vector store.
