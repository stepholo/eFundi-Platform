"""URL configuration for the notifications app."""

from django.urls import path

from .views import NotificationViewSet


urlpatterns = [
    path('', NotificationViewSet.as_view({'get': 'list', 'post': 'create'}), name='notification-list'),
    path('<int:pk>/', NotificationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='notification-detail'),
    path('<int:pk>/mark-read/', NotificationViewSet.as_view({'patch': 'mark_read'}), name='notification-mark-read'),
]
