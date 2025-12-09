"""
Django management command to set up the database and ensure proper configuration
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Set up database and ensure proper configuration for medical document portal'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up Medical Document Portal database...'))
        
        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            self.stdout.write(self.style.SUCCESS('✓ Database connection successful'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Database connection failed: {e}'))
            return
        
        # Ensure uploads directory exists
        uploads_dir = settings.MEDIA_ROOT
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir, exist_ok=True)
            self.stdout.write(self.style.SUCCESS(f'✓ Created uploads directory: {uploads_dir}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✓ Uploads directory exists: {uploads_dir}'))
        
        # Check directory permissions
        if os.access(uploads_dir, os.W_OK):
            self.stdout.write(self.style.SUCCESS('✓ Uploads directory is writable'))
        else:
            self.stdout.write(self.style.ERROR('✗ Uploads directory is not writable'))
        
        # Display database info
        db_config = settings.DATABASES['default']
        self.stdout.write(self.style.SUCCESS(f'✓ Database: {db_config["ENGINE"]}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Database name: {db_config["NAME"]}'))
        
        self.stdout.write(self.style.SUCCESS('\nDatabase setup complete!'))