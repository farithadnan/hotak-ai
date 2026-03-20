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

export interface DocumentUploadResponse {
  loaded: number;
  skipped: number;
  uploaded_sources: string[];
  cached_sources: string[];
  loaded_sources: string[];
  failed_sources: string[];
  failed_files: Array<{
    file_name: string;
    error: string;
  }>;
  file_results: Array<{
    file_name: string;
    source: string | null;
    status: 'uploaded' | 'ingested' | 'cached' | 'failed_upload' | 'failed_load';
    error: string | null;
  }>;
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

/**
 * Upload files and ingest them into vector store.
 */
export const uploadDocuments = async (
  files: File[],
  onUploadProgress?: (percent: number) => void,
): Promise<DocumentUploadResponse> => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onUploadProgress
        ? (progressEvent) => {
            if (progressEvent.total) {
              onUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
            }
          }
        : undefined,
    });

    return response.data;
  } catch (error) {
    throw new Error(`Failed to upload documents: ${getErrorMessage(error as any)}`);
  }
};