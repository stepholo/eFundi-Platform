"""Serializers for reviews."""

from rest_framework import serializers

from bookings.models import Booking
from payments.models import Payment
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for customer reviews.

    On create, the customer only supplies: booking_id, rating, comment.
    customer_id and technician_id are derived automatically from the booking
    in the view's perform_create and are therefore read-only here.

    Validation rules enforced here:
      1. The booking must be in 'completed' status.
      2. The booking must have at least one Successful payment.
      3. The booking must not already have a review (OneToOne enforced by DB,
         but we surface a clear message rather than a DB error).
    """

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('id', 'customer_id', 'technician_id', 'created_at')

    def validate_booking_id(self, booking):
        # 1. Must be completed
        if booking.status != Booking.STATUS_COMPLETED:
            raise serializers.ValidationError(
                'You can only review a completed job.'
            )

        # 2. Must have a successful payment
        has_paid = booking.payments.filter(
            payment_status=Payment.STATUS_SUCCESSFUL
        ).exists()
        if not has_paid:
            raise serializers.ValidationError(
                'You can only review a job that has been paid for successfully.'
            )

        # 3. Not already reviewed (surface a clear message before the DB raises)
        if hasattr(booking, 'review'):
            raise serializers.ValidationError(
                'This booking has already been reviewed.'
            )

        return booking
