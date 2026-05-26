"""Payment API views."""

import os

from django.db import transaction
from django.db.models import F
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import filters, permissions, serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.models import Notification
from notifications.services import create_notification
from utils.permissions import IsAdminOrSuperAdmin, IsCustomer, IsVerifiedTechnician
from .models import ExportJob, Payment, TechnicianWallet, WithdrawalRequest
from .serializers import (
    ExportJobSerializer,
    PaymentSerializer,
    TechnicianWalletSerializer,
    WithdrawalRequestSerializer,
)
from .tasks import run_export_job


@extend_schema_view(
    list=extend_schema(tags=['Customer', 'Admin']),
    retrieve=extend_schema(tags=['Customer', 'Admin']),
    create=extend_schema(tags=['Customer']),
    update=extend_schema(tags=['Admin']),
    partial_update=extend_schema(tags=['Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for payments."""

    serializer_class = PaymentSerializer
    search_fields = (
        'transaction_reference', 'payment_status', 'payment_method',
        'payer_phone_number', 'merchant_request_id', 'checkout_request_id',
    )
    ordering_fields = ('created_at', 'updated_at', 'amount', 'payment_status')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Customers see their own payments; admins see all."""
        user = self.request.user
        qs = Payment.objects.select_related('booking_id')
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Customer':
            return qs.filter(booking_id__customer_id__user_id=user)
        return qs.none()

    def get_permissions(self):
        if self.action == 'create':
            return [(IsCustomer | IsAdminOrSuperAdmin)()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        if self.action in ('callback', 'intasend_callback', 'intasend_payout_callback'):
            return [permissions.AllowAny()]
        return [(IsCustomer | IsAdminOrSuperAdmin)()]

    def perform_create(self, serializer):
        payment = serializer.save()
        self._process_successful_payment(payment)

    def perform_update(self, serializer):
        payment = serializer.save()
        self._process_successful_payment(payment)

    def _process_successful_payment(self, payment):
        if payment.payment_status != Payment.STATUS_SUCCESSFUL or payment.is_credited:
            return
        from decimal import Decimal
        from django.conf import settings as django_settings

        commission_rate = getattr(django_settings, 'COMMISSION_RATE', Decimal('0.20'))
        commission = (payment.amount * commission_rate).quantize(Decimal('0.01'))
        earnings = payment.amount - commission

        booking = payment.booking_id
        technician = booking.technician_id
        wallet, _ = TechnicianWallet.objects.get_or_create(technician_id=technician)

        with transaction.atomic():
            TechnicianWallet.objects.filter(pk=wallet.pk).update(
                balance=F('balance') + earnings,
                total_earned=F('total_earned') + earnings,
            )
            Payment.objects.filter(pk=payment.pk).update(
                is_credited=True,
                commission_amount=commission,
                technician_earnings=earnings,
            )

        # Auto-create commission audit record
        from commissions.models import Commission
        import django.utils.timezone as tz
        Commission.objects.get_or_create(
            payment=payment,
            defaults={
                'customer': booking.customer_id,
                'technician': technician,
                'work_done': booking.service_category,
                'full_amount': payment.amount,
                'commission_amount': commission,
                'technician_earnings': earnings,
                'payment_method': payment.payment_method,
                'paid_at': payment.transaction_date or tz.now(),
            },
        )

        create_notification(
            booking.customer_id.user_id,
            'Payment successful',
            (
                f'Your payment of KSh {payment.amount} for '
                f'{booking.service_category} was received.'
            ),
            Notification.EVENT_PAYMENT_SUCCESSFUL,
        )
        create_notification(
            technician.user_id,
            'Earnings updated',
            (
                f'KSh {earnings} has been added to your wallet for '
                f'{booking.service_category} '
                f'(KSh {payment.amount} − KSh {commission} eFundi commission).'
            ),
            Notification.EVENT_PAYMENT_SUCCESSFUL,
        )

        from .tasks import auto_payout_wallet
        auto_payout_wallet.delay(technician.pk)

    @extend_schema(
        tags=['Customer'],
        summary='Initiate M-Pesa STK Push via Intasend',
        description=(
            'Sends a payment prompt to the customer\'s phone via Intasend → M-Pesa. '
            'The booking must already have a quoted amount (technician accepted). '
            'A pending Payment record is created immediately; status updates when '
            'Intasend posts to the intasend/callback/ webhook endpoint.'
        ),
        request=inline_serializer(
            name='STKPushRequest',
            fields={
                'booking_id': drf_serializers.UUIDField(),
                'payer_phone_number': drf_serializers.CharField(
                    help_text='Kenyan phone number, e.g. 0712345678',
                ),
            },
        ),
        responses={
            200: inline_serializer(
                name='STKPushResponse',
                fields={
                    'detail': drf_serializers.CharField(),
                    'payment_id': drf_serializers.IntegerField(),
                    'invoice_id': drf_serializers.CharField(),
                },
            ),
        },
    )
    @action(detail=False, methods=['post'], url_path='stk-push',
            permission_classes=[IsCustomer])
    def stk_push(self, request):
        """Initiate an M-Pesa STK Push payment for a booking via Intasend."""
        from mpesa_custom.services import IntasendClient, IntasendError
        from bookings.models import Booking

        booking_id = request.data.get('booking_id')
        phone_number = request.data.get('payer_phone_number')

        if not booking_id or not phone_number:
            return Response(
                {'detail': 'booking_id and payer_phone_number are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {'detail': 'Booking not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.amount is None:
            return Response(
                {
                    'detail': (
                        'This booking has no quoted amount. '
                        'The technician must accept the booking first.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the customer owns this booking
        try:
            customer_profile = request.user.client_profile
        except Exception:
            return Response(
                {'detail': 'Customer profile not found.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if booking.customer_id != customer_profile:
            return Response(
                {'detail': 'You can only pay for your own bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            intasend = IntasendClient()
            response = intasend.send_stk_push(
                phone_number=phone_number,
                amount=int(booking.amount),
                account_reference=str(booking.booking_id)[:64],
                email=request.user.email or '',
                narrative=f'eFundi {booking.service_category}',
            )
        except IntasendError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        invoice = response.get('invoice', {})
        invoice_id = invoice.get('invoice_id', '')

        payment = Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            payment_method=Payment.METHOD_MPESA,
            payer_phone_number=phone_number,
            account_reference=str(booking.booking_id)[:64],
            # checkout_request_id stores the Intasend invoice_id for webhook lookup
            checkout_request_id=invoice_id,
            payment_status=Payment.STATUS_PENDING,
        )

        return Response(
            {
                'detail': 'Payment prompt sent to your phone. Enter your M-Pesa PIN.',
                'invoice_id': invoice_id,
                'payment_id': payment.id,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=['Webhooks'],
        summary='Intasend STK Push webhook',
        description=(
            'Webhook called by Intasend when an STK Push payment changes state '
            '(COMPLETE or FAILED). Register this URL in your Intasend dashboard → '
            'Settings → Webhooks → Collection.'
        ),
    )
    @action(detail=False, methods=['post'], url_path='intasend/callback',
            permission_classes=[permissions.AllowAny])
    def intasend_callback(self, request):
        """Handle Intasend STK Push result and credit the technician wallet on success."""
        from mpesa_custom.services import IntasendClient

        parsed = IntasendClient.parse_stk_callback(request.data)
        invoice_id = parsed.get('invoice_id')
        state = parsed.get('state')   # COMPLETE | FAILED | PENDING | PROCESSING

        payment = Payment.objects.filter(checkout_request_id=invoice_id).first()
        if payment is None:
            # Unknown invoice — acknowledge so Intasend doesn't retry
            return Response({'status': 'ok'})

        if state == 'COMPLETE':
            payment.payment_status = Payment.STATUS_SUCCESSFUL
            payment.transaction_reference = parsed.get('mpesa_reference')
            payment.callback_metadata = request.data
            payment.save()
            self._process_successful_payment(payment)

        elif state == 'FAILED':
            payment.payment_status = Payment.STATUS_FAILED
            payment.result_description = parsed.get('failed_reason') or 'Payment failed'
            payment.callback_metadata = request.data
            payment.save()

        # For PENDING / PROCESSING we do nothing — wait for the final state
        return Response({'status': 'ok'})

    @extend_schema(
        tags=['Webhooks'],
        summary='Intasend Send Money (payout) webhook',
        description=(
            'Webhook called by Intasend when a technician payout (Send Money) '
            'changes state. Register this URL in your Intasend dashboard → '
            'Settings → Webhooks → Send Money.'
        ),
    )
    @action(detail=False, methods=['post'], url_path='intasend/payout/callback',
            permission_classes=[permissions.AllowAny])
    def intasend_payout_callback(self, request):
        """Handle Intasend Send Money result for technician withdrawals."""
        from mpesa_custom.services import IntasendClient

        parsed = IntasendClient.parse_payout_callback(request.data)
        tracking_id = parsed.get('tracking_id', '')
        payout_status = parsed.get('status', '')   # complete | failed | pending

        withdrawal = WithdrawalRequest.objects.filter(
            originator_conversation_id=tracking_id
        ).first()
        if withdrawal is None:
            return Response({'status': 'ok'})

        if payout_status == 'complete':
            wallet, _ = TechnicianWallet.objects.get_or_create(
                technician_id=withdrawal.technician_id
            )
            with transaction.atomic():
                TechnicianWallet.objects.filter(pk=wallet.pk).update(
                    balance=F('balance') - withdrawal.amount,
                    total_withdrawn=F('total_withdrawn') + withdrawal.amount,
                )
                withdrawal.status = WithdrawalRequest.STATUS_APPROVED
                withdrawal.result_description = 'Paid via Intasend'
                withdrawal.save(update_fields=[
                    'status', 'result_description', 'updated_at',
                ])
            create_notification(
                withdrawal.technician_id.user_id,
                'Withdrawal sent',
                (
                    f'KSh {withdrawal.amount} has been sent to your M-Pesa '
                    f'{withdrawal.phone_number}.'
                ),
                Notification.EVENT_WITHDRAWAL_APPROVED,
            )

        elif 'fail' in payout_status:
            withdrawal.status = WithdrawalRequest.STATUS_FAILED
            withdrawal.result_description = 'Payout failed via Intasend'
            withdrawal.save(update_fields=['status', 'result_description', 'updated_at'])
            create_notification(
                withdrawal.technician_id.user_id,
                'Withdrawal failed',
                (
                    f'Your withdrawal of KSh {withdrawal.amount} could not be '
                    f'processed. Please contact support.'
                ),
                Notification.EVENT_WITHDRAWAL_REJECTED,
            )

        elif 'cancel' in payout_status:
            withdrawal.status = WithdrawalRequest.STATUS_FAILED
            withdrawal.result_description = 'Payout cancelled on Intasend'
            withdrawal.save(update_fields=['status', 'result_description', 'updated_at'])
            create_notification(
                withdrawal.technician_id.user_id,
                'Withdrawal cancelled',
                (
                    f'Your withdrawal of KSh {withdrawal.amount} was cancelled. '
                    f'Your wallet balance has not been deducted.'
                ),
                Notification.EVENT_WITHDRAWAL_REJECTED,
            )

        return Response({'status': 'ok'})

    @extend_schema(tags=['Admin'])
    @action(detail=False, methods=['post'], url_path='callback')
    def callback(self, request):
        """
        Manual payment status update — useful for Cash payments or testing
        without triggering STK Push.
        """
        reference = request.data.get('transaction_reference')
        new_status = request.data.get('payment_status')
        if not reference or not new_status:
            return Response(
                {'detail': 'transaction_reference and payment_status are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment = Payment.objects.filter(transaction_reference=reference).first()
        if payment is None:
            return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(
            payment, data={'payment_status': new_status}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._process_successful_payment(serializer.instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
)
class TechnicianWalletViewSet(viewsets.ReadOnlyModelViewSet):
    """Technician wallet — balance, total earned, total withdrawn."""

    serializer_class = TechnicianWalletSerializer
    lookup_field = 'technician_id'
    ordering_fields = ('balance', 'total_earned', 'total_withdrawn', 'updated_at')
    filter_backends = (filters.OrderingFilter,)

    def get_queryset(self):
        """Technicians see their own wallet; admins see all."""
        user = self.request.user
        qs = TechnicianWallet.objects.select_related('technician_id')
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Technician':
            return qs.filter(technician_id__user_id=user)
        return qs.none()

    def get_permissions(self):
        return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]


@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
    create=extend_schema(
        tags=['Technician'],
        request=inline_serializer(
            name='WithdrawalRequestCreate',
            fields={
                'amount': drf_serializers.DecimalField(max_digits=10, decimal_places=2),
                'phone_number': drf_serializers.CharField(
                    help_text='Phone number to receive M-Pesa payout, e.g. 0712345678',
                ),
                'notes': drf_serializers.CharField(required=False, allow_blank=True),
            },
        ),
    ),
    update=extend_schema(tags=['Admin']),
    partial_update=extend_schema(tags=['Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class WithdrawalRequestViewSet(viewsets.ModelViewSet):
    """Technician withdrawal requests."""

    serializer_class = WithdrawalRequestSerializer
    search_fields = ('status', 'phone_number', 'technician_id__email')
    ordering_fields = ('created_at', 'updated_at', 'amount', 'status')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Technicians see their own requests; admins see all."""
        user = self.request.user
        qs = WithdrawalRequest.objects.select_related('technician_id')
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Technician':
            return qs.filter(technician_id__user_id=user)
        return qs.none()

    def get_permissions(self):
        if self.action == 'create':
            return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]
        if self.action in ('approve', 'reject_withdrawal',
                           'update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]

    def perform_create(self, serializer):
        from technicians.models import Technician
        try:
            technician = self.request.user.technician_profile
        except Technician.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No technician profile found for your account.')
        withdrawal = serializer.save(technician_id=technician)
        create_notification(
            withdrawal.technician_id.user_id,
            'Withdrawal requested',
            f'Your withdrawal request for {withdrawal.amount} is pending review.',
            Notification.EVENT_WITHDRAWAL_REQUESTED,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """Approve a pending withdrawal — triggers an Intasend Send Money payout to the technician."""
        from mpesa_custom.services import IntasendClient, IntasendError
        withdrawal = self.get_object()
        if withdrawal.status != WithdrawalRequest.STATUS_PENDING:
            return Response(
                {'detail': 'Only pending withdrawals can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        wallet, _ = TechnicianWallet.objects.get_or_create(
            technician_id=withdrawal.technician_id
        )
        if wallet.balance < withdrawal.amount:
            return Response(
                {'detail': 'Insufficient wallet balance.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        technician = withdrawal.technician_id
        user = technician.user_id
        full_name = f"{user.first_name} {user.last_name}".strip() or user.email

        try:
            intasend = IntasendClient()
            response = intasend.send_b2c(
                phone_number=withdrawal.phone_number,
                amount=int(withdrawal.amount),
                name=full_name,
                narrative=f'eFundi withdrawal {withdrawal.pk}',
            )
        except IntasendError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Store Intasend tracking_id in originator_conversation_id for webhook lookup
        tracking_id = response.get('tracking_id', '')
        withdrawal.status = WithdrawalRequest.STATUS_PROCESSING
        withdrawal.originator_conversation_id = tracking_id
        withdrawal.save(update_fields=[
            'status', 'originator_conversation_id', 'updated_at',
        ])
        create_notification(
            withdrawal.technician_id.user_id,
            'Withdrawal processing',
            f'Your withdrawal of KSh {withdrawal.amount} is being sent to {withdrawal.phone_number}.',
            Notification.EVENT_WITHDRAWAL_APPROVED,
        )
        return Response(self.get_serializer(withdrawal).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='reject')
    def reject_withdrawal(self, request, pk=None):
        """Reject a pending withdrawal request."""
        withdrawal = self.get_object()
        if withdrawal.status != WithdrawalRequest.STATUS_PENDING:
            return Response(
                {'detail': 'Only pending withdrawals can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        withdrawal.status = WithdrawalRequest.STATUS_REJECTED
        withdrawal.save(update_fields=['status', 'updated_at'])
        create_notification(
            withdrawal.technician_id.user_id,
            'Withdrawal rejected',
            f'Your withdrawal of {withdrawal.amount} was rejected.',
            Notification.EVENT_WITHDRAWAL_REJECTED,
        )
        return Response(self.get_serializer(withdrawal).data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(tags=['Admin']),
    create=extend_schema(tags=['Admin']),
)
class ExportJobViewSet(viewsets.GenericViewSet):
    """Background export jobs (Admin only)."""

    serializer_class = ExportJobSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Super Admin':
            return ExportJob.objects.all()
        return ExportJob.objects.filter(user=user)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(user=request.user)
        run_export_job.delay(job.id)
        return Response(self.get_serializer(job).data, status=status.HTTP_201_CREATED)

    def list(self, request):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Download a completed export file."""
        job = self.get_object()
        if job.status != ExportJob.STATUS_COMPLETED or not job.file:
            return Response({'detail': 'Export not ready.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.conf import settings
        from django.http import FileResponse
        file_path = (
            (settings.MEDIA_ROOT + '/' + job.file.name)
            if settings.MEDIA_ROOT else job.file.path
        )
        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(job.file.name),
        )
