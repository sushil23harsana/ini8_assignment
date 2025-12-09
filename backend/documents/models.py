from django.db import models
import os


class Document(models.Model):
    """Model for storing document metadata"""
    
    filename = models.CharField(max_length=255, help_text="Original filename")
    filepath = models.CharField(max_length=500, help_text="Path to stored file")
    filesize = models.BigIntegerField(help_text="File size in bytes")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # AI Analysis fields
    analysis_result = models.TextField(blank=True, null=True, help_text="AI analysis result")
    analysis_status = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed')
        ],
        default='pending',
        help_text="Analysis status"
    )
    analyzed_at = models.DateTimeField(blank=True, null=True, help_text="When analysis was completed")
    
    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.filename} ({self.filesize} bytes)"
    
    def delete(self, *args, **kwargs):
        """Override delete to also remove the physical file"""
        if self.filepath and os.path.exists(self.filepath):
            try:
                os.remove(self.filepath)
            except OSError:
                pass  # File might already be deleted
        super().delete(*args, **kwargs)