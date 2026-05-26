"""Payment models for the eFundi marketplace."""

from django.db import models


class Payment(models.Model):
    """Payment record for a booking."""

    STATUS_PENDING = 'Pending'
    STATUS_PROCESSING = 'Processing'
    STATUS_SUCCESSFUL = 'Successful'
    STATUS_FAILED = 'Failed'
    STATUS_CANCELLED = 'Cancelled'

    STATUS_CHOICES = (
        (STATUS_PENDING, STATUS_PENDING),
        (STATUS_PROCESSING, STATUS_PROCESSING),
        (STATUS_SUCCESSFUL, STATUS_SUCCESSFUL),
        (STATUS_FAILED, STATUS_FAILED),
        (STATUS_CANCELLED, STATUS_CANCELLED),
    )

    METHOD_MPESA = 'M-Pesa'
    METHOD_CASH = 'Cash'
    METHOD_CARD = 'Card'

    METHOD_CHOICES = (
        (METHOD_MPESA, METHOD_MPESA),
        (METHOD_CASH, METHOD_CASH),
        (METHOD_CARD, METHOD_CARD),
    )

    booking_id = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='payments',
        db_column='booking_id',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_reference = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        null=True,
    )
    payer_phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text='Mobile number used for M-Pesa payment.',
    )
    account_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Account reference passed to M-Pesa STK Push.',
    )
    merchant_request_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='M-Pesa merchant request identifier.',
    )
    checkout_request_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='M-Pesa checkout request identifier.',
    )
    conversation_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='M-Pesa conversation identifier from callbacks.',
    )
    result_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Result code returned by M-Pesa for the request.',
    )
    result_description = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Result description returned by M-Pesa callback.',
    )
    callback_metadata = models.JSONField(
        blank=True,
        null=True,
        help_text='Raw callback payload from the M-Pesa gateway.',
    )
    transaction_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text='Date and time of the M-Pesa transaction.',
    )
    payment_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=METHOD_CHOICES,
        default=METHOD_MPESA,
    )
    is_credited = models.BooleanField(default=False)
    commission_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text='20% platform commission retained by eFundi.',
    )
    technician_earnings = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text='80% of payment credited to the technician wallet.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """Return a readable payment label."""
        return f"{self.booking_id} - {self.amount} ({self.payment_status})"

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']
        db_table = 'payments'
        indexes = [
            models.Index(fields=['payment_status'], name='payment_status_idx'),
            models.Index(fields=['payment_method'], name='payment_method_idx'),
            models.Index(fields=['transaction_reference'], name='payment_reference_idx'),
            models.Index(fields=['merchant_request_id'], name='mpesa_merchant_request_idx'),
            models.Index(fields=['checkout_request_id'], name='mpesa_checkout_request_idx'),
            models.Index(fields=['conversation_id'], name='mpesa_conversation_idx'),
            models.Index(fields=['payer_phone_number'], name='mpesa_phone_idx'),
        ]


        


class TechnicianWallet(models.Model):
    """Wallet balance for a technician."""

    technician_id = models.OneToOneField(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='wallet',
        db_column='technician_id',
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_withdrawn = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """Return a readable wallet label."""
        return f"{self.technician_id} wallet"

    class Meta:
        verbose_name = 'Technician Wallet'
        verbose_name_plural = 'Technician Wallets'
        db_table = 'technician_wallets'


class ExportJob(models.Model):
    """Background export job record for large CSV exports."""

    STATUS_PENDING = 'pending'
    STATUS_RUNNING = 'running'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_RUNNING, 'Running'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
    )

    EXPORT_PAYMENTS = 'payments'
    EXPORT_WALLETS = 'wallets'
    EXPORT_WITHDRAWALS = 'withdrawals'
    EXPORT_TECHNICIAN = 'technician_transactions'
    EXPORT_CUSTOMER = 'customer_transactions'

    EXPORT_TYPE_CHOICES = (
        (EXPORT_PAYMENTS, 'Payments'),
        (EXPORT_WALLETS, 'Wallets'),
        (EXPORT_WITHDRAWALS, 'Withdrawals'),
        (EXPORT_TECHNICIAN, 'Technician Transactions'),
        (EXPORT_CUSTOMER, 'Customer Transactions'),
    )

    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    export_type = models.CharField(max_length=64, choices=EXPORT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    filters = models.JSONField(blank=True, null=True)
    file = models.FileField(upload_to='exports/', blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = 'Export Job'
        verbose_name_plural = 'Export Jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"ExportJob({self.export_type}) by {self.user} - {self.status}"


class WithdrawalRequest(models.Model):
    """Technician request to withdraw wallet earnings."""

    STATUS_PENDING = 'Pending'
    STATUS_PROCESSING = 'Processing'
    STATUS_APPROVED = 'Approved'
    STATUS_REJECTED = 'Rejected'
    STATUS_FAILED = 'Failed'

    STATUS_CHOICES = (
        (STATUS_PENDING, STATUS_PENDING),
        (STATUS_PROCESSING, STATUS_PROCESSING),
        (STATUS_APPROVED, STATUS_APPROVED),
        (STATUS_REJECTED, STATUS_REJECTED),
        (STATUS_FAILED, STATUS_FAILED),
    )

    technician_id = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='withdrawal_requests',
        db_column='technician_id',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    phone_number = models.CharField(max_length=15)
    notes = models.TextField(blank=True)
    originator_conversation_id = models.CharField(max_length=100, blank=True)
    conversation_id = models.CharField(max_length=100, blank=True)
    result_code = models.CharField(max_length=10, blank=True)
    result_description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        """Return a readable withdrawal label."""
        return f"{self.technician_id} - {self.amount} ({self.status})"

    class Meta:
        verbose_name = 'Withdrawal Request'
        verbose_name_plural = 'Withdrawal Requests'
        ordering = ['-created_at']
        db_table = 'withdrawal_requests'
        indexes = [
            models.Index(fields=['status'], name='withdrawal_status_idx'),
            models.Index(fields=['created_at'], name='withdrawal_created_at_idx'),
        ]
