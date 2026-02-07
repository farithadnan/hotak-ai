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

### Step 2: API Service Layer (Legacy)
- [x] Create `src/services/api.ts`
- [x] Configure axios client with base URL
- [x] Define TypeScript interfaces for legacy functionality
- [x] Implement API functions: `healthCheck()`, `queryAgent()`, `loadDocuments()`, `listDocuments()`

### Step 1.5: Backend CORS Configuration
- [x] Add CORS middleware to FastAPI backend
- [x] Allow requests from http://localhost:5173
- [x] Test connection (health check shows "status: healthy")

### Step 3: TypeScript Data Models
- [x] Created `src/types/models.ts`
- [x] Defined Template, TemplateCreate, TemplateUpdate, TemplateSettings interfaces
- [x] Added Chat, Message, MessageCreate interfaces (for future use)
- [x] Implemented type guards (isTemplate, isTemplateSettings)
- [x] Added default values and constants (DEFAULT_TEMPLATE_SETTINGS, AVAILABLE_MODELS)
- [x] Comprehensive inline documentation explaining each type
- **Completed:** February 5, 2026
- **Key Learning:** How TypeScript interfaces mirror Python Pydantic models, optional properties, union types, generic types

### Step 4: API Service Layer (Template Functions)
- [x] Updated `src/services/api.ts` with template CRUD functions
- [x] Implemented: `createTemplate()`, `getTemplates()`, `getTemplate(id)`, `updateTemplate(id, data)`, `deleteTemplate(id)`
- [x] Comprehensive error handling with `getErrorMessage()` utility
- [x] Maintained backward compatibility with legacy functions
- [x] Full inline documentation explaining each function's purpose and usage
- **Completed:** February 5, 2026
- **Key Learning:** CRUD patterns, Axios generics, Promise chaining, error handling pyramid

---

## 🔄 Current Development Phase - Component Building

You've completed the foundation! The models and API layer are ready. Now it's time to build the React components that use them.

### Step 5: Template Builder Component ✅ COMPLETE (Feb 6, 2026)

**Goal:** Create a form where users can create and edit templates

**Created:** `src/components/TemplateBuilder.tsx`

**What it will do:**
```
┌─────────────────────────────────┐
│      Template Builder Form      │
├─────────────────────────────────┤
│                                 │
│  Template Name                  │
│  [Text Input]                   │
│                                 │
│  Description                    │
│  [Textarea]                     │
│                                 │
│  Document Sources               │
│  [Textarea - one per line]      │
│                                 │
│  ┌─ Settings Section ─────┐     │
│  │                        │     │
│  │ Model: [Dropdown ▼]    │     │
│  │                        │     │
│  │ Temperature: [Slider]  │     │
│  │                        │     │
│  │ Chunk Size: [Input]    │     │
│  │ Chunk Overlap: [Input] │     │
│  │ Retrieval K: [Input]   │     │
│  │                        │     │
│  └────────────────────────┘     │
│                                 │
│  System Prompt                  │
│  [Large Textarea]               │
│                                 │
│  [Save Button] [Cancel Button]  │
│                                 │
└─────────────────────────────────┘
```

**Key Features:**
1. **Form Fields:**
   - Name (required, min 1 char, max 100)
   - Description (optional, max 500 chars)
   - Sources (optional, array of URLs/paths)
   - Settings object:
     - Model dropdown (gpt-4o-mini, gpt-4o, etc.)
     - Temperature slider (0.0 to 1.0)
     - Chunk size input (must be > 0)
     - Chunk overlap input (must be >= 0)
     - Retrieval K input (must be > 0)
     - System prompt textarea

2. **Validation:**
   - Name required, min 1 char
   - Temperature between 0-1
   - Chunk sizes positive integers
   - Show error messages for invalid inputs
   - Disable save button until form is valid

3. **API Integration:**
   - When "Save" clicked, call `createTemplate(formData)`
   - Show loading state (disable inputs, show spinner)
   - On success: show success message, navigate back to template list
   - On error: show error message to user

4. **Form States:**
   - Empty (new template)
   - Pre-filled (edit existing template)
   - Loading (submitting)
   - Error (show error message)
   - Success (show confirmation, reset form)

5. **Component Design:**
   ```typescript
   interface TemplateBuilderProps {
     mode: 'create' | 'edit';      // New or editing?
     templateId?: string;           // If editing, which template?
     onSuccess?: (template: Template) => void;  // What to do after save
     onCancel?: () => void;         // What to do if user clicks cancel
   }
   ```

**Why This Step:**
- Users need a way to create templates
- This is the first "form component" combining multiple input types
- Teaches form validation, async operations, and error handling
- All the API functions are ready, just need the UI

