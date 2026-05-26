"""Commission API views — read-only, Admin only."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, viewsets

from utils.permissions import IsAdminOrSuperAdmin
from .models import Commission
from .serializers import CommissionSerializer


@extend_schema_view(
    list=extend_schema(tags=['Admin']),
    retrieve=extend_schema(tags=['Admin']),
)
class CommissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list of all platform commissions.
    One record per successful payment — Admin access only.
    """

    queryset = Commission.objects.select_related(
        'customer', 'technician', 'payment'
    ).order_by('-paid_at')
    serializer_class = CommissionSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    search_fields = (
        'work_done', 'payment_method',
        'customer__first_name', 'customer__last_name',
        'technician__first_name', 'technician__last_name',
    )
    ordering_fields = ('paid_at', 'full_amount', 'commission_amount')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
