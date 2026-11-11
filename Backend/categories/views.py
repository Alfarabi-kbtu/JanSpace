from rest_framework import viewsets
from rest_framework.throttling import UserRateThrottle
from .models import Category
from .serializers import CategorySerializer
from core.permissions import IsAdminOrReadOnly
from core.throttles import CatalogAnonRateThrottle


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    throttle_classes = [CatalogAnonRateThrottle, UserRateThrottle]