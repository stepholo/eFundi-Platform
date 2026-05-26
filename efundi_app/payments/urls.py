"""URL configuration for the payments app."""

from django.urls import path

from .views import PaymentViewSet, TechnicianWalletViewSet, WithdrawalRequestViewSet
from .views import ExportJobViewSet


urlpatterns = [
    path('', PaymentViewSet.as_view({'get': 'list', 'post': 'create'}), name='payment-list'),

    # Intasend STK Push — customer initiates M-Pesa payment
    path('stk-push/', PaymentViewSet.as_view({'post': 'stk_push'}), name='intasend-stk-push'),

    # Intasend webhook — posted by Intasend when STK Push completes (COMPLETE / FAILED)
    # Register this URL in Intasend dashboard → Settings → Webhooks → Collection
    path('intasend/callback/', PaymentViewSet.as_view({'post': 'intasend_callback'}), name='intasend-callback'),

    # Intasend webhook — posted by Intasend when a Send Money payout completes
    # Register this URL in Intasend dashboard → Settings → Webhooks → Send Money
    path('intasend/payout/callback/', PaymentViewSet.as_view({'post': 'intasend_payout_callback'}), name='intasend-payout-callback'),

    # Manual status update — for Cash or testing without STK Push
    path('callback/', PaymentViewSet.as_view({'post': 'callback'}), name='payment-callback'),
    path('wallets/', TechnicianWalletViewSet.as_view({'get': 'list'}), name='wallet-list'),
    path('wallets/<uuid:technician_id>/', TechnicianWalletViewSet.as_view({'get': 'retrieve'}), name='wallet-detail'),
    path('withdrawals/', WithdrawalRequestViewSet.as_view({'get': 'list', 'post': 'create'}), name='withdrawal-list'),
    path('withdrawals/<int:pk>/', WithdrawalRequestViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='withdrawal-detail'),
    path('withdrawals/<int:pk>/approve/', WithdrawalRequestViewSet.as_view({'patch': 'approve'}), name='withdrawal-approve'),
    path('withdrawals/<int:pk>/reject/', WithdrawalRequestViewSet.as_view({'patch': 'reject_withdrawal'}), name='withdrawal-reject'),
    path('<int:pk>/', PaymentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='payment-detail'),
    path('exports/', ExportJobViewSet.as_view({'post': 'create', 'get': 'list'}), name='export-list'),
    path('exports/<int:pk>/download/', ExportJobViewSet.as_view({'get': 'download'}), name='export-download'),
]
