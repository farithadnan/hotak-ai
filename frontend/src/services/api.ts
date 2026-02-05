import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
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

// API functions
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const queryAgent = async (request: QueryRequest): Promise<QueryResponse> => {
  const response = await api.post('/query', request);
  return response.data;
};

export const loadDocuments = async (request: DocumentLoadRequest): Promise<DocumentLoadResponse> => {
  const response = await api.post('/documents/load', request);
  return response.data;
};

export const listDocuments = async (): Promise<DocumentListResponse> => {
  const response = await api.get('/documents');
  return response.data;
};

export default api;
