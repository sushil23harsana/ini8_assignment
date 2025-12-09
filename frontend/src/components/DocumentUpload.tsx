import React, { useState, useRef } from 'react';
import { DocumentApiService, getErrorMessage } from '../services/api';
import './DocumentUpload.css';

interface DocumentUploadProps {
  onUploadSuccess: (document: any) => void;
  onUploadError: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: null
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are allowed.';
    }
    
    if (file.type && file.type !== 'application/pdf') {
      return 'Invalid file type. Only PDF files are allowed.';
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB}MB) exceeds the maximum limit of 10MB.`;
    }
    
    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Clear previous messages
    setUploadState(prev => ({
      ...prev,
      error: null,
      success: null
    }));
    
    if (!file) {
      setSelectedFile(null);
      return;
    }
    
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState(prev => ({
        ...prev,
        error: validationError
      }));
      setSelectedFile(null);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please select a file to upload.'
      }));
      return;
    }

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      success: null
    }));

    try {
      // Use the API service
      const result = await DocumentApiService.uploadDocument(selectedFile);
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        success: result.message || 'File uploaded successfully!'
      }));

      // Clear the form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component
      onUploadSuccess(result);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          success: null,
          progress: 0
        }));
      }, 3000);

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage
      }));

      onUploadError(errorMessage);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Simulate file input change by directly calling the file handler
      // Skip the event simulation and work with the file directly
      const validationError = validateFile(file);
      if (validationError) {
        setUploadState(prev => ({
          ...prev,
          error: validationError
        }));
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="document-upload">
      <h2>Upload Medical Document</h2>
      
      <div 
        className={`upload-area ${selectedFile ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <div className="upload-icon">📄</div>
          
          {!selectedFile ? (
            <>
              <p>Drag and drop a PDF file here, or click to select</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="file-input"
                disabled={uploadState.isUploading}
              />
              <button 
                type="button" 
                className="select-file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState.isUploading}
              >
                Select PDF File
              </button>
            </>
          ) : (
            <div className="selected-file">
              <div className="file-info">
                <strong>{selectedFile.name}</strong>
                <span className="file-size">{formatFileSize(selectedFile.size)}</span>
              </div>
              <button 
                type="button" 
                className="remove-file-btn"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={uploadState.isUploading}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {uploadState.isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadState.progress}%` }}
            ></div>
          </div>
          <span className="progress-text">Uploading... {uploadState.progress}%</span>
        </div>
      )}

      {uploadState.error && (
        <div className="message error-message">
          <span className="message-icon">⚠️</span>
          {uploadState.error}
        </div>
      )}

      {uploadState.success && (
        <div className="message success-message">
          <span className="message-icon">✅</span>
          {uploadState.success}
        </div>
      )}

      <div className="upload-actions">
        <button
          type="button"
          className="upload-btn"
          onClick={handleUpload}
          disabled={!selectedFile || uploadState.isUploading}
        >
          {uploadState.isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>

      <div className="upload-info">
        <p><strong>Requirements:</strong></p>
        <ul>
          <li>File must be in PDF format</li>
          <li>Maximum file size: 10MB</li>
          <li>Only medical documents should be uploaded</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentUpload;