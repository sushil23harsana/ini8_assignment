export interface Document {
  id: number;
  filename: string;
  filesize: number;
  created_at: string;
  analysis_status?: 'pending' | 'processing' | 'completed' | 'failed';
  analyzed_at?: string;
}

export interface UploadResponse {
  id: number;
  filename: string;
  filesize: number;
  created_at: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  status_code?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ErrorResponse;
  status: number;
}

export interface DocumentListResponse {
  documents: Document[];
  count: number;
}

export interface DeleteResponse {
  message: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  checks: Record<string, any>;
}