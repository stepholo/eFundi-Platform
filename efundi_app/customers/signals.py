"""Signals for keeping client profiles in sync with user roles."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import User
from .models import Client


@receiver(post_save, sender=User, dispatch_uid='ensure_client_profile')
def ensure_client_profile(sender, instance, **kwargs):
    """Keep client profiles aligned with the user's role."""
    if instance.role != 'Customer' or instance.is_superuser:
        Client.objects.filter(user_id=instance).delete()
        return

    client, created = Client.objects.get_or_create(
        user_id=instance,
        defaults={
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'email': instance.email,
            'phone_number': instance.phone_number,
            'role': instance.role,
        },
    )

    if created:
        return

    fields_to_update = []
    synced_fields = {
        'first_name': instance.first_name,
        'last_name': instance.last_name,
        'email': instance.email,
        'phone_number': instance.phone_number,
        'role': instance.role,
    }

    for field, value in synced_fields.items():
        if getattr(client, field) != value:
            setattr(client, field, value)
            fields_to_update.append(field)

    if fields_to_update:
        fields_to_update.append('updated_at')
        client.save(update_fields=fields_to_update)
