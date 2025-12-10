import React, { useState, useRef } from 'react';
import DocumentUpload, { DocumentUploadHandle } from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const uploadRef = useRef<DocumentUploadHandle>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleTriggerUpload = () => {
    uploadRef.current?.open();
  };

  const handleUploadStart = () => {
    setNotification({
      type: 'info',
      message: 'Uploading document...'
    });
  };

  const handleUploadSuccess = (document: any) => {
    setRefreshTrigger(prev => prev + 1);
    setNotification({
      type: 'success',
      message: `Success! ${document.filename} added.`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleUploadError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDocumentDeleted = (documentId: number) => {
    setNotification({
      type: 'success',
      message: 'Document removed successfully'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const dismissNotification = () => setNotification(null);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <div className="logo-container">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="header-text">
            <h1>Medical Portal</h1>
            <p>AI-powered document analysis & management</p>
          </div>
        </div>
        
        <button className="header-action-btn" onClick={handleTriggerUpload}>
          <span>+</span> Upload New
        </button>
      </header>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'info' && <span className="spinner-small"></span>}
          <span className="notification-message">{notification.message}</span>
          <button className="notification-close" onClick={dismissNotification}>✕</button>
        </div>
      )}

      <main>
        <DocumentUpload
          ref={uploadRef}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          onUploadStart={handleUploadStart}
        />
        
        <DocumentList
          refreshTrigger={refreshTrigger}
          onDocumentDeleted={handleDocumentDeleted}
          onError={handleError}
        />
      </main>

      <footer className="App-footer">
        <p>Secure document storage • Encrypted • Local Storage</p>
      </footer>
    </div>
  );
}

export default App;