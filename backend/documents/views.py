from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FileUploadParser
from rest_framework.response import Response
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer, DocumentDetailSerializer
from .utils import DocumentStorageService, DatabaseService
from .validators import InputValidator, DocumentValidator
from .exceptions import FileStorageError, FileValidationError, DocumentNotFoundError
import os
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@parser_classes([MultiPartParser, FileUploadParser])
def upload_document(request):
    """
    Upload a PDF document
    
    Handles multipart file uploads, validates PDF file types and size limits,
    stores files and creates database records.
    
    Requirements: 1.1, 1.2, 1.3, 6.1
    """
    logger.info("Document upload request received")
    
    # Validate request data
    if 'file' not in request.data:
        logger.warning("Upload request missing file")
        return Response(
            {'error': 'No file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = DocumentUploadSerializer(data=request.data)
    
    if serializer.is_valid():
        uploaded_file = serializer.validated_data['file']
        logger.info(f"Processing upload for file: {uploaded_file.name}")
        
        try:
            # Sanitize filename
            safe_filename = InputValidator.sanitize_filename(uploaded_file.name)
            
            # Save file using storage service
            file_path = DocumentStorageService.save_file(uploaded_file)
            
            # Verify file was saved correctly
            if not DocumentStorageService.file_exists(file_path):
                logger.error(f"File verification failed after save: {file_path}")
                raise FileStorageError("Failed to save file to storage")
            
            # Optional: Validate file content
            try:
                DocumentValidator.validate_file_content(file_path)
            except FileValidationError as e:
                logger.warning(f"File content validation failed: {e}")
                # Clean up invalid file
                DocumentStorageService.delete_file(file_path)
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create database record using database service
            document = DatabaseService.create_document_record(
                filename=safe_filename,
                filepath=file_path,
                filesize=uploaded_file.size
            )
            
            logger.info(f"Document uploaded successfully: ID {document.id}")
            return Response(
                {
                    **DocumentSerializer(document).data,
                    'message': 'File uploaded successfully'
                },
                status=status.HTTP_201_CREATED
            )
            
        except FileStorageError as e:
            logger.error(f"File storage error: {e}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Unexpected error during upload: {e}")
            # Clean up file if database record creation fails
            if 'file_path' in locals() and DocumentStorageService.file_exists(file_path):
                DocumentStorageService.delete_file(file_path)
            
            return Response(
                {'error': f'Failed to save file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    else:
        logger.warning(f"Upload validation failed: {serializer.errors}")
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def list_documents(request):
    """
    List all documents
    
    Query database for all document metadata and return JSON array 
    of document information ordered by creation date (newest first).
    
    Requirements: 2.1, 6.2
    """
    try:
        documents = DatabaseService.get_all_documents()
        serializer = DocumentSerializer(documents, many=True)
        
        return Response({
            'documents': serializer.data,
            'count': len(serializer.data)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to retrieve documents: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'OPTIONS'])
def download_document(request, document_id):
    """
    Download a specific document
    
    Retrieve file from storage and serve with proper headers.
    Handle missing file scenarios gracefully.
    
    Requirements: 3.1, 3.2, 6.3
    """
    # Handle CORS preflight requests
    if request.method == 'OPTIONS':
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    # Validate document_id using InputValidator
    try:
        document_id = InputValidator.validate_document_id(document_id)
    except ValidationError as e:
        logger.warning(f"Invalid document ID provided for download: {document_id}")
        return HttpResponse(
            f'Invalid document ID: {str(e)}', 
            status=400,
            content_type='text/plain'
        )
    
    # Get document from database
    document = DatabaseService.get_document_by_id(document_id)
    if not document:
        raise Http404("Document not found")
    
    # Check if file exists on disk
    if not DocumentStorageService.file_exists(document.filepath):
        raise Http404("File not found on disk")
    
    try:
        # Serve file with proper headers for inline viewing
        response = FileResponse(
            open(document.filepath, 'rb'),
            content_type='application/pdf'
        )
        
        # Sanitize filename for Content-Disposition header
        safe_filename = document.filename.replace('"', '\\"')
        # Use inline instead of attachment to allow PDF preview
        response['Content-Disposition'] = f'inline; filename="{safe_filename}"'
        response['Content-Length'] = document.filesize
        
        # Add CORS headers for frontend access
        response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        return response
        
    except Exception as e:
        from django.http import HttpResponse
        response = HttpResponse(
            f'Failed to serve file: {str(e)}', 
            status=500,
            content_type='text/plain'
        )
        return response


@api_view(['DELETE'])
def delete_document(request, document_id):
    """
    Delete a document
    
    Remove file from storage and database record.
    Handle cleanup of orphaned records gracefully.
    
    Requirements: 4.2, 6.4
    """
    # Validate document_id using InputValidator
    try:
        document_id = InputValidator.validate_document_id(document_id)
    except ValidationError as e:
        logger.warning(f"Invalid document ID provided for deletion: {document_id}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get document from database
    document = DatabaseService.get_document_by_id(document_id)
    if not document:
        raise Http404("Document not found")
    
    try:
        # Store file path for cleanup
        file_path = document.filepath
        
        # Delete file from storage (even if it doesn't exist)
        file_deleted = DocumentStorageService.delete_file(file_path)
        
        # Delete database record
        record_deleted = DatabaseService.delete_document_record(document_id)
        
        if record_deleted:
            message = 'Document deleted successfully'
            if not file_deleted:
                message += ' (file was already missing from storage)'
            
            return Response(
                {'message': message}, 
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'Failed to delete document record'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {'error': f'Failed to delete document: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def health_check(request):
    """
    Comprehensive health check endpoint
    
    Validates database connectivity, file storage accessibility,
    and overall system health.
    """
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'checks': {}
    }
    
    try:
        # Database connectivity check
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    try:
        # File storage accessibility check
        import tempfile
        test_file = tempfile.NamedTemporaryFile(delete=False)
        test_file.write(b'health check')
        test_file.close()
        
        # Test storage operations
        uploaded_file = SimpleUploadedFile(
            name="health_check.pdf",
            content=b'health check content',
            content_type='application/pdf'
        )
        
        file_path = DocumentStorageService.save_file(uploaded_file)
        file_exists = DocumentStorageService.file_exists(file_path)
        DocumentStorageService.delete_file(file_path)
        
        if file_exists:
            health_status['checks']['file_storage'] = 'healthy'
        else:
            health_status['checks']['file_storage'] = 'unhealthy: file save/check failed'
            health_status['status'] = 'unhealthy'
            
    except Exception as e:
        health_status['checks']['file_storage'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Document count check
    try:
        document_count = Document.objects.count()
        health_status['checks']['document_count'] = document_count
    except Exception as e:
        health_status['checks']['document_count'] = f'error: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Return appropriate status code
    status_code = status.HTTP_200_OK if health_status['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(health_status, status=status_code)


@api_view(['POST'])
def analyze_document(request, document_id):
    """
    Analyze a document using AI
    
    Performs AI-powered analysis of the document content using Google Gemini.
    Returns analysis results including document type, key information, and insights.
    """
    # Validate document_id
    try:
        document_id = InputValidator.validate_document_id(document_id)
    except ValidationError as e:
        logger.warning(f"Invalid document ID provided for analysis: {document_id}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get document from database
    document = DatabaseService.get_document_by_id(document_id)
    if not document:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if file exists
    if not DocumentStorageService.file_exists(document.filepath):
        return Response(
            {'error': 'Physical file not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        from .ai_analyzer import get_analyzer
        
        analyzer = get_analyzer()
        if not analyzer:
            return Response(
                {'error': 'AI analyzer not available. Please check GEMINI_API_KEY configuration.'}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Check if already analyzing
        if document.analysis_status == 'processing':
            return Response(
                {
                    'message': 'Document analysis is already in progress',
                    'status': document.analysis_status
                },
                status=status.HTTP_202_ACCEPTED
            )
        
        # Start analysis
        analysis_result = analyzer.analyze_document(document)
        
        return Response(
            {
                'message': 'Document analyzed successfully',
                'analysis': analysis_result,
                'status': document.analysis_status,
                'analyzed_at': document.analyzed_at
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Document analysis failed: {e}")
        return Response(
            {'error': f'Analysis failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_document_analysis(request, document_id):
    """
    Get existing analysis results for a document
    """
    # Validate document_id
    try:
        document_id = InputValidator.validate_document_id(document_id)
    except ValidationError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get document from database
    document = DatabaseService.get_document_by_id(document_id)
    if not document:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(
        {
            'analysis': document.analysis_result,
            'status': document.analysis_status,
            'analyzed_at': document.analyzed_at
        },
        status=status.HTTP_200_OK
    )