"""Notification models for marketplace events."""

from django.db import models


class Notification(models.Model):
    """In-app notification for a user."""

    EVENT_NEW_BOOKING = 'New Booking'
    EVENT_BOOKING_BROADCASTED = 'Booking Broadcasted'
    EVENT_BOOKING_ACCEPTED = 'Booking Accepted'
    EVENT_BOOKING_DECLINED = 'Booking Declined'
    EVENT_BOOKING_REJECTED = 'Booking Rejected'
    EVENT_BOOKING_COMPLETED = 'Booking Completed'
    EVENT_BOOKING_CANCELLED = 'Booking Cancelled'
    EVENT_PAYMENT_SUCCESSFUL = 'Payment Successful'
    EVENT_WITHDRAWAL_REQUESTED = 'Withdrawal Requested'
    EVENT_WITHDRAWAL_APPROVED = 'Withdrawal Approved'
    EVENT_WITHDRAWAL_REJECTED = 'Withdrawal Rejected'
    EVENT_SYSTEM = 'System'

    EVENT_CHOICES = (
        (EVENT_NEW_BOOKING, EVENT_NEW_BOOKING),
        (EVENT_BOOKING_BROADCASTED, EVENT_BOOKING_BROADCASTED),
        (EVENT_BOOKING_ACCEPTED, EVENT_BOOKING_ACCEPTED),
        (EVENT_BOOKING_DECLINED, EVENT_BOOKING_DECLINED),
        (EVENT_BOOKING_REJECTED, EVENT_BOOKING_REJECTED),
        (EVENT_BOOKING_COMPLETED, EVENT_BOOKING_COMPLETED),
        (EVENT_BOOKING_CANCELLED, EVENT_BOOKING_CANCELLED),
        (EVENT_PAYMENT_SUCCESSFUL, EVENT_PAYMENT_SUCCESSFUL),
        (EVENT_WITHDRAWAL_REQUESTED, EVENT_WITHDRAWAL_REQUESTED),
        (EVENT_WITHDRAWAL_APPROVED, EVENT_WITHDRAWAL_APPROVED),
        (EVENT_WITHDRAWAL_REJECTED, EVENT_WITHDRAWAL_REJECTED),
        (EVENT_SYSTEM, EVENT_SYSTEM),
    )

    user_id = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        db_column='user_id',
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_CHOICES,
        default=EVENT_SYSTEM,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Return a readable notification label."""
        return f"{self.user_id} - {self.title}"

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['event_type'], name='notification_event_idx'),
            models.Index(fields=['is_read'], name='notification_is_read_idx'),
            models.Index(fields=['created_at'], name='notification_created_at_idx'),
        ]
