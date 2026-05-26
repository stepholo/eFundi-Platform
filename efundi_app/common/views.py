"""Common utility API views."""

from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Simple API health check."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """Return basic service health."""
        return Response({'status': 'ok'})
