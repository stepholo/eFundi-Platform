"""
This is the accounts app models.py file.
It contains the User model which is a custom user model that extends AbstractUser.
The User model will be used for user categorization, authentication and authorization in the application.
"""

from django.core.validators import RegexValidator
from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from uuid import uuid4


class User(AbstractUser):
    """Custom User Model that extends AbstractUser."""

    ROLE_CHOICES = (
        ('Super Admin', 'Super Admin'),
        ('Admin', 'Admin'),
        ('Customer', 'Customer'),
        ('Technician', 'Technician'),
    )
    user_id = models.UUIDField(
        primary_key=True,
        default=uuid4,
        editable=False,
        unique=True,
        help_text="Unique identifier for the user."
    )
    email = models.EmailField(
        verbose_name='Email Address',
        unique=True,
        help_text="""User's email address, used for authentication
                     and communication."""
    )
    verified_email = models.BooleanField(
        default=False,
        help_text="Designates whether the user's email has been verified."
    )
    verified_phone_number = models.BooleanField(
        default=False,
        help_text="Designates whether the user's phone number has been verified."
    )
    phone_number = models.CharField(
        verbose_name='Phone Number',
        max_length=10,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^\d{10}$',
                message='Phone number must contain exactly 10 digits.',
                code='invalid_phone_number'
            )
        ],
        help_text="User's phone number, used for contact."
    )
    first_name = models.CharField(
        verbose_name='First Name',
        max_length=30,
        help_text="User's first name."
    )
    last_name = models.CharField(
        verbose_name='Last Name',
        max_length=30,
        help_text="User's last name."
    )
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text="Unique username for the user, used for authentication."
    )
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True,
        help_text="Profile picture of the user."
    )
    is_active = models.BooleanField(
        verbose_name='is_active',
        default=False,
        help_text="""Designates whether this user should be treated as active.
                    Unselect this instead of deleting accounts."""
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the admin site."
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Designates whether the user has completed the verification process."
    )
    last_login = models.DateTimeField(
        null=True,
        blank=True,
        help_text="The last time the user logged in."
    )
    role = models.CharField(
        choices=ROLE_CHOICES,
        default='Customer',
        help_text="""The role of the user, which determines their permissions
                    and access level in the application."""
    )
    groups = models.ManyToManyField(
        Group,
        blank=True,
        related_name='efundi_users_groups',
        verbose_name='groups',
        help_text="""The groups this user belongs to. A user will get all
                     permissions granted to each of their groups."""
    )
    user_permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name='efundi_users_permissions',
        verbose_name='user permissions',
        help_text="""Specific permissions for this user. These permissions will
                     be added to any permissions the user has through their groups."""
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time when the user account was created."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="The date and time when the user account was last updated."
    )

    def __str__(self):
        """String representation of the User model."""
        return f"{self.first_name} {self.last_name} ({self.email})"""

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ['-created_at']
        db_table = 'efundi_user'
        indexes = [
            models.Index(fields=['email'], name='email_idx'),
            models.Index(fields=['phone_number'], name='phone_number_idx'),
            models.Index(fields=['username'], name='username_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['email'], name='unique_email'),
            models.UniqueConstraint(fields=['phone_number'], name='unique_phone_number'),
            models.UniqueConstraint(fields=['username'], name='unique_username'),
        ]
