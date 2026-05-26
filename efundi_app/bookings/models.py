"""Booking, dispatch tracking, and live location models."""

from uuid import uuid4

from django.db import models


class Booking(models.Model):
    """A service request created by a customer, booked and priced by a technician."""

    # Service categories — replaces the former services.Service FK
    CATEGORY_PLUMBING = 'Plumbing'
    CATEGORY_ELECTRICAL = 'Electrical'
    CATEGORY_CARPENTRY = 'Carpentry'
    CATEGORY_CLEANING = 'Cleaning'
    CATEGORY_OTHER = 'Other'

    CATEGORY_CHOICES = (
        (CATEGORY_PLUMBING, 'Plumbing'),
        (CATEGORY_ELECTRICAL, 'Electrical'),
        (CATEGORY_CARPENTRY, 'Carpentry'),
        (CATEGORY_CLEANING, 'Cleaning'),
        (CATEGORY_OTHER, 'Other'),
    )

    STATUS_REQUESTED = 'requested'
    STATUS_BROADCASTED = 'broadcasted'
    STATUS_ASSIGNED = 'assigned'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = (
        (STATUS_REQUESTED, 'Pending'),        # customer submitted — awaiting dispatch
        (STATUS_BROADCASTED, 'Broadcasted'),  # sent to nearby technicians
        (STATUS_ASSIGNED, 'Assigned'),        # technician has booked the job
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    booking_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

    customer_id = models.ForeignKey(
        'customers.Client',
        on_delete=models.CASCADE,
        related_name='bookings',
        db_column='customer_id',
    )
    technician_id = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.SET_NULL,
        related_name='assigned_bookings',
        db_column='technician_id',
        null=True,
        blank=True,
    )
    service_category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_REQUESTED,
    )
    completion_duration = models.DurationField(blank=True, null=True)
    # amount is null on creation — set by the technician when they accept the job
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True, default=None,
    )
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    scheduled_time = models.DateTimeField()
    assigned_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    assignment_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Return a readable booking label."""
        return f"{self.customer_id} — {self.service_category} ({self.status})"

    class Meta:
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-created_at']
        db_table = 'efundi_bookings'
        indexes = [
            models.Index(fields=['status'], name='booking_status_idx'),
            models.Index(fields=['service_category'], name='booking_category_idx'),
            models.Index(fields=['scheduled_time'], name='booking_scheduled_time_idx'),
            models.Index(fields=['created_at'], name='booking_created_at_idx'),
            models.Index(fields=['assignment_expires_at'], name='booking_expires_at_idx'),
        ]


class BookingBroadcast(models.Model):
    """Tracks each technician's response to a broadcasted booking request."""

    STATUS_SENT = 'sent'
    STATUS_VIEWED = 'viewed'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = (
        (STATUS_SENT, 'Sent'),
        (STATUS_VIEWED, 'Viewed'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
        (STATUS_EXPIRED, 'Expired'),
    )

    booking_id = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='broadcasts',
        db_column='booking_id',
    )
    technician_id = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='received_broadcasts',
        db_column='technician_id',
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_SENT,
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        """Return a readable broadcast label."""
        return f"Broadcast {self.booking_id_id} → {self.technician_id} ({self.status})"

    class Meta:
        verbose_name = 'Booking Broadcast'
        verbose_name_plural = 'Booking Broadcasts'
        ordering = ['-sent_at']
        db_table = 'efundi_booking_broadcasts'
        unique_together = [['booking_id', 'technician_id']]
        indexes = [
            models.Index(fields=['status'], name='broadcast_status_idx'),
            models.Index(
                fields=['booking_id', 'status'],
                name='broadcast_booking_status_idx',
            ),
        ]


class TechnicianLocation(models.Model):
    """Latest live location for a technician."""

    ONLINE_THRESHOLD_SECONDS = 300  # 5 minutes

    technician_id = models.OneToOneField(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='live_location',
        db_column='technician_id',
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_online(self) -> bool:
        from django.utils import timezone
        from datetime import timedelta
        return (timezone.now() - self.updated_at).total_seconds() < self.ONLINE_THRESHOLD_SECONDS

    def __str__(self):
        """Return a readable location label."""
        return f"{self.technician_id} @ {self.latitude}, {self.longitude}"

    class Meta:
        verbose_name = 'Technician Location'
        verbose_name_plural = 'Technician Locations'
        ordering = ['-updated_at']
        db_table = 'efundi_technician_locations'
