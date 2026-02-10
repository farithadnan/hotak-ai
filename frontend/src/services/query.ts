import api, { API_BASE_URL, getErrorMessage } from './api';

// Contract: /query -> { answer, citation_info }
// Contract: /query/stream -> text/plain stream (chunked)

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

export type QueryStreamChunk = string;


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

/**
 * Stream query results as text chunks.
 *
 * WHY:
 * The backend responds with a text/plain stream for incremental rendering.
 * Axios does not handle streaming well in the browser, so we use fetch.
 */
export const streamQuery = async function* (
  request: QueryRequest
): AsyncGenerator<QueryStreamChunk> {
  try {
    const response = await fetch(`${API_BASE_URL}/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      yield decoder.decode(value, { stream: true });
    }
  } catch (error) {
    throw new Error(`Failed to stream query: ${getErrorMessage(error as any)}`);
  }
};
