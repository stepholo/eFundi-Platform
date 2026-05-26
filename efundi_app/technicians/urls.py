"""URL configuration for the Technician app."""

from django.urls import path
from .views import TechnicianViewSet

urlpatterns = [
    path('', TechnicianViewSet.as_view({'get': 'list', 'post': 'create'}), name='technician-list'),
    path('<uuid:user_id>/', TechnicianViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='technician-detail'),
    path('<uuid:user_id>/verify/', TechnicianViewSet.as_view({'patch': 'verify_technician'}), name='technician-verify'),
    path('<uuid:user_id>/reject/', TechnicianViewSet.as_view({'patch': 'reject_technician'}), name='technician-reject'),
    path('<uuid:user_id>/availability/', TechnicianViewSet.as_view({'patch': 'set_availability'}), name='technician-availability'),
    path('<uuid:user_id>/verification-status/', TechnicianViewSet.as_view({'get': 'verification_status', 'patch': 'update_verification_status'}), name='technician-verification-status'),
]
