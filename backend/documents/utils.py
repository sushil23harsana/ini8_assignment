"""
Utility functions for document management
"""
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


class DocumentStorageService:
    """Service for handling document file operations"""
    
    @staticmethod
    def generate_unique_filename(original_filename):
        """Generate a unique filename with UUID prefix"""
        file_extension = os.path.splitext(original_filename)[1]
        unique_name = f"{uuid.uuid4()}{file_extension}"
        return unique_name
    
    @staticmethod
    def save_file(uploaded_file):
        """
        Save uploaded file to storage and return file path
        
        Args:
            uploaded_file: Django UploadedFile object
            
        Returns:
            str: Full path to saved file
        """
        # Generate unique filename
        unique_filename = DocumentStorageService.generate_unique_filename(uploaded_file.name)
        
        # Full path where file will be stored
        file_path = os.path.join(settings.MEDIA_ROOT, unique_filename)
        
        # Ensure uploads directory exists
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        
        # Save file to disk
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        return file_path
    
    @staticmethod
    def delete_file(file_path):
        """
        Delete file from storage
        
        Args:
            file_path: Full path to file to delete
            
        Returns:
            bool: True if file was deleted, False if file didn't exist
        """
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return True
            except OSError:
                return False
        return False
    
    @staticmethod
    def file_exists(file_path):
        """
        Check if file exists in storage
        
        Args:
            file_path: Full path to file
            
        Returns:
            bool: True if file exists, False otherwise
        """
        return os.path.exists(file_path)
    
    @staticmethod
    def get_file_size(file_path):
        """
        Get file size in bytes
        
        Args:
            file_path: Full path to file
            
        Returns:
            int: File size in bytes, 0 if file doesn't exist
        """
        if os.path.exists(file_path):
            return os.path.getsize(file_path)
        return 0


class DatabaseService:
    """Service for database operations"""
    
    @staticmethod
    def create_document_record(filename, filepath, filesize):
        """
        Create a new document record in database
        
        Args:
            filename: Original filename
            filepath: Path to stored file
            filesize: File size in bytes
            
        Returns:
            Document: Created document instance
        """
        from .models import Document
        
        document = Document.objects.create(
            filename=filename,
            filepath=filepath,
            filesize=filesize
        )
        return document
    
    @staticmethod
    def get_all_documents():
        """
        Get all documents ordered by creation date (newest first)
        
        Returns:
            QuerySet: All document records
        """
        from .models import Document
        return Document.objects.all()
    
    @staticmethod
    def get_document_by_id(document_id):
        """
        Get document by ID
        
        Args:
            document_id: Document ID
            
        Returns:
            Document: Document instance or None if not found
        """
        from .models import Document
        try:
            return Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return None
    
    @staticmethod
    def delete_document_record(document_id):
        """
        Delete document record from database
        
        Args:
            document_id: Document ID to delete
            
        Returns:
            bool: True if deleted, False if not found
        """
        from .models import Document
        try:
            document = Document.objects.get(id=document_id)
            document.delete()
            return True
        except Document.DoesNotExist:
            return False