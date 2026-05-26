"""Serializers for the commissions app."""

from rest_framework import serializers

from .models import Commission


class CommissionSerializer(serializers.ModelSerializer):
    """Read-only serializer for commission records."""

    customer_name = serializers.SerializerMethodField()
    technician_name = serializers.SerializerMethodField()

    class Meta:
        model = Commission
        fields = (
            'commission_id',
            'customer_name',
            'technician_name',
            'work_done',
            'full_amount',
            'commission_amount',
            'technician_earnings',
            'payment_method',
            'paid_at',
            'created_at',
        )
        read_only_fields = fields

    def get_customer_name(self, obj):
        if obj.customer:
            return f"{obj.customer.first_name} {obj.customer.last_name}"
        return None

    def get_technician_name(self, obj):
        if obj.technician:
            return f"{obj.technician.first_name} {obj.technician.last_name}"
        return None
