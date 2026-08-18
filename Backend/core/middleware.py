# core/middleware.py

from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import User, AnonymousUser


@database_sync_to_async
def get_user_from_token(token):
    """
    Проверяет JWT access-токен и возвращает соответствующего User.
    Если токен невалиден/просрочен — возвращает AnonymousUser
    (тогда consumer сам решит закрыть соединение).
    """
    try:
        # AccessToken(token) сам проверяет подпись и срок действия токена
        validated_token = AccessToken(token)
        user_id = validated_token["user_id"]   # simplejwt кладёт id юзера внутрь токена
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware для Django Channels: достаёт JWT-токен из query-параметров
    WebSocket-соединения (ws://.../ws/orders/?token=xxx) и кладёт
    соответствующего пользователя в scope["user"] — так же, как это
    делает обычная HTTP-аутентификация для REST API.
    """

    async def __call__(self, scope, receive, send):
        # scope["query_string"] — это байты вида b"token=eyJhbGci..."
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)

        token = query_params.get("token")   # parse_qs возвращает список, даже если параметр один
        if token:
            scope["user"] = await get_user_from_token(token[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)