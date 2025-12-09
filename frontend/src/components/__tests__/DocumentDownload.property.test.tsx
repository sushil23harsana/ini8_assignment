/**
 * Property-based tests for download round-trip consistency
 * **Feature: medical-document-portal, Property 4: Download round-trip consistency**
 * **Validates: Requirements 3.1, 3.2**
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import DocumentItem from '../DocumentItem';
import { DocumentApiService } from '../../services/api';
import { Document } from '../../types/Document';

// Mock the API service
jest.mock('../../services/api');
const mockDocumentApiService = DocumentApiService as jest.Mocked<typeof DocumentApiService>;

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window.URL, 'createObjectURL', {
  value: mockCreateObjectURL
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL
});

// Mock document.createElement and appendChild/removeChild
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
});
Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
});
Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
});

// Helper to generate valid document data
const documentArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  filename: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.pdf`),
  filesize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())
});

// Helper to generate valid PDF content
const pdfContentArbitrary = fc.uint8Array({ minLength: 1024, maxLength: 1024 * 1024 }); // 1KB to 1MB

describe('DocumentDownload Property Tests', () => {
  const mockFormatDate = jest.fn((date: string) => new Date(date).toLocaleDateString());
  const mockFormatFileSize = jest.fn((bytes: number) => `${Math.round(bytes / 1024)} KB`);
  const mockOnDeleted = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:test-url');
    
    // Mock createElement to return a mock link element
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      click: mockClick
    });
  });

  test('Property: Download round-trip consistency - file content matches upload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(documentArbitrary, pdfContentArbitrary),
        async ([document, pdfContent]) => {
          // Create blob with the test content
          const mockBlob = new Blob([pdfContent], { type: 'application/pdf' });
          
          // Mock API service to return the blob
          mockDocumentApiService.downloadDocument.mockResolvedValueOnce(mockBlob);

          render(
            <DocumentItem
              document={document}
              onDeleted={mockOnDeleted}
              onError={mockOnError}
              formatDate={mockFormatDate}
              formatFileSize={mockFormatFileSize}
            />
          );

          // Find and click the download button
          const downloadButton = screen.getByText(/Download/);
          fireEvent.click(downloadButton);

          // Wait for download process to complete
          await waitFor(() => {
            expect(mockDocumentApiService.downloadDocument).toHaveBeenCalledWith(document.id);
          });

          // Verify download process was initiated correctly
          expect(mockDocumentApiService.downloadDocument).toHaveBeenCalledTimes(1);
          expect(mockDocumentApiService.downloadDocument).toHaveBeenCalledWith(document.id);

          // Verify URL.createObjectURL was called with the blob
          expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);

          // Verify download link was created correctly
          expect(mockCreateElement).toHaveBeenCalledWith('a');
          
          // Verify the link element was configured correctly
          const linkElement = mockCreateElement.mock.results[0].value;
          expect(linkElement.href).toBe('blob:test-url');
          expect(linkElement.download).toBe(document.filename);

          // Verify the download was triggered
          expect(mockAppendChild).toHaveBeenCalledWith(linkElement);
          expect(mockClick).toHaveBeenCalled();
          expect(mockRemoveChild).toHaveBeenCalledWith(linkElement);

          // Verify cleanup
          expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');

          // Verify no errors were reported
          expect(mockOnError).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  });

  test('Property: Download handles file not found errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        documentArbitrary,
        async (document) => {
          // Mock API service to return a 404 error
          const notFoundError = new Error('File not found');
          (notFoundError as any).status = 404;
          mockDocumentApiService.downloadDocument.mockRejectedValueOnce(notFoundError);

          render(
            <DocumentItem
              document={document}
              onDeleted={mockOnDeleted}
              onError={mockOnError}
              formatDate={mockFormatDate}
              formatFileSize={mockFormatFileSize}
            />
          );

          // Find and click the download button
          const downloadButton = screen.getByText(/Download/);
          fireEvent.click(downloadButton);

          // Wait for error handling
          await waitFor(() => {
            expect(mockDocumentApiService.downloadDocument).toHaveBeenCalledWith(document.id);
          });

          // Verify error was handled correctly
          expect(mockOnError).toHaveBeenCalledWith(
            expect.stringContaining(`Failed to download ${document.filename}`)
          );

          // Verify no download link was created
          expect(mockCreateObjectURL).not.toHaveBeenCalled();
          expect(mockCreateElement).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30, timeout: 5000 }
    );
  });

  test('Property: Download preserves filename integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          documentArbitrary,
          fc.string({ minLength: 1, maxLength: 100 }).map(s => `${s}.pdf`) // Alternative filename
        ),
        async ([document, alternativeFilename]) => {
          // Test with both original and alternative filenames
          const testFilename = Math.random() > 0.5 ? document.filename : alternativeFilename;
          const testDocument = { ...document, filename: testFilename };

          const mockBlob = new Blob(['test content'], { type: 'application/pdf' });
          mockDocumentApiService.downloadDocument.mockResolvedValueOnce(mockBlob);

          render(
            <DocumentItem
              document={testDocument}
              onDeleted={mockOnDeleted}
              onError={mockOnError}
              formatDate={mockFormatDate}
              formatFileSize={mockFormatFileSize}
            />
          );

          const downloadButton = screen.getByText(/Download/);
          fireEvent.click(downloadButton);

          await waitFor(() => {
            expect(mockDocumentApiService.downloadDocument).toHaveBeenCalled();
          });

          // Verify the download filename matches exactly
          const linkElement = mockCreateElement.mock.results[0]?.value;
          if (linkElement) {
            expect(linkElement.download).toBe(testFilename);
          }
        }
      ),
      { numRuns: 40, timeout: 8000 }
    );
  });

  test('Property: Download button state changes correctly during download', async () => {
    await fc.assert(
      fc.asyncProperty(
        documentArbitrary,
        async (document) => {
          // Create a promise that we can control
          let resolveDownload: (value: Blob) => void;
          const downloadPromise = new Promise<Blob>((resolve) => {
            resolveDownload = resolve;
          });

          mockDocumentApiService.downloadDocument.mockReturnValueOnce(downloadPromise);

          render(
            <DocumentItem
              document={document}
              onDeleted={mockOnDeleted}
              onError={mockOnError}
              formatDate={mockFormatDate}
              formatFileSize={mockFormatFileSize}
            />
          );

          // Initial state - button should be enabled
          const downloadButton = screen.getByText(/Download/) as HTMLButtonElement;
          expect(downloadButton.disabled).toBe(false);

          // Click download button
          fireEvent.click(downloadButton);

          // Button should be disabled and show downloading state
          await waitFor(() => {
            expect(screen.getByText(/Downloading/)).toBeInTheDocument();
          });

          const downloadingButton = screen.getByText(/Downloading/) as HTMLButtonElement;
          expect(downloadingButton.disabled).toBe(true);

          // Resolve the download
          const mockBlob = new Blob(['test'], { type: 'application/pdf' });
          resolveDownload!(mockBlob);

          // Wait for download to complete - button should be re-enabled
          await waitFor(() => {
            const finalButton = screen.getByText(/^Download$/) as HTMLButtonElement;
            expect(finalButton.disabled).toBe(false);
          });
        }
      ),
      { numRuns: 30, timeout: 8000 }
    );
  });

  test('Property: Multiple downloads of same document produce consistent results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(documentArbitrary, pdfContentArbitrary),
        async ([document, pdfContent]) => {
          const mockBlob = new Blob([pdfContent], { type: 'application/pdf' });
          
          // Mock multiple successful downloads
          mockDocumentApiService.downloadDocument
            .mockResolvedValueOnce(mockBlob)
            .mockResolvedValueOnce(mockBlob)
            .mockResolvedValueOnce(mockBlob);

          render(
            <DocumentItem
              document={document}
              onDeleted={mockOnDeleted}
              onError={mockOnError}
              formatDate={mockFormatDate}
              formatFileSize={mockFormatFileSize}
            />
          );

          const downloadButton = screen.getByText(/Download/);

          // Perform multiple downloads
          for (let i = 0; i < 3; i++) {
            fireEvent.click(downloadButton);
            
            await waitFor(() => {
              expect(mockDocumentApiService.downloadDocument).toHaveBeenCalledTimes(i + 1);
            });

            // Verify each download call is identical
            expect(mockDocumentApiService.downloadDocument).toHaveBeenNthCalledWith(
              i + 1,
              document.id
            );
          }

          // Verify all downloads used the same document ID
          const allCalls = mockDocumentApiService.downloadDocument.mock.calls;
          const firstCallArg = allCalls[0][0];
          allCalls.forEach(call => {
            expect(call[0]).toBe(firstCallArg);
          });

          // Verify no errors occurred
          expect(mockOnError).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  test('Property: Download maintains view state during operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        documentArbitrary,
        async (document) => {
          const mockBlob = new Blob(['test'], { type: 'application/pdf' });
          mockDocumentApiService.downloadDocument.mockResolvedValueOnce(mockBlob);

          render(
            <DocumentItem
              document={document}
              onDeleted={mockOnDeleted}
              onError={mockOnError}
              formatDate={mockFormatDate}
              formatFileSize={mockFormatFileSize}
            />
          );

          // Verify initial document information is displayed
          expect(screen.getByText(document.filename)).toBeInTheDocument();
          expect(mockFormatFileSize).toHaveBeenCalledWith(document.filesize);
          expect(mockFormatDate).toHaveBeenCalledWith(document.created_at);

          // Start download
          const downloadButton = screen.getByText(/Download/);
          fireEvent.click(downloadButton);

          // During download, document info should still be visible
          await waitFor(() => {
            expect(screen.getByText(/Downloading/)).toBeInTheDocument();
          });

          // Document metadata should still be displayed
          expect(screen.getByText(document.filename)).toBeInTheDocument();

          // Wait for download to complete
          await waitFor(() => {
            expect(screen.getByText(/^Download$/)).toBeInTheDocument();
          });

          // After download, document info should still be visible
          expect(screen.getByText(document.filename)).toBeInTheDocument();
          
          // Verify the delete button is still functional
          const deleteButton = screen.getByText(/Delete/);
          expect(deleteButton).toBeInTheDocument();
          expect((deleteButton as HTMLButtonElement).disabled).toBe(false);
        }
      ),
      { numRuns: 25, timeout: 8000 }
    );
  });
});