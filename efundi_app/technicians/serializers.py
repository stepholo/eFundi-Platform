"""Serializers for the Technician model."""

from rest_framework import serializers
from .models import Technician


class TechnicianSerializer(serializers.ModelSerializer):
    """Serializer for the Technician model."""

    id = serializers.UUIDField(source='user_id.user_id', read_only=True)

    class Meta:
        model = Technician
        fields = (
            'id', 'user_id',
            'first_name', 'last_name', 'email', 'phone_number', 'role',
            'specialization', 'bio', 'years_of_experience',
            'is_available', 'is_active', 'verification_status',
            'credentials', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'user_id', 'is_active', 'created_at', 'updated_at')

    def validate_email(self, value):
        """Validate that the email is unique across technicians."""
        if Technician.objects.filter(email=value).exclude(
            pk=getattr(self.instance, 'pk', None)
        ).exists():
            raise serializers.ValidationError(
                'A technician with this email already exists.'
            )
        return value

    def validate_phone_number(self, value):
        """Validate that the phone number is unique across technicians."""
        if Technician.objects.filter(phone_number=value).exclude(
            pk=getattr(self.instance, 'pk', None)
        ).exists():
            raise serializers.ValidationError(
                'A technician with this phone number already exists.'
            )
        return value

    def validate_specialization(self, value):
        if not value:
            raise serializers.ValidationError('Specialization cannot be empty.')
        return value

    def validate_years_of_experience(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Years of experience cannot be negative.'
            )
        return value

    def validate_verification_status(self, value):
        allowed = [s[0] for s in Technician.STATUS]
        if value not in allowed:
            raise serializers.ValidationError(
                f'Verification status must be one of: {", ".join(allowed)}.'
            )
        return value

    def validate(self, attrs):
        """
        is_available may only be True when is_active is True.
        is_active is auto-derived from verification_status in the model's save(),
        but we surface a clear error here before the save happens.
        """
        instance = self.instance

        # Resolve the effective is_active for this update
        verification_status = attrs.get(
            'verification_status',
            instance.verification_status if instance else 'Pending',
        )
        is_active = (verification_status == 'Verified')

        is_available = attrs.get(
            'is_available',
            instance.is_available if instance else False,
        )

        if is_available and not is_active:
            raise serializers.ValidationError({
                'is_available': (
                    'A technician can only be set as available after '
                    'their verification status is Verified.'
                )
            })

        return attrs
