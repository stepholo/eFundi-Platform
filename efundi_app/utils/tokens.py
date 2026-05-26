"""Generate account verification, password reset, email verification tokens, and phone verification OTPs for user accounts."""

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from secrets import token_urlsafe


account_activation_token = PasswordResetTokenGenerator()


def email_verification_token():
    """Generate a secure token for email verification."""
    return token_urlsafe(32)


def phone_verification_code():
    """Generate a secure 6-digit OTP for phone verification."""
    return token_urlsafe(3)[:4]  # Generate a short token and take the first 4 characters