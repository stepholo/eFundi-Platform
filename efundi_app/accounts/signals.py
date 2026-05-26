"""Signals for the accounts app."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User


@receiver(post_save, sender=User, dispatch_uid='send_verification_email_on_create')
def send_verification_email_on_create(sender, instance, created, **kwargs):
    """Send an email verification link whenever a new non-superuser account is created."""
    if not created or instance.is_superuser:
        return

    from utils.emails import send_verification_email
    send_verification_email(instance)
