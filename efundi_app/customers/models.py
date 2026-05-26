"""Client model for users with the Customer role."""

from django.db import models


class Client(models.Model):
    """Profile record derived from a user with the Customer role."""

    user_id = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='client_profile',
        db_column='user_id',
        editable=False,
    )
    first_name = models.CharField(
        'accounts.User.first_name',
        max_length=30,
    )
    last_name = models.CharField(
        'accounts.User.last_name',
        max_length=30,
    )
    email = models.EmailField(
        'accounts.User.email',
        unique=True,
    )
    phone_number = models.CharField(
        'accounts.User.phone_number',
        max_length=10,
        unique=True,
    )
    role = models.CharField(
        'accounts.User.role',
        max_length=20,
        default='Customer',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """Return a readable client label."""
        return f"{self.first_name} {self.last_name} ({self.email})"

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
        ordering = ['-created_at']
        db_table = 'efundi_client'
        indexes = [
            models.Index(fields=['email'], name='client_email_idx'),
            models.Index(fields=['phone_number'], name='client_phone_number_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['email'], name='unique_client_email'),
            models.UniqueConstraint(fields=['phone_number'], name='unique_client_phone_number'),
        ]


# Proxy model moved to admin to avoid circular imports during autodiscover.
CustomerTransaction = None
