import json
from channels.generic.websocket import AsyncWebsocketConsumer


class OrderStatusConsumer(AsyncWebsocketConsumer):
    """
    Consumer подключается, когда фронтенд открывает WebSocket-соединение
    на конкретного пользователя, и слушает изменения статуса ЕГО заказов.
    """

    async def connect(self):
        user = self.scope["user"]

        # Если юзер не авторизован — сразу закрываем соединение
        if user.is_anonymous:
            await self.close()
            return

        # group_name — уникальная "комната" для конкретного юзера,
        # например "user_5_orders" для юзера с id=5
        self.group_name = f"user_{user.id}_orders"

        # Подключаем это соединение к группе
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # При отключении убираем соединение из группы
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Этот метод вызывается, когда в группу приходит событие с type="order_status_update"
    # (см. сигнал ниже — именно так мы будем отправлять сообщения)
    async def order_status_update(self, event):
        # Пересылаем данные события в сам WebSocket клиенту (браузеру/приложению)
        await self.send(text_data=json.dumps({
            "order_id": event["order_id"],
            "order_status": event["order_status"],
        }))