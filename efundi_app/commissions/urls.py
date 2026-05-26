"""URL configuration for the commissions app."""

from django.urls import path

from .views import CommissionViewSet

urlpatterns = [
    path('', CommissionViewSet.as_view({'get': 'list'}), name='commission-list'),
    path('<uuid:pk>/', CommissionViewSet.as_view({'get': 'retrieve'}), name='commission-detail'),
]
