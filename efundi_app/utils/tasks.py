from celery import shared_task
from django.core.mail import send_mail
import logging
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


logger = logging.getLogger(__name__)


@shared_task
def send_email_async(subject: str, template_name: str, context: dict, recipient_list: list) -> None:
    """
    A Celery task to send an email using a template.

    :param subject: Subject of the email
    :param template_name: Name of the template to render the email body
    :param context: Context data to render the template
    :param recipient_list: List of email addresses to send the email to
    :param html_message: Optional HTML message to send
    """
    html_message = render_to_string(template_name, context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject,
        plain_message,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        html_message=html_message,
        fail_silently=False,
    )
