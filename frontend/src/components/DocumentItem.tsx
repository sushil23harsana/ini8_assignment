/* src/components/DocumentItem.tsx */
import React, { useState } from 'react';
import { Document } from '../types/Document';
import { DocumentApiService, getErrorMessage } from '../services/api';
import PDFViewer from './PDFViewer';
import './DocumentItem.css';

interface DocumentItemProps {
  document: Document;
  onDeleted: (documentId: number) => void;
  onError: (error: string) => void;
  formatDate: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  document,
  onDeleted,
  onError,
  formatDate,
  formatFileSize
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  // ... (Keep existing Logic handlers like handleDownload, handleDelete, etc.)
  // For brevity in this display, I am using the handlers directly in the JSX below
  // You should keep your existing handleDownload, handleDeleteConfirm logic here.
  
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await DocumentApiService.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      onError('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if(!window.confirm(`Delete ${document.filename}?`)) return;
    setIsDeleting(true);
    try {
      await DocumentApiService.deleteDocument(document.id);
      onDeleted(document.id);
    } catch (error) {
      setIsDeleting(false);
      onError('Delete failed');
    }
  };

  return (
    <>
      <div className={`document-row ${isDeleting ? 'deleting' : ''}`}>
        <div className="doc-icon-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>

        <div className="doc-info-main">
          <div className="doc-filename">{document.filename}</div>
          <div className="doc-meta">
            {formatFileSize(document.filesize)} • {formatDate(document.created_at)}
          </div>
        </div>

        <div className="doc-actions">
          <button className="icon-btn analyze" title="AI Analysis">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </button>
          
          <button className="icon-btn view" onClick={() => setShowPDFViewer(true)} title="View">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>

          <button className="icon-btn download" onClick={handleDownload} disabled={isDownloading} title="Download">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>

          <button className="icon-btn delete" onClick={handleDelete} disabled={isDeleting} title="Delete">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      {showPDFViewer && (
        <PDFViewer
          fileUrl={`http://localhost:8000/api/documents/${document.id}/download/`}
          fileName={document.filename}
          onClose={() => setShowPDFViewer(false)}
        />
      )}
    </>
  );
};

export default DocumentItem;