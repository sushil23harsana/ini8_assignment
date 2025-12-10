import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { DocumentApiService, getErrorMessage } from '../services/api';

interface DocumentUploadProps {
  onUploadSuccess: (document: any) => void;
  onUploadError: (error: string) => void;
  onUploadStart?: () => void;
}

export interface DocumentUploadHandle {
  open: () => void;
}

const DocumentUpload = forwardRef<DocumentUploadHandle, DocumentUploadProps>(
  ({ onUploadSuccess, onUploadError, onUploadStart }, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        fileInputRef.current?.click();
      }
    }));

    const validateFile = (file: File): string | null => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return 'Only PDF files are allowed.';
      }
      if (file.type && file.type !== 'application/pdf') {
        return 'Invalid file type. Only PDF files are allowed.';
      }
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return `File size exceeds the maximum limit of 10MB.`;
      }
      return null;
    };

    const processUpload = async (file: File) => {
      if (onUploadStart) onUploadStart();
      setIsUploading(true);

      try {
        const result = await DocumentApiService.uploadDocument(file);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        onUploadSuccess(result);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        onUploadError(errorMessage);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } finally {
        setIsUploading(false);
      }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      
      if (!file) return;
      
      const validationError = validateFile(file);
      if (validationError) {
        onUploadError(validationError);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      processUpload(file);
    };

    return (
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isUploading}
      />
    );
  }
);

export default DocumentUpload;