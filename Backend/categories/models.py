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

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        # Показываем то поле, которое заполнено
        return self.product_category or self.service_category or f"Category #{self.id}"