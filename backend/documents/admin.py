from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'filesize', 'created_at']
    list_filter = ['created_at']
    search_fields = ['filename']
    readonly_fields = ['created_at']