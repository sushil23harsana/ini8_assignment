"""
AI Analysis service using Mistral API
"""
import os
import logging
import PyPDF2
import requests
import json
from django.conf import settings
from django.utils import timezone
from decouple import config

logger = logging.getLogger(__name__)


class DocumentAnalyzer:
    """Service for AI-powered document analysis"""
    
    def __init__(self):
        # Configure Mistral API
        self.api_key = config('MISTRAL_API_KEY', default='')
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY not found in environment variables")
        
        self.api_url = "https://api.mistral.ai/v1/chat/completions"
        self.model = "mistral-large-latest"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    def extract_text_from_pdf(self, file_path):
        """
        Extract text content from PDF file
        
        Args:
            file_path (str): Path to PDF file
            
        Returns:
            str: Extracted text content
        """
        try:
            text_content = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text_content += page.extract_text()
            
            return text_content.strip()
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    def analyze_medical_document(self, text_content, filename):
        """
        Analyze medical document using Mistral AI
        
        Args:
            text_content (str): Extracted text from document
            filename (str): Original filename for context
            
        Returns:
            str: Analysis result from Mistral
        """
        try:
            # Create a comprehensive prompt for medical document analysis
            prompt = f"""
            Please analyze this medical document and provide a comprehensive summary. The document filename is: {filename}
            
            Document content:
            {text_content[:12000]}  # Mistral can handle longer context
            
            Please provide analysis in the following structured format:
            
            **Document Type**: [Identify if this is a prescription, lab report, medical record, etc.]
            
            **Key Medical Information**:
            - Patient information (if mentioned)
            - Medical conditions or diagnoses
            - Medications prescribed
            - Test results or measurements
            - Treatment recommendations
            
            **Important Dates**: [Any relevant dates mentioned]
            
            **Summary**: [2-3 sentence summary of the document's purpose and key findings]
            
            **Recommendations**: [Any follow-up actions or recommendations mentioned]
            
            **Risk Factors**: [Any potential health risks or concerns identified]
            
            Note: If this doesn't appear to be a medical document, please indicate that and provide a general document analysis instead.
            """
            
            # Prepare the API request payload
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }
            
            # Make the API request
            response = requests.post(
                self.api_url,
                headers=self.headers,
                data=json.dumps(payload),
                timeout=60
            )
            
            if response.status_code != 200:
                raise Exception(f"Mistral API error: {response.status_code} - {response.text}")
            
            response_data = response.json()
            analysis_result = response_data['choices'][0]['message']['content']
            
            return analysis_result
        
        except Exception as e:
            logger.error(f"Error analyzing document with Mistral: {e}")
            raise Exception(f"AI analysis failed: {str(e)}")
    
    def analyze_document(self, document):
        """
        Complete document analysis workflow
        
        Args:
            document: Document model instance
            
        Returns:
            str: Analysis result
        """
        try:
            # Update status to processing
            document.analysis_status = 'processing'
            document.save()
            
            # Extract text from PDF
            text_content = self.extract_text_from_pdf(document.filepath)
            
            if not text_content:
                raise Exception("No text content could be extracted from the PDF")
            
            # Analyze with AI
            analysis_result = self.analyze_medical_document(text_content, document.filename)
            
            # Update document with results
            document.analysis_result = analysis_result
            document.analysis_status = 'completed'
            document.analyzed_at = timezone.now()
            document.save()
            
            logger.info(f"Successfully analyzed document {document.id}")
            return analysis_result
        
        except Exception as e:
            # Update status to failed
            document.analysis_status = 'failed'
            document.analysis_result = f"Analysis failed: {str(e)}"
            document.save()
            
            logger.error(f"Document analysis failed for {document.id}: {e}")
            raise e


# Utility functions
def get_analyzer():
    """Get configured document analyzer instance"""
    try:
        return DocumentAnalyzer()
    except ValueError as e:
        logger.error(f"Failed to initialize DocumentAnalyzer: {e}")
        return None