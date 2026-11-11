from rest_framework import viewsets
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from .models import Services
from .serializers import ServicesSerializer
from core.permissions import IsAdminOrReadOnly
from core.throttles import CatalogAnonRateThrottle

class ServicesViewSet(viewsets.ModelViewSet):
    queryset = Services.objects.select_related("service_category").all()
    serializer_class = ServicesSerializer
    permission_classes = [IsAdminOrReadOnly]
    throttle_classes = [CatalogAnonRateThrottle, UserRateThrottle]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_available", "service_category"]