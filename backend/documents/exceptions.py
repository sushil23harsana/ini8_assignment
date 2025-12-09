"""
Custom exceptions for document management
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class DocumentError(Exception):
    """Base exception for document-related errors"""
    pass


class FileStorageError(DocumentError):
    """Exception raised when file storage operations fail"""
    pass


class FileValidationError(DocumentError):
    """Exception raised when file validation fails"""
    pass


class DocumentNotFoundError(DocumentError):
    """Exception raised when document is not found"""
    pass


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the exception
    logger.error(f"Exception in {context.get('view', 'Unknown view')}: {exc}", exc_info=True)
    
    if response is not None:
        # Customize the response format
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': response.data,
            'status_code': response.status_code
        }
        
        # Handle specific error types
        if response.status_code == 400:
            custom_response_data['message'] = 'Invalid request data'
        elif response.status_code == 401:
            custom_response_data['message'] = 'Authentication required'
        elif response.status_code == 403:
            custom_response_data['message'] = 'Permission denied'
        elif response.status_code == 404:
            custom_response_data['message'] = 'Resource not found'
        elif response.status_code == 405:
            custom_response_data['message'] = 'Method not allowed'
        elif response.status_code == 500:
            custom_response_data['message'] = 'Internal server error'
        
        response.data = custom_response_data
    
    # Handle custom exceptions
    elif isinstance(exc, FileStorageError):
        custom_response_data = {
            'error': True,
            'message': 'File storage error',
            'details': str(exc),
            'status_code': 500
        }
        response = Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif isinstance(exc, FileValidationError):
        custom_response_data = {
            'error': True,
            'message': 'File validation error',
            'details': str(exc),
            'status_code': 400
        }
        response = Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
    
    elif isinstance(exc, DocumentNotFoundError):
        custom_response_data = {
            'error': True,
            'message': 'Document not found',
            'details': str(exc),
            'status_code': 404
        }
        response = Response(custom_response_data, status=status.HTTP_404_NOT_FOUND)
    
    return response