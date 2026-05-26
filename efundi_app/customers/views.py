"""Client API views."""

from rest_framework import filters, status, viewsets
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from utils.permissions import IsAdminOrSuperAdmin, IsCustomer, IsOwnerOrAdmin
from .models import Client
from .serializers import ClientSerializer


@extend_schema_view(
    list=extend_schema(tags=['Customer', 'Admin']),
    retrieve=extend_schema(tags=['Customer', 'Admin']),
    update=extend_schema(tags=['Customer', 'Admin']),
    partial_update=extend_schema(tags=['Customer', 'Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and managing client profiles."""

    serializer_class = ClientSerializer
    lookup_field = 'user_id'
    search_fields = ('first_name', 'last_name', 'email', 'phone_number')
    ordering_fields = ('created_at', 'updated_at')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Customers see only their own profile; admins see all."""
        user = self.request.user
        qs = Client.objects.all()
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Customer':
            return qs.filter(user_id=user)
        return qs.none()

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOrSuperAdmin()]
        if self.action in ('update', 'partial_update'):
            return [IsOwnerOrAdmin()]
        return [(IsCustomer | IsAdminOrSuperAdmin)()]

    def create(self, request, *args, **kwargs):
        """Client profiles are created automatically via user role signals."""
        return Response(
            {
                'detail': (
                    'Create a user through the accounts endpoint, '
                    'then set their role to Customer.'
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
