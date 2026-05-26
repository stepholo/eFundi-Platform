"""Booking and location API views."""

from decimal import Decimal, InvalidOperation
from math import radians

from django.core.cache import cache
from django.db.models import F, FloatField, Value
from django.db.models.functions import ACos, Cos, Radians, Sin
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.models import Notification
from notifications.services import create_notification
from utils.permissions import (
    IsAdminOrSuperAdmin,
    IsAuthenticated,
    IsCustomer,
    IsTechnician,
    IsVerifiedTechnician,
)
from .dispatch import accept_booking, broadcast_booking, decline_booking
from .models import Booking, BookingBroadcast, TechnicianLocation
from .serializers import (
    BookingBroadcastSerializer,
    BookingSerializer,
    TechnicianLocationSerializer,
    TechnicianLocationUpdateSerializer,
)


@extend_schema_view(
    list=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    retrieve=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    create=extend_schema(
        tags=['Customer'],
        summary='Post a service request',
        description=(
            'Customer posts a job request for a service. '
            'The system will broadcast it to nearby qualified technicians who can then book it.'
        ),
    ),
    update=extend_schema(tags=['Admin']),
    partial_update=extend_schema(tags=['Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class BookingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing bookings."""

    serializer_class = BookingSerializer
    search_fields = (
        'status',
        'customer_id__first_name', 'customer_id__last_name',
        'technician_id__first_name', 'technician_id__last_name',
        'service_category__name',
    )
    ordering_fields = ('created_at', 'scheduled_time', 'amount', 'status')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """
        Filter bookings by role:
          Admin/Super Admin → all bookings
          Customer          → their own bookings (customer_id)
          Technician        → bookings assigned to them  OR
                              broadcasted bookings they were notified about
                              (so they can call /accept/ on available jobs)
        """
        from django.db.models import Q
        user = self.request.user
        qs = Booking.objects.select_related('customer_id', 'technician_id')
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Customer':
            return qs.filter(customer_id__user_id=user)
        if user.role == 'Technician':
            try:
                tech = user.technician_profile
            except Exception:
                return qs.none()
            return qs.filter(
                Q(technician_id__user_id=user) |            # already assigned
                Q(                                           # broadcasted to them
                    status=Booking.STATUS_BROADCASTED,
                    broadcasts__technician_id=tech,
                    broadcasts__status=BookingBroadcast.STATUS_SENT,
                )
            ).distinct()
        return qs.none()

    def get_permissions(self):
        """
        Role-specific permissions per action.

        Customer  → post service requests (create), view/cancel their own
        Technician → accept/decline/start/complete bookings (book jobs)
        Admin     → full management access
        """
        if self.action == 'create':
            # Only customers can post a service request
            return [IsCustomer()]
        if self.action in ('accept', 'decline'):
            return [IsVerifiedTechnician()]
        if self.action in ('start', 'complete'):
            return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]
        if self.action in ('reject', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        if self.action == 'cancel':
            return [(IsCustomer | IsTechnician | IsAdminOrSuperAdmin)()]
        # list, retrieve, broadcasts — customer or technician sees their own
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Create booking for the authenticated customer then broadcast it."""
        from customers.models import Client
        from rest_framework.exceptions import ValidationError

        user = self.request.user

        # Lazily create the client profile if the signal missed it
        client, _ = Client.objects.get_or_create(
            user_id=user,
            defaults={
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone_number': user.phone_number,
                'role': user.role,
            },
        )

        if user.role != 'Customer':
            raise ValidationError(
                {'detail': 'Only users with the Customer role can create bookings.'}
            )

        booking = serializer.save(
            customer_id=client,
            status=Booking.STATUS_REQUESTED,
        )
        broadcast_booking(booking)

    def _set_status(self, booking, new_status, user, event_type, title, message):
        booking.status = new_status
        booking.save(update_fields=['status'])
        create_notification(user, title, message, event_type)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Technician'],
        summary='Book a service request',
        description=(
            'Technician books (accepts) a broadcasted service request. '
            'First-accept-wins: uses SELECT FOR UPDATE to prevent double-booking.'
        ),
    )
    @action(detail=True, methods=['patch'])
    def accept(self, request, pk=None):
        """Technician books an available service request (first-accept-wins)."""
        booking = self.get_object()
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'Only technicians can accept bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not technician.is_active:
            return Response(
                {
                    'detail': (
                        'Your account is not active. '
                        'Only verified technicians can book service requests.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not technician.is_available:
            return Response(
                {
                    'detail': (
                        'You are not marked as available. '
                        'Set your availability to On before booking a service.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Technician must provide their quoted amount for the job
        raw_amount = request.data.get('amount')
        if raw_amount is None:
            return Response(
                {'detail': 'You must provide a quoted amount to book this service.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            amount = Decimal(str(raw_amount))
            if amount <= 0:
                raise ValueError
        except (InvalidOperation, ValueError):
            return Response(
                {'detail': 'Amount must be a valid positive number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        success, message = accept_booking(booking.pk, technician.pk, amount)
        if not success:
            return Response({'detail': message}, status=status.HTTP_409_CONFLICT)

        booking.refresh_from_db()
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'])
    def decline(self, request, pk=None):
        """Technician explicitly declines a broadcasted booking."""
        booking = self.get_object()
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'Only technicians can decline bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not decline_booking(booking.pk, technician.pk):
            return Response(
                {'detail': 'No active broadcast found for this booking.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        create_notification(
            technician.user_id,
            'Booking Declined',
            f'You declined the {booking.service_category} booking.',
            Notification.EVENT_BOOKING_DECLINED,
        )
        return Response({'detail': 'Booking declined.'}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Reject a requested or broadcasted booking (admin action)."""
        booking = self.get_object()
        if booking.status not in (
            Booking.STATUS_REQUESTED, Booking.STATUS_BROADCASTED
        ):
            return Response(
                {'detail': 'Only requested or broadcasted bookings can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._set_status(
            booking, Booking.STATUS_CANCELLED,
            booking.customer_id.user_id,
            Notification.EVENT_BOOKING_REJECTED,
            'Booking rejected',
            f'Your booking for {booking.service_category} was rejected.',
        )

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'], url_path='start')
    def start(self, request, pk=None):
        """Mark an assigned booking as in progress and record the start time."""
        booking = self.get_object()
        if booking.status != Booking.STATUS_ASSIGNED:
            return Response(
                {'detail': 'Only assigned bookings can be started.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        booking.status = Booking.STATUS_IN_PROGRESS
        booking.started_at = now
        booking.save(update_fields=['status', 'started_at'])
        create_notification(
            booking.customer_id.user_id,
            'Booking started',
            f'Your {booking.service_category} booking is now in progress.',
            Notification.EVENT_SYSTEM,
        )
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        """
        Mark an in-progress booking as completed and compute the work duration
        as the elapsed time from started_at to now.
        """
        booking = self.get_object()
        if booking.status != Booking.STATUS_IN_PROGRESS:
            return Response(
                {'detail': 'Only in-progress bookings can be completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        booking.status = Booking.STATUS_COMPLETED
        if booking.started_at:
            booking.completion_duration = now - booking.started_at
        booking.save(update_fields=['status', 'completion_duration'])
        create_notification(
            booking.customer_id.user_id,
            'Booking completed',
            f'Your {booking.service_category} booking has been completed.',
            Notification.EVENT_BOOKING_COMPLETED,
        )
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Customer', 'Technician'])
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel a booking that has not yet been completed."""
        booking = self.get_object()
        if booking.status == Booking.STATUS_COMPLETED:
            return Response(
                {'detail': 'Completed bookings cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.status in (Booking.STATUS_REQUESTED, Booking.STATUS_BROADCASTED):
            BookingBroadcast.objects.filter(
                booking_id=booking,
                status=BookingBroadcast.STATUS_SENT,
            ).update(
                status=BookingBroadcast.STATUS_EXPIRED,
                responded_at=timezone.now(),
            )

        notify_user = (
            booking.technician_id.user_id
            if booking.technician_id
            else booking.customer_id.user_id
        )
        return self._set_status(
            booking, Booking.STATUS_CANCELLED,
            notify_user,
            Notification.EVENT_BOOKING_CANCELLED,
            'Booking cancelled',
            f'A booking for {booking.service_category} was cancelled.',
        )

    @extend_schema(tags=['Customer', 'Technician', 'Admin'])
    @action(detail=True, methods=['get'], url_path='broadcasts')
    def broadcasts(self, request, pk=None):
        """List all broadcast records for a booking."""
        booking = self.get_object()
        qs = (
            BookingBroadcast.objects
            .filter(booking_id=booking)
            .select_related('technician_id')
        )
        return Response(
            BookingBroadcastSerializer(qs, many=True).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
    update=extend_schema(tags=['Technician']),
    partial_update=extend_schema(tags=['Technician']),
    destroy=extend_schema(tags=['Admin']),
)
class TechnicianLocationViewSet(viewsets.ModelViewSet):
    """ViewSet for technician live locations and nearby search."""

    queryset = TechnicianLocation.objects.select_related('technician_id')
    serializer_class = TechnicianLocationSerializer
    lookup_field = 'technician_id'
    ordering_fields = ('updated_at',)
    filter_backends = (filters.OrderingFilter,)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'update_my_location'):
            return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]
        if self.action == 'destroy':
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    @extend_schema(
        tags=['Technician'],
        summary='Push current GPS location (upsert)',
        description=(
            'Call this endpoint periodically (e.g. every 15–30 s) from the technician '
            'app after reading the device GPS. '
            'The technician is resolved from the Bearer token — only latitude and '
            'longitude are needed in the body. '
            'Creates a location record on first call; updates it on subsequent calls. '
            'A technician is considered **online** if their location was updated within '
            'the last 5 minutes.'
        ),
        request=TechnicianLocationUpdateSerializer,
        responses={
            200: TechnicianLocationSerializer,
            201: TechnicianLocationSerializer,
        },
    )
    def create(self, request, *args, **kwargs):
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'Only technicians can set a live location.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        write = TechnicianLocationUpdateSerializer(data=request.data)
        if not write.is_valid():
            return Response(write.errors, status=status.HTTP_400_BAD_REQUEST)

        location, created = TechnicianLocation.objects.update_or_create(
            technician_id=technician,
            defaults=write.validated_data,
        )
        return Response(
            TechnicianLocationSerializer(location).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(
        tags=['Technician'],
        summary='Get my current location',
        responses={200: TechnicianLocationSerializer},
    )
    @action(detail=False, methods=['get'], url_path='me')
    def update_my_location(self, request):
        """Return the authenticated technician's own location record."""
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'No technician profile found.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            location = TechnicianLocation.objects.get(technician_id=technician)
        except TechnicianLocation.DoesNotExist:
            return Response(
                {'detail': 'No location recorded yet. Push a GPS update first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TechnicianLocationSerializer(location).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Customer', 'Technician', 'Admin'])
    @action(detail=False, methods=['get'], url_path='nearby')
    def nearby(self, request):
        """Find technicians within a radius in kilometers."""
        try:
            latitude = float(request.query_params['latitude'])
            longitude = float(request.query_params['longitude'])
            radius_km = float(request.query_params.get('radius_km', 5))
        except (KeyError, TypeError, ValueError):
            return Response(
                {
                    'detail': (
                        'Provide numeric latitude and longitude query params. '
                        'radius_km is optional and defaults to 5.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = (
            f"nearby-technicians:{round(latitude, 5)}:"
            f"{round(longitude, 5)}:{round(radius_km, 2)}"
        )
        try:
            cached_data = cache.get(cache_key)
        except Exception:
            cached_data = None
        if cached_data is not None:
            return Response(cached_data, status=status.HTTP_200_OK)

        earth_radius_km = 6371.0
        queryset = (
            self.get_queryset()
            .annotate(
                distance_km=Value(earth_radius_km, output_field=FloatField())
                * ACos(
                    Cos(Value(radians(latitude), output_field=FloatField()))
                    * Cos(Radians(F('latitude')))
                    * Cos(
                        Radians(F('longitude'))
                        - Value(radians(longitude), output_field=FloatField())
                    )
                    + Sin(Value(radians(latitude), output_field=FloatField()))
                    * Sin(Radians(F('latitude')))
                )
            )
            .filter(distance_km__lte=radius_km)
            .order_by('distance_km')
        )
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        for item, location in zip(data, queryset):
            item['distance_km'] = round(location.distance_km, 3)

        try:
            cache.set(cache_key, data, timeout=60)
        except Exception:
            pass

        return Response(data, status=status.HTTP_200_OK)
