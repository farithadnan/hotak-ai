import api, { getErrorMessage } from './api';

// Contract: /query -> { answer, citation_info }
// Contract: /query/stream -> text/plain stream

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
  citation_info: string;
}


/**
 * Query the RAG system (existing functionality)
 */
export const queryAgent = async (request: QueryRequest): Promise<QueryResponse> => {
  try {
    const response = await api.post('/query', request);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to run query: ${getErrorMessage(error as any)}`);
  }
};
