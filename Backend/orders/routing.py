from django.urls import re_path
from .consumers import OrderStatusConsumer

websocket_urlpatterns = [
    re_path(r"ws/orders/$", OrderStatusConsumer.as_asgi()),
]