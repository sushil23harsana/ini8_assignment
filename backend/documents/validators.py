"""
Validation utilities for document management
"""
import os
from django.core.exceptions import ValidationError
from django.conf import settings
from .exceptions import FileValidationError

# Optional magic import for enhanced file type checking
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False


class DocumentValidator:
    """Comprehensive document validation"""
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = ['.pdf']
    
    # Maximum file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Allowed MIME types
    ALLOWED_MIME_TYPES = ['application/pdf']
    
    @classmethod
    def validate_file_extension(cls, filename):
        """
        Validate file extension
        
        Args:
            filename: Name of the file to validate
            
        Raises:
            FileValidationError: If extension is not allowed
        """
        if not filename:
            raise FileValidationError("Filename cannot be empty")
        
        file_extension = os.path.splitext(filename.lower())[1]
        
        if file_extension not in cls.ALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"File extension '{file_extension}' not allowed. "
                f"Allowed extensions: {', '.join(cls.ALLOWED_EXTENSIONS)}"
            )
    
    @classmethod
    def validate_file_size(cls, file_size):
        """
        Validate file size
        
        Args:
            file_size: Size of the file in bytes
            
        Raises:
            FileValidationError: If file is too large
        """
        if file_size > cls.MAX_FILE_SIZE:
            max_size_mb = cls.MAX_FILE_SIZE / (1024 * 1024)
            actual_size_mb = file_size / (1024 * 1024)
            raise FileValidationError(
                f"File size {actual_size_mb:.1f}MB exceeds maximum allowed size of {max_size_mb}MB"
            )
    
    @classmethod
    def validate_mime_type(cls, content_type):
        """
        Validate MIME type
        
        Args:
            content_type: MIME type of the file
            
        Raises:
            FileValidationError: If MIME type is not allowed
        """
        if content_type and content_type not in cls.ALLOWED_MIME_TYPES:
            raise FileValidationError(
                f"MIME type '{content_type}' not allowed. "
                f"Allowed types: {', '.join(cls.ALLOWED_MIME_TYPES)}"
            )
    
    @classmethod
    def validate_file_content(cls, file_path):
        """
        Validate actual file content using python-magic
        
        Args:
            file_path: Path to the file to validate
            
        Raises:
            FileValidationError: If file content doesn't match expected type
        """
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                raise FileValidationError("File does not exist for content validation")
            
            # Use python-magic to detect actual file type if available
            if MAGIC_AVAILABLE:
                file_mime = magic.from_file(file_path, mime=True)
                
                if file_mime not in cls.ALLOWED_MIME_TYPES:
                    raise FileValidationError(
                        f"File content type '{file_mime}' does not match expected PDF format"
                    )
            else:
                # Fallback: Basic file header check for PDF
                with open(file_path, 'rb') as f:
                    header = f.read(4)
                    if header != b'%PDF':
                        raise FileValidationError(
                            "File does not appear to be a valid PDF (header check failed)"
                        )
                
        except Exception as e:
            if isinstance(e, FileValidationError):
                raise
            # For other exceptions, skip content validation
            pass
    
    @classmethod
    def validate_filename_safety(cls, filename):
        """
        Validate filename for security (prevent path traversal, etc.)
        
        Args:
            filename: Filename to validate
            
        Raises:
            FileValidationError: If filename contains unsafe characters
        """
        if not filename:
            raise FileValidationError("Filename cannot be empty")
        
        # Check for path traversal attempts
        if '..' in filename or '/' in filename or '\\' in filename:
            raise FileValidationError("Filename contains invalid path characters")
        
        # Check for control characters
        if any(ord(char) < 32 for char in filename):
            raise FileValidationError("Filename contains invalid control characters")
        
        # Check filename length
        if len(filename) > 255:
            raise FileValidationError("Filename too long (maximum 255 characters)")
    
    @classmethod
    def validate_uploaded_file(cls, uploaded_file):
        """
        Comprehensive validation of uploaded file
        
        Args:
            uploaded_file: Django UploadedFile object
            
        Raises:
            FileValidationError: If any validation fails
        """
        # Validate filename safety
        cls.validate_filename_safety(uploaded_file.name)
        
        # Validate file extension
        cls.validate_file_extension(uploaded_file.name)
        
        # Validate file size
        cls.validate_file_size(uploaded_file.size)
        
        # Validate MIME type if available
        if hasattr(uploaded_file, 'content_type') and uploaded_file.content_type:
            cls.validate_mime_type(uploaded_file.content_type)


class InputValidator:
    """Validation for API inputs"""
    
    @staticmethod
    def validate_document_id(document_id):
        """
        Validate document ID
        
        Args:
            document_id: Document ID to validate
            
        Returns:
            int: Validated document ID
            
        Raises:
            ValidationError: If ID is invalid
        """
        try:
            doc_id = int(document_id)
            if doc_id <= 0:
                raise ValidationError("Document ID must be a positive integer")
            return doc_id
        except (ValueError, TypeError):
            raise ValidationError("Document ID must be a valid integer")
    
    @staticmethod
    def sanitize_filename(filename):
        """
        Sanitize filename for safe storage and display
        
        Args:
            filename: Original filename
            
        Returns:
            str: Sanitized filename
        """
        if not filename:
            return "unnamed_file.pdf"
        
        # Remove or replace unsafe characters
        safe_chars = []
        for char in filename:
            if char.isalnum() or char in '.-_()[]{}':
                safe_chars.append(char)
            else:
                safe_chars.append('_')
        
        sanitized = ''.join(safe_chars)
        
        # Ensure it ends with .pdf
        if not sanitized.lower().endswith('.pdf'):
            sanitized += '.pdf'
        
        return sanitized[:255]  # Limit length