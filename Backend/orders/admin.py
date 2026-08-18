from django.contrib import admin
from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_id", "user", "order_status", "order_date")
    list_filter = ("order_status",)
    search_fields = ("order_id__iexact", "user__username")  # поиск по ID заказа и юзеру
    # M2M поля (product, services) в list_display напрямую не показываются —
    # Django этого не позволяет, но они доступны при открытии конкретного заказа