**Techniques You'll Learn:**
- React hooks: `useState`, `useEffect`
- Form handling (controlled inputs)
- Async/await with error handling
- Conditional rendering for loading/error states
- Data binding between form fields and TypeScript types

**Time estimate:** 3-4 hours  
**Difficulty:** Medium (multiple form fields, validation, async)
**Status:** ✅ Complete!

**What was built:**
- [x] Form with all fields (name, description, sources, settings)
- [x] Model dropdown (gpt-4o-mini, gpt-4o, etc.)
- [x] Temperature slider (0.0-1.0 with live display)
- [x] Chunk settings (chunk_size, chunk_overlap, retrieval_k)
- [x] System prompt textarea
- [x] Form validation (name required, prevents empty submission)
- [x] API integration with createTemplate()
- [x] Loading state ("Creating..." button text, disabled inputs)
- [x] Success message (green box with confirmation)
- [x] Error handling (red box with error message)
- [x] Form reset after successful creation
- [x] Tested and working - templates saved to backend

---

### Step 6: Template List Component (🎯 NEXT)

**Goal:** Display all templates, let users select/edit/delete them

**Create:** `src/components/TemplateList.tsx`

**What it will do:**
```
┌──────────────────────────────────────────────┐
│         Available Templates                  │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────┐                │
│  │ Python Helper            │                │
│  │ Description: Helps with  │  [Edit] [Del] │
│  │ Sources: 5 URLs          │                │
│  └──────────────────────────┘                │
│                                              │
│  ┌──────────────────────────┐                │
│  │ Documentation Reader     │                │
│  │ Description: Reads docs  │  [Edit] [Del] │
│  │ Sources: 3 Files         │                │
│  └──────────────────────────┘                │
│                                              │
│              [+ New Template]                │
│                                              │
└──────────────────────────────────────────────┘
```

**Features:**
- Grid/list of template cards
- Each card shows name, description, document count
- Click card to view details
- Edit button → open TemplateBuilder in edit mode
- Delete button → confirmation dialog → delete if confirmed
- "Create New Template" button → open TemplateBuilder in create mode
- Empty state message if no templates exist
- Loading state while fetching templates
- Error message if fetch fails

**Time estimate:** 2-3 hours  
**Difficulty:** Medium

---

### Step 7: Chat Window Component

**Goal:** Display chat messages and accept user input

**Coming:** After template components work

---

## 🔄 In Progress Steps

### Step 3: Define Data Models (TypeScript Interfaces)
**Status:** ✅ COMPLETE  
**File:** `frontend/src/types/models.ts`

All interfaces defined with comprehensive documentation:
- ✅ TemplateSettings, TemplateCreate, Template, TemplateUpdate
- ✅ Chat, Message, MessageCreate (for future use)
- ✅ Type guards (isTemplate, isTemplateSettings)
- ✅ Default constants (DEFAULT_TEMPLATE_SETTINGS, AVAILABLE_MODELS)

---

### Step 4: Update API Service Layer
**Status:** ✅ COMPLETE  
**File:** `frontend/src/services/api.ts`

All functions implemented with documentation:
- ✅ `createTemplate(data)` → POST /templates
- ✅ `getTemplates()` → GET /templates
- ✅ `getTemplate(id)` → GET /templates/{id}
- ✅ `updateTemplate(id, data)` → PUT /templates/{id}
- ✅ `deleteTemplate(id)` → DELETE /templates/{id}
- ✅ Error handling with getErrorMessage()
- ✅ Backward compatibility with legacy functions

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

## 📋 Upcoming Tasks (Continue From Here)

### ✨ NEXT IMMEDIATE TASK: Step 6 - Template List Component

**Current Date:** February 6, 2026  
**Status:** Ready to start  
**Time Estimate:** 2-3 hours  
**Difficulty:** Medium

**Prerequisites:** ✅ All complete!
- ✅ TypeScript models defined (`src/types/models.ts`)
- ✅ API functions ready (`src/services/api.ts` - `getTemplates()`, `deleteTemplate()`, etc.)
- ✅ Template Builder working (can create templates)

**What to build:**
[See Step 5: Template Builder Component section above for full details]

**Key Implementation Tips:**
1. **Start with form structure:**
   ```typescript
   const [formData, setFormData] = useState<TemplateCreate>({
     name: '',
     description: '',
     sources: [],
     settings: DEFAULT_TEMPLATE_SETTINGS
   })
   ```

2. **Create input change handlers:**
   ```typescript
   const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setFormData({ ...formData, name: e.target.value })
   }
   ```

3. **Add form submission with error handling:**
   ```typescript
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault()
     try {
       setIsLoading(true)
       const created = await createTemplate(formData)
       // Success - reset form or navigate
     } catch (error) {
       setError(error.message)
     } finally {
       setIsLoading(false)
     }
   }
   ```

