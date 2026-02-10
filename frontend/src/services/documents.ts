import api, { getErrorMessage } from './api';

// Contract: /documents/load -> { loaded, skipped, cached_sources, loaded_sources, failed_sources }
// Contract: /documents -> { total_sources, sources: [{ source, chunks }] }


export interface DocumentLoadRequest {
  sources: string[];
  chunk_size?: number;
  chunk_overlap?: number;
}

// Backend shape for /documents/load
export interface DocumentLoadResponse {
  loaded: number;
  skipped: number;
  cached_sources: string[];
  loaded_sources: string[];
  failed_sources: string[];
}

export interface DocumentSource {
  source: string;
  chunks: number;
}

export interface DocumentListResponse {
  total_sources: number;
  sources: DocumentSource[];
}

/**
 * Load documents into vector store (existing functionality)
 */
export const loadDocuments = async (request: DocumentLoadRequest): Promise<DocumentLoadResponse> => {
  try {
    const response = await api.post('/documents/load', request);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to load documents: ${getErrorMessage(error as any)}`);
  }
};

/**
 * List loaded documents (existing functionality)
 */
export const listDocuments = async (): Promise<DocumentListResponse> => {
  try {
    const response = await api.get('/documents');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to list documents: ${getErrorMessage(error as any)}`);
  }
};