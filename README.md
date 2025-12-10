# Medical Document Portal

A comprehensive web application for managing medical documents. Upload, view, and organize PDF medical documents with intelligent AI analysis capabilities. Built with modern web technologies for reliability and ease of use.

## Features
- **Document Upload**: Secure PDF upload with drag-and-drop support
- **Inline PDF Viewer**: View documents directly in the browser with zoom and navigation
- **AI-Powered Analysis**: Intelligent medical document analysis using Mistral AI
- **Document Management**: Organize, download, and delete documents easily
- **Modern Interface**: Responsive design with intuitive user experience

## Project Structure

```
medical-document-portal/
├── frontend/          # React TypeScript frontend
├── backend/           # Django REST Framework backend
├── .kiro/specs/       # Feature specifications
├── design.md          # Design document and tech stack decisions
└── README.md
```

## Technology Stack

- **Frontend**: React + TypeScript for type-safe, maintainable code
- **Backend**: Django REST Framework for robust API development
- **Database**: PostgreSQL for reliable data persistence
- **File Storage**: Local filesystem with UUID-based file naming
- **AI Integration**: Mistral AI for advanced document analysis
- **PDF Processing**: react-pdf for in-browser PDF rendering
- **Text Extraction**: PyMuPDF for reliable PDF text parsing

## Getting This Running

### Prerequisites:
- Python 3.8 or higher
- Node.js 16+ (LTS version recommended)
- PostgreSQL 12 or newer
- Mistral API key (obtainable from mistral.ai)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medical-document-portal
   ```

2. **Set up backend (Django)**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure database**
   ```bash
   # Create PostgreSQL database
   createdb medical_portal
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env file with your database credentials and Mistral API key
   ```

4. **Run Django migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Django backend**
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python manage.py runserver
   ```
   Server will run on http://localhost:8000

2. **Start the React frontend**
   ```bash
   cd frontend
   npm start
   ```
   Frontend will run on http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload/` | Upload a PDF file |
| GET | `/api/documents/` | List all documents |
| GET | `/api/documents/{id}/download/` | View/download a specific file |
| POST | `/api/documents/{id}/analyze/` | Analyze document with AI |
| DELETE | `/api/documents/{id}/delete/` | Delete a document |

### Example API Calls

```bash
# Upload a document
curl -X POST -F "file=@document.pdf" http://localhost:8000/api/documents/upload/

# List all documents
curl http://localhost:8000/api/documents/

# Download/view a document
curl -O http://localhost:8000/api/documents/1/download/

# Analyze a document with AI
curl -X POST http://localhost:8000/api/documents/1/analyze/

# Delete a document
curl -X DELETE http://localhost:8000/api/documents/1/delete/
```

## Implementation Status

- ✅ PDF file upload with drag-and-drop support
- ✅ Document listing with metadata display
- ✅ Inline PDF viewer with navigation controls
- ✅ AI-powered document analysis using Mistral API
- ✅ Document deletion with confirmation dialogs
- ✅ Comprehensive error handling and user feedback
- ✅ Responsive, mobile-friendly interface
- ✅ CORS configuration for seamless frontend-backend integration