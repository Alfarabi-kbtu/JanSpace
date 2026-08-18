from django.contrib import admin
from .models import Product


# Используем @admin.register вместо admin.site.register(),
# чтобы сразу настроить, как модель отображается в списке
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_name", "product_category", "price", "is_available")  # колонки в списке
    list_filter = ("is_available", "product_category")   # фильтры справа
    search_fields = ("product_name",)                     # поле поиска сверху