import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './PDFViewer.css';

// Set up the worker - try multiple sources for reliability
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, fileName, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add loading timeout
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setError('PDF loading timed out. The file might be too large or there\'s a network issue.');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Handle escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('PDF loading failed:', error);
    setError('PDF viewer failed to load. You can try downloading the file or viewing it in a new tab.');
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(2.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  };

  return (
    <div 
      className="pdf-viewer-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pdf-viewer-container">
        {/* Header */}
        <div className="pdf-viewer-header">
          <div className="pdf-viewer-title">
            <span className="pdf-icon">📄</span>
            <h3>{fileName}</h3>
          </div>
          <button className="close-btn" onClick={onClose} title="Close" style={{ 
            position: 'relative', 
            zIndex: 1000, 
            background: 'rgba(255,255,255,0.9)', 
            border: 'none', 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            cursor: 'pointer',
            fontSize: '24px',
            color: '#333'
          }}>
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div className="pdf-viewer-toolbar">
          <div className="toolbar-group">
            <button 
              onClick={goToPrevPage} 
              disabled={pageNumber <= 1}
              title="Previous page"
            >
              ◀
            </button>
            <div className="page-info">
              <input
                type="number"
                value={pageNumber}
                onChange={handlePageInputChange}
                min={1}
                max={numPages}
                className="page-input"
              />
              <span>of {numPages || 0}</span>
            </div>
            <button 
              onClick={goToNextPage} 
              disabled={pageNumber >= numPages}
              title="Next page"
            >
              ▶
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={zoomOut} disabled={scale <= 0.5} title="Zoom out">
              ➖
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} disabled={scale >= 2.0} title="Zoom in">
              ➕
            </button>
            <button onClick={resetZoom} title="Reset zoom">
              🔄
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="pdf-viewer-content">
          {loading && (
            <div className="pdf-loading">
              <div className="loading-spinner"></div>
              <p>Loading PDF...</p>
            </div>
          )}

          {error && (
            <div className="pdf-error">
              <div className="error-icon">⚠️</div>
              <h4>Unable to load PDF</h4>
              <p>{error}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={onClose} className="btn-secondary">
                  Close
                </button>
                <button 
                  onClick={() => window.open(fileUrl, '_blank')} 
                  className="btn-primary"
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Download Instead
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="pdf-document-container">
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="pdf-loading">Loading...</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pdf-viewer-footer">
          <div className="footer-info">
            <span>Scale: {Math.round(scale * 100)}%</span>
            <span>Page {pageNumber} of {numPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;