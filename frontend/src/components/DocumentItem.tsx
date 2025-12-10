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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

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

  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  const healthcareFacts = [
    "🏥 India has the world's largest healthcare workforce with over 4.7 million registered healthcare professionals!",
    "💊 India is known as the 'Pharmacy of the World' - producing 60% of global vaccines and 20% of generic medicines!",
    "🔬 The first cataract surgery was performed in India over 2,600 years ago, making it a pioneer in eye care!",
    "🌿 Ayurveda, India's traditional medicine system, is over 5,000 years old and still widely practiced today!",
    "🏥 India performs the highest number of cardiac surgeries in the world, with over 200,000 procedures annually!"
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setShowAnalysisModal(true);
    setAnalysisResult(null);
    setCurrentFactIndex(0);

    // Cycle through facts every 3 seconds during analysis
    const factInterval = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % healthcareFacts.length);
    }, 3000);

    try {
      const result = await DocumentApiService.analyzeDocument(document.id);
      setAnalysisResult(result.analysis || 'Analysis completed');
      clearInterval(factInterval);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      onError(`Analysis failed: ${errorMessage}`);
      setAnalysisResult(null);
      clearInterval(factInterval);
    } finally {
      setIsAnalyzing(false);
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
          <button className="icon-btn analyze" onClick={handleAnalyze} disabled={isAnalyzing} title="AI Analysis">
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

      {showAnalysisModal && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal">
            <div className="analysis-header">
              <div className="analysis-title">
                <span className="analysis-icon">🧠</span>
                <h3>AI Document Analysis</h3>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setShowAnalysisModal(false)}
                disabled={isAnalyzing}
              >
                ✕
              </button>
            </div>

            <div className="analysis-file-info">
              <strong>{document.filename}</strong>
              <span>{formatFileSize(document.filesize)} • {formatDate(document.created_at)}</span>
            </div>

            <div className="analysis-content">
              {isAnalyzing ? (
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
                    <h4>🔍 Analyzing Your Document...</h4>
                    <p>Our advanced AI is carefully examining your medical document. Please wait while we process the information.</p>
                    
                    <div className="loading-progress">
                      <div className="progress-bar">
                        <div className="progress-fill"></div>
                      </div>
                      <span className="progress-text">Processing...</span>
                    </div>

                    <div className="healthcare-facts">
                      <div className="fact-header">
                        <span className="fact-icon">💡</span>
                        <h5>Did You Know?</h5>
                      </div>
                      <div className="fact-content">
                        <p className="healthcare-fact">{healthcareFacts[currentFactIndex]}</p>
                      </div>
                      <div className="fact-indicator">
                        {healthcareFacts.map((_, index) => (
                          <span 
                            key={index} 
                            className={`fact-dot ${index === currentFactIndex ? 'active' : ''}`}
                          ></span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : analysisResult ? (
                <div>
                  <div className="analysis-success">
                    <span className="success-icon">✅</span>
                    Analysis completed successfully!
                  </div>
                  <div className="analysis-text">
                    {analysisResult.split('\n').map((line, index) => {
                      const trimmedLine = line.trim();
                      
                      // Handle headings with **text**
                      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                        return <h4 key={index} className="analysis-heading">{trimmedLine.slice(2, -2)}</h4>;
                      }
                      
                      // Handle different bullet point formats
                      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')) {
                        return <div key={index} className="analysis-list-item">{trimmedLine.slice(2)}</div>;
                      }
                      
                      // Handle numbered lists
                      if (/^\d+\.\s/.test(trimmedLine)) {
                        return <div key={index} className="analysis-numbered-item">{trimmedLine}</div>;
                      }
                      
                      // Regular paragraphs (skip empty lines)
                      if (trimmedLine) {
                        return <p key={index} className="analysis-paragraph">{trimmedLine}</p>;
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="analysis-error">
                  <span className="error-icon">❌</span>
                  <h4>Analysis Failed</h4>
                  <p>Unable to analyze the document. Please try again.</p>
                </div>
              )}
            </div>

            <div className="analysis-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowAnalysisModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentItem;