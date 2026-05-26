"""Helpers for creating notification records."""

from .models import Notification


def create_notification(user, title, message, event_type=Notification.EVENT_SYSTEM):
    """Create a notification for a user when a user object is available."""
    if user is None:
        return None

    return Notification.objects.create(
        user_id=user,
        title=title,
        message=message,
        event_type=event_type,
    )
