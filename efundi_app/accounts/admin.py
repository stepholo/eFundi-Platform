"""Admin configuration for the accounts app, including custom user model and related token models."""


from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from unfold.admin import ModelAdmin
from customers.models import Client
from technicians.models import Technician
from .models import User


class AccountClient(Client):
    """Admin proxy so clients appear under Accounts."""

    class Meta:
        proxy = True
        app_label = 'accounts'
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'


class AccountTechnician(Technician):
    """Admin proxy so technicians appear under Accounts."""

    class Meta:
        proxy = True
        app_label = 'accounts'
        verbose_name = 'Technician'
        verbose_name_plural = 'Technicians'


@admin.register(User)
class UserAdmin(ModelAdmin, DjangoUserAdmin):
    list_display = ('user_id','username', 'email', 'first_name', 'last_name',
                    'phone_number','is_active', 'is_staff', 'role', 'created_at',
                    'updated_at', 'last_login')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    list_filter = ('is_active', 'is_staff', 'role','created_at', 'updated_at')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'groups')}),
        ('Important Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'phone_number', 'role', 'password1', 'password2'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_login')


@admin.register(AccountTechnician)
class AccountTechnicianAdmin(ModelAdmin):
    list_display = (
        'user_id', 'first_name', 'last_name', 'email', 'phone_number',
        'years_of_experience', 'is_available', 'verification_status',
        'is_active', 'created_at', 'updated_at'
    )
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    list_filter = ('is_available', 'verification_status', 'is_active', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('user_id', 'email', 'phone_number')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'bio')}),
        ('Professional Info', {'fields': ('specialization', 'years_of_experience')}),
        ('Status Info', {'fields': ('is_available', 'verification_status', 'is_active')}),
        ('Important Dates', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('user_id', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        """Technician profiles are created from users with Technician role."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Technician profiles are deleted when user role changes."""
        return False


@admin.register(AccountClient)
class AccountClientAdmin(ModelAdmin):
    list_display = (
        'user_id', 'first_name', 'last_name', 'email', 'phone_number',
        'created_at', 'updated_at'
    )
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    list_filter = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('user_id', 'email', 'phone_number')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Important Dates', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = (
        'user_id', 'first_name', 'last_name', 'email', 'phone_number',
        'created_at', 'updated_at'
    )

    def has_add_permission(self, request):
        """Client profiles are created from users with Customer role."""
        return False
