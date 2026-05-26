"""Review API views."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny

from utils.permissions import IsAdminOrSuperAdmin, IsCustomer, IsOwnerOrAdmin
from .models import Review
from .serializers import ReviewSerializer


@extend_schema_view(
    list=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    retrieve=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    create=extend_schema(
        tags=['Customer'],
        summary='Submit a review',
        description=(
            'Customer submits a review for a completed, paid booking. '
            'Only supply booking_id, rating (1–5), and comment. '
            'customer_id and technician_id are resolved automatically.'
        ),
    ),
    update=extend_schema(tags=['Customer', 'Admin']),
    partial_update=extend_schema(tags=['Customer', 'Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for service reviews."""

    queryset = Review.objects.select_related('customer_id', 'technician_id', 'booking_id')
    serializer_class = ReviewSerializer
    search_fields = (
        'comment',
        'customer_id__first_name', 'customer_id__last_name',
        'technician_id__first_name', 'technician_id__last_name',
    )
    ordering_fields = ('created_at', 'rating')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'create':
            return [(IsCustomer | IsAdminOrSuperAdmin)()]
        if self.action in ('update', 'partial_update'):
            return [IsOwnerOrAdmin()]
        if self.action == 'destroy':
            return [IsAdminOrSuperAdmin()]
        return [(IsCustomer | IsAdminOrSuperAdmin)()]

    def perform_create(self, serializer):
        """
        Auto-set customer_id and technician_id from the booking.
        Also verifies the authenticated customer actually owns the booking.
        """
        try:
            client = self.request.user.client_profile
        except Exception:
            raise ValidationError({'detail': 'Customer profile not found.'})

        booking = serializer.validated_data['booking_id']

        if booking.customer_id != client:
            raise PermissionDenied('You can only review your own bookings.')

        if booking.technician_id is None:
            raise ValidationError(
                {'detail': 'This booking has no assigned technician.'}
            )

        serializer.save(
            customer_id=client,
            technician_id=booking.technician_id,
        )
