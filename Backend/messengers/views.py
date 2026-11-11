from rest_framework import viewsets
from rest_framework.throttling import UserRateThrottle
from .models import Messengers
from .serializers import MessengersSerializer
from core.permissions import IsAdminOrReadOnly
from core.throttles import CatalogAnonRateThrottle


class MessengersViewSet(viewsets.ModelViewSet):
    queryset = Messengers.objects.all()
    serializer_class = MessengersSerializer
    permission_classes = [IsAdminOrReadOnly]
    throttle_classes = [CatalogAnonRateThrottle, UserRateThrottle]