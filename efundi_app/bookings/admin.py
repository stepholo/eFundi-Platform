"""Admin configuration for bookings, broadcast tracking, and live locations."""

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import Booking, BookingBroadcast, TechnicianLocation


class BookingBroadcastInline(TabularInline):
    """Shows all broadcast records directly inside a Booking change page."""

    model = BookingBroadcast
    extra = 0
    readonly_fields = ('technician_id', 'status', 'sent_at', 'responded_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Booking)
class BookingAdmin(ModelAdmin):
    list_display = (
        'booking_id', 'customer_id', 'service_category', 'status',
        'assigned_technician', 'work_duration', 'amount', 'created_at',
    )
    search_fields = (
        'customer_id__first_name', 'customer_id__last_name',
        'technician_id__first_name', 'technician_id__last_name',
        'service_category', 'status',
    )
    list_filter = ('status', 'service_category', 'scheduled_time', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = (
        'booking_id', 'customer_id', 'technician_id', 'service_category',
        'status', 'assigned_at', 'accepted_at', 'assignment_expires_at',
        'created_at',
    )
    inlines = [BookingBroadcastInline]

    def has_add_permission(self, request):
        """Bookings are created automatically from customer service requests — not manually."""
        return False

    @admin.display(description='Assigned Technician', ordering='technician_id')
    def assigned_technician(self, obj):
        """Return the technician's name, or a pending indicator."""
        if obj.technician_id:
            t = obj.technician_id
            return f"{t.first_name} {t.last_name}"
        return '— Pending —'

    @admin.display(description='Duration', ordering='completion_duration')
    def work_duration(self, obj):
        """Human-readable completion duration, only shown when work is done."""
        if obj.status == Booking.STATUS_COMPLETED and obj.completion_duration:
            total = int(obj.completion_duration.total_seconds())
            hours, rem = divmod(total, 3600)
            minutes = rem // 60
            if hours:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"
        return '—'


@admin.register(BookingBroadcast)
class BookingBroadcastAdmin(ModelAdmin):
    list_display = (
        'id', 'booking_id', 'technician_id', 'status', 'sent_at', 'responded_at',
    )
    search_fields = (
        'technician_id__first_name', 'technician_id__last_name',
        'technician_id__email',
    )
    list_filter = ('status', 'sent_at')
    ordering = ('-sent_at',)
    readonly_fields = ('sent_at', 'responded_at')

    def has_add_permission(self, request):
        return False


@admin.register(TechnicianLocation)
class TechnicianLocationAdmin(ModelAdmin):
    list_display = ('technician_id', 'latitude', 'longitude', 'updated_at')
    search_fields = (
        'technician_id__first_name', 'technician_id__last_name',
        'technician_id__email',
    )
    ordering = ('-updated_at',)
    readonly_fields = ('updated_at',)
