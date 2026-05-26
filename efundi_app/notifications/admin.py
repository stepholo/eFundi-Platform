"""Admin configuration for notifications."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = (
        'id', 'user_id', 'title', 'event_type', 'is_read', 'created_at'
    )
    search_fields = ('title', 'message', 'event_type', 'user_id__email')
    list_filter = ('event_type', 'is_read', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