4. **Add validation to disable save button:**
   ```typescript
   const isFormValid = formData.name.trim().length >= 1
   ```

**File:** `frontend/src/components/TemplateBuilder.tsx`

---

### Step 6 - Template List Component

**Status:** Queued (after Step 5 works)  
**Time Estimate:** 2-3 hours  
**Difficulty:** Medium

**Depends on:** Step 5 complete

Use your new `getTemplates()` function to fetch and display all templates.

**File:** `frontend/src/components/TemplateList.tsx`

---

### Step 7 - Chat Window Component

**Status:** Queued (backend needs chat endpoints first)  
**Time Estimate:** 4-5 hours  
**Difficulty:** Hard

**Depends on:** Chat API endpoints created on backend

This requires conversation history, streaming responses, and citation formatting.

**File:** `frontend/src/components/ChatWindow.tsx`

---

### Step 8 - Chat Sidebar Component

**Status:** Queued (after Step 7)  
**Time Estimate:** 2-3 hours  
**Difficulty:** Medium

**Depends on:** Step 7 complete, chat storage on backend

**File:** `frontend/src/components/ChatSidebar.tsx`

---

### Step 9 - Main App Layout

**Status:** Queued (after Steps 5-8)  
**Time Estimate:** 2-3 hours  
**Difficulty:** Medium

Organize all components into a cohesive layout with navigation.

**File:** Update `src/App.tsx`

---

### Step 10 - Tailwind CSS Styling

**Status:** Queued (can be done anytime, or progressively with each component)  
**Time Estimate:** 4-5 hours  
**Difficulty:** Low-Medium

**Steps:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
# Then add Tailwind directives to index.css and use classes in components
```

---

### Step 11 - State Management (Optional)

**Status:** Queued (Optional, nice-to-have for complex state)  
**Time Estimate:** 2-3 hours  
**Difficulty:** Medium

Recommended: **Zustand** (lightweight, simple API)

---

## 🛠️ Backend Tasks Still Needed

Before you can fully test the UI, you need these backend features:

### Chat Session API (Not yet implemented)
- [ ] `POST /chats` - Create new chat
- [ ] `GET /chats` - List all chats
- [ ] `GET /chats/{id}` - Get chat history
- [ ] `POST /chats/{id}/message` - Send message
- [ ] `DELETE /chats/{id}` - Delete chat

### Chat Models
- [ ] Chat data model (Pydantic)
- [ ] Message data model
- [ ] Chat storage (JSON or database)

**Recommended Order:**
1. Finish frontend Step 5 (Template Builder) - uses existing backend
2. Build Chat Session backend endpoints
3. Then build Chat UI frontend (Steps 7-8)

---

## 🎯 How to Continue

**When you're ready to build Step 5 (Template Builder):**

1. Create file: `frontend/src/components/TemplateBuilder.tsx`
2. Import from your new models and API:
   ```typescript
   import { createTemplate, updateTemplate } from '../services/api'
   import type { TemplateCreate, Template } from '../types/models'
   import { DEFAULT_TEMPLATE_SETTINGS, AVAILABLE_MODELS } from '../types/models'
   ```
3. Build the component following the structure above
4. Test by:
   - Filling out the form
   - Clicking save
   - Checking that the template was created in `app/data/templates/templates.json`
   - Seeing the success message

**Tell me when you're ready!**

---

## 📊 Progress Tracker

| Phase | Task | Status | Date |
|-------|------|--------|------|
| Foundation | Backend refactoring | ✅ Complete | Jan 2026 |
| Foundation | Configuration system | ✅ Complete | Jan 2026 |
| Foundation | Error handling & logging | ✅ Complete | Jan 2026 |
| Foundation | Template data models (Python) | ✅ Complete | Feb 5 |
| Foundation | Template storage (JSON backend) | ✅ Complete | Feb 5 |
| Foundation | Template API endpoints | ✅ Complete | Feb 5 |
| Foundation | **TypeScript models** | ✅ Complete | Feb 5 |
| Foundation | **API service layer** | ✅ Complete | Feb 5 |
| UI - Step 5 | **Template Builder Component** | ✅ Complete | Feb 6 |
| UI - Step 6 | **Template List Component** | ⏭️ Current | Feb 7 |
| UI - Step 6 | Template List Component | Queued | — |
| UI - Step 7 | Chat Window Component | Queued | — |
| UI - Step 8 | Chat Sidebar | Queued | — |
| UI - Step 9 | App Layout | Queued | — |
| UI - Step 10 | Tailwind Styling | Queued | — |
| Backend | Chat endpoints | Queued | — |
| Backend | Chat models | Queued | — |
| Backend | Chat storage | Queued | — |


