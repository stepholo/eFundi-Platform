"""URL configuration for the customers app."""

from django.urls import path

from .views import ClientViewSet


urlpatterns = [
    path('', ClientViewSet.as_view({'get': 'list', 'post': 'create'}), name='client-list'),
    path('<uuid:user_id>/', ClientViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='client-detail'),
]
