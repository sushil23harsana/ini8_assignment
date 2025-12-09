import React, { useState } from 'react';
import { Document } from '../types/Document';
import { DocumentApiService, getErrorMessage } from '../services/api';
import './DocumentItem.css';

interface DocumentItemProps {
  document: Document;
  onDeleted: (documentId: number) => void;
  onError: (error: string) => void;
  formatDate: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
}

interface ItemState {
  isDownloading: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  isAnalyzing: boolean;
  showAnalysisModal: boolean;
  analysisResult: string | null;
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  document,
  onDeleted,
  onError,
  formatDate,
  formatFileSize
}) => {
  const [itemState, setItemState] = useState<ItemState>({
    isDownloading: false,
    isDeleting: false,
    showDeleteConfirm: false,
    isAnalyzing: false,
    showAnalysisModal: false,
    analysisResult: null
  });

  const handleDownload = async () => {
    setItemState(prev => ({ ...prev, isDownloading: true }));

    try {
      // Use the API service
      const blob = await DocumentApiService.downloadDocument(document.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.filename;
      
      // Trigger download
      window.document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      onError(`Failed to download ${document.filename}: ${errorMessage}`);
    } finally {
      setItemState(prev => ({ ...prev, isDownloading: false }));
    }
  };

  const handleDeleteClick = () => {
    setItemState(prev => ({ ...prev, showDeleteConfirm: true }));
  };

  const handleDeleteConfirm = async () => {
    setItemState(prev => ({ 
      ...prev, 
      isDeleting: true, 
      showDeleteConfirm: false 
    }));

    try {
      // Use the API service
      await DocumentApiService.deleteDocument(document.id);

      // Notify parent component
      onDeleted(document.id);

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      onError(`Failed to delete ${document.filename}: ${errorMessage}`);
      
      setItemState(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    setItemState(prev => ({ ...prev, showDeleteConfirm: false }));
  };

  const handleAnalyzeClick = async () => {
    setItemState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      showAnalysisModal: true,
      analysisResult: null 
    }));

    try {
      const result = await DocumentApiService.analyzeDocument(document.id);
      
      setItemState(prev => ({ 
        ...prev, 
        isAnalyzing: false,
        analysisResult: result.analysis 
      }));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      onError(`Failed to analyze ${document.filename}: ${errorMessage}`);
      
      setItemState(prev => ({ 
        ...prev, 
        isAnalyzing: false,
        showAnalysisModal: false 
      }));
    }
  };

  const handleCloseAnalysisModal = () => {
    setItemState(prev => ({ 
      ...prev, 
      showAnalysisModal: false,
      analysisResult: null 
    }));
  };

  const getFileIcon = (filename: string): string => {
    if (filename.toLowerCase().endsWith('.pdf')) {
      return '📄';
    }
    return '📄'; // Default to document icon
  };

  return (
    <div className={`document-item ${itemState.isDeleting ? 'deleting' : ''}`}>
      <div className="document-header">
        <div className="file-icon">
          {getFileIcon(document.filename)}
        </div>
        <div className="document-info">
          <h3 className="document-title" title={document.filename}>
            {document.filename}
          </h3>
          <div className="document-meta">
            <span className="file-size">
              {formatFileSize(document.filesize)}
            </span>
            <span className="upload-date">
              Uploaded {formatDate(document.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="document-actions">
        <button
          type="button"
          className="action-btn download-btn"
          onClick={handleDownload}
          disabled={itemState.isDownloading || itemState.isDeleting}
          title="Download document"
        >
          {itemState.isDownloading ? (
            <>
              <span className="btn-spinner"></span>
              Downloading...
            </>
          ) : (
            <>
              <span className="btn-icon">📥</span>
              Download
            </>
          )}
        </button>

        <button
          type="button"
          className="action-btn analyze-btn"
          onClick={handleAnalyzeClick}
          disabled={itemState.isDownloading || itemState.isDeleting || itemState.isAnalyzing}
          title="Analyze document with AI"
        >
          {itemState.isAnalyzing ? (
            <>
              <span className="btn-spinner"></span>
              Analyzing...
            </>
          ) : (
            <>
              <span className="btn-icon">🧠</span>
              Analyze
            </>
          )}
        </button>

        <button
          type="button"
          className="action-btn delete-btn"
          onClick={handleDeleteClick}
          disabled={itemState.isDownloading || itemState.isDeleting || itemState.isAnalyzing}
          title="Delete document"
        >
          {itemState.isDeleting ? (
            <>
              <span className="btn-spinner"></span>
              Deleting...
            </>
          ) : (
            <>
              <span className="btn-icon">🗑️</span>
              Delete
            </>
          )}
        </button>
      </div>

      {itemState.showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <div className="confirm-header">
              <span className="confirm-icon">⚠️</span>
              <h4>Confirm Deletion</h4>
            </div>
            
            <div className="confirm-content">
              <p>Are you sure you want to delete this document?</p>
              <div className="confirm-file-info">
                <strong>{document.filename}</strong>
                <span>{formatFileSize(document.filesize)}</span>
              </div>
              <p className="confirm-warning">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn cancel-btn"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-btn delete-confirm-btn"
                onClick={handleDeleteConfirm}
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {itemState.showAnalysisModal && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal">
            <div className="analysis-header">
              <div className="analysis-title">
                <span className="analysis-icon">🧠</span>
                <h3>AI Document Analysis</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={handleCloseAnalysisModal}
                disabled={itemState.isAnalyzing}
              >
                ✕
              </button>
            </div>
            
            <div className="analysis-file-info">
              <strong>{document.filename}</strong>
              <span>{formatFileSize(document.filesize)}</span>
            </div>

            <div className="analysis-content">
              {itemState.isAnalyzing ? (
                <div className="analysis-loading">
                  <div className="loading-animation">
                    <div className="scanning-line"></div>
                    <div className="pulse-circles">
                      <div className="pulse-circle pulse-1"></div>
                      <div className="pulse-circle pulse-2"></div>
                      <div className="pulse-circle pulse-3"></div>
                    </div>
                  </div>
                  <div className="loading-text">
                    <h4>Analyzing your document...</h4>
                    <p>Our AI is reading and analyzing the content. This may take a moment.</p>
                    <div className="loading-steps">
                      <div className="step active">📄 Extracting text</div>
                      <div className="step active">🧠 AI analysis</div>
                      <div className="step">✨ Generating insights</div>
                    </div>
                  </div>
                </div>
              ) : itemState.analysisResult ? (
                <div className="analysis-result">
                  <div className="analysis-success">
                    <span className="success-icon">✅</span>
                    <span>Analysis completed successfully!</span>
                  </div>
                  <div className="analysis-text">
                    {itemState.analysisResult.split('\n').map((line, index) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h4 key={index} className="analysis-heading">
                            {line.replace(/\*\*/g, '')}
                          </h4>
                        );
                      } else if (line.startsWith('- ')) {
                        return (
                          <li key={index} className="analysis-list-item">
                            {line.substring(2)}
                          </li>
                        );
                      } else if (line.trim()) {
                        return (
                          <p key={index} className="analysis-paragraph">
                            {line}
                          </p>
                        );
                      }
                      return <br key={index} />;
                    })}
                  </div>
                </div>
              ) : (
                <div className="analysis-error">
                  <span className="error-icon">⚠️</span>
                  <p>Analysis failed. Please try again.</p>
                </div>
              )}
            </div>

            {!itemState.isAnalyzing && (
              <div className="analysis-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseAnalysisModal}
                >
                  Close
                </button>
                {itemState.analysisResult && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(itemState.analysisResult || '');
                      // Could add a toast notification here
                    }}
                  >
                    Copy Analysis
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentItem;