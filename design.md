# Design Document: Patient Portal System

## 1. Tech Stack Choices & Justification

### Q1. Frontend Framework: **React.js**
**Choice:** React
**Justification:**
* **Interactive UI:** The requirements (upload feedback, deleting items without refresh, dynamic lists) are best handled by a state-driven library like React.
* **Component Structure:** Breaking the UI into components (Upload Form, Document Card, Modal) keeps the code organized and reusable.
* **Ecosystem:** Excellent support for HTTP clients (Axios) and file handling libraries makes development faster.

### Q2. Backend Framework: **Django (Python)**
**Choice:** Django & Django REST Framework (DRF)
**Justification:**
* **Security & Reliability:** Django provides "batteries-included" security features (protection against SQL Injection, XSS, and CSRF) which are critical for any healthcare-related application.
* **Rapid Development:** The Django ORM and DRF Serializers allow us to build robust, validated REST APIs much faster than setting up a micro-framework from scratch.
* **Maintainability:** Python’s clean syntax ensures the codebase remains readable and easy to debug.
* **Bonus:** Python's rich ecosystem allows for easy integration of advanced features like the **Mistral AI document analysis** we implemented, leveraging PyMuPDF for text extraction and providing intelligent medical document insights.

### Q3. Database: **PostgreSQL**
**Choice:** PostgreSQL
**Justification:**
* **Concurrency:** Unlike SQLite (which locks the database file during a write), PostgreSQL handles multiple simultaneous users efficiently. This is essential for a system where many users might upload documents at the same time.
* **Data Integrity:** It is the industry standard for production Django apps, offering robust data typing and reliability that simple file-based databases cannot match.

---

### Q4. Scaling to 1,000 Users
To support 1,000 active users, we need to address **Storage** and **Access Control**.

#### 1. Storage: Migrate to Cloud (AWS S3)
* **Problem:** Storing 1,000 users' files on the web server's local disk will run out of space and make the server slow.
* **Solution:** Connect Django to **AWS S3** (Object Storage).
* **Retrieval:** Instead of serving files through the Django server (which ties up resources), the backend will generate **Presigned URLs**. These are secure, temporary links that allow the frontend to download the file directly from AWS S3.

#### 2. Security: Row-Level Permissions
* **Problem:** Currently, the application is "open" (anyone can see all files).
* **Solution:**
    * **Database:** Add a `owner_id` link to every document in PostgreSQL.
    * **Logic:** Update the API to only return documents that belong to the logged-in user (`Document.objects.filter(owner=request.user)`).
    * **Auth:** Implement JSON Web Tokens (JWT) so the API knows exactly who is requesting the data.

---

## 2. Architecture Overview

**Flow:**
[ React Frontend ] <--> [ Django API ] <--> [ PostgreSQL (Metadata) ]
                                  ^
                                  |
                                  v
                          [ AWS S3 Bucket (File Storage) ]

1.  **Frontend:** User uploads file.
2.  **Django:** Receives file, authenticates user, and sends file to **S3**.
3.  **PostgreSQL:** Stores the file location (S3 Key) and links it to the specific User ID.
4.  **Retrieval:** When requested, Django asks S3 for a secure, temporary link and sends it to the Frontend.

---

## 3. API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/documents/upload/` | `POST` | Upload a PDF (Multipart/Form-Data) |
| `/api/documents/` | `GET` | List **all** uploaded documents |
| `/api/documents/:id/delete/` | `DELETE` | Delete a file and its record |
| `/api/documents/:id/download/` | `GET` | Get PDF file for inline viewing/download |
| `/api/documents/:id/analyze/` | `POST` | **NEW: AI-powered document analysis** |

---

## 4. Data Flow Description

**Q5. Step-by-Step Process:**

**Upload Process:**
1.  React sends the PDF to the Django endpoint.
2.  Django validates the file type (.pdf).
3.  Django uploads the file to the configured storage (Local `media/` folder for now, S3 in production).
4.  Once saved, Django creates a record in PostgreSQL with the filename, size, and upload date.

**Download Process:**
1.  User clicks the "View" or "Download" icon.
2.  React requests the document from Django.
3.  Django looks up the file in the database.
4.  Django opens the file path and streams the binary data back to the browser (or returns a Presigned URL in the scaled version).

