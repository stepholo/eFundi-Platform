"""Admin configuration for payments."""

from django.contrib import admin, messages
from django.http import HttpResponse
from unfold.admin import ModelAdmin
import csv
import datetime

from .models import Payment, TechnicianWallet, WithdrawalRequest


def _is_superuser(request):
    return getattr(request.user, 'is_superuser', False)


def _format_datetime(value):
    return value.isoformat() if value is not None else ''


def export_payments_as_csv(modeladmin, request, queryset):
    if not _is_superuser(request):
        return
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f'payments_{timestamp}.csv'
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    headers = [
        'id', 'booking', 'amount', 'transaction_reference', 'payment_status',
        'payment_method', 'payer_phone_number', 'merchant_request_id',
        'checkout_request_id', 'created_at', 'updated_at'
    ]
    writer.writerow(headers)
    for p in queryset.iterator():
        writer.writerow([
            p.id,
            str(p.booking_id) if p.booking_id else '',
            str(p.amount),
            p.transaction_reference or '',
            p.payment_status or '',
            p.payment_method or '',
            p.payer_phone_number or '',
            p.merchant_request_id or '',
            p.checkout_request_id or '',
            _format_datetime(p.created_at),
            _format_datetime(p.updated_at),
        ])
    return response


export_payments_as_csv.short_description = 'Export selected payments as CSV (superusers only)'


def export_wallets_as_csv(modeladmin, request, queryset):
    if not _is_superuser(request):
        return
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f'wallets_{timestamp}.csv'
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    headers = ['id', 'technician', 'balance', 'total_earned', 'total_withdrawn', 'updated_at']
    writer.writerow(headers)
    for w in queryset.iterator():
        writer.writerow([
            w.id,
            str(w.technician_id) if w.technician_id else '',
            str(w.balance),
            str(w.total_earned),
            str(w.total_withdrawn),
            _format_datetime(w.updated_at),
        ])
    return response


export_wallets_as_csv.short_description = 'Export selected wallets as CSV (superusers only)'


def export_withdrawals_as_csv(modeladmin, request, queryset):
    if not _is_superuser(request):
        return
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f'withdrawals_{timestamp}.csv'
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    headers = ['id', 'technician', 'amount', 'status', 'phone_number', 'notes', 'created_at', 'updated_at']
    writer.writerow(headers)
    for wd in queryset.iterator():
        writer.writerow([
            wd.id,
            str(wd.technician_id) if wd.technician_id else '',
            str(wd.amount),
            wd.status,
            wd.phone_number,
            wd.notes or '',
            _format_datetime(wd.created_at),
            _format_datetime(wd.updated_at),
        ])
    return response


export_withdrawals_as_csv.short_description = 'Export selected withdrawals as CSV (superusers only)'


def approve_withdrawals(modeladmin, request, queryset):
    """Trigger Intasend B2C payout for each selected pending withdrawal."""
    from mpesa_custom.services import IntasendClient, IntasendError
    sent = 0
    skipped = 0
    for withdrawal in queryset.filter(status=WithdrawalRequest.STATUS_PENDING):
        wallet, _ = TechnicianWallet.objects.get_or_create(
            technician_id=withdrawal.technician_id
        )
        if wallet.balance < withdrawal.amount:
            messages.error(
                request,
                f'Withdrawal #{withdrawal.pk}: insufficient balance '
                f'(wallet KSh {wallet.balance}, requested KSh {withdrawal.amount}).',
            )
            skipped += 1
            continue
        tech = withdrawal.technician_id
        try:
            client = IntasendClient()
            response = client.send_b2c(
                phone_number=withdrawal.phone_number,
                amount=int(withdrawal.amount),
                name=f'{tech.first_name} {tech.last_name}',
                narrative=f'eFundi withdrawal {withdrawal.pk}',
            )
        except IntasendError as exc:
            messages.error(request, f'Withdrawal #{withdrawal.pk}: payout failed — {exc}')
            skipped += 1
            continue
        withdrawal.status = WithdrawalRequest.STATUS_PROCESSING
        withdrawal.originator_conversation_id = response.get('tracking_id', '')
        withdrawal.save(update_fields=[
            'status', 'originator_conversation_id', 'updated_at',
        ])
        sent += 1
    if sent:
        messages.success(request, f'{sent} withdrawal(s) sent for M-Pesa B2C processing.')
    if skipped:
        messages.warning(request, f'{skipped} withdrawal(s) skipped — see errors above.')


approve_withdrawals.short_description = 'Approve selected withdrawals (trigger M-Pesa B2C payout)'


def reject_withdrawals(modeladmin, request, queryset):
    updated = queryset.filter(status=WithdrawalRequest.STATUS_PENDING).update(
        status=WithdrawalRequest.STATUS_REJECTED
    )
    messages.success(request, f'{updated} withdrawal(s) rejected.')


reject_withdrawals.short_description = 'Reject selected pending withdrawals'


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = (
        'id', 'booking_id', 'amount', 'transaction_reference',
        'payment_status', 'payment_method', 'payer_phone_number',
        'merchant_request_id', 'checkout_request_id', 'created_at', 'updated_at'
    )
    search_fields = (
        'transaction_reference', 'payment_status', 'payment_method',
        'payer_phone_number', 'merchant_request_id', 'checkout_request_id',
    )
    list_filter = ('payment_status', 'payment_method', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    actions = [export_payments_as_csv]


@admin.register(TechnicianWallet)
class TechnicianWalletAdmin(ModelAdmin):
    list_display = (
        'technician_id', 'balance', 'total_earned',
        'total_withdrawn', 'updated_at'
    )
    search_fields = ('technician_id__email', 'technician_id__first_name', 'technician_id__last_name')
    ordering = ('-updated_at',)
    readonly_fields = ('updated_at',)
    actions = [export_wallets_as_csv]


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(ModelAdmin):
    list_display = (
        'id', 'technician_id', 'amount', 'status',
        'phone_number', 'result_description', 'originator_conversation_id', 'created_at',
    )
    search_fields = ('technician_id__email', 'phone_number', 'status')
    list_filter = ('status', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    readonly_fields = (
        'status', 'result_code', 'result_description',
        'originator_conversation_id', 'conversation_id',
        'created_at', 'updated_at',
    )
    actions = [approve_withdrawals, reject_withdrawals, export_withdrawals_as_csv]
