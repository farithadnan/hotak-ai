import api from './api';


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