# Design Document

## Overview

The Medical Document Portal is a full-stack web application that enables patients to manage their healthcare documents through a clean, intuitive interface. The system consists of a React frontend, Node.js/Express backend, SQLite database for metadata storage, and local file system storage for PDF documents. The architecture emphasizes simplicity, reliability, and ease of local development while maintaining clear separation of concerns.

## Architecture

The application follows a traditional three-tier architecture:

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    SQL     ┌─────────────────┐
│   React Frontend│ ──────────────► │ Django Backend  │ ─────────► │PostgreSQL Database│
│   (Port 3000)   │                 │   (Port 8000)   │            │   (metadata)    │
└─────────────────┘                 └─────────────────┘            └─────────────────┘
                                             │
                                             │ File I/O
                                             ▼
                                    ┌─────────────────┐
                                    │ Local File      │
                                    │ System (PDFs)   │
                                    └─────────────────┘
```

**Technology Stack Rationale:**

- **Frontend: React** - Provides component-based architecture, excellent developer experience, and robust ecosystem for file handling
- **Backend: Django REST Framework** - Robust Python framework with excellent file handling, built-in admin interface, and comprehensive security features
- **Database: PostgreSQL** - Production-ready relational database with excellent Django integration and ACID compliance
- **File Storage: Local File System** - Simple, direct file access without additional infrastructure complexity

## Components and Interfaces

### Frontend Components

**DocumentUpload Component**
- Handles file selection and upload form
- Validates PDF file type before submission
- Displays upload progress and success/error messages
- Interfaces with backend via POST /documents/upload

**DocumentList Component**
- Fetches and displays all uploaded documents
- Renders document metadata (name, size, date)
- Provides download and delete actions for each document
- Handles empty state when no documents exist

**DocumentItem Component**
- Represents individual document in the list
- Contains download and delete buttons
- Manages confirmation dialog for deletion
- Handles individual document actions

### Backend Services

**DocumentController**
- Handles HTTP requests and responses
- Validates request parameters and file types
- Coordinates between storage and database services
- Manages error responses and status codes

**FileStorageService**
- Manages physical file operations (save, retrieve, delete)
- Ensures uploads directory exists and is accessible
- Generates unique filenames to prevent conflicts
- Handles file system errors gracefully

**DatabaseService**
- Manages SQLite database connections and queries
- Handles document metadata CRUD operations
- Ensures data integrity and consistency
- Manages database schema initialization

### API Interface

**POST /documents/upload**
- Accepts multipart/form-data with PDF file
- Returns document metadata on success
- Validates file type and size constraints

**GET /documents**
- Returns array of all document metadata
- Includes id, filename, filesize, created_at fields
- Supports empty array response when no documents exist

**GET /documents/:id**
- Serves file download with appropriate headers
- Returns 404 if document not found
- Sets Content-Type and Content-Disposition headers

**DELETE /documents/:id**
- Removes file and database record
- Returns success confirmation
- Handles cleanup of orphaned records

## Data Models

### Document Metadata Schema

```python
# Django Model
class Document(models.Model):
    id = models.AutoField(primary_key=True)
    filename = models.CharField(max_length=255)
    filepath = models.CharField(max_length=500)
    filesize = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key for each document
- `filename`: Original filename as uploaded by user (max 255 chars)
- `filepath`: Relative path to stored file in uploads directory
- `filesize`: File size in bytes for display purposes
- `created_at`: Timestamp of upload, automatically set on creation

### File Storage Structure

```
uploads/
├── {uuid}-{original-filename}.pdf
├── {uuid}-{original-filename}.pdf
└── ...
```

Files are stored with UUID prefixes to prevent naming conflicts while preserving original filenames for user recognition.

## Correctness Properties
*
A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing the acceptance criteria, I've identified several key properties that can be consolidated to eliminate redundancy while maintaining comprehensive coverage:

**Property 1: File upload and storage consistency**
*For any* valid PDF file, uploading it should result in both the file being stored in the uploads directory and corresponding metadata being created in the database with all required fields (filename, filepath, filesize, created_at)
**Validates: Requirements 1.1, 1.3, 5.1, 5.2**

**Property 2: File type validation**
*For any* non-PDF file, attempting to upload it should be rejected with an appropriate error message and no storage or database changes should occur
**Validates: Requirements 1.2**

**Property 3: Document listing completeness**
*For any* set of uploaded documents, the document list should display all documents with their complete metadata (filename, upload date, file size) and provide download and delete actions for each
**Validates: Requirements 2.1, 2.2, 2.4**

**Property 4: Download round-trip consistency**
*For any* uploaded document, downloading it should return the exact same file content that was originally uploaded
**Validates: Requirements 3.1, 3.2**

**Property 5: Deletion completeness**
*For any* existing document, successfully deleting it should remove both the physical file from storage and the metadata record from the database
**Validates: Requirements 4.2, 5.5**

**Property 6: API endpoint consistency**
*For any* valid API request, the response should include appropriate HTTP status codes and, for successful operations, should maintain consistency between the API response and the actual system state
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

**Property 7: Error handling preservation**
*For any* operation that encounters an error, the system should display appropriate error messages while maintaining the current UI state without corruption
**Validates: Requirements 1.5, 3.5, 4.4, 6.5**

## Error Handling

The system implements comprehensive error handling at multiple levels:

**Frontend Error Handling:**
- File type validation before upload attempts
- Network error handling for API communication failures
- User-friendly error messages for all failure scenarios
- UI state preservation during error conditions

**Backend Error Handling:**
- Input validation for all API endpoints
- File system error handling (permissions, disk space, etc.)
- Database error handling with transaction rollback
- Graceful handling of missing files or records
- Proper HTTP status codes for different error types

**Database Error Handling:**
- Connection error recovery
- Transaction integrity maintenance
- Constraint violation handling
- Orphaned record cleanup procedures

## Testing Strategy

The testing approach combines unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing Framework:** Jest for frontend, Django's unittest/pytest for backend
**Property-Based Testing Framework:** fast-check for frontend, Hypothesis for Python backend

**Unit Testing Coverage:**
- Component rendering and user interactions
- API endpoint functionality with specific examples
- Database operations with known data sets
- File system operations with controlled scenarios
- Error boundary testing with specific failure cases

**Property-Based Testing Coverage:**
- File upload/download round-trip properties across various PDF files
- Database consistency properties with randomly generated document sets
- API response consistency across different request patterns
- Error handling properties with various failure scenarios
- UI state preservation properties during operations

**Testing Configuration:**
- Property-based tests configured to run minimum 100 iterations
- Each property test tagged with corresponding design document property
- Test data generators for PDF files, document metadata, and API requests
- Isolated test environments with temporary PostgreSQL databases and file storage
- Django test database isolation and transaction rollback

**Integration Testing:**
- End-to-end workflows from upload through deletion
- Cross-component communication validation
- Database and file system synchronization verification
- API contract compliance testing

The dual testing approach ensures that unit tests catch specific bugs and edge cases while property-based tests verify that the system maintains correctness across the full range of possible inputs and scenarios.