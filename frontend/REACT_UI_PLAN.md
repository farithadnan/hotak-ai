# React UI Development Plan - Template-Based RAG System

## Overview
Building a professional React + TypeScript UI for Hotak AI with:
- **Knowledge Templates** (reusable "brains" with docs + settings)
- **Chat Sessions** (bound to templates or ad-hoc)
- **FastAPI backend integration**

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

## 🔄 New Architecture Steps

### Step 3: Define Data Models (TypeScript Interfaces)
**Goal:** Define the shape of Templates, Chats, and Messages

**Create:** `src/types/models.ts`

**Interfaces:**
```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  sources: string[];  // URLs or file paths
  settings: {
    model: string;
    temperature: number;
    chunk_size: number;
    chunk_overlap: number;
    retrieval_k: number;
    system_prompt: string;
  };
  created_at: string;
  updated_at: string;
}

interface Chat {
  id: string;
  template_id?: string;  // Optional - null for ad-hoc chats
  name: string;
  messages: Message[];
  created_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  timestamp: string;
}
```

**Priority:** HIGH  
**Time estimate:** 30 minutes

---

### Step 4: Update API Service Layer
**Goal:** Add template and chat API functions

**Update:** `src/services/api.ts`

**New Functions:**
- `createTemplate(data)` → POST /templates
- `getTemplates()` → GET /templates
- `getTemplate(id)` → GET /templates/{id}
- `updateTemplate(id, data)` → PUT /templates/{id}
- `deleteTemplate(id)` → DELETE /templates/{id}
- `createChat(templateId?)` → POST /chats
- `getChats()` → GET /chats
- `getChat(id)` → GET /chats/{id}
- `sendMessage(chatId, message)` → POST /chats/{id}/message
- `deleteChat(id)` → DELETE /chats/{id}

**Priority:** HIGH  
**Time estimate:** 1-2 hours

---

### Step 5: Template Builder Component
**Goal:** Create and manage knowledge templates

**Create:** `src/components/TemplateBuilder.tsx`

**Features:**
- Form with fields:
  - Name input
  - Description textarea
  - Documents/URLs (multi-line textarea or tag input)
  - System prompt editor (large textarea)
  - Settings panel:
    - Model dropdown
    - Temperature slider (0-1)
    - Chunk size input
    - Chunk overlap input
    - Retrieval K input
- Save button (loading state)
- Cancel button
- Validation (required fields)
- Error handling
- Success message

**Priority:** HIGH  
**Time estimate:** 3-4 hours

---

### Step 6: Template List Component
**Goal:** Display all templates, select one, edit/delete

**Create:** `src/components/TemplateList.tsx`

**Features:**
- Grid/list of template cards
- Each card shows:
  - Template name
  - Description preview
  - Document count
  - Settings summary
- Click to view details
- Edit button → opens TemplateBuilder
- Delete button with confirmation
- "Create New Template" button
- Empty state (no templates)
- Loading state
- Search/filter (optional)

**Priority:** HIGH  
**Time estimate:** 2-3 hours

---

### Step 7: Chat Interface Component
**Goal:** Chat window with message history

**Create:** `src/components/ChatWindow.tsx`

**Features:**
- Message list (scrollable)
- Display user messages (right-aligned)
- Display assistant messages (left-aligned)
- Show citations below assistant messages
- Input textarea at bottom
- Send button
- Loading indicator while waiting for response
- Template badge at top (if using template)
- Ad-hoc upload button (if no template)
- Auto-scroll to latest message

**Priority:** HIGH  
**Time estimate:** 4-5 hours

---

### Step 8: Chat List Sidebar
**Goal:** List all chats, create new chat

**Create:** `src/components/ChatList.tsx`

**Features:**
- List of chat items
- Each chat shows:
  - Chat name/title
  - Last message preview
  - Template name (if bound)
  - Timestamp
- Click to open chat
- "New Chat" button → modal:
  - Option 1: Select template
  - Option 2: Start without template
- Delete chat option
- Active chat indicator
- Empty state

**Priority:** HIGH  
**Time estimate:** 2-3 hours

---

### Step 9: Main Layout
**Goal:** Organize all components into cohesive UI

**Update:** `src/App.tsx`

**Layout Structure:**
```
┌──────────────────────────────────────────────┐
│            Header / Title Bar                │
├──────────┬──────────────────┬───────────────┤
│          │                  │               │
│ Sidebar  │   Main Content   │  Info Panel   │
│          │                  │  (optional)   │
│ - Temps  │   Chat Window    │               │
│ - Chats  │   or             │  - Template   │
│          │   Template Form  │    details    │
│          │                  │  - Settings   │
│          │                  │               │
└──────────┴──────────────────┴───────────────┘
```

