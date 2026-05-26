"""Intasend payment gateway client for eFundi.

Handles:
  - STK Push  : customer pays for a booking (C2B)
  - Send Money: platform pays technician on withdrawal approval (B2C equivalent)

Webhook payloads are posted by Intasend to the URLs registered in your dashboard:
  STK Push result  → /api/v1/payments/intasend/callback/
  Send Money result → /api/v1/payments/intasend/payout/callback/
"""

from django.conf import settings


class IntasendError(Exception):
    """Raised when the Intasend API returns an error."""

    def __init__(self, step: str, message: str):
        self.step = step
        super().__init__(f"Intasend {step} failed: {message}")


class IntasendClient:
    """Thin wrapper around the intasend-python SDK."""

    def __init__(self):
        from intasend import APIService
        self._api = APIService(
            token=settings.INTASEND_API_KEY,
            publishable_key=settings.INTASEND_PUBLISHABLE_KEY,
            test=getattr(settings, 'INTASEND_TEST_MODE', False),
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def normalize_phone(phone_number: str) -> str:
        """Convert any Kenyan phone format to 254XXXXXXXXX (Intasend requirement)."""
        number = str(phone_number).strip().replace(' ', '').replace('-', '')
        if number.startswith('+254'):
            number = number[1:]            # +2547... → 2547...
        elif number.startswith('0'):
            number = '254' + number[1:]   # 07...    → 2547...
        elif number.startswith('7') or number.startswith('1'):
            number = '254' + number       # 7...     → 2547...
        return number

    # ------------------------------------------------------------------
    # STK Push  (collect money from customer)
    # ------------------------------------------------------------------

    def send_stk_push(
        self,
        phone_number: str,
        amount: int,
        account_reference: str,
        email: str = '',
        narrative: str = '',
    ) -> dict:
        """Initiate an M-Pesa STK Push via Intasend.

        Returns the raw Intasend response dict.  The caller should read:
            response['invoice']['invoice_id']   — used to look up the payment on callback
        """
        phone = self.normalize_phone(phone_number)
        try:
            return self._api.collect.mpesa_stk_push(
                phone_number=phone,
                email=email,  # or 'customer@efundi.co.ke',
                amount=int(amount),
                narrative=(narrative or 'eFundi payment')[:64],
                api_ref=account_reference[:64],
            )
        except Exception as exc:
            raise IntasendError('stk_push', str(exc))

    # ------------------------------------------------------------------
    # Send Money  (pay out to technician)
    # ------------------------------------------------------------------

    def send_b2c(
        self,
        phone_number: str,
        amount: int,
        name: str,
        narrative: str,
    ) -> dict:
        """Send money to a technician's M-Pesa via Intasend Transfer API.

        Uses the two-step initiate → approve flow so the payout is released
        immediately without requiring manual approval on the Intasend dashboard.

        Returns the approved response dict.  The caller should read:
            response['tracking_id']   — stored on the WithdrawalRequest for callback lookup
        """
        phone = self.normalize_phone(phone_number)
        try:
            response = self._api.transfer.mpesa(
                currency='KES',
                transactions=[{
                    'name': name[:100],
                    'account': phone,
                    'amount': int(amount),
                    'narrative': narrative[:100],
                }],
                requires_approval='YES',
            )
            return self._api.transfer.approve(response)
        except Exception as exc:
            raise IntasendError('b2c', str(exc))

    # ------------------------------------------------------------------
    # Webhook parsers
    # ------------------------------------------------------------------

    @staticmethod
    def parse_stk_callback(payload: dict) -> dict:
        """Normalise an Intasend STK Push webhook payload.

        Expected Intasend states: PENDING | PROCESSING | COMPLETE | FAILED
        """
        return {
            'invoice_id':      payload.get('invoice_id'),
            'state':           (payload.get('state') or '').upper(),
            'mpesa_reference': payload.get('mpesa_reference'),
            'failed_reason':   payload.get('failed_reason'),
            'account':         payload.get('account'),
            'value':           payload.get('value'),
            'api_ref':         payload.get('api_ref'),
        }

    @staticmethod
    def parse_payout_callback(payload: dict) -> dict:
        """Normalise an Intasend Send Money webhook payload.

        Expected Intasend statuses: Complete | Failed | Pending
        """
        return {
            'tracking_id':  payload.get('tracking_id'),
            'status':       (payload.get('status') or '').lower(),
            'transactions': payload.get('transactions', []),
        }
