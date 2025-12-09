# Design Document

## Tech Stack Choices

**Q1. What frontend framework did you use and why?**

I chose **React 18 with TypeScript** for the following reasons:
- **Component-based architecture**: Perfect for building reusable UI components like DocumentItem, DocumentList, and DocumentUpload
- **TypeScript integration**: Provides strong typing for better error detection, especially important for file handling and API responses
- **Rich ecosystem**: Excellent libraries for file handling, form validation, and testing (React Testing Library, fast-check for property testing)
- **Developer experience**: Hot reloading, excellent debugging tools, and comprehensive documentation
- **File handling**: Strong support for File API, drag-and-drop, and progress indicators

**Q2. What backend framework did you choose and why?**

I chose **Django 4.2 with Django REST Framework** for the following reasons:
- **Robust file handling**: Django has excellent built-in support for file uploads, validation, and storage
- **Database ORM**: Django's ORM provides clean database interactions with automatic migrations
- **Security**: Built-in protection against common vulnerabilities (CSRF, XSS, SQL injection)
- **Admin interface**: Django Admin provides easy database management during development
- **REST Framework**: DRF offers powerful serialization, validation, and API documentation
- **Python ecosystem**: Excellent for data processing, testing with Hypothesis for property-based testing

**Q3. What database did you choose and why?**

I chose **PostgreSQL** for the following reasons:
- **Production-ready**: ACID compliance, concurrent access, and excellent performance
- **Data integrity**: Strong consistency guarantees important for medical document metadata
- **Django integration**: Excellent ORM support with advanced features like JSON fields if needed
- **Scalability**: Better handling of concurrent users compared to SQLite
- **Full-text search**: Built-in capabilities for future document content searching
- **Backup and recovery**: Robust tools for data protection

**Q4. If you were to support 1,000 users, what changes would you consider?**

For 1,000 users, I would implement:

**Authentication & Authorization:**
- User registration/login system with JWT tokens
- Role-based access control (patients, doctors, admins)
- User-specific document isolation

**Performance & Scalability:**
- **Database**: Connection pooling, read replicas, query optimization with indexes
- **File Storage**: Move to cloud storage (AWS S3, Google Cloud Storage) with CDN
- **Caching**: Redis for session data and frequently accessed metadata
- **Load Balancing**: Nginx reverse proxy, multiple Django instances
- **Background Tasks**: Celery for file processing, virus scanning, thumbnail generation

**Security Enhancements:**
- Rate limiting and API throttling
- File virus scanning before storage
- Encryption at rest for sensitive documents
- Audit logging for compliance
- HTTPS enforcement with proper SSL certificates

**Monitoring & Reliability:**
- Application monitoring (Sentry, DataDog)
- Database monitoring and automated backups
- Health checks and alerting
- Automated testing and CI/CD pipeline

## Architecture Overview

### System Architecture Flow

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    SQL     ┌─────────────────┐
│   React Frontend│ ──────────────► │ Django Backend  │ ─────────► │PostgreSQL Database│
│   (Port 3000)   │                 │   (Port 8000)   │            │   (metadata)    │
└─────────────────┘                 └─────────────────┘            └─────────────────┘
                                             │
                                             │ File I/O
                                             ▼
                                    ┌─────────────────┐
                                    │ Local uploads/  │
                                    │ Directory (PDFs)│
                                    └─────────────────┘
```

**Component Interactions:**
1. **Frontend → Backend**: RESTful API calls for all operations
2. **Backend → Database**: Django ORM for metadata CRUD operations
3. **Backend → File System**: Direct file I/O for PDF storage/retrieval
4. **Database ↔ File System**: Backend ensures consistency between metadata and files

## API Specification

### POST /api/documents/upload/
**Description**: Upload a PDF file
**Content-Type**: multipart/form-data

**Sample Request:**
```bash
curl -X POST -F "file=@prescription.pdf" http://localhost:8000/api/documents/upload/
```

**Sample Response (201 Created):**
```json
{
  "id": 1,
  "filename": "prescription.pdf",
  "filesize": 245760,
  "created_at": "2024-12-09T10:30:00Z",
  "message": "File uploaded successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Only PDF files are allowed"
}
```

### GET /api/documents/
**Description**: List all uploaded documents

**Sample Request:**
```bash
curl http://localhost:8000/api/documents/
```

**Sample Response (200 OK):**
```json
{
  "documents": [
    {
      "id": 1,
      "filename": "prescription.pdf",
      "filesize": 245760,
      "created_at": "2024-12-09T10:30:00Z"
    },
    {
      "id": 2,
      "filename": "test_results.pdf",
      "filesize": 1024000,
      "created_at": "2024-12-09T11:15:00Z"
    }
  ],
  "count": 2
}
```

### GET /api/documents/{id}/
**Description**: Download a specific file

**Sample Request:**
```bash
curl -O http://localhost:8000/api/documents/1/
```

**Sample Response (200 OK):**
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="prescription.pdf"
- Content-Length: 245760
- Body: PDF file binary data

**Error Response (404 Not Found):**
```json
{
  "error": "Document not found"
}
```

### DELETE /api/documents/{id}/delete/
**Description**: Delete a document and its file

**Sample Request:**
```bash
curl -X DELETE http://localhost:8000/api/documents/1/delete/
```

**Sample Response (200 OK):**
```json
{
  "message": "Document deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Document not found"
}
```

## Data Flow Description

**Q5. File Upload Process:**

1. **Frontend**: User selects PDF file in upload form
2. **Frontend**: Client-side validation (file type, size < 10MB)
3. **Frontend**: Creates FormData with file, sends POST to `/api/documents/upload/`
4. **Backend**: Django receives multipart request, validates file type and size
5. **Backend**: FileStorageService generates unique filename (UUID prefix)
6. **Backend**: File saved to `uploads/` directory
7. **Backend**: DatabaseService creates Document record with metadata
8. **Backend**: Returns document metadata to frontend
9. **Frontend**: Updates document list, shows success message

**Q5. File Download Process:**

1. **Frontend**: User clicks download button for specific document
2. **Frontend**: Sends GET request to `/api/documents/{id}/`
3. **Backend**: Validates document ID, queries database for document record
4. **Backend**: Checks if physical file exists in storage
5. **Backend**: Serves file with proper HTTP headers (Content-Type, Content-Disposition)
6. **Frontend**: Receives file blob, creates download link, triggers browser download
7. **Frontend**: Cleans up temporary blob URL

## Assumptions

**Q6. Assumptions made during development:**

**File Handling:**
- Maximum file size: 10MB (suitable for most medical documents)
- Only PDF files allowed (most common format for medical documents)
- Files stored locally in `uploads/` directory with UUID prefixes to prevent naming conflicts

**Authentication:**
- Single user system (no login required) as specified in assignment
- All documents belong to the same user
- No access control or permission checks needed

**Concurrency:**
- Low concurrent usage expected for local development
- Database handles basic concurrent operations
- No file locking mechanisms implemented

**Data Persistence:**
- Local PostgreSQL database for metadata
- No data backup or recovery mechanisms for development phase
- File paths stored as relative paths from media root

**Error Handling:**
- Basic error messages suitable for development
- File deletion handles orphaned records gracefully
- Network errors handled with user-friendly messages

**Browser Support:**
- Modern browsers supporting File API, FormData, and blob downloads
- JavaScript enabled
- No IE support required

**Security:**
- CORS enabled only for localhost:3000
- No file content validation beyond extension checking
- No virus scanning or malware detection
- Debug mode enabled for development

These assumptions would need to be revisited for a production deployment with multiple users, enhanced security requirements, and higher availability needs.