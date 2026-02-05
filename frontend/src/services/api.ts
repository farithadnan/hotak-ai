/**
 * API Service Layer
 * 
 * WHAT IS THIS?
 * This file is a "bridge" between your React UI and the FastAPI backend.
 * It handles all HTTP communication, type safety, and error handling.
 * 
 * WHY DO WE NEED IT?
 * - Centralized API logic (all requests in one place, easy to maintain)
 * - Reusable (call createTemplate() from multiple components)
 * - Type safe (TypeScript catches errors before runtime)
 * - Error handling (consistent error messages across the app)
 * - Easier testing (can mock this service in unit tests)
 */

import axios, { AxiosError } from 'axios';
import type {
  Template,
  TemplateCreate,
  TemplateUpdate,
  ApiError
} from '../types/models';

// ==========================================
// 1. AXIOS INSTANCE SETUP
// ==========================================

/**
 * Base URL for API
 * 
 * WHY CONFIG:
 * - When deployed to production, this changes to the real domain
 * - Easy to switch between development, staging, production
 * - Currently points to localhost:8000 (backend running locally)
 */
const API_BASE_URL = 'http://localhost:8000';

/**
 * Axios Instance Creation
 * 
 * WHAT IS AXIOS?
 * A library that makes HTTP requests easier than fetch() API:
 * - Automatic JSON serialization/deserialization
 * - Interceptors (modify requests/responses globally)
 * - Better error handling
 * - Timeout support
 * 
 * HEADERS EXPLAINED:
 * - Content-Type: 'application/json' tells the server we're sending JSON
 *   (Backend reads this to know how to parse our request body)
 * 
 * BASEURL:
 * - Instead of http://localhost:8000/templates, we just use /templates
 * - axios will prepend the baseURL automatically
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// 2. ERROR HANDLING UTILITY
// ==========================================

/**
 * Extract Error Message
 * 
 * WHY:
 * Different error types have different structures:
 * - Network error: { message: "Network error" }
 * - Axios error: { response: { data: { detail: "..." } } }
 * - Generic error: { message: "Unknown error" }
 * 
 * This function standardizes them all.
 * 
 * USAGE:
 * try {
 *   await createTemplate(...)
 * } catch (error) {
 *   console.error(getErrorMessage(error))
 * }
 */
const getErrorMessage = (error: any): string => {
  // If it's an Axios error with response data
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as ApiError;
    return data.detail || 'An error occurred';
  }
  
  // If it's a regular JavaScript error
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback
  return 'An unknown error occurred';
};

// ==========================================
// 3. LEGACY TYPES (Existing functionality)
// ==========================================

/**
 * Legacy types for existing RAG query functionality
 * These will coexist with new template system
 */
export interface QueryRequest {
  question: string;
  stream?: boolean;
}

export interface QueryResponse {
  answer: string;
  sources: string[];
}

export interface DocumentLoadRequest {
  sources: string[];
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface DocumentLoadResponse {
  loaded: number;
  skipped: number;
  cached_sources: string[];
  loaded_sources: string[];
}

export interface DocumentSource {
  source: string;
  chunks: number;
}

export interface DocumentListResponse {
  total_sources: number;
  sources: DocumentSource[];
}

// ==========================================
// 4. TEMPLATE API FUNCTIONS (NEW)
// ==========================================

/**
 * Create a new template
 * 
 * ENDPOINT: POST /templates
 * 
 * WHY THIS FUNCTION:
 * When user submits the template form, we need to:
 * 1. Send the data to backend
 * 2. Check for errors
 * 3. Return the created template with generated ID
 * 
 * FLOW:
 * User fills form → TemplateCreate object → POST /templates
 * Backend validates, generates ID, creates file
 * Returns full Template object with id + timestamps
 * 
 * PARAMETER EXPLANATION:
 * - data: TemplateCreate (from our models.ts)
 *   - name: string (required)
 *   - description?: string
 *   - sources?: string[]
 *   - settings?: TemplateSettings
 * 
 * RETURN TYPE: Promise<Template>
 * - Promise: We wait for the network request to complete
 * - Template: What we get back includes id, timestamps, etc.
 * 
 * ERROR HANDLING:
 * - If request fails, axios throws error
 * - We catch it, extract message, and re-throw
 * - Component catches this and shows error to user
 * 
 * TYPESCRIPT GENERICS EXPLAINED:
 * Promise<Template> = "This function will eventually give you a Template"
 */
export const createTemplate = async (data: TemplateCreate): Promise<Template> => {
  try {
    // POST /templates sends JSON body
    const response = await api.post<Template>('/templates', data);
    // response.data is the Template object returned by backend
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create template: ${getErrorMessage(error)}`);
  }
};

/**
 * Get all templates
 * 
 * ENDPOINT: GET /templates
 * 
 * WHY:
 * Display list of all templates in the UI dropdown/table
 * This is the "list" operation in CRUD
 * 
 * RETURN TYPE: Promise<Template[]>
 * - Template[] = array of templates
 * 
 * WHEN TO CALL:
 * - On app startup (load available templates)
 * - After creating/deleting template (refresh list)
 * - When user navigates to templates page
 */
export const getTemplates = async (): Promise<Template[]> => {
  try {
    const response = await api.get<Template[]>('/templates');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch templates: ${getErrorMessage(error)}`);
  }
};

