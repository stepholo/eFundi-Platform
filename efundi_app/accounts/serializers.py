"""Model serializers for the accounts app,
   including user registration, email verification, and password reset serializers.
"""

from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import (
    validate_password,
    UserAttributeSimilarityValidator,
    MinimumLengthValidator,
    CommonPasswordValidator,
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model, used for registration and user details."""
    full_name = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('user_id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'phone_number', 'role', 'password', 'password2')
        read_only_fields = ('user_id',)
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'phone_number': {'required': True},
            'email': {'required': True},
            'role': {'required': False},
        }

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def validate_username(self, value: str) -> str:
        """ Validates that the username is unique and not empty. """
        if not value:
            raise serializers.ValidationError("Username cannot be empty")
        if User.objects.filter(username=value).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError("Username already exists")
        if not value[0].isalpha():
            raise serializers.ValidationError(
                "Username must start with a letter")
        return value

    def validate_email(self, value: str) -> str:
        """Validate the user's email address format and uniqueness."""
        if not value:
            raise serializers.ValidationError("Email cannot be empty")
        if '@' not in value or '.com' not in value:
            raise serializers.ValidationError("Invalid email address format.")
        if User.objects.filter(email=value).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError("Email already exists")
        if value[0].isupper():
            raise serializers.ValidationError(
                "Email must start with a lowercase letter")
        if not value[0].isalpha():
            raise serializers.ValidationError(
                "Email must start with a letter")
        return value

    def validate_role(self, value: str) -> str:
        """Validates that the role is one of the predefined choices."""
        valid_roles = [choice[0] for choice in User.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(
                f"Role must be one of {valid_roles}")
        return value

    def validate_password(self, value: str) -> str:
        """Validates the password while allowing numeric-only passwords."""
        user = self.instance if self.instance is not None else None
        validators = [
            UserAttributeSimilarityValidator(),
            MinimumLengthValidator(),
            CommonPasswordValidator(),
        ]
        validate_password(value, user=user, password_validators=validators)
        return value

    def update(self, instance, validated_data):
        """Override update method to hash the password if provided."""
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def validate_phone_number(self, value: str) -> str:
        """ Validates that the phone number is in a valid format. """
        if not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits.")
        if len(value) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits.")
        return value


class UserRegistrationSerializer(UserSerializer):
    """Serializer for user registration, inherits from UserSerializer."""
    class Meta(UserSerializer.Meta):
        extra_kwargs = {
            **UserSerializer.Meta.extra_kwargs,
            'role': {'required': False},
        }


class UserDetailSerializer(UserSerializer):
    """Serializer for user details, inherits from UserSerializer."""
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ('verified_email', 'is_active', 'is_staff', 'last_login')
        read_only_fields = UserSerializer.Meta.read_only_fields + ('verified_email', 'is_active', 'is_staff', 'last_login')


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        validators = [
            UserAttributeSimilarityValidator(),
            MinimumLengthValidator(),
            CommonPasswordValidator(),
        ]
        validate_password(value, password_validators=validators)
        return value
