from django.contrib import admin
from .models import Order, OrderServiceItem


class OrderServiceItemInline(admin.TabularInline):
    # Доп.услуги, привязанные к товарам заказа — показываем прямо на странице
    # заказа, чтобы было видно, к какому товару что относится, без перехода
    # в отдельный список OrderServiceItem
    model = OrderServiceItem
    extra = 0
    readonly_fields = ("product", "service", "service_name", "price_snapshot", "details")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_id", "user", "order_status", "fulfillment_type", "preorder_requested", "order_date")
    list_filter = ("order_status", "fulfillment_type", "preorder_requested")
    search_fields = ("order_id__iexact", "user__username")  # поиск по ID заказа и юзеру
    inlines = [OrderServiceItemInline]
    # M2M поля (product, services) в list_display напрямую не показываются —
    # Django этого не позволяет, но они доступны при открытии конкретного заказа
