"""Serializers for client profiles."""

from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for the Client model."""

    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = (
            'user_id',
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'role',
            'created_at',
            'updated_at',
        )
