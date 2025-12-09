from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Document
import tempfile
import os


class DocumentModelTest(TestCase):
    """Test cases for Document model"""
    
    def test_document_creation(self):
        """Test creating a document instance"""
        document = Document.objects.create(
            filename="test.pdf",
            filepath="/path/to/test.pdf",
            filesize=1024
        )
        self.assertEqual(document.filename, "test.pdf")
        self.assertEqual(document.filesize, 1024)
        self.assertIsNotNone(document.created_at)


class DocumentAPITest(APITestCase):
    """Test cases for Document API endpoints"""
    
    def test_list_documents_empty(self):
        """Test listing documents when none exist"""
        url = reverse('list_documents')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
    
    def test_upload_invalid_file_type(self):
        """Test uploading non-PDF file"""
        url = reverse('upload_document')
        
        # Create a temporary text file
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as tmp_file:
            tmp_file.write(b'This is not a PDF')
            tmp_file.flush()
            
            with open(tmp_file.name, 'rb') as f:
                response = self.client.post(url, {'file': f}, format='multipart')
        
        # Clean up
        os.unlink(tmp_file.name)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Only PDF files are allowed', str(response.data))
    
    def test_download_nonexistent_document(self):
        """Test downloading a document that doesn't exist"""
        url = reverse('download_document', kwargs={'document_id': 999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)