"""Defines the URL patterns for the accounts app."""

from django.urls import path
from .views import (
    UserViewSet, EmailVerificationView, PasswordResetRequestView,
    PasswordResetConfirmView, PhoneVerificationConfirmView,
    UserRegistrationView, UserLoginView, UserLogoutView, SwaggerLoginView,
)

urlpatterns = [
    path('swagger-login/', SwaggerLoginView.as_view(), name='swagger-login'),
    path('users/', UserViewSet.as_view({'get': 'list'}), name='user-list'),
    path('users/<uuid:user_id>/', UserViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='user-detail'),
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('logout/', UserLogoutView.as_view(), name='user-logout'),
    path('verify-email/', EmailVerificationView.as_view(), name='email-verify'),
    path('reset-password/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('confirm-reset-password/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('verify-phone/', PhoneVerificationConfirmView.as_view(), name='phone-verify'),
]
