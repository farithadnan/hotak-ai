import api from './api';

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


/**
 * Query the RAG system (existing functionality)
 */
export const queryAgent = async (request: QueryRequest): Promise<QueryResponse> => {
  const response = await api.post('/query', request);
  return response.data;
};