/**
 * Get single template by ID
 * 
 * ENDPOINT: GET /templates/{id}
 * 
 * WHY:
 * Load full details of a specific template for editing
 * 
 * PARAMETER:
 * - id: string (UUID generated by backend)
 *   Example: "d32039af-ca18-486d-9cd6-488ffa34ef84"
 * 
 * USAGE:
 * const template = await getTemplate(selectedId);
 * populateFormWithValues(template); // Prefill edit form
 * 
 * ERROR HANDLING:
 * If template not found, backend returns 404
 * Error handler extracts the detail message
 */
export const getTemplate = async (id: string): Promise<Template> => {
  try {
    const response = await api.get<Template>(`/templates/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch template: ${getErrorMessage(error)}`);
  }
};

/**
 * Update an existing template
 * 
 * ENDPOINT: PUT /templates/{id}
 * 
 * WHY:
 * User edited some template settings, we need to save changes
 * This is the "update" operation in CRUD
 * 
 * PARAMETERS:
 * - id: string (which template to update)
 * - data: TemplateUpdate (what to change)
 *   Note: ALL fields in TemplateUpdate are optional (?)
 *   So user can update just the name, leaving others unchanged
 * 
 * EXAMPLE:
 * // Only updating the name
 * await updateTemplate(templateId, { name: "New Name" })
 * 
 * // Updating multiple fields
 * await updateTemplate(templateId, {
 *   name: "New Name",
 *   description: "Better description",
 *   settings: { temperature: 0.5 }
 * })
 * 
 * RETURN:
 * Full updated Template object (in case something changed on backend)
 */
export const updateTemplate = async (
  id: string,
  data: TemplateUpdate
): Promise<Template> => {
  try {
    const response = await api.put<Template>(`/templates/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update template: ${getErrorMessage(error)}`);
  }
};

/**
 * Delete a template
 * 
 * ENDPOINT: DELETE /templates/{id}
 * 
 * WHY:
 * User wants to remove a template (and all associated data)
 * This is the "delete" operation in CRUD
 * 
 * PARAMETER:
 * - id: string (which template to delete)
 * 
 * RETURN TYPE: Promise<void>
 * - void = we don't expect any data back
 * - Backend just returns 200 OK if successful
 * 
 * USAGE:
 * await deleteTemplate(templateId);
 * // Then refresh template list
 * const templates = await getTemplates();
 * 
 * WARNING:
 * This is destructive (can't be undone)
 * UI should ask for confirmation before calling this
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    await api.delete(`/templates/${id}`);
    // If we got here, delete was successful
  } catch (error) {
    throw new Error(`Failed to delete template: ${getErrorMessage(error)}`);
  }
};

// ==========================================
// 5. LEGACY API FUNCTIONS (Existing)
// ==========================================

/**
 * Health check - verify backend is running
 * 
 * USAGE:
 * if (await healthCheck()) {
 *   console.log("Backend is up!")
 * }
 */
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * Query the RAG system (existing functionality)
 */
export const queryAgent = async (request: QueryRequest): Promise<QueryResponse> => {
  const response = await api.post('/query', request);
  return response.data;
};

/**
 * Load documents into vector store (existing functionality)
 */
export const loadDocuments = async (request: DocumentLoadRequest): Promise<DocumentLoadResponse> => {
  const response = await api.post('/documents/load', request);
  return response.data;
};

/**
 * List loaded documents (existing functionality)
 */
export const listDocuments = async (): Promise<DocumentListResponse> => {
  const response = await api.get('/documents');
  return response.data;
};

// ==========================================
// 6. EXPORTS FOR EXTERNAL USE
// ==========================================

/**
 * Export the axios instance for advanced usage
 * 
 * WHY:
 * Some components might need direct axios access
 * Example: interceptors for auth tokens, custom headers
 */
export default api;
