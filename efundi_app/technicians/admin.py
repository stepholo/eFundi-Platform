"""Technician admin is registered under the Accounts app.

Adds a proxy admin view for technician transactions (payments linked to technician bookings).
"""
from django.contrib import admin
from django.http import HttpResponse
from unfold.admin import ModelAdmin
import csv
import datetime

from unfold.admin import TabularInline
from .models import Technician
from django.apps import apps


def _is_superuser(request):
	return getattr(request.user, 'is_superuser', False)


def _format_datetime(value):
	return value.isoformat() if value is not None else ''


def export_transactions_as_csv(modeladmin, request, queryset):
	if not _is_superuser(request):
		return
	timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
	filename = f'technician_transactions_{timestamp}.csv'
	response = HttpResponse(content_type='text/csv')
	response['Content-Disposition'] = f'attachment; filename="{filename}"'
	writer = csv.writer(response)
	headers = ['id', 'booking', 'amount', 'transaction_reference', 'payment_status', 'payment_method', 'payer_phone_number', 'created_at']
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
			_format_datetime(p.created_at),
		])
	return response


export_transactions_as_csv.short_description = 'Export selected technician transactions as CSV (superusers only)'


try:
    from payments.models import WithdrawalRequest

    class WithdrawalRequestInline(TabularInline):
        model = WithdrawalRequest
        fk_name = 'technician_id'
        extra = 0
        can_delete = False
        fields = ('amount', 'status', 'phone_number', 'originator_conversation_id', 'created_at')
        readonly_fields = ('amount', 'status', 'phone_number', 'originator_conversation_id', 'created_at')
        show_change_link = True
        verbose_name = 'Withdrawal Request'
        verbose_name_plural = 'Withdrawal History'

except Exception:
    WithdrawalRequestInline = None


@admin.register(Technician)
class TechnicianAdmin(ModelAdmin):
	list_display = ('user_id', 'first_name', 'last_name', 'email', 'phone_number', 'specialization', 'verification_status', 'is_active')
	search_fields = ('first_name', 'last_name', 'email', 'phone_number')
	list_filter = ('verification_status', 'is_active', 'is_available')
	readonly_fields = ('user_id', 'created_at', 'updated_at')
	inlines = [WithdrawalRequestInline] if WithdrawalRequestInline else []

	def has_add_permission(self, request):
		"""Technician profiles are created automatically when a user registers with Technician role."""
		return False

	def save_model(self, request, obj, form, change):
		if change and 'verification_status' in form.changed_data:
			old_status = Technician.objects.filter(pk=obj.pk).values_list(
				'verification_status', flat=True
			).first()
			super().save_model(request, obj, form, change)
			new_status = obj.verification_status
			if old_status != new_status:
				self._sync_user_flags(obj)
				self._send_status_email(obj, new_status)
		else:
			super().save_model(request, obj, form, change)

	def _sync_user_flags(self, technician):
		user = technician.user_id
		is_verified = technician.verification_status == 'Verified'
		user.is_active = is_verified
		user.is_verified = is_verified
		user.save(update_fields=['is_active', 'is_verified'])

	def _send_status_email(self, technician, status):
		from utils.emails import send_notification_email
		templates = {
			'Verified': (
				'emails/account_verified.html',
				'Your eFundi technician account has been verified',
			),
			'Rejected': (
				'emails/account_rejected.html',
				'Update on your eFundi technician application',
			),
		}
		if status not in templates:
			return
		template_name, subject = templates[status]
		send_notification_email(
			to_email=technician.email,
			subject=subject,
			template_name=template_name,
			context={
				'first_name': technician.first_name,
				'last_name': technician.last_name,
				'email': technician.email,
				'verification_status': status,
			},
		)


try:
	Payment = apps.get_model('payments', 'Payment')
except Exception:
	Payment = None

if Payment is not None:
	attrs = {
		'__module__': __name__,
		'Meta': type('Meta', (), {'proxy': True, 'verbose_name': 'Technician Transaction', 'verbose_name_plural': 'Technician Transactions'})
	}
	TechnicianTransaction = type('TechnicianTransaction', (Payment,), attrs)

	@admin.register(TechnicianTransaction)
	class TechnicianTransactionAdmin(ModelAdmin):
		list_display = ('id', 'booking_id', 'amount', 'transaction_reference', 'payment_status', 'created_at')
		search_fields = ('transaction_reference', 'booking_id__id', 'payer_phone_number')
		list_filter = ('payment_status', 'payment_method',)
		readonly_fields = ('created_at', 'updated_at')
		actions = [export_transactions_as_csv]

		def get_queryset(self, request):
			qs = super().get_queryset(request)
			return qs.filter(booking_id__technician_id__isnull=False)
