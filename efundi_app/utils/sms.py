import logging


def send_phone_verification_sms(phone_number, code):
    """Send a phone verification SMS asynchronously using Celery."""
    try:
        # Implement SMS sending logic here (e.g., using Twilio or another provider)
        logging.info(f"Phone verification SMS sent to {phone_number} with code {code}")
    except Exception as e:
        logging.error(f"Failed to send phone verification SMS to {phone_number}: {str(e)}")