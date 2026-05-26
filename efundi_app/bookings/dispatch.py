"""Booking dispatch engine: broadcast → first-accept-wins.

Flow:
  1. Customer creates booking → broadcast_booking() finds nearby technicians
  2. BookingBroadcast rows created; each technician notified
  3. First technician calls accept_booking() → SELECT FOR UPDATE locks the row
  4. Booking becomes 'assigned'; all other broadcasts expired; others notified
  5. If technician goes missing, release_expired_booking() resets to 'requested'
"""

import math
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.services import create_notification
from .models import Booking, BookingBroadcast


# Dispatch radius per service category (km)
DISPATCH_RADIUS_KM = {
    'Plumbing': 8,
    'Electrical': 10,
    'Carpentry': 10,
    'Cleaning': 5,
    'Other': 8,
}
DEFAULT_RADIUS_KM = 8

# Minutes before an assigned-but-inactive technician is released
ASSIGNMENT_EXPIRY_MINUTES = 5


def _haversine_km(lat1, lon1, lat2, lon2):
    """Approximate great-circle distance in km between two GPS coordinates."""
    R = 6371
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(float(lat1)))
        * math.cos(math.radians(float(lat2)))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def find_nearby_technicians(booking, radius_km=None):
    """
    Return verified, available technicians within radius whose specialization
    matches the booking's service category, sorted by distance (closest first).

    Excludes technicians who already declined or had an expired broadcast for
    this booking (so radius expansion re-broadcasts only to new candidates).
    """
    from technicians.models import Technician

    category = booking.service_category
    radius = radius_km or DISPATCH_RADIUS_KM.get(category, DEFAULT_RADIUS_KM)

    already_responded = BookingBroadcast.objects.filter(
        booking_id=booking,
        status__in=[BookingBroadcast.STATUS_DECLINED, BookingBroadcast.STATUS_EXPIRED],
    ).values_list('technician_id_id', flat=True)

    candidates = (
        Technician.objects
        .filter(
            verification_status='Verified',
            is_available=True,
            is_active=True,
            specialization__iexact=category,
        )
        .exclude(pk__in=already_responded)
        .select_related('live_location')
        .filter(live_location__isnull=False)
    )

    nearby = []
    for tech in candidates:
        dist = _haversine_km(
            booking.latitude, booking.longitude,
            tech.live_location.latitude, tech.live_location.longitude,
        )
        if dist <= radius:
            nearby.append((dist, tech))

    nearby.sort(key=lambda x: x[0])
    return [tech for _, tech in nearby]


def broadcast_booking(booking):
    """
    Transition booking to 'broadcasted', create BookingBroadcast rows for each
    nearby qualified technician, and notify them.

    Returns the list of notified Technician instances (empty if none found).
    """
    technicians = find_nearby_technicians(booking)
    if not technicians:
        return []

    with transaction.atomic():
        Booking.objects.filter(
            pk=booking.pk, status=Booking.STATUS_REQUESTED
        ).update(status=Booking.STATUS_BROADCASTED)

        BookingBroadcast.objects.bulk_create(
            [
                BookingBroadcast(booking_id=booking, technician_id=tech)
                for tech in technicians
            ],
            ignore_conflicts=True,
        )

    for tech in technicians:
        create_notification(
            tech.user_id,
            'New Job Request',
            f'A new {booking.service_category} booking is available near you.',
            Notification.EVENT_NEW_BOOKING,
        )

    return technicians


