"""
ASGI config for config project.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# ВАЖНО: эта строка должна быть здесь, ДО импорта channels/routing,
# иначе Django приложения ещё не готовы (AppRegistryNotReady)
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from core.middleware import JWTAuthMiddleware
import orders.routing


application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": JWTAuthMiddleware(
        URLRouter(
            orders.routing.websocket_urlpatterns
        )
    ),
})