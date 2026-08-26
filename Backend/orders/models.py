import uuid                              # для UUID в order_id
from django.db import models
from django.contrib.auth.models import User   # для поля user (FK)
from products.models import Product      # для ManyToMany product
from services.models import Services     # для ManyToMany services
class Order(models.Model):
    # Статусы заказа. Используем choices, чтобы избежать "опечаток" в статусах
    # и чтобы DRF мог валидировать значение автоматически.
    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    order_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,   # UUID генерируется автоматически при создании
        editable=False
    )

    order_date = models.DateTimeField(auto_now_add=True)  # проставляется автоматически при создании заказа

    order_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,   # если пользователь удалён — его заказы тоже удаляем
        related_name="orders"
    )

    # ManyToMany: один заказ может содержать много товаров,
    # и один товар может быть в нескольких заказах
    product = models.ManyToManyField(
        Product,
        related_name="orders",
        blank=True
    )

    # ManyToMany для услуг — аналогично товарам
    services = models.ManyToManyField(
        Services,
        related_name="orders",
        blank=True
    )

    # Способ получения заказа выбирается на чекауте — либо самовывоз, либо
    # доставка (тогда обязателен delivery_address, см. валидацию в
    # orders/serializers.py). Это ортогонально гравировке и предзаказу ниже —
    # клиент может, например, заказать доставку И гравировку одновременно.
    FULFILLMENT_PICKUP = "pickup"
    FULFILLMENT_DELIVERY = "delivery"

    FULFILLMENT_CHOICES = [
        (FULFILLMENT_PICKUP, "Самовывоз"),
        (FULFILLMENT_DELIVERY, "Доставка"),
    ]

    fulfillment_type = models.CharField(
        max_length=20,
        choices=FULFILLMENT_CHOICES,
        default=FULFILLMENT_PICKUP,
    )

    # Заполняется только при fulfillment_type == "delivery"
    delivery_address = models.CharField(max_length=500, blank=True, default="")

    # Предзаказ — независимая доп.опция заказа. preorder_date (желаемая дата
    # получения) обязателен только когда preorder_requested=True
    preorder_requested = models.BooleanField(default=False)
    preorder_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-order_date"]   # новые заказы показываются первыми

    def __str__(self):
        return f"Order {self.order_id} ({self.order_status})"


class OrderServiceItem(models.Model):
    """
    Доп.услуга (гравировка, подарочная упаковка и т.п.), выбранная для
    КОНКРЕТНОГО товара в заказе — в отличие от Order.services (услуга как
    самостоятельная позиция заказа, никак не связанная с товаром: клиент
    добавил её в корзину отдельно, а не выбрал для конкретной вещи).

    service_name/price_snapshot — снимок названия и цены услуги на момент
    оформления заказа (заполняются сервером из Services, а не из данных,
    присланных клиентом — см. OrderSerializer._sync_attached_services).
    Так последующее изменение цены услуги в каталоге не меняет задним числом
    уже оформленные заказы, а клиент не может подменить цену.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="service_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attached_service_items")
    # SET_NULL — если услугу удалят из каталога, снимок (service_name/price_snapshot)
    # в уже оформленных заказах должен остаться читаемым
    service = models.ForeignKey(Services, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items")

    service_name = models.CharField(max_length=255)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    details = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Order service item"
        verbose_name_plural = "Order service items"

    def __str__(self):
        return f"{self.service_name} → {self.product.product_name}"