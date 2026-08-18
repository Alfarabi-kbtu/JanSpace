from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]   # заказы — только для авторизованных

    def get_queryset(self):
        # каждый пользователь видит только СВОИ заказы (не чужие)
        return Order.objects.filter(user=self.request.user).prefetch_related("product", "services")

    def perform_create(self, serializer):
        # при создании заказа user проставляется автоматически = текущий юзер
        serializer.save(user=self.request.user)