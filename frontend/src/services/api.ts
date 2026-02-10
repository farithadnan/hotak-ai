/**
 * API Core Utilities
 * 
 * WHAT IS THIS?
 * This file provides the shared axios instance and error handling helpers
 * used by the feature-specific service modules.
 * 
 * WHY DO WE NEED IT?
 * - Centralized API configuration (base URL, headers)
 * - Reusable error handling across services
 * - Type safe (TypeScript catches errors before runtime)
 * - Error handling (consistent error messages across the app)
 * - Easier testing (can mock this service in unit tests)
 */

import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types/models';

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
export const getErrorMessage = (error: any): string => {
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
// 2. LEGACY API FUNCTIONS (Existing)
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

// ==========================================
// EXPORTS FOR EXTERNAL USE
// ==========================================

/**
 * Export the axios instance for advanced usage
 * 
 * WHY:
 * Some components might need direct axios access
 * Example: interceptors for auth tokens, custom headers
 */
export default api;
