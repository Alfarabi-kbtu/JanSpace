from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer
from core.permissions import IsAdminOrReadOnly

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("product_category").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    

    # позволяет фильтровать через ?is_available=true&product_category=1
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_available", "product_category"]