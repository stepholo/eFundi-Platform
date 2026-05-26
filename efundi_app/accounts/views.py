"""This module contains views related to user accounts, including registration,
    login, logout, email verification, and password reset.
"""

from rest_framework import viewsets, status, filters, generics, serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from .serializers import UserSerializer, PasswordResetConfirmSerializer
from django.contrib.auth import authenticate, logout
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from drf_yasg.utils import swagger_auto_schema
from .models import User
from utils.permissions import EfundiPermissions
from utils.emails import send_verification_email, send_password_reset_email
from utils.sms import send_phone_verification_sms
from utils.tokens import phone_verification_code


class SwaggerLoginView(generics.GenericAPIView):
    """
    OAuth2 password-flow compatible login used by Swagger UI's Authorize dialog.

    Swagger sends credentials as form-encoded; this view also accepts JSON.
    Returns access_token / token_type so Swagger can auto-attach Bearer auth.
    """

    authentication_classes = []   # no SessionAuthentication → no CSRF enforcement
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['Authentication'],
        summary='Swagger UI login (OAuth2 password flow)',
        description=(
            'Enter your eFundi **username** and **password**. '
            'Swagger UI will call this endpoint automatically when you use the '
            '`credentialsAuth` option in the Authorize dialog and will set '
            '`Authorization: Bearer <token>` on every subsequent request.\n\n'
            'The `role` field in the response tells you which tag group in '
            'Swagger applies to your account (Customer / Technician / Admin).'
        ),
        request=inline_serializer(
            name='SwaggerLoginRequest',
            fields={
                'username': drf_serializers.CharField(),
                'password': drf_serializers.CharField(),
                'grant_type': drf_serializers.CharField(
                    required=False,
                    default='password',
                    help_text='Auto-filled by Swagger UI — leave as "password".',
                ),
            },
        ),
        responses={
            200: inline_serializer(
                name='SwaggerLoginResponse',
                fields={
                    'access_token': drf_serializers.CharField(),
                    'token_type': drf_serializers.CharField(),
                    'refresh_token': drf_serializers.CharField(),
                    'role': drf_serializers.CharField(
                        help_text='Customer | Technician | Admin | Super Admin'
                    ),
                },
            ),
            401: OpenApiResponse(description='Invalid credentials'),
            403: OpenApiResponse(description='Account inactive'),
        },
        auth=[],
    )
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'username and password are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is inactive'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access_token': str(refresh.access_token),
            'token_type': 'bearer',
            'refresh_token': str(refresh),
            'role': user.role,
        })


@swagger_auto_schema(tags=['Accounts'])
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user accounts, including registration and details."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [EfundiPermissions]
    lookup_field = 'user_id'
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    ordering_fields = ('created_at', 'updated_at', 'last_login')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def perform_queryset(self):
        """Override to filter queryset based on user role."""
        user = self.request.user
        if user.is_authenticated and user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(user_id=user.user_id)


