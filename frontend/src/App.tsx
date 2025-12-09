import React, { useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleUploadSuccess = (document: any) => {
    // Trigger document list refresh
    setRefreshTrigger(prev => prev + 1);
    
    // Show success notification
    setNotification({
      type: 'success',
      message: `Successfully uploaded ${document.filename}`
    });

    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const handleUploadError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    });

    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDocumentDeleted = (documentId: number) => {
    setNotification({
      type: 'success',
      message: 'Document deleted successfully'
    });

    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const handleError = (error: string) => {
    setNotification({
      type: 'error',
      message: error
    });

    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Medical Document Portal</h1>
        <p>Upload and manage your healthcare documents securely</p>
      </header>

      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close"
            onClick={dismissNotification}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      <main>
        <DocumentUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
        
        <DocumentList
          refreshTrigger={refreshTrigger}
          onDocumentDeleted={handleDocumentDeleted}
          onError={handleError}
        />
      </main>

      <footer className="App-footer">
        <p>
          Secure document storage for your medical records. 
          All files are stored locally and encrypted.
        </p>
      </footer>
    </div>
  );
}

export default App;