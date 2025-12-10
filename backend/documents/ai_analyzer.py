"""
AI Analysis service using Mistral API
"""
import os
import logging
import fitz  # PyMuPDF
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
        Extract text content from PDF file using PyMuPDF
        
        Args:
            file_path (str): Path to PDF file
            
        Returns:
            str: Extracted text content
        """
        try:
            text_content = ""
            
            # Open PDF document
            pdf_document = fitz.open(file_path)
            
            # Extract text from each page
            for page_num in range(len(pdf_document)):
                page = pdf_document.load_page(page_num)
                text_content += page.get_text()
            
            # Close the document
            pdf_document.close()
            
            return text_content.strip()
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    def analyze_medical_document(self, text_content, filename):
        """
        Send document text to Mistral for analysis
        
        This was the trickiest part - getting the prompt right took several tries.
        Mistral handles medical text pretty well, better than I expected.
        """
        try:
            # Create a comprehensive prompt for medical document analysis
            prompt = f"""
            You are a medical document analysis expert. Analyze this medical document and provide a comprehensive summary. Document filename: {filename}
            
            Document content:
            {text_content[:12000]}
            
            IMPORTANT: Format your response EXACTLY as shown below, using bullet points (-) for lists and double asterisks (**) for headings:
            
            **Document Type**
            [Identify the type: prescription, lab report, medical record, discharge summary, etc.]
            
            **Key Medical Information**
            - Patient demographics and basic information
            - Primary medical conditions or diagnoses identified
            - Medications mentioned with dosages (if applicable)
            - Test results, vital signs, or measurements
            - Treatment plans or medical procedures described
            
            **Important Dates and Timeline**
            - Document date and any significant medical dates
            - Appointment schedules or follow-up dates mentioned
            - Duration of treatments or medication schedules
            
            **Clinical Summary**
            - Main purpose of this medical document
            - Key findings or medical conclusions
            - Overall health status assessment from document
            
            **Medical Recommendations**
            - Treatment recommendations or medical advice given
            - Lifestyle modifications suggested
            - Follow-up care instructions
            - Referrals to specialists (if mentioned)
            
            **Risk Assessment**
            - Potential health risks or red flags identified
            - Contraindications or warnings mentioned
            - Areas requiring immediate medical attention
            
            **Additional Notes**
            - Any other relevant medical information
            - Document completeness and clarity assessment
            
            Note: If this is not a medical document, clearly state that and provide appropriate general document analysis.
            """
            
    # build the request for Mistral API
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                "temperature": 0.3,  # not too creative, we want consistent medical analysis
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