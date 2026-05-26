"""Application configuration for the technicians app."""

from django.apps import AppConfig


class TechniciansConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'technicians'
    verbose_name = 'Technicians'

    def ready(self):
        import technicians.signals  # noqa: F401
