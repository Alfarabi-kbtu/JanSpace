from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Product
from services.models import Services
from .models import Order


class OrderApiTests(APITestCase):
    # /api/orders/ — только для авторизованных, каждый юзер видит и может
    # управлять только своими заказами (get_queryset фильтрует по user)

    def setUp(self):
        self.user = User.objects.create_user(username="ivan", password="Ivan-Pass!1")
        self.other_user = User.objects.create_user(username="petr", password="Petr-Pass!1")

        self.product = Product.objects.create(product_name="Телефон", price=Decimal("100.00"))
        self.service = Services.objects.create(service_name="Ремонт", service_price=Decimal("50.00"))

        self.list_url = reverse("order-list")

    def _detail_url(self, order):
        return reverse("order-detail", args=[order.order_id])

    def test_list_orders_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_orders_returns_only_own_orders(self):
        # Arrange
        own_order = Order.objects.create(user=self.user)
        own_order.product.add(self.product)
        other_order = Order.objects.create(user=self.other_user)
        other_order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["order_id"] for item in response.data["results"]]
        self.assertEqual(returned_ids, [str(own_order.order_id)])

    def test_create_order_with_product_succeeds_and_assigns_current_user(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.list_url, {"product_ids": [self.product.id]})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(order_id=response.data["order_id"])
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.order_status, Order.STATUS_PENDING)
        self.assertIn(self.product, order.product.all())

    def test_create_order_with_service_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.list_url, {"service_ids": [self.service.id]})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(order_id=response.data["order_id"])
        self.assertIn(self.service, order.services.all())

    def test_create_order_without_products_or_services_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.list_url, {})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_ignores_user_field_from_request_body(self):
        # user — read_only в сериализаторе, попытка подсунуть чужого юзера
        # должна игнорироваться, заказ всегда привязывается к request.user
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.list_url, {"product_ids": [self.product.id], "user": self.other_user.id}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(order_id=response.data["order_id"])
        self.assertEqual(order.user, self.user)

    def test_retrieve_other_users_order_returns_404(self):
        # queryset уже отфильтрован по user, поэтому чужой заказ выглядит
        # как несуществующий (404), а не как запрещённый (403)
        # Arrange
        other_order = Order.objects.create(user=self.other_user)
        other_order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.get(self._detail_url(other_order))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_order_succeeds(self):
        # Arrange
        order = Order.objects.create(user=self.user)
        order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.delete(self._detail_url(order))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Order.objects.filter(order_id=order.order_id).exists())

    def test_delete_other_users_order_returns_404(self):
        # Arrange
        other_order = Order.objects.create(user=self.other_user)
        other_order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.delete(self._detail_url(other_order))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Order.objects.filter(order_id=other_order.order_id).exists())

    @patch("orders.signals.get_channel_layer")
    def test_update_order_status_alone_without_resending_items_succeeds(self, mock_get_channel_layer):
        # OrderSerializer.validate() раньше смотрел только на явно переданные
        # в запросе поля: при partial=True (PATCH) "product"/"services" в data
        # не было вообще, если их не прислать заново, из-за чего заказ ошибочно
        # считался "пустым". Теперь при отсутствии поля в data validate()
        # подставляет текущее значение из instance — PATCH одним order_status
        # должен проходить без повторной отправки товаров/услуг.
        # get_channel_layer мокаем, т.к. смена статуса дёргает pre_save-сигнал
        # с реальным Redis-подключением (см. orders/signals.py)
        # Arrange
        mock_channel_layer = MagicMock()
        mock_channel_layer.group_send = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        order = Order.objects.create(user=self.user)
        order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.patch(
            self._detail_url(order), {"order_status": Order.STATUS_PROCESSING}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.order_status, Order.STATUS_PROCESSING)
        self.assertIn(self.product, order.product.all())

    def test_update_order_explicitly_clearing_all_items_returns_400(self):
        # Если клиент явно прислал пустые product_ids И service_ids —
        # это не "поле не передано", а осознанная попытка оставить заказ
        # без товаров и услуг, и validate() должен её отклонить как обычно.
        # format="json" обязателен: при multipart-кодировании (дефолт
        # test-клиента) пустой список [] вообще пропадает из тела запроса,
        # и сервер не отличит его от "поле не передано".
        # Arrange
        order = Order.objects.create(user=self.user)
        order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.patch(
            self._detail_url(order),
            {"product_ids": [], "service_ids": []},
            format="json",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(self.product, order.product.all())

    @patch("orders.signals.get_channel_layer")
    def test_update_order_status_via_api_notifies_websocket_group(self, mock_get_channel_layer):
        # orders/signals.py шлёт group_send через настоящий Redis channel layer —
        # мокаем get_channel_layer(), чтобы тест не зависел от поднятого Redis/Docker
        # Arrange
        mock_channel_layer = MagicMock()
        mock_channel_layer.group_send = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        order = Order.objects.create(user=self.user)
        order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.patch(
            self._detail_url(order), {"order_status": Order.STATUS_PROCESSING}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_channel_layer.group_send.assert_called_once()
        group_name, payload = mock_channel_layer.group_send.call_args.args
        self.assertEqual(group_name, f"user_{self.user.id}_orders")
        self.assertEqual(payload["order_status"], Order.STATUS_PROCESSING)
        self.assertEqual(payload["order_id"], str(order.order_id))

    @patch("orders.signals.get_channel_layer")
    def test_saving_order_without_status_change_does_not_notify_websocket(self, mock_get_channel_layer):
        # Arrange
        mock_channel_layer = MagicMock()
        mock_channel_layer.group_send = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        order = Order.objects.create(user=self.user)
        order.product.add(self.product)
        self.client.force_authenticate(user=self.user)

        # Act — статус в запросе тот же самый, что уже стоит у заказа
        response = self.client.patch(
            self._detail_url(order), {"order_status": order.order_status}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_channel_layer.group_send.assert_not_called()

    @patch("orders.signals.get_channel_layer")
    def test_creating_order_does_not_notify_websocket(self, mock_get_channel_layer):
        # order_id (UUID pk) генерируется ДО первого save() (default=uuid.uuid4
        # выставляется при __init__), поэтому в сигнале нельзя отличить "новый
        # объект" по pk — вместо этого сигнал ловит Order.DoesNotExist и выходит
        # Arrange
        mock_channel_layer = MagicMock()
        mock_channel_layer.group_send = AsyncMock()
        mock_get_channel_layer.return_value = mock_channel_layer
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.list_url, {"product_ids": [self.product.id]})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_channel_layer.group_send.assert_not_called()