**Navigation:**
- Tab 1: Templates
- Tab 2: Chats
- Switch between template builder and chat view

**Priority:** HIGH  
**Time estimate:** 3-4 hours

---

### Step 10: Tailwind CSS Styling
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
   - Consistent color scheme (blue/purple for templates, green for chats)
   - Proper spacing and typography
   - Hover/focus states
   - Loading animations
   - Error/success states
   - Responsive design
   - Message bubbles (chat UI)
   - Form validation styling

**Optional:**
- Dark mode toggle
- Custom theme colors
- Animations and transitions
- Icons (install `lucide-react`)

**Priority:** MEDIUM  
**Time estimate:** 4-5 hours

---

### Step 11: Context/State Management (Optional)
**Goal:** Share state across components

**Options:**
1. **React Context** (simplest)
2. **Zustand** (lightweight)
3. **Redux Toolkit** (full-featured)

**What to manage:**
- Current chat
- Current template
- User settings
- Global loading state

**Priority:** LOW  
**Time estimate:** 2-3 hours

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

## File Structure (Updated)

```
frontend/
├── src/
│   ├── components/
│   │   ├── TemplateBuilder.tsx   (Step 5)
│   │   ├── TemplateList.tsx      (Step 6)
│   │   ├── ChatWindow.tsx        (Step 7)
│   │   ├── ChatList.tsx          (Step 8)
│   │   └── ... (other components)
│   ├── types/
│   │   └── models.ts             (Step 3)
│   ├── services/
│   │   └── api.ts                (Step 2 ✅, Step 4)
│   ├── context/                  (Step 11 - optional)
│   │   └── AppContext.tsx
│   ├── App.tsx                   (Step 9 - Layout)
│   ├── App.css                   (Step 10 - Styling)
│   ├── index.css                 (Step 10 - Tailwind)
│   └── main.tsx
├── public/
├── package.json
├── tailwind.config.js            (Step 10)
├── tsconfig.json
└── vite.config.ts
```

---

## Next Action - Step-by-Step Guide

**Phase 1: Backend Foundation (Start Here)**

Before building the UI, you need backend endpoints. Here's the order:

### Backend Step 1: Create Template Data Model
**File:** `app/models/template.py`

Create a simple data model:
```python
from pydantic import BaseModel
from typing import List, Optional

class TemplateSettings(BaseModel):
    model: str = "gpt-4"
    temperature: float = 0.2
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    system_prompt: str

class Template(BaseModel):
    id: str
    name: str
    description: str
    sources: List[str]
    settings: TemplateSettings
    created_at: str
    updated_at: Optional[str] = None
```

**Time:** 30 minutes  
**Goal:** Define what a template looks like

---

### Backend Step 2: Template Storage (Simple JSON)
**File:** `app/storage/template_storage.py`

Functions to implement:
- `save_template(template)` → Write to JSON file
- `load_templates()` → Read from JSON file
- `get_template(id)` → Get one template
- `delete_template(id)` → Remove template

**Time:** 1-2 hours  
**Goal:** Persist templates to disk

---

### Backend Step 3: Template API Endpoints
**File:** `app/server.py` (add new routes)

Add routes:
- `POST /templates` - Create
- `GET /templates` - List all
- `GET /templates/{id}` - Get one
- `PUT /templates/{id}` - Update
- `DELETE /templates/{id}` - Delete

**Time:** 2-3 hours  
**Goal:** API to manage templates

---

### Backend Step 4: Test Template API
Use Swagger UI at http://localhost:8000/docs

1. Create a template
2. List templates
3. Get template by ID
4. Update template
5. Delete template

**Time:** 30 minutes  
**Goal:** Verify backend works

---

**Phase 2: Frontend Foundation**

Once backend is ready, start React:

### Frontend Step 1: TypeScript Models
Follow Step 3 in the UI plan above.

### Frontend Step 2: API Service
Follow Step 4 in the UI plan above.

### Frontend Step 3: Template Builder
Follow Step 5 in the UI plan above.

---

**I'll guide you through each step. Where do you want to start?**

Reply with:
1. **Backend Step 1** (recommended - build foundation first)
2. **Skip to Frontend** (if you want to mock the backend)
3. **Show me example code** for a specific step
