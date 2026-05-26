"""Review models for technician reputation."""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
    """Customer review for a technician."""

    customer_id = models.ForeignKey(
        'customers.Client',
        on_delete=models.CASCADE,
        related_name='reviews',
        db_column='customer_id',
    )
    technician_id = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='reviews',
        db_column='technician_id',
    )
    booking_id = models.OneToOneField(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='review',
        db_column='booking_id',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        """Return a readable review label."""
        return f"{self.customer_id} -> {self.technician_id}: {self.rating}"

    class Meta:
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']
        db_table = 'reviews'
        indexes = [
            models.Index(fields=['rating'], name='review_rating_idx'),
            models.Index(fields=['created_at'], name='review_created_at_idx'),
        ]
