import { Document, UploadResponse } from '../types/Document';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_ENDPOINTS = {
  documents: `${API_BASE_URL}/api/documents/`,
  upload: `${API_BASE_URL}/api/documents/upload/`,
  download: (id: number) => `${API_BASE_URL}/api/documents/${id}/`,
  delete: (id: number) => `${API_BASE_URL}/api/documents/${id}/delete/`,
  analyze: (id: number) => `${API_BASE_URL}/api/documents/${id}/analyze/`,
  getAnalysis: (id: number) => `${API_BASE_URL}/api/documents/${id}/analysis/`,
  health: `${API_BASE_URL}/api/documents/health/`,
} as const;

// Request timeout configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const UPLOAD_TIMEOUT = 120000; // 2 minutes for uploads

// Custom error class for API errors
export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Helper function to create fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new ApiError('Request timeout', 408));
    }, timeout);

    fetch(url, {
      ...options,
      signal: controller.signal,
    })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: any = null;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData.details || errorData;
    } catch {
      // If response is not JSON, use status text
    }

    throw new ApiError(errorMessage, response.status, errorDetails);
  }

  // Handle empty responses (like for DELETE requests)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError('Invalid JSON response', 500, error);
  }
};

// API Service Class
export class DocumentApiService {
  /**
   * Upload a document file
   */
  static async uploadDocument(file: File): Promise<UploadResponse> {
    if (!file) {
      throw new ApiError('No file provided', 400);
    }

    // Client-side validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new ApiError('Only PDF files are allowed', 400);
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new ApiError('File size exceeds 10MB limit', 400);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithTimeout(
      API_ENDPOINTS.upload,
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      },
      UPLOAD_TIMEOUT
    );

    return handleResponse<UploadResponse>(response);
  }

  /**
   * Get all documents
   */
  static async getDocuments(): Promise<{ documents: Document[]; count: number }> {
    const response = await fetchWithTimeout(API_ENDPOINTS.documents, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    return handleResponse<{ documents: Document[]; count: number }>(response);
  }

  /**
   * Download a document
   */
  static async downloadDocument(documentId: number): Promise<Blob> {
    if (!documentId || documentId <= 0) {
      throw new ApiError('Invalid document ID', 400);
    }

    const response = await fetchWithTimeout(
      API_ENDPOINTS.download(documentId),
      {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      }
    );

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        throw new ApiError(
          errorData.error || errorData.message || 'Download failed',
          response.status,
          errorData
        );
      } catch {
        throw new ApiError(`Download failed: ${response.statusText}`, response.status);
      }
    }

    return response.blob();
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: number): Promise<{ message: string }> {
    if (!documentId || documentId <= 0) {
      throw new ApiError('Invalid document ID', 400);
    }

    const response = await fetchWithTimeout(
      API_ENDPOINTS.delete(documentId),
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    return handleResponse<{ message: string }>(response);
  }

  /**
   * Analyze a document using AI
   */
  static async analyzeDocument(documentId: number): Promise<{ message: string; analysis: string; status: string; analyzed_at: string }> {
    if (!documentId || documentId <= 0) {
      throw new ApiError('Invalid document ID', 400);
    }

    const response = await fetchWithTimeout(
      API_ENDPOINTS.analyze(documentId),
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      120000 // Longer timeout for AI analysis
    );

    return handleResponse<{ message: string; analysis: string; status: string; analyzed_at: string }>(response);
  }

  /**
   * Get existing analysis results for a document
   */
  static async getDocumentAnalysis(documentId: number): Promise<{ analysis: string; status: string; analyzed_at: string }> {
    if (!documentId || documentId <= 0) {
      throw new ApiError('Invalid document ID', 400);
    }

    const response = await fetchWithTimeout(
      API_ENDPOINTS.getAnalysis(documentId),
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    return handleResponse<{ analysis: string; status: string; analyzed_at: string }>(response);
  }

  /**
   * Check API health
   */
  static async checkHealth(): Promise<any> {
    const response = await fetchWithTimeout(
      API_ENDPOINTS.health,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      },
      5000 // Shorter timeout for health checks
    );

    return handleResponse<any>(response);
  }
}

// Utility functions for error handling
export const isApiError = (error: any): error is ApiError => {
  return error instanceof ApiError;
};

export const getErrorMessage = (error: any): string => {
  if (isApiError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

export const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError ||
    (isApiError(error) && error.status === 408) ||
    error?.name === 'AbortError'
  );
};

// Retry utility for failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except for timeouts
      if (isApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 408) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
};

// Export default instance
export default DocumentApiService;