@swagger_auto_schema(tags=['Accounts'])
class UserRegistrationView(generics.CreateAPIView):
    """API view for user registration."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        serializer.save()


@swagger_auto_schema(tags=['Accounts'])
class UserLoginView(generics.GenericAPIView):
    """API view for user login."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Authenticate user and return JWT tokens."""
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            if not user.is_active:
                return Response(
                    {'error': 'Account is inactive. Please verify your email.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'role': user.role,
            }, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@swagger_auto_schema(tags=['Accounts'])
class UserLogoutView(generics.GenericAPIView):
    """API view for user logout."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Logout user and end session."""
        logout(request)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class EmailVerificationView(generics.GenericAPIView):
    """API view for email verification."""
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """Verify email using token."""
        token = request.query_params.get('token')
        uid = request.query_params.get('uid')
        if not uid or not token:
            return Response({'error': 'Missing uid or token.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'error': 'Invalid uid.'}, status=status.HTTP_400_BAD_REQUEST)

        generator = PasswordResetTokenGenerator()
        if not generator.check_token(user, token):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.verified_email = True
        user.save()

        if user.role == 'Technician':
            from utils.emails import send_notification_email
            send_notification_email(
                to_email=user.email,
                subject='Your eFundi technician account is pending verification',
                template_name='emails/account_pending.html',
                context={
                    'first_name': user.first_name,
                    'verification_status': 'Pending',
                },
            )

        return Response({'message': 'Email verified successfully'}, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    summary='Resend email verification link',
    request=inline_serializer(
        name='ResendVerificationBody',
        fields={'email': drf_serializers.EmailField()},
    ),
    responses={
        200: inline_serializer(
            name='ResendVerificationResponse',
            fields={'message': drf_serializers.CharField()},
        ),
        400: OpenApiResponse(description='Invalid email or account already active'),
    },
    auth=[],
)
class EmailVerificationConfirmView(generics.GenericAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user and not user.is_active:
            send_verification_email(user, request)
            return Response(
                {'message': 'Verification email resent. Please check your inbox.'},
                status=status.HTTP_200_OK,
            )
        return Response(
            {'error': 'Invalid email or account already active.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


@extend_schema(
    tags=['Authentication'],
    summary='Request a password reset email',
    request=inline_serializer(
        name='PasswordResetRequestBody',
        fields={'email': drf_serializers.EmailField()},
    ),
    responses={200: inline_serializer(
        name='PasswordResetRequestResponse',
        fields={'message': drf_serializers.CharField()},
    )},
    auth=[],
)
class PasswordResetRequestView(generics.GenericAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user:
            send_password_reset_email(user, request)
        return Response(
            {'message': 'If an account with that email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=['Authentication'],
    summary='Confirm password reset with uid, token and new password',
    methods=['GET', 'POST'],
)
class PasswordResetConfirmView(generics.GenericAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def get_serializer(self, *args, **kwargs):
        kwargs.setdefault('initial', {
            'uid': self.request.query_params.get('uid', ''),
            'token': self.request.query_params.get('token', ''),
        })
        return super().get_serializer(*args, **kwargs)

    @extend_schema(
        summary='Validate password reset token (called when user clicks email link)',
        parameters=[
            drf_serializers.CharField(label='uid'),
            drf_serializers.CharField(label='token'),
        ],
        responses={
            200: inline_serializer(
                name='PasswordResetTokenValidResponse',
                fields={
                    'uid': drf_serializers.CharField(),
                    'token': drf_serializers.CharField(),
                    'message': drf_serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Invalid or expired token'),
        },
        auth=[],
    )
    def get(self, request, *args, **kwargs):
        uid = request.query_params.get('uid')
        token = request.query_params.get('token')
        if not uid or not token:
            return Response({'error': 'Missing uid or token.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'error': 'Invalid uid.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'uid': uid,
            'token': token,
            'message': 'Token is valid. Submit uid, token and new_password via POST to reset your password.',
        }, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Set new password using uid and token',
        request=inline_serializer(
            name='PasswordResetConfirmBody',
            fields={
                'uid': drf_serializers.CharField(),
                'token': drf_serializers.CharField(),
                'new_password': drf_serializers.CharField(),
            },
        ),
        responses={
            200: inline_serializer(
                name='PasswordResetConfirmResponse',
                fields={'message': drf_serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid or expired token'),
        },
        auth=[],
    )
    def post(self, request, *args, **kwargs):
        data = {
            'uid': request.data.get('uid') or request.query_params.get('uid', ''),
            'token': request.data.get('token') or request.query_params.get('token', ''),
            'new_password': request.data.get('new_password', ''),
        }
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'error': 'Invalid uid.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class PhoneVerificationView(generics.GenericAPIView):
    """API view for phone number verification."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Generate OTP and send SMS for phone verification."""
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({'error': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = phone_verification_code()
        send_phone_verification_sms(phone_number, otp_code)
        return Response({'message': 'OTP sent to the provided phone number.'}, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class PhoneVerificationConfirmView(generics.GenericAPIView):
    """API view for confirming phone number verification."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Verify phone number using OTP."""
        user = request.user
        phone_number = request.data.get('phone_number')
        otp_code = request.data.get('otp_code')
        otp_record = get_object_or_404(phone_verification_code, user=user, phone_number=phone_number, code=otp_code)

        if otp_record.is_used:
            return Response({'error': 'OTP has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp_record.expires_at < timezone.now():
            return Response({'error': 'OTP has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.phone_number = phone_number
        user.save()
        otp_record.is_used = True
        otp_record.save()
        return Response({'message': 'Phone number verified successfully'}, status=status.HTTP_200_OK)
