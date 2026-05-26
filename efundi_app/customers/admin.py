"""Client admin is registered under the Accounts app.

Adds a proxy admin view for customer transaction history (payments linked to customer bookings).
"""
from django.contrib import admin
from django.http import HttpResponse
from unfold.admin import ModelAdmin
import csv
import datetime

from .models import Client
from django.apps import apps


def _is_superuser(request):
	return getattr(request.user, 'is_superuser', False)


def _format_datetime(value):
	return value.isoformat() if value is not None else ''


def export_customer_transactions_as_csv(modeladmin, request, queryset):
	if not _is_superuser(request):
		return
	timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
	filename = f'customer_transactions_{timestamp}.csv'
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


export_customer_transactions_as_csv.short_description = 'Export selected customer transactions as CSV (superusers only)'


@admin.register(Client)
class ClientAdmin(ModelAdmin):
	list_display = ('id', 'first_name', 'last_name', 'email', 'phone_number')
	search_fields = ('first_name', 'last_name', 'email', 'phone_number')

	def has_add_permission(self, request):
		"""Client profiles are created automatically when a user registers with Customer role."""
		return False


try:
	Payment = apps.get_model('payments', 'Payment')
except Exception:
	Payment = None

if Payment is not None:
	attrs = {
		'__module__': __name__,
		'Meta': type('Meta', (), {'proxy': True, 'verbose_name': 'Customer Transaction', 'verbose_name_plural': 'Customer Transactions'})
	}
	CustomerTransaction = type('CustomerTransaction', (Payment,), attrs)

	@admin.register(CustomerTransaction)
	class CustomerTransactionAdmin(ModelAdmin):
		list_display = ('id', 'booking_id', 'amount', 'transaction_reference', 'payment_status', 'created_at')
		search_fields = ('transaction_reference', 'booking_id__id', 'payer_phone_number')
		list_filter = ('payment_status', 'payment_method',)
		readonly_fields = ('created_at', 'updated_at')
		actions = [export_customer_transactions_as_csv]

		def get_queryset(self, request):
			qs = super().get_queryset(request)
			return qs.filter(booking_id__customer_id__isnull=False)
