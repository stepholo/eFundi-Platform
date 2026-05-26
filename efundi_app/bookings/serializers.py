"""Serializers for bookings, broadcasts, and technician locations."""

from rest_framework import serializers

from .models import Booking, BookingBroadcast, TechnicianLocation


class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for bookings.

    Customer creates with: service_category, location, latitude, longitude, scheduled_time.
    amount is NOT set by the customer — it is the technician's quoted price, provided
    when the technician calls the accept/ action.

    booking_id, customer_id, technician_id, status, amount, assigned_at,
    accepted_at, and created_at are all read-only or system-managed.

    customer_id and technician_id are returned as User UUIDs.
    """

    customer_id = serializers.SerializerMethodField()
    technician_id = serializers.SerializerMethodField()
    technician_name = serializers.SerializerMethodField()
    completion_duration = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'booking_id', 'customer_id', 'technician_id', 'technician_name',
            'service_category', 'status', 'amount', 'location', 'latitude', 'longitude',
            'scheduled_time', 'assigned_at', 'accepted_at', 'started_at',
            'completion_duration', 'created_at',
        )
        read_only_fields = (
            'booking_id', 'customer_id', 'technician_id', 'technician_name',
            'status', 'assigned_at', 'accepted_at', 'started_at',
            'completion_duration', 'created_at',
        )

    def get_customer_id(self, obj):
        """Return the User UUID of the customer (not the Client integer PK)."""
        return str(obj.customer_id.user_id_id)

    def get_technician_id(self, obj):
        """Return the User UUID of the assigned technician, or null."""
        if obj.technician_id is None:
            return None
        return str(obj.technician_id.user_id_id)

    def get_technician_name(self, obj):
        """Return the technician's full name once assigned, otherwise null."""
        if obj.technician_id is None:
            return None
        t = obj.technician_id
        return f"{t.first_name} {t.last_name}"

    def get_completion_duration(self, obj):
        """Return human-readable duration once the job is completed, otherwise null."""
        if obj.status != Booking.STATUS_COMPLETED or not obj.completion_duration:
            return None
        total = int(obj.completion_duration.total_seconds())
        hours, rem = divmod(total, 3600)
        minutes = rem // 60
        if hours:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


class BookingBroadcastSerializer(serializers.ModelSerializer):
    """Read-only view of a dispatch broadcast record."""

    technician_name = serializers.SerializerMethodField()

    class Meta:
        model = BookingBroadcast
        fields = (
            'id', 'booking_id', 'technician_id', 'technician_name',
            'status', 'sent_at', 'responded_at',
        )
        read_only_fields = fields

    def get_technician_name(self, obj):
        t = obj.technician_id
        return f"{t.first_name} {t.last_name}"


class TechnicianLocationSerializer(serializers.ModelSerializer):
    """Read serializer for technician live locations."""

    technician = serializers.StringRelatedField(source='technician_id', read_only=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = TechnicianLocation
        fields = (
            'id', 'technician_id', 'technician',
            'latitude', 'longitude', 'updated_at', 'is_online',
        )
        read_only_fields = ('id', 'technician_id', 'updated_at', 'is_online')


class TechnicianLocationUpdateSerializer(serializers.Serializer):
    """Write serializer — only lat/lng accepted from the device."""

    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        min_value=-90, max_value=90,
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        min_value=-180, max_value=180,
    )
