import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './PDFViewer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('PDF loading failed:', error);
    setError('Hmm, PDF won\'t load. Try downloading it instead - sometimes that works better.');
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
    <div className="pdf-viewer-overlay">
      <div className="pdf-viewer-container">
        {/* Header */}
        <div className="pdf-viewer-header">
          <div className="pdf-viewer-title">
            <span className="pdf-icon">📄</span>
            <h3>{fileName}</h3>
          </div>
          <button className="close-btn" onClick={onClose} title="Close">
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
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
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