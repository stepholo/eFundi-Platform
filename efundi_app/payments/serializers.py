"""Serializers for payments."""

from rest_framework import serializers

from .models import Payment, TechnicianWallet, WithdrawalRequest
from .models import ExportJob


class ExportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportJob
        fields = ('id', 'user', 'export_type', 'status', 'filters', 'file', 'error', 'created_at', 'completed_at')
        read_only_fields = ('id', 'status', 'file', 'error', 'created_at', 'completed_at')


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment records."""

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TechnicianWalletSerializer(serializers.ModelSerializer):
    """Serializer for technician wallets."""

    technician = serializers.StringRelatedField(source='technician_id', read_only=True)

    class Meta:
        model = TechnicianWallet
        fields = (
            'id', 'technician_id', 'technician', 'balance',
            'total_earned', 'total_withdrawn', 'updated_at',
        )
        read_only_fields = (
            'id', 'balance', 'total_earned', 'total_withdrawn', 'updated_at',
        )


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """Serializer for withdrawal requests."""

    class Meta:
        model = WithdrawalRequest
        fields = '__all__'
        read_only_fields = ('id', 'technician_id', 'status', 'created_at', 'updated_at')

    def validate_amount(self, value):
        from decimal import Decimal
        from django.conf import settings as django_settings

        minimum = getattr(django_settings, 'MINIMUM_WITHDRAWAL', Decimal('5'))
        if value < minimum:
            raise serializers.ValidationError(
                f'Minimum withdrawal amount is KSh {minimum}.'
            )
        return value

    def validate(self, attrs):
        """Ensure the withdrawal does not exceed the technician's wallet balance."""
        technician = attrs.get('technician_id')
        amount = attrs.get('amount')
        if technician and amount:
            try:
                from .models import TechnicianWallet
                wallet = TechnicianWallet.objects.get(technician_id=technician)
                if amount > wallet.balance:
                    raise serializers.ValidationError({
                        'amount': (
                            f'Insufficient balance. Your current wallet balance '
                            f'is KSh {wallet.balance}.'
                        )
                    })
            except TechnicianWallet.DoesNotExist:
                raise serializers.ValidationError({
                    'amount': 'No wallet found for your account.'
                })
        return attrs
