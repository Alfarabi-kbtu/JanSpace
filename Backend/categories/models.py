from django.db import models
class Category(models.Model):
    id = models.AutoField(primary_key=True)

    product_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Название категории для товаров (например: 'Электроника')"
    )
    service_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Название категории для услуг (например: 'Ремонт')"
    )

    # Особый тип категории. По умолчанию — обычная категория товаров/услуг.
    # kind=delivery/preorder — категории способов получения заказа (см.
    # orders.Order.fulfillment_type/preorder_requested). kind=engraving —
    # категория услуг, которые можно привязать к КОНКРЕТНОМУ товару в корзине
    # (гравировка, подарочная упаковка и т.п., см. orders.OrderServiceItem) —
    # название "engraving" исторически от первой такой услуги, охватывает
    # любые привязываемые к товару доп.услуги, не только буквально гравировку.
    KIND_REGULAR = "regular"
    KIND_DELIVERY = "delivery"
    KIND_ENGRAVING = "engraving"
    KIND_PREORDER = "preorder"

    KIND_CHOICES = [
        (KIND_REGULAR, "Обычная категория"),
        (KIND_DELIVERY, "Доставка"),
        (KIND_ENGRAVING, "Гравировка"),
        (KIND_PREORDER, "Предзаказ"),
    ]

    kind = models.CharField(
        max_length=20,
        choices=KIND_CHOICES,
        default=KIND_REGULAR,
        help_text="Обычная категория или один из способов оформления заказа (доставка/гравировка/предзаказ)"
    )

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        # Показываем то поле, которое заполнено
        return self.product_category or self.service_category or f"Category #{self.id}"