---

## 5. Assumptions
**Q6:**
1.  **Local Environment:** The current implementation assumes a local environment where the server has permission to write to the disk.
2.  **Trust:** We assume the file extension `.pdf` accurately reflects the file content (in production, we would validate "Magic Bytes").
3.  **Single-Tenant:** Currently, the app runs in a "global" mode where all uploads are shared, as no Login system was required for the assignment.

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
  "analysis_status": "not_started",
  "message": "File uploaded successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Only PDF files are allowed"
}
```

### POST /api/documents/{id}/analyze/
**Description**: **NEW FEATURE** - AI-powered document analysis using Mistral AI
**Content-Type**: application/json

**Sample Request:**
```bash
curl -X POST http://localhost:8000/api/documents/1/analyze/
```

**Sample Response (200 OK):**
```json
{
  "analysis": "**Document Type**\nMedical prescription\n\n**Key Medical Information**\n- Patient: John Doe\n- Medication: Amoxicillin 500mg\n- Dosage: Take twice daily for 7 days\n\n**Clinical Summary**\nAntibiotic prescription for bacterial infection treatment..."
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

1. **Frontend**: User selects PDF file in upload form with drag-and-drop support
2. **Frontend**: Client-side validation (file type, size < 10MB) with real-time feedback
3. **Frontend**: Creates FormData with file, sends POST to `/api/documents/upload/`
4. **Backend**: Django receives multipart request, validates file type and size
5. **Backend**: FileStorageService generates unique filename (UUID prefix)
6. **Backend**: File saved to `uploads/` directory with proper permissions
7. **Backend**: DatabaseService creates Document record with metadata and analysis_status
8. **Backend**: Returns document metadata to frontend
9. **Frontend**: Updates document list, shows success message with file details

**Q5. AI Analysis Process (NEW):**

1. **Frontend**: User clicks "Analyze" button on document card
2. **Frontend**: Shows engaging loading modal with healthcare facts rotation
3. **Frontend**: Sends POST request to `/api/documents/{id}/analyze/`
4. **Backend**: DocumentAnalyzer extracts text using PyMuPDF
5. **Backend**: Sends structured prompt to Mistral AI API for medical analysis
6. **Backend**: Updates document record with analysis results and timestamps
7. **Frontend**: Displays formatted analysis with proper markdown rendering
8. **Frontend**: Shows scrollable modal with organized medical insights

**Q5. File Download/View Process:**

1. **Frontend**: User clicks download or view button for specific document
2. **Frontend**: Sends GET request to `/api/documents/{id}/download/`
3. **Backend**: Validates document ID, queries database for document record
4. **Backend**: Checks if physical file exists in storage
5. **Backend**: Serves file with proper HTTP headers (inline for viewing, attachment for download)
6. **Backend**: Includes CORS headers for frontend PDF viewer access
7. **Frontend**: For viewing: Opens PDF in react-pdf modal with navigation controls
8. **Frontend**: For download: Creates blob URL and triggers browser download
9. **Frontend**: PDF viewer includes zoom, pagination, and error handling

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

**Security:**
- CORS enabled only for localhost:3000
- No file content validation beyond extension checking
- No virus scanning or malware detection
- Debug mode enabled for development

These assumptions would need to be revisited for a production deployment with multiple users, enhanced security requirements, and higher availability needs.

## AI Integration Architecture

### Mistral AI Document Analysis

**Technology Stack:**
- **AI Provider**: Mistral AI (mistral-large-latest model)
- **Text Extraction**: PyMuPDF (fitz) for reliable PDF parsing
- **Processing Flow**: Document → Text Extraction → Structured Prompt → AI Analysis → Formatted Response

**Analysis Features:**
- Medical document type identification
- Key information extraction (medications, diagnoses, dates)
- Clinical summary generation
- Risk assessment and recommendations
- Structured markdown output with proper formatting

**User Experience Enhancements:**
- Engaging loading animation with rotating healthcare facts about India
- Real-time progress indicators
- Scrollable analysis results modal
- Proper error handling with fallback options
- Mobile-responsive design

**Performance Considerations:**
- 15-second timeout for API calls
- Efficient text chunking for large documents
- Cached results to avoid redundant API calls
- Graceful degradation when AI service unavailable