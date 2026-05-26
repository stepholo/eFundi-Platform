from utils.tasks import send_email_async
import logging
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _send_template_email(subject, template_name, context, to_email):
    recipient_list = [to_email] if isinstance(to_email, str) else list(to_email)
    send_email_async.delay(subject, template_name, context, recipient_list)


def _absolute_url(path, request=None):
    """Return a fully qualified URL for path, using request or SITE_URL fallback."""
    if request is not None:
        return request.build_absolute_uri(path)
    from django.conf import settings
    return f"{settings.SITE_URL.rstrip('/')}{path}"


def send_verification_email(user, request=None):
    """Send an email verification asynchronously using Celery."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)
    verification_url = _absolute_url(
        f"/api/v1/accounts/verify-email/?uid={uid}&token={token}",
        request,
    )

    context = {
        'first_name': user.first_name,
        'verification_url': verification_url,
    }
    try:
        _send_template_email(
            'Verify your eFundi account',
            'emails/email_verification.html',
            context,
            user.email,
        )
        logging.info(f"Verification email sent to {user.email}")
    except Exception as e:
        logging.error(f"Failed to send verification email to {user.email}: {str(e)}")


def send_password_reset_email(user, request=None):
    """Send a password reset email asynchronously using Celery."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)
    reset_url = _absolute_url(
        f"/api/v1/accounts/confirm-reset-password/?uid={uid}&token={token}",
        request,
    )

    context = {
        'first_name': user.first_name,
        'reset_url': reset_url,
        'uid': uid,
        'token': token,
    }
    try:
        _send_template_email(
            'Reset your eFundi password',
            'emails/password_reset.html',
            context,
            user.email,
        )
        logging.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        logging.error(f"Failed to send password reset email to {user.email}: {str(e)}")


def send_notification_email(to_email, subject, template_name, context):
    """Send a notification email asynchronously using Celery."""
    try:
        _send_template_email(subject, template_name, context, to_email)
        logging.info(f"Notification email sent to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send notification email to {to_email}: {str(e)}")
