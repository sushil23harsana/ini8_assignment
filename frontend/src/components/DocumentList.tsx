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
    setListState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Use the API service with retry logic
      const data = await retryRequest(() => DocumentApiService.getDocuments(), 2);
      
      setListState(prev => ({
        ...prev,
        documents: data.documents || [],
        isLoading: false,
        lastRefresh: new Date()
      }));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setListState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      onError(errorMessage);
    }
  };

  // Fetch documents on component mount and when refresh is triggered
  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    fetchDocuments();
  };

  const handleDocumentDeleted = (documentId: number) => {
    // Remove document from local state
    setListState(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId)
    }));

    // Notify parent component
    onDocumentDeleted(documentId);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = (): string => {
    const totalBytes = listState.documents.reduce((sum, doc) => sum + doc.filesize, 0);
    return formatFileSize(totalBytes);
  };

  if (listState.isLoading && listState.documents.length === 0) {
    return (
      <div className="document-list">
        <div className="list-header">
          <h2>Your Medical Documents</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-list">
      <div className="list-header">
        <div className="header-content">
          <h2>Your Medical Documents</h2>
          <div className="list-stats">
            <span className="document-count">
              {listState.documents.length} document{listState.documents.length !== 1 ? 's' : ''}
            </span>
            {listState.documents.length > 0 && (
              <span className="total-size">
                Total: {getTotalSize()}
              </span>
            )}
          </div>
        </div>
        
        <div className="list-actions">
          <button
            type="button"
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={listState.isLoading}
            title="Refresh document list"
          >
            {listState.isLoading ? '⟳' : '↻'} Refresh
          </button>
          
          {listState.lastRefresh && (
            <span className="last-refresh">
              Last updated: {formatDate(listState.lastRefresh.toISOString())}
            </span>
          )}
        </div>
      </div>

      {listState.error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{listState.error}</span>
          <button 
            type="button" 
            className="retry-btn"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {listState.documents.length === 0 && !listState.isLoading && !listState.error ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No documents uploaded yet</h3>
          <p>Upload your first medical document using the form above.</p>
          <div className="empty-features">
            <div className="feature">
              <span className="feature-icon">📤</span>
              <span>Upload PDF files</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💾</span>
              <span>Secure storage</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📥</span>
              <span>Easy download</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="documents-grid">
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

      {listState.isLoading && listState.documents.length > 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner small"></div>
          <span>Refreshing...</span>
        </div>
      )}
    </div>
  );
};

export default DocumentList;