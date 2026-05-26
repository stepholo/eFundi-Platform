from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
import csv
import io
import os
from pathlib import Path
from decimal import Decimal
from .models import ExportJob, Payment, TechnicianWallet, WithdrawalRequest


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def auto_payout_wallet(self, technician_id: int):
    """
    Triggered after every wallet credit. If the balance is at or above
    AUTO_WITHDRAWAL_THRESHOLD and there is no withdrawal already in flight,
    a WithdrawalRequest is created and the payout is dispatched to Intasend
    immediately via the two-step initiate → approve flow.
    """
    from mpesa_custom.services import IntasendClient, IntasendError
    from notifications.models import Notification
    from notifications.services import create_notification

    threshold = getattr(settings, 'AUTO_WITHDRAWAL_THRESHOLD', Decimal('200'))

    try:
        with transaction.atomic():
            wallet = (
                TechnicianWallet.objects
                .select_for_update()
                .select_related('technician_id__user_id')
                .get(technician_id_id=technician_id)
            )

            if wallet.balance < threshold:
                return

            # Skip if a withdrawal is already pending or processing
            in_flight = WithdrawalRequest.objects.filter(
                technician_id_id=technician_id,
                status__in=[WithdrawalRequest.STATUS_PENDING, WithdrawalRequest.STATUS_PROCESSING],
            ).exists()
            if in_flight:
                return

            technician = wallet.technician_id
            user = technician.user_id
            amount = wallet.balance
            phone = technician.phone_number
            full_name = f"{user.first_name} {user.last_name}".strip() or user.email

            withdrawal = WithdrawalRequest.objects.create(
                technician_id=technician,
                amount=amount,
                phone_number=phone,
                status=WithdrawalRequest.STATUS_PROCESSING,
                notes='Auto-payout: wallet balance reached threshold',
            )

        # Intasend call outside the lock — failure here is caught and retried
        client = IntasendClient()
        response = client.send_b2c(
            phone_number=phone,
            amount=int(amount),
            name=full_name,
            narrative=f'eFundi auto payout {withdrawal.pk}',
        )

        tracking_id = response.get('tracking_id', '')
        withdrawal.originator_conversation_id = tracking_id
        withdrawal.save(update_fields=['originator_conversation_id', 'updated_at'])

        create_notification(
            user,
            'Auto-payout initiated',
            f'KSh {amount} is being sent to your M-Pesa {phone}.',
            Notification.EVENT_WITHDRAWAL_APPROVED,
        )

    except IntasendError as exc:
        if withdrawal.pk:
            withdrawal.status = WithdrawalRequest.STATUS_FAILED
            withdrawal.result_description = str(exc)
            withdrawal.save(update_fields=['status', 'result_description', 'updated_at'])
        raise self.retry(exc=exc)


@shared_task
def run_export_job(export_job_id):
    job = ExportJob.objects.filter(pk=export_job_id).first()
    if job is None:
        return
    job.status = ExportJob.STATUS_RUNNING
    job.save(update_fields=['status'])

    try:
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        export_type = job.export_type
        # Build queryset based on export type
        if export_type == ExportJob.EXPORT_PAYMENTS:
            qs = Payment.objects.select_related('booking_id')
            headers = ['id', 'booking', 'amount', 'transaction_reference', 'payment_status', 'payment_method', 'payer_phone_number', 'created_at']
            writer.writerow(headers)
            for p in qs.iterator():
                writer.writerow([
                    p.id,
                    str(p.booking_id) if p.booking_id else '',
                    str(p.amount),
                    p.transaction_reference or '',
                    p.payment_status or '',
                    p.payment_method or '',
                    p.payer_phone_number or '',
                    p.created_at.isoformat() if p.created_at else '',
                ])
        elif export_type == ExportJob.EXPORT_WALLETS:
            from .models import TechnicianWallet
            qs = TechnicianWallet.objects.select_related('technician_id')
            headers = ['id', 'technician', 'balance', 'total_earned', 'total_withdrawn', 'updated_at']
            writer.writerow(headers)
            for w in qs.iterator():
                writer.writerow([
                    w.id,
                    str(w.technician_id) if w.technician_id else '',
                    str(w.balance),
                    str(w.total_earned),
                    str(w.total_withdrawn),
                    w.updated_at.isoformat() if w.updated_at else '',
                ])
        elif export_type == ExportJob.EXPORT_WITHDRAWALS:
            from .models import WithdrawalRequest
            qs = WithdrawalRequest.objects.select_related('technician_id')
            headers = ['id', 'technician', 'amount', 'status', 'phone_number', 'notes', 'created_at']
            writer.writerow(headers)
            for wd in qs.iterator():
                writer.writerow([
                    wd.id,
                    str(wd.technician_id) if wd.technician_id else '',
                    str(wd.amount),
                    wd.status,
                    wd.phone_number,
                    wd.notes or '',
                    wd.created_at.isoformat() if wd.created_at else '',
                ])
        elif export_type == ExportJob.EXPORT_TECHNICIAN:
            qs = Payment.objects.filter(booking_id__technician_id__isnull=False).select_related('booking_id')
            headers = ['id', 'booking', 'amount', 'transaction_reference', 'payment_status', 'payer_phone_number', 'created_at']
            writer.writerow(headers)
            for p in qs.iterator():
                writer.writerow([
                    p.id,
                    str(p.booking_id) if p.booking_id else '',
                    str(p.amount),
                    p.transaction_reference or '',
                    p.payment_status or '',
                    p.payer_phone_number or '',
                    p.created_at.isoformat() if p.created_at else '',
                ])
        elif export_type == ExportJob.EXPORT_CUSTOMER:
            qs = Payment.objects.filter(booking_id__customer_id__isnull=False).select_related('booking_id')
            headers = ['id', 'booking', 'amount', 'transaction_reference', 'payment_status', 'payer_phone_number', 'created_at']
            writer.writerow(headers)
            for p in qs.iterator():
                writer.writerow([
                    p.id,
                    str(p.booking_id) if p.booking_id else '',
                    str(p.amount),
                    p.transaction_reference or '',
                    p.payment_status or '',
                    p.payer_phone_number or '',
                    p.created_at.isoformat() if p.created_at else '',
                ])
        else:
            raise ValueError('Unsupported export type')

        content = buffer.getvalue().encode('utf-8')
        filename = f"export_{job.export_type}_{timezone.now().strftime('%Y%m%d%H%M%S')}.csv"
        media_root = getattr(settings, 'MEDIA_ROOT', None)
        if not media_root:
            media_root = os.path.join(os.getcwd(), 'media')
        export_dir = Path(media_root) / 'exports'
        export_dir.mkdir(parents=True, exist_ok=True)
        file_path = export_dir / filename
        file_path.write_bytes(content)

        # attach to job
        job.file.name = f'exports/{filename}'
        job.status = ExportJob.STATUS_COMPLETED
        job.completed_at = timezone.now()
        job.save(update_fields=['file', 'status', 'completed_at'])
    except Exception as exc:
        job.status = ExportJob.STATUS_FAILED
        job.error = str(exc)
        job.save(update_fields=['status', 'error'])
        raise
