from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Services
from .serializers import ServicesSerializer
from core.permissions import IsAdminOrReadOnly

class ServicesViewSet(viewsets.ModelViewSet):
    queryset = Services.objects.select_related("service_category").all()
    serializer_class = ServicesSerializer
    permission_classes = [IsAdminOrReadOnly]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_available", "service_category"]