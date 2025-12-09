from rest_framework import serializers
from .models import Document
from .validators import DocumentValidator, InputValidator
from .exceptions import FileValidationError


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model"""
    
    class Meta:
        model = Document
        fields = ['id', 'filename', 'filesize', 'created_at', 'analysis_status', 'analyzed_at']
        read_only_fields = ['id', 'created_at', 'analysis_status', 'analyzed_at']


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload with comprehensive validation"""
    
    file = serializers.FileField()
    
    def validate_file(self, value):
        """Comprehensive file validation using DocumentValidator"""
        try:
            # Use comprehensive validation
            DocumentValidator.validate_uploaded_file(value)
            return value
        except FileValidationError as e:
            raise serializers.ValidationError(str(e))
    
    def validate(self, attrs):
        """Additional validation at the serializer level"""
        uploaded_file = attrs.get('file')
        
        if not uploaded_file:
            raise serializers.ValidationError("No file provided")
        
        # Additional checks can be added here
        return attrs


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for document with additional metadata"""
    
    file_exists = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = ['id', 'filename', 'filesize', 'created_at', 'file_exists']
        read_only_fields = ['id', 'created_at', 'file_exists']
    
    def get_file_exists(self, obj):
        """Check if the physical file still exists"""
        from .utils import DocumentStorageService
        return DocumentStorageService.file_exists(obj.filepath)