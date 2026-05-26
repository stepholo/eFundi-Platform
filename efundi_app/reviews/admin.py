"""Admin configuration for reviews."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Review


@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    list_display = (
        'id', 'customer_id', 'technician_id', 'booking_id',
        'rating', 'created_at'
    )
    search_fields = (
        'comment', 'customer_id__first_name', 'customer_id__last_name',
        'technician_id__first_name', 'technician_id__last_name',
    )
    list_filter = ('rating', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
