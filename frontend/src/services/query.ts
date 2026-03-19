import api, { API_BASE_URL, getErrorMessage } from './api';

// Contract: /query -> { answer, citation_info }
// Contract: /query/stream -> text/plain stream (chunked)

/**
 * Legacy types for existing RAG query functionality
 * These will coexist with new template system
 */
export interface QueryRequest {
  question: string;
  chat_id?: string;
  model?: string;
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream?: boolean;
}

export interface QueryResponse {
  answer: string;
  citation_info: string;
  model?: string;
  warning?: string;
}

export type QueryStreamChunk = string;

// If no stream chunk arrives within this window, abort and let caller fallback.
const STREAM_CHUNK_TIMEOUT_MS = 20000;


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
    const controller = new AbortController();
    const response = await fetch(`${API_BASE_URL}/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const readWithTimeout = async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        return await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error(`Stream chunk timeout after ${STREAM_CHUNK_TIMEOUT_MS}ms`));
            }, STREAM_CHUNK_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };

    while (true) {
      const { value, done } = await readWithTimeout();
      if (done) {
        break;
      }
      yield decoder.decode(value, { stream: true });
    }
  } catch (error) {
    throw new Error(`Failed to stream query: ${getErrorMessage(error as any)}`);
  }
};