def accept_booking(booking_id, technician_pk, amount):
    """
    Atomically assign a technician to a broadcasted booking (first-accept-wins).

    amount: the technician's quoted price for the job (set at acceptance time).

    Uses PostgreSQL SELECT FOR UPDATE to prevent concurrent double-assignment:
    only the first technician to enter this block will find status=broadcasted;
    all subsequent callers get a DoesNotExist and return failure immediately.

    Returns (success: bool, message: str).
    """
    expired_broadcast_pks = []

    with transaction.atomic():
        # Lock the booking row — only one writer enters past this point
        try:
            booking = (
                Booking.objects
                .select_for_update()
                .get(pk=booking_id, status=Booking.STATUS_BROADCASTED)
            )
        except Booking.DoesNotExist:
            return False, 'Booking is no longer available.'

        # Verify this technician has an active (not yet responded) broadcast
        try:
            broadcast = (
                BookingBroadcast.objects
                .select_for_update()
                .get(
                    booking_id=booking,
                    technician_id_id=technician_pk,
                    status=BookingBroadcast.STATUS_SENT,
                )
            )
        except BookingBroadcast.DoesNotExist:
            return False, 'No active broadcast found for this technician.'

        now = timezone.now()

        # Mark this broadcast accepted
        broadcast.status = BookingBroadcast.STATUS_ACCEPTED
        broadcast.responded_at = now
        broadcast.save(update_fields=['status', 'responded_at'])

        # Lock the booking to this technician and record the quoted amount
        Booking.objects.filter(pk=booking_id).update(
            technician_id=technician_pk,
            status=Booking.STATUS_ASSIGNED,
            amount=amount,
            assigned_at=now,
            accepted_at=now,
            assignment_expires_at=now + timedelta(minutes=ASSIGNMENT_EXPIRY_MINUTES),
        )

        # Collect remaining open broadcasts to expire
        expired_broadcast_pks = list(
            BookingBroadcast.objects
            .filter(booking_id=booking, status=BookingBroadcast.STATUS_SENT)
            .exclude(pk=broadcast.pk)
            .values_list('pk', flat=True)
        )

        if expired_broadcast_pks:
            BookingBroadcast.objects.filter(pk__in=expired_broadcast_pks).update(
                status=BookingBroadcast.STATUS_EXPIRED,
                responded_at=now,
            )

    # ── Notifications run AFTER the transaction commits ──────────────────────
    # This releases the DB lock before doing extra writes.
    booking_data = (
        Booking.objects
        .select_related('customer_id__user_id')
        .get(pk=booking_id)
    )

    create_notification(
        booking_data.customer_id.user_id,
        'Technician Assigned',
        (
            f'A technician has accepted your {booking_data.service_category} booking. '
            f'Quoted amount: {booking_data.amount}.'
        ),
        Notification.EVENT_BOOKING_ACCEPTED,
    )

    if expired_broadcast_pks:
        displaced = (
            BookingBroadcast.objects
            .filter(pk__in=expired_broadcast_pks)
            .select_related('technician_id__user_id')
        )
        for bc in displaced:
            create_notification(
                bc.technician_id.user_id,
                'Job No Longer Available',
                f'A nearby {booking_data.service_category} booking was taken by another technician.',
                Notification.EVENT_BOOKING_BROADCASTED,
            )

    return True, 'Booking successfully assigned.'


def decline_booking(booking_id, technician_pk):
    """
    Mark a broadcast as declined by the technician.
    Returns True if a record was updated, False if no active broadcast found.
    """
    updated = BookingBroadcast.objects.filter(
        booking_id_id=booking_id,
        technician_id_id=technician_pk,
        status=BookingBroadcast.STATUS_SENT,
    ).update(
        status=BookingBroadcast.STATUS_DECLINED,
        responded_at=timezone.now(),
    )
    return updated > 0


def release_expired_booking(booking_id):
    """
    Release an assigned booking whose technician went inactive past
    assignment_expires_at.  Resets to 'requested' so a new broadcast cycle
    can be triggered.  Returns True if the booking was released.
    """
    with transaction.atomic():
        try:
            Booking.objects.select_for_update().get(
                pk=booking_id,
                status=Booking.STATUS_ASSIGNED,
                assignment_expires_at__lte=timezone.now(),
            )
        except Booking.DoesNotExist:
            return False

        Booking.objects.filter(pk=booking_id).update(
            technician_id=None,
            status=Booking.STATUS_REQUESTED,
            assigned_at=None,
            accepted_at=None,
            assignment_expires_at=None,
        )

    return True
