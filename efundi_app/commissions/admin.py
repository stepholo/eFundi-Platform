"""Admin configuration for commissions."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Commission


@admin.register(Commission)
class CommissionAdmin(ModelAdmin):
    list_display = (
        'commission_id', 'customer', 'technician', 'work_done',
        'full_amount', 'commission_amount', 'technician_earnings',
        'payment_method', 'paid_at',
    )
    search_fields = (
        'work_done', 'payment_method',
        'customer__first_name', 'customer__last_name',
        'technician__first_name', 'technician__last_name',
    )
    list_filter = ('payment_method', 'work_done', 'paid_at')
    ordering = ('-paid_at',)
    readonly_fields = (
        'commission_id', 'payment', 'customer', 'technician',
        'work_done', 'full_amount', 'commission_amount',
        'technician_earnings', 'payment_method', 'paid_at', 'created_at',
    )

    def has_add_permission(self, request):
        """Commissions are created automatically — never manually."""
        return False

    def has_delete_permission(self, request, obj=None):
        return False
