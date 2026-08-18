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

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-order_date"]   # новые заказы показываются первыми

    def __str__(self):
        return f"Order {self.order_id} ({self.order_status})"