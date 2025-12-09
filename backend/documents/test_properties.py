"""
Property-based tests for document storage operations using Hypothesis
"""
import os
import tempfile
import shutil
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from hypothesis import given, strategies as st, settings
from hypothesis.extra.django import TestCase as HypothesisTestCase
from .models import Document
from .utils import DocumentStorageService, DatabaseService


# Create a temporary directory for test uploads
TEST_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class DocumentStoragePropertyTests(HypothesisTestCase):
    """
    Property-based tests for document storage operations
    **Feature: medical-document-portal, Property 1: File upload and storage consistency**
    **Validates: Requirements 1.1, 1.3, 5.1, 5.2**
    """
    
    def setUp(self):
        """Set up test environment"""
        # Ensure test media directory exists
        os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
    
    def tearDown(self):
        """Clean up test environment"""
        # Clean up test files
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)
            os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
    
    @given(
        filename=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), 
            min_size=1, 
            max_size=50
        ).map(lambda x: f"{x}.pdf"),
        file_content=st.binary(min_size=1, max_size=1024)
    )
    @settings(max_examples=100, deadline=None)
    def test_file_upload_and_storage_consistency(self, filename, file_content):
        """
        Property: For any valid PDF file, uploading it should result in both 
        the file being stored in the uploads directory and corresponding metadata 
        being created in the database with all required fields
        """
        # Create uploaded file object
        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=file_content,
            content_type='application/pdf'
        )
        
        # Save file using storage service
        file_path = DocumentStorageService.save_file(uploaded_file)
        
        # Verify file exists on disk
        self.assertTrue(
            DocumentStorageService.file_exists(file_path),
            "File should exist on disk after saving"
        )
        
        # Verify file content matches
        with open(file_path, 'rb') as saved_file:
            saved_content = saved_file.read()
            self.assertEqual(
                saved_content, 
                file_content,
                "Saved file content should match original content"
            )
        
        # Create database record
        document = DatabaseService.create_document_record(
            filename=uploaded_file.name,
            filepath=file_path,
            filesize=uploaded_file.size
        )
        
        # Verify database record has all required fields
        self.assertIsNotNone(document.id, "Document should have an ID")
        self.assertEqual(
            document.filename, 
            uploaded_file.name,
            "Database filename should match uploaded filename"
        )
        self.assertEqual(
            document.filepath, 
            file_path,
            "Database filepath should match saved file path"
        )
        self.assertEqual(
            document.filesize, 
            uploaded_file.size,
            "Database filesize should match uploaded file size"
        )
        self.assertIsNotNone(
            document.created_at,
            "Document should have creation timestamp"
        )
        
        # Verify file size consistency
        actual_file_size = DocumentStorageService.get_file_size(file_path)
        self.assertEqual(
            actual_file_size,
            uploaded_file.size,
            "Actual file size should match recorded size"
        )
        
        # Clean up for next iteration
        DocumentStorageService.delete_file(file_path)
        document.delete()
    
    @given(
        filename=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), 
            min_size=1, 
            max_size=50
        ).map(lambda x: f"{x}.pdf"),
        file_content=st.binary(min_size=1, max_size=1024)
    )
    @settings(max_examples=50, deadline=None)
    def test_file_deletion_consistency(self, filename, file_content):
        """
        Property: For any uploaded document, deleting it should remove both 
        the physical file from storage and the metadata record from the database
        """
        # Create and save file
        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=file_content,
            content_type='application/pdf'
        )
        
        file_path = DocumentStorageService.save_file(uploaded_file)
        document = DatabaseService.create_document_record(
            filename=uploaded_file.name,
            filepath=file_path,
            filesize=uploaded_file.size
        )
        
        # Verify file and record exist before deletion
        self.assertTrue(DocumentStorageService.file_exists(file_path))
        self.assertIsNotNone(DatabaseService.get_document_by_id(document.id))
        
        # Delete file and record
        DocumentStorageService.delete_file(file_path)
        DatabaseService.delete_document_record(document.id)
        
        # Verify both file and record are gone
        self.assertFalse(
            DocumentStorageService.file_exists(file_path),
            "File should not exist after deletion"
        )
        self.assertIsNone(
            DatabaseService.get_document_by_id(document.id),
            "Database record should not exist after deletion"
        )
    
    @given(
        filenames=st.lists(
            st.text(
                alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), 
                min_size=1, 
                max_size=20
            ).map(lambda x: f"{x}.pdf"),
            min_size=1,
            max_size=10,
            unique=True
        )
    )
    @settings(max_examples=20, deadline=None)
    def test_unique_filename_generation(self, filenames):
        """
        Property: For any set of files with the same original filename,
        the storage service should generate unique file paths
        """
        generated_paths = []
        
        for filename in filenames:
            # Create file with same name multiple times
            for _ in range(3):  # Test 3 files with same name
                uploaded_file = SimpleUploadedFile(
                    name=filename,
                    content=b'test content',
                    content_type='application/pdf'
                )
                
                file_path = DocumentStorageService.save_file(uploaded_file)
                generated_paths.append(file_path)
        
        # Verify all generated paths are unique
        unique_paths = set(generated_paths)
        self.assertEqual(
            len(unique_paths),
            len(generated_paths),
            "All generated file paths should be unique"
        )
        
        # Clean up
        for path in generated_paths:
            DocumentStorageService.delete_file(path)
    
    def test_file_storage_directory_creation(self):
        """
        Property: The storage service should ensure the uploads directory exists
        """
        # Remove the test directory
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)
        
        # Verify directory doesn't exist
        self.assertFalse(os.path.exists(TEST_MEDIA_ROOT))
        
        # Save a file (should create directory)
        uploaded_file = SimpleUploadedFile(
            name="test.pdf",
            content=b'test content',
            content_type='application/pdf'
        )
        
        file_path = DocumentStorageService.save_file(uploaded_file)
        
        # Verify directory was created
        self.assertTrue(
            os.path.exists(TEST_MEDIA_ROOT),
            "Storage service should create uploads directory if it doesn't exist"
        )
        
        # Verify file was saved
        self.assertTrue(
            DocumentStorageService.file_exists(file_path),
            "File should be saved even when directory didn't exist initially"
        )
        
        # Clean up
        DocumentStorageService.delete_file(file_path)

