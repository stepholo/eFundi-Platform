"""Role-based permission classes for the eFundi marketplace.

Role hierarchy:
  Super Admin  — full access to everything
  Admin        — manage users and bookings; approve/reject withdrawals
  Customer     — own account, create bookings, make payments, reviews
  Technician   — own account, accept/work bookings, wallet, withdrawals
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ── Atomic role guards ────────────────────────────────────────────────────────

class IsAdminOrSuperAdmin(BasePermission):
    """Admin or Super Admin role."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('Admin', 'Super Admin')
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsSuperAdmin(BasePermission):
    """Super Admin only."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'Super Admin'
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsCustomer(BasePermission):
    """Customer role."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'Customer'
        )


class IsTechnician(BasePermission):
    """Technician role."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'Technician'
        )


class IsVerifiedTechnician(BasePermission):
    """Technician whose profile has been admin-verified (verification_status == 'Verified')."""

    message = 'Your technician account must be verified before you can perform this action.'

    def has_permission(self, request, view):
        if not (request.user.is_authenticated and request.user.role == 'Technician'):
            return False
        try:
            return request.user.technician_profile.verification_status == 'Verified'
        except Exception:
            return False


class IsAuthenticated(BasePermission):
    """Any authenticated user regardless of role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated


# ── Object-level ownership ────────────────────────────────────────────────────

def _resolve_owner(obj):
    """
    Return the User that owns obj by traversing the project's FK conventions:
      obj.user_id           → User (Client, Technician)
      obj.customer_id.user_id  → User (Booking, Payment, Review …)
      obj.technician_id.user_id → User (Booking, TechnicianWallet …)
      obj itself            → User
    Returns None if ownership cannot be determined.
    """
    from accounts.models import User
    if isinstance(obj, User):
        return obj
    uid = getattr(obj, 'user_id', None)
    if uid is not None:
        return uid if isinstance(uid, User) else None
    cust = getattr(obj, 'customer_id', None)
    if cust is not None and hasattr(cust, 'user_id'):
        return cust.user_id
    tech = getattr(obj, 'technician_id', None)
    if tech is not None and hasattr(tech, 'user_id'):
        return tech.user_id
    return None


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: the owner may read and write their resource.
    Admin / Super Admin may do anything.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in ('Admin', 'Super Admin'):
            return True
        return _resolve_owner(obj) == user


class IsOwnerReadWriteAdminFull(BasePermission):
    """
    Safe methods: any authenticated user.
    Unsafe methods: owner or Admin.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in ('Admin', 'Super Admin'):
            return True
        if request.method in SAFE_METHODS:
            return True
        return _resolve_owner(obj) == user


# ── Legacy generic permission (kept for backward compat) ──────────────────────

class EfundiPermissions(BasePermission):
    """
    Generic fallback permission used on views not yet migrated to
    role-specific classes.

      Super Admin  → full access
      Admin        → full access except modifying Super Admin accounts
      Customer / Technician → safe methods + own objects
      Unauthenticated → safe methods only
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return request.user.role in ('Admin', 'Super Admin', 'Customer', 'Technician')

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role == 'Super Admin':
            return True
        if user.role == 'Admin':
            from accounts.models import User as UserModel
            if isinstance(obj, UserModel) and obj.role == 'Super Admin':
                return False
            return True
        return _resolve_owner(obj) == user
