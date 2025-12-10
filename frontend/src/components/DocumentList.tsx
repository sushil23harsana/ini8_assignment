/* src/components/DocumentList.tsx */
import React, { useState, useEffect } from 'react';
import DocumentItem from './DocumentItem';
import { Document } from '../types/Document';
import { DocumentApiService, getErrorMessage, retryRequest } from '../services/api';
import './DocumentList.css';

interface DocumentListProps {
  refreshTrigger: number;
  onDocumentDeleted: (documentId: number) => void;
  onError: (error: string) => void;
}

interface ListState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  refreshTrigger, 
  onDocumentDeleted, 
  onError 
}) => {
  const [listState, setListState] = useState<ListState>({
    documents: [],
    isLoading: false,
    error: null,
    lastRefresh: null
  });

  const fetchDocuments = async () => {
    setListState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await retryRequest(() => DocumentApiService.getDocuments(), 2);
      setListState(prev => ({
        ...prev,
        documents: data.documents || [],
        isLoading: false,
        lastRefresh: new Date()
      }));
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setListState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      onError(errorMessage);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleDocumentDeleted = (documentId: number) => {
    setListState(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId)
    }));
    onDocumentDeleted(documentId);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="dashboard-container">
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Documents</span>
            <span className="stat-value">{listState.documents.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">AI Analysis</span>
            <span className="stat-value">Ready</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Security</span>
            <span className="stat-value">Protected</span>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>Your Documents</h2>
      </div>

      {listState.isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      )}

      {listState.error && (
        <div className="error-card">
          <p>{listState.error}</p>
          <button onClick={fetchDocuments}>Retry</button>
        </div>
      )}

      {!listState.isLoading && listState.documents.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📂</div>
          <h3>No documents yet</h3>
          <p>Upload your first medical record to get started.</p>
        </div>
      ) : (
        <div className="documents-list-container">
          {listState.documents.map((document) => (
            <DocumentItem
              key={document.id}
              document={document}
              onDeleted={handleDocumentDeleted}
              onError={onError}
              formatDate={formatDate}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;