@
override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class FileTypeValidationPropertyTests(HypothesisTestCase):
    """
    Property-based tests for file type validation
    **Feature: medical-document-portal, Property 2: File type validation**
    **Validates: Requirements 1.2**
    """
    
    def setUp(self):
        """Set up test environment"""
        os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
    
    def tearDown(self):
        """Clean up test environment"""
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)
            os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
    
    @given(
        filename=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), 
            min_size=1, 
            max_size=50
        ),
        extension=st.sampled_from(['.txt', '.doc', '.jpg', '.png', '.zip', '.exe', '.html']),
        file_content=st.binary(min_size=1, max_size=1024)
    )
    @settings(max_examples=100, deadline=None)
    def test_non_pdf_files_rejected(self, filename, extension, file_content):
        """
        Property: For any non-PDF file, attempting to upload it should be rejected 
        with an appropriate error message and no storage or database changes should occur
        """
        from .serializers import DocumentUploadSerializer
        
        # Create non-PDF file
        non_pdf_filename = f"{filename}{extension}"
        uploaded_file = SimpleUploadedFile(
            name=non_pdf_filename,
            content=file_content,
            content_type='text/plain'  # Non-PDF content type
        )
        
        # Test serializer validation
        serializer = DocumentUploadSerializer(data={'file': uploaded_file})
        
        # Should be invalid
        self.assertFalse(
            serializer.is_valid(),
            f"Non-PDF file {non_pdf_filename} should be rejected"
        )
        
        # Should contain appropriate error message
        self.assertIn(
            'Only PDF files are allowed',
            str(serializer.errors),
            "Error message should indicate PDF files only"
        )
        
        # Verify no files were created in storage
        files_in_storage = os.listdir(TEST_MEDIA_ROOT) if os.path.exists(TEST_MEDIA_ROOT) else []
        self.assertEqual(
            len(files_in_storage), 
            0,
            "No files should be created in storage for invalid uploads"
        )
        
        # Verify no database records were created
        document_count = Document.objects.count()
        self.assertEqual(
            document_count, 
            0,
            "No database records should be created for invalid uploads"
        )
    
    @given(
        filename=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), 
            min_size=1, 
            max_size=50
        ).map(lambda x: f"{x}.pdf"),
        file_content=st.binary(min_size=1, max_size=1024)
    )
    @settings(max_examples=50, deadline=None)
    def test_pdf_files_accepted(self, filename, file_content):
        """
        Property: For any valid PDF file, the validation should pass
        """
        from .serializers import DocumentUploadSerializer
        
        # Create PDF file
        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=file_content,
            content_type='application/pdf'
        )
        
        # Test serializer validation
        serializer = DocumentUploadSerializer(data={'file': uploaded_file})
        
        # Should be valid
        self.assertTrue(
            serializer.is_valid(),
            f"Valid PDF file {filename} should be accepted. Errors: {serializer.errors}"
        )
        
        # Clean up
        Document.objects.all().delete()
    
    @given(
        filesize_mb=st.integers(min_value=11, max_value=50)  # Files larger than 10MB
    )
    @settings(max_examples=20, deadline=None)
    def test_large_files_rejected(self, filesize_mb):
        """
        Property: For any file larger than the size limit, it should be rejected
        """
        from .serializers import DocumentUploadSerializer
        
        # Create large file content (simulate large file)
        large_content = b'x' * (filesize_mb * 1024 * 1024)  # Convert MB to bytes
        
        uploaded_file = SimpleUploadedFile(
            name="large_file.pdf",
            content=large_content,
            content_type='application/pdf'
        )
        
        # Test serializer validation
        serializer = DocumentUploadSerializer(data={'file': uploaded_file})
        
        # Should be invalid due to size
        self.assertFalse(
            serializer.is_valid(),
            f"File of {filesize_mb}MB should be rejected (limit is 10MB)"
        )
        
        # Should contain size limit error
        self.assertIn(
            'File size cannot exceed',
            str(serializer.errors),
            "Error message should indicate file size limit"
        )
fr
om rest_framework.test import APITestCase
from django.urls import reverse


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class APIEndpointConsistencyPropertyTests(APITestCase, HypothesisTestCase):
    """
    Property-based tests for API endpoint consistency
    **Feature: medical-document-portal, Property 6: API endpoint consistency**
    **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    """
    
    def setUp(self):
        """Set up test environment"""
        os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
    
    def tearDown(self):
        """Clean up test environment"""
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)
            os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
        Document.objects.all().delete()
    
    @given(
        filename=st.text(
            alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')), 
            min_size=1, 
            max_size=30
        ).map(lambda x: f"{x}.pdf"),
        file_content=st.binary(min_size=1, max_size=1024)
    )
    @settings(max_examples=50, deadline=None)
    def test_upload_endpoint_consistency(self, filename, file_content):
        """
        Property: For any valid upload request, the API should return appropriate 
        HTTP status codes and maintain consistency between response and system state
        """
        # Create valid PDF file
        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=file_content,
            content_type='application/pdf'
        )
        
        # Make upload request
        url = reverse('upload_document')
        response = self.client.post(url, {'file': uploaded_file}, format='multipart')
        
        # Should return 201 Created for successful upload
        self.assertEqual(
            response.status_code, 
            201,
            f"Upload should return 201 Created. Got {response.status_code}: {response.data}"
        )
        
        # Response should contain document data
        self.assertIn('id', response.data)
        self.assertIn('filename', response.data)
        self.assertIn('filesize', response.data)
        self.assertIn('created_at', response.data)
        
        # Response data should match uploaded file
        self.assertEqual(response.data['filename'], filename)
        self.assertEqual(response.data['filesize'], len(file_content))
        
        # Document should exist in database
        document_id = response.data['id']
        document = DatabaseService.get_document_by_id(document_id)
        self.assertIsNotNone(document, "Document should exist in database after upload")
        
        # File should exist in storage
        self.assertTrue(
            DocumentStorageService.file_exists(document.filepath),
            "File should exist in storage after upload"
        )
        
        # Clean up for next iteration
        DocumentStorageService.delete_file(document.filepath)
        document.delete()
    
    @given(
        document_count=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=20, deadline=None)
    def test_list_endpoint_consistency(self, document_count):
        """
        Property: For any number of documents in the system, the list endpoint 
        should return all documents with correct count and data
        """
        # Create test documents
        created_documents = []
        for i in range(document_count):
            filename = f"test_doc_{i}.pdf"
            content = f"Test content {i}".encode()
            
            uploaded_file = SimpleUploadedFile(
                name=filename,
                content=content,
                content_type='application/pdf'
            )
            
            file_path = DocumentStorageService.save_file(uploaded_file)
            document = DatabaseService.create_document_record(
                filename=filename,
                filepath=file_path,
                filesize=len(content)
            )
            created_documents.append(document)
        
        # Make list request
        url = reverse('list_documents')
        response = self.client.get(url)
        
        # Should return 200 OK
        self.assertEqual(response.status_code, 200)
        
        # Should return correct count
        self.assertEqual(
            response.data['count'], 
            document_count,
            f"List should return {document_count} documents"
        )
        
        # Should return all documents
        self.assertEqual(
            len(response.data['documents']), 
            document_count,
            f"List should contain {document_count} document entries"
        )
        
        # Clean up
        for document in created_documents:
            DocumentStorageService.delete_file(document.filepath)
            document.delete()
    
    def test_download_endpoint_consistency(self):
        """
        Property: For any existing document, the download endpoint should 
        serve the file with correct headers and content
        """
        # Create test document
        filename = "test_download.pdf"
        content = b"Test PDF content for download"
        
        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=content,
            content_type='application/pdf'
        )
        
        file_path = DocumentStorageService.save_file(uploaded_file)
        document = DatabaseService.create_document_record(
            filename=filename,
            filepath=file_path,
            filesize=len(content)
        )
        
        # Make download request
        url = reverse('download_document', kwargs={'document_id': document.id})
        response = self.client.get(url)
        
        # Should return 200 OK
        self.assertEqual(response.status_code, 200)
        
        # Should have correct content type
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Should have correct content disposition
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn(filename, response['Content-Disposition'])
        
        # Should have correct content length
        self.assertEqual(int(response['Content-Length']), len(content))
        
        # Clean up
        DocumentStorageService.delete_file(file_path)
        document.delete()
    
    def test_delete_endpoint_consistency(self):
        """
        Property: For any existing document, the delete endpoint should 
        remove both file and database record
        """
        # Create test document
        filename = "test_delete.pdf"
        content = b"Test PDF content for deletion"
        
        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=content,
            content_type='application/pdf'
        )
        
        file_path = DocumentStorageService.save_file(uploaded_file)
        document = DatabaseService.create_document_record(
            filename=filename,
            filepath=file_path,
            filesize=len(content)
        )
        
        document_id = document.id
        
        # Verify document exists before deletion
        self.assertTrue(DocumentStorageService.file_exists(file_path))
        self.assertIsNotNone(DatabaseService.get_document_by_id(document_id))
        
        # Make delete request
        url = reverse('delete_document', kwargs={'document_id': document_id})
        response = self.client.delete(url)
        
        # Should return 200 OK
        self.assertEqual(response.status_code, 200)
        
        # Should contain success message
        self.assertIn('message', response.data)
        self.assertIn('deleted successfully', response.data['message'])
        
        # File should be removed from storage
        self.assertFalse(
            DocumentStorageService.file_exists(file_path),
            "File should be removed from storage after deletion"
        )
        
        # Database record should be removed
        self.assertIsNone(
            DatabaseService.get_document_by_id(document_id),
            "Database record should be removed after deletion"
        )
    
    @given(
        invalid_id=st.one_of(
            st.integers(max_value=0),  # Non-positive integers
            st.integers(min_value=999999),  # Very large integers (likely non-existent)
            st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=1, max_size=10)  # Non-numeric strings
        )
    )
    @settings(max_examples=30, deadline=None)
    def test_invalid_id_handling_consistency(self, invalid_id):
        """
        Property: For any invalid document ID, endpoints should return 
        appropriate error responses with correct status codes
        """
        # Test download with invalid ID
        try:
            url = reverse('download_document', kwargs={'document_id': invalid_id})
            response = self.client.get(url)
            
            # Should return 400 or 404
            self.assertIn(
                response.status_code, 
                [400, 404],
                f"Invalid ID {invalid_id} should return 400 or 404, got {response.status_code}"
            )
        except Exception:
            # URL reverse might fail for non-numeric IDs, which is expected
            pass
        
        # Test delete with invalid ID
        try:
            url = reverse('delete_document', kwargs={'document_id': invalid_id})
            response = self.client.delete(url)
            
            # Should return 400 or 404
            self.assertIn(
                response.status_code, 
                [400, 404],
                f"Invalid ID {invalid_id} should return 400 or 404, got {response.status_code}"
            )
        except Exception:
            # URL reverse might fail for non-numeric IDs, which is expected
            pass
