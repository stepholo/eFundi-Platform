"""Notification API views."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from utils.permissions import IsAdminOrSuperAdmin, IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


@extend_schema_view(
    list=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    retrieve=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    destroy=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    update=extend_schema(tags=['Admin']),
    partial_update=extend_schema(tags=['Admin']),
    create=extend_schema(tags=['Admin']),
)
class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notifications.
    Each user sees only their own; Admins see all.
    """

    serializer_class = NotificationSerializer
    search_fields = ('title', 'message', 'event_type', 'user_id__email')
    ordering_fields = ('created_at', 'event_type', 'is_read')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Users see only their own notifications; admins see all."""
        user = self.request.user
        qs = Notification.objects.select_related('user_id')
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        return qs.filter(user_id=user)

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'create'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    @extend_schema(tags=['Customer', 'Technician', 'Admin'])
    @action(detail=True, methods=['patch'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(
            self.get_serializer(notification).data,
            status=status.HTTP_200_OK,
        )
