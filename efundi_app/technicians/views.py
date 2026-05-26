"""Technician API views."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from utils.emails import send_notification_email
from utils.permissions import IsAdminOrSuperAdmin, IsTechnician, IsOwnerOrAdmin
from .models import Technician
from .serializers import TechnicianSerializer


@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
    update=extend_schema(tags=['Technician', 'Admin']),
    partial_update=extend_schema(tags=['Technician', 'Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class TechnicianViewSet(viewsets.ModelViewSet):
    """ViewSet for managing technician profiles."""

    serializer_class = TechnicianSerializer
    lookup_field = 'user_id'
    search_fields = ('first_name', 'last_name', 'email', 'phone_number', 'specialization')
    ordering_fields = ('created_at', 'updated_at')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Technicians see only their own profile; admins see all."""
        user = self.request.user
        qs = Technician.objects.all()
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Technician':
            return qs.filter(user_id=user)
        return qs.none()

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOrSuperAdmin()]
        if self.action in ('update', 'partial_update'):
            return [IsOwnerOrAdmin()]
        if self.action in ('verify_technician', 'reject_technician',
                           'update_verification_status'):
            return [IsAdminOrSuperAdmin()]
        if self.action == 'set_availability':
            return [(IsTechnician | IsAdminOrSuperAdmin)()]
        return [(IsTechnician | IsAdminOrSuperAdmin)()]

    def create(self, request, *args, **kwargs):
        """Technician profiles are created automatically via user role signals."""
        return Response(
            {
                'detail': (
                    'Create a user through the accounts endpoint, '
                    'then set their role to Technician.'
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _send_status_email(self, technician, template_name, subject):
        context = {
            'first_name': technician.first_name,
            'last_name': technician.last_name,
            'email': technician.email,
            'verification_status': technician.verification_status,
        }
        send_notification_email(
            subject=subject,
            template_name=template_name,
            context=context,
            to_email=technician.email,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='verify')
    def verify_technician(self, request, user_id=None):
        """Mark a technician as verified (Admin only)."""
        technician = self.get_object()
        technician.verification_status = 'Verified'
        technician.is_active = True
        technician.save(update_fields=['verification_status', 'is_active', 'updated_at'])

        user = technician.user_id
        user.is_active = True
        user.is_verified = True
        user.save(update_fields=['is_active', 'is_verified', 'updated_at'])

        self._send_status_email(
            technician,
            'emails/account_verified.html',
            'Your eFundi technician account has been verified',
        )
        return Response(
            {
                'message': 'Technician verified successfully.',
                'verification_status': technician.verification_status,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='reject')
    def reject_technician(self, request, user_id=None):
        """Mark a technician as rejected (Admin only)."""
        technician = self.get_object()
        technician.verification_status = 'Rejected'
        technician.is_active = False
        technician.save(update_fields=['verification_status', 'is_active', 'updated_at'])

        user = technician.user_id
        user.is_active = False
        user.is_verified = False
        user.save(update_fields=['is_active', 'is_verified', 'updated_at'])

        self._send_status_email(
            technician,
            'emails/account_rejected.html',
            'Update on your eFundi technician application',
        )
        return Response(
            {
                'message': 'Technician rejected successfully.',
                'verification_status': technician.verification_status,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'], url_path='availability')
    def set_availability(self, request, user_id=None):
        """Toggle a technician's availability (own profile or Admin)."""
        technician = self.get_object()
        if 'is_available' not in request.data:
            return Response(
                {'is_available': 'This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(
            technician,
            data={'is_available': request.data.get('is_available')},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                'message': 'Availability updated successfully.',
                'is_available': serializer.instance.is_available,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Technician', 'Admin'])
    @action(detail=True, methods=['get'], url_path='verification-status-read')
    def verification_status(self, request, user_id=None):
        """Return the technician's current verification status."""
        technician = self.get_object()
        return Response(
            {'verification_status': technician.verification_status},
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='verification-status')
    def update_verification_status(self, request, user_id=None):
        """Update a technician's verification status (Admin only)."""
        technician = self.get_object()
        verification_status = request.data.get('verification_status')
        allowed = [choice[0] for choice in Technician.STATUS]

        if verification_status not in allowed:
            return Response(
                {'verification_status': f'Must be one of: {", ".join(allowed)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification_status == 'Verified':
            return self.verify_technician(request, user_id=user_id)
        if verification_status == 'Rejected':
            return self.reject_technician(request, user_id=user_id)

        technician.verification_status = 'Pending'
        technician.save(update_fields=['verification_status', 'updated_at'])
        technician.user_id.is_verified = False
        technician.user_id.save(update_fields=['is_verified', 'updated_at'])

        return Response(
            {
                'message': 'Verification status reset to Pending.',
                'verification_status': technician.verification_status,
            },
            status=status.HTTP_200_OK,
        )