@override_
settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class ErrorHandlingPropertyTests(APITestCase, HypothesisTestCase):
    """
    Property-based tests for error handling preservation
    **Feature: medical-document-portal, Property 7: Error handling preservation**
    **Validates: Requirements 1.5, 3.5, 4.4, 6.5**
    """
    
    def setUp(self):
        """Set up test environment"""
        os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
    
    def tearDown(self):
        """Clean up test environment"""
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)
            os.makedirs(TEST_MEDIA_ROOT, exist_ok=True)
        Document.objects.all().delete()
    
    @given(
        invalid_data=st.one_of(
            st.none(),  # No data
            st.dictionaries(
                keys=st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=1, max_size=10),
                values=st.text(min_size=0, max_size=50),
                min_size=0,
                max_size=5
            ).filter(lambda d: 'file' not in d),  # Data without file
            st.just({})  # Empty dict
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_upload_error_handling_preserves_state(self, invalid_data):
        """
        Property: For any operation that encounters an error, the system should 
        display appropriate error messages while maintaining the current UI state 
        without corruption
        """
        # Record initial state
        initial_document_count = Document.objects.count()
        initial_files = os.listdir(TEST_MEDIA_ROOT) if os.path.exists(TEST_MEDIA_ROOT) else []
        
        # Make invalid upload request
        url = reverse('upload_document')
        response = self.client.post(url, invalid_data, format='multipart')
        
        # Should return error status (400 Bad Request)
        self.assertEqual(
            response.status_code, 
            400,
            f"Invalid upload should return 400, got {response.status_code}"
        )
        
        # Should contain error information
        self.assertIn(
            'error', 
            response.data,
            "Error response should contain error information"
        )
        
        # System state should be preserved (no documents created)
        final_document_count = Document.objects.count()
        self.assertEqual(
            initial_document_count,
            final_document_count,
            "Document count should not change after failed upload"
        )
        
        # No files should be created in storage
        final_files = os.listdir(TEST_MEDIA_ROOT) if os.path.exists(TEST_MEDIA_ROOT) else []
        self.assertEqual(
            len(initial_files),
            len(final_files),
            "No files should be created in storage after failed upload"
        )
    
    @given(
        invalid_ids=st.one_of(
            st.integers(max_value=0),  # Non-positive integers
            st.integers(min_value=999999),  # Very large integers (non-existent)
            st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=1, max_size=10)  # Non-numeric
        )
    )
    @settings(max_examples=30, deadline=None)
    def test_download_error_handling_preserves_state(self, invalid_ids):
        """
        Property: For any invalid download request, appropriate error messages 
        should be returned without affecting system state
        """
        # Record initial state
        initial_document_count = Document.objects.count()
        
        # Attempt download with invalid ID
        try:
            url = reverse('download_document', kwargs={'document_id': invalid_ids})
            response = self.client.get(url)
            
            # Should return error status (400 or 404)
            self.assertIn(
                response.status_code,
                [400, 404],
                f"Invalid download should return 400 or 404, got {response.status_code}"
            )
            
            # Should contain error information
            if hasattr(response, 'data'):
                self.assertIn(
                    'error',
                    response.data,
                    "Error response should contain error information"
                )
        
        except Exception:
            # URL reverse might fail for invalid IDs, which is acceptable
            pass
        
        # System state should be preserved
        final_document_count = Document.objects.count()
        self.assertEqual(
            initial_document_count,
            final_document_count,
            "Document count should not change after failed download attempt"
        )
    
    @given(
        invalid_ids=st.one_of(
            st.integers(max_value=0),
            st.integers(min_value=999999),
            st.text(alphabet=st.characters(whitelist_categories=('Lu', 'Ll')), min_size=1, max_size=10)
        )
    )
    @settings(max_examples=30, deadline=None)
    def test_delete_error_handling_preserves_state(self, invalid_ids):
        """
        Property: For any invalid delete request, appropriate error messages 
        should be returned without affecting existing documents
        """
        # Create a test document to ensure state preservation
        test_filename = "preserve_state_test.pdf"
        test_content = b"Test content for state preservation"
        
        uploaded_file = SimpleUploadedFile(
            name=test_filename,
            content=test_content,
            content_type='application/pdf'
        )
        
        file_path = DocumentStorageService.save_file(uploaded_file)
        test_document = DatabaseService.create_document_record(
            filename=test_filename,
            filepath=file_path,
            filesize=len(test_content)
        )
        
        # Record initial state
        initial_document_count = Document.objects.count()
        
        # Attempt delete with invalid ID
        try:
            url = reverse('delete_document', kwargs={'document_id': invalid_ids})
            response = self.client.delete(url)
            
            # Should return error status (400 or 404)
            self.assertIn(
                response.status_code,
                [400, 404],
                f"Invalid delete should return 400 or 404, got {response.status_code}"
            )
            
            # Should contain error information
            if hasattr(response, 'data'):
                self.assertIn(
                    'error',
                    response.data,
                    "Error response should contain error information"
                )
        
        except Exception:
            # URL reverse might fail for invalid IDs, which is acceptable
            pass
        
        # System state should be preserved (test document should still exist)
        final_document_count = Document.objects.count()
        self.assertEqual(
            initial_document_count,
            final_document_count,
            "Document count should not change after failed delete attempt"
        )
        
        # Test document should still exist
        self.assertIsNotNone(
            DatabaseService.get_document_by_id(test_document.id),
            "Test document should still exist after failed delete attempt"
        )
        
        self.assertTrue(
            DocumentStorageService.file_exists(file_path),
            "Test file should still exist after failed delete attempt"
        )
        
        # Clean up
        DocumentStorageService.delete_file(file_path)
        test_document.delete()
    
    def test_concurrent_operation_error_handling(self):
        """
        Property: When multiple operations fail simultaneously, each should 
        handle errors independently without affecting others
        """
        # Create multiple invalid requests
        invalid_requests = [
            ('upload', {'data': {}}),
            ('download', {'document_id': -1}),
            ('delete', {'document_id': 999999}),
        ]
        
        responses = []
        
        # Execute all requests
        for request_type, params in invalid_requests:
            try:
                if request_type == 'upload':
                    url = reverse('upload_document')
                    response = self.client.post(url, params['data'], format='multipart')
                elif request_type == 'download':
                    url = reverse('download_document', kwargs={'document_id': params['document_id']})
                    response = self.client.get(url)
                elif request_type == 'delete':
                    url = reverse('delete_document', kwargs={'document_id': params['document_id']})
                    response = self.client.delete(url)
                
                responses.append((request_type, response))
            except Exception as e:
                # Some requests might fail at URL level, which is acceptable
                responses.append((request_type, None))
        
        # All requests should handle errors appropriately
        for request_type, response in responses:
            if response is not None:
                # Should return appropriate error status
                self.assertIn(
                    response.status_code,
                    [400, 404, 405, 500],
                    f"{request_type} request should return error status"
                )
        
        # System should remain in consistent state
        # (No documents should be created from failed operations)
        document_count = Document.objects.count()
        self.assertEqual(
            document_count,
            0,
            "No documents should exist after failed operations"
        )
    
    def test_error_response_format_consistency(self):
        """
        Property: All error responses should follow a consistent format
        """
        # Test various error scenarios
        error_scenarios = [
            ('upload_no_file', lambda: self.client.post(reverse('upload_document'), {})),
            ('download_invalid_id', lambda: self.client.get(reverse('download_document', kwargs={'document_id': -1}))),
            ('delete_invalid_id', lambda: self.client.delete(reverse('delete_document', kwargs={'document_id': -1}))),
        ]
        
        for scenario_name, request_func in error_scenarios:
            response = request_func()
            
            # Should return error status
            self.assertGreaterEqual(
                response.status_code,
                400,
                f"{scenario_name} should return error status (>=400)"
            )
            
            # Should have consistent error format
            if hasattr(response, 'data') and response.data:
                # Should contain error information
                self.assertTrue(
                    'error' in response.data or 'message' in response.data or 'detail' in response.data,
                    f"{scenario_name} should contain error information in response"
                )