from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_document, name='upload_document'),
    path('', views.list_documents, name='list_documents'),
    path('<int:document_id>/', views.download_document, name='download_document'),
    path('<int:document_id>/delete/', views.delete_document, name='delete_document'),
    path('<int:document_id>/analyze/', views.analyze_document, name='analyze_document'),
    path('<int:document_id>/analysis/', views.get_document_analysis, name='get_document_analysis'),
    path('health/', views.health_check, name='document_health_check'),
]