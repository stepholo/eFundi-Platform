"""Signals for keeping technician profiles in sync with user roles."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import User
from .models import Technician


@receiver(post_save, sender=User, dispatch_uid='ensure_technician_profile')
def ensure_technician_profile(sender, instance, **kwargs):
    """Keep technician profiles aligned with the user's role."""
    if instance.role != 'Technician' or instance.is_superuser:
        Technician.objects.filter(user_id=instance).delete()
        return

    technician, created = Technician.objects.get_or_create(
        user_id=instance,
        defaults={
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'email': instance.email,
            'phone_number': instance.phone_number,
            'role': instance.role,
            'specialization': 'General',
            'is_active': instance.is_active,
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
        'is_active': instance.is_active,
    }

    for field, value in synced_fields.items():
        if getattr(technician, field) != value:
            setattr(technician, field, value)
            fields_to_update.append(field)

    if fields_to_update:
        fields_to_update.append('updated_at')
        technician.save(update_fields=fields_to_update)
