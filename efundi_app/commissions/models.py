"""Commission records — auto-created on every successful payment."""

from uuid import uuid4

from django.db import models


class Commission(models.Model):
    """
    One record per successful payment capturing the platform's 20% fee.
    Created automatically by payments._process_successful_payment.
    """

    commission_id = models.UUIDField(
        primary_key=True, default=uuid4, editable=False
    )
    payment = models.OneToOneField(
        'payments.Payment',
        on_delete=models.CASCADE,
        related_name='commission_record',
    )
    customer = models.ForeignKey(
        'customers.Client',
        on_delete=models.SET_NULL,
        null=True,
        related_name='commissions',
    )
    technician = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.SET_NULL,
        null=True,
        related_name='commissions',
    )
    work_done = models.CharField(
        max_length=100,
        help_text='Service category from the booking (e.g. Plumbing).',
    )
    full_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Total amount paid by the customer.',
    )
    commission_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='20% platform fee retained by eFundi.',
    )
    technician_earnings = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='80% credited to the technician wallet.',
    )
    payment_method = models.CharField(max_length=20)
    paid_at = models.DateTimeField(
        help_text='Timestamp of the confirmed M-Pesa transaction.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f"Commission {self.commission_id} — "
            f"KSh {self.commission_amount} from {self.work_done} job"
        )

    class Meta:
        verbose_name = 'Commission'
        verbose_name_plural = 'Commissions'
        ordering = ['-paid_at']
        db_table = 'commissions'
        indexes = [
            models.Index(fields=['paid_at'], name='commission_paid_at_idx'),
            models.Index(fields=['payment_method'], name='commission_method_idx'),
        ]
