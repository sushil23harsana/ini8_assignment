# Medical Document Portal

A full-stack web application for managing medical documents (PDFs). Patients can upload, view, download, and delete their healthcare files through a clean web interface.

## Project Structure

```
medical-document-portal/
├── frontend/          # React TypeScript frontend
├── backend/           # Django REST Framework backend
├── .kiro/specs/       # Feature specifications
├── design.md          # Design document and tech stack decisions
└── README.md
```

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL for metadata storage
- **File Storage**: Local file system
- **Testing**: Jest + fast-check (frontend), pytest + Hypothesis (backend)

## Development Setup

### Prerequisites

- Python 3.8 or higher
- Node.js (v16 or higher)
- PostgreSQL 12 or higher
- npm or yarn

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
   
   # Copy environment file and configure
   cp .env.example .env
   # Edit .env with your database credentials
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

### Testing

- **Backend tests**: `cd backend && python manage.py test` or `pytest`
- **Frontend tests**: `cd frontend && npm test`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload/` | Upload a PDF file |
| GET | `/api/documents/` | List all documents |
| GET | `/api/documents/{id}/` | Download a specific file |
| DELETE | `/api/documents/{id}/delete/` | Delete a document |

### Example API Calls

```bash
# Upload a document
curl -X POST -F "file=@document.pdf" http://localhost:8000/api/documents/upload/

# List all documents
curl http://localhost:8000/api/documents/

# Download a document
curl -O http://localhost:8000/api/documents/1/

# Delete a document
curl -X DELETE http://localhost:8000/api/documents/1/delete/
```

## Features

- ✅ PDF file upload with validation
- ✅ Document listing with metadata
- ✅ File download functionality
- ✅ Document deletion with confirmation
- ✅ Error handling and user feedback
- ✅ Responsive web interface

## Development Status

This project is currently under development. See `.kiro/specs/medical-document-portal/tasks.md` for implementation progress.

## License

MIT