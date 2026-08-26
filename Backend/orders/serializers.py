from django.utils import timezone
from rest_framework import serializers
from .models import Order, OrderServiceItem
from products.models import Product
from products.serializers import ProductSerializer
from services.models import Services
from services.serializers import ServicesSerializer


class OrderServiceItemSerializer(serializers.ModelSerializer):
    # Для чтения: к какому товару относится услуга и её зафиксированная (на
    # момент оформления заказа) цена — не текущая цена в каталоге
    product = serializers.PrimaryKeyRelatedField(read_only=True)
    product_name = serializers.CharField(source="product.product_name", read_only=True)

    class Meta:
        model = OrderServiceItem
        fields = ["id", "product", "product_name", "service_name", "price_snapshot", "details"]
        read_only_fields = fields


class AttachedServiceInputSerializer(serializers.Serializer):
    # Для записи: клиент присылает только product_id/service_id/details —
    # название и цену сервер сам берёт из каталога (Services) в
    # OrderSerializer._sync_attached_services, а не из тела запроса, чтобы
    # клиент не мог подменить цену услуги
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    service_id = serializers.PrimaryKeyRelatedField(queryset=Services.objects.all())
    details = serializers.CharField(required=False, allow_blank=True, default="")


class OrderSerializer(serializers.ModelSerializer):
    # для чтения — полные объекты товаров/услуг
    product = ProductSerializer(many=True, read_only=True)
    services = ServicesSerializer(many=True, read_only=True)

    # для записи — просто списки id
    product_ids = serializers.PrimaryKeyRelatedField(
        queryset=Order._meta.get_field("product").related_model.objects.all(),
        source="product",
        write_only=True,
        many=True,
        required=False
    )
    service_ids = serializers.PrimaryKeyRelatedField(
        queryset=Order._meta.get_field("services").related_model.objects.all(),
        source="services",
        write_only=True,
        many=True,
        required=False
    )

    # Доп.услуги, привязанные к конкретным товарам заказа (гравировка,
    # подарочная упаковка...) — отдельный сценарий от services/service_ids
    # выше, которые описывают услугу как САМОСТОЯТЕЛЬНУЮ позицию заказа,
    # не связанную ни с одним товаром
    service_items = OrderServiceItemSerializer(many=True, read_only=True)
    attached_services = AttachedServiceInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Order
        fields = [
            "order_id", "order_date", "order_status", "user",
            "product", "product_ids",
            "services", "service_ids",
            "service_items", "attached_services",
            "fulfillment_type", "delivery_address",
            "preorder_requested", "preorder_date",
        ]
        read_only_fields = ["order_id", "order_date", "user"]   # эти поля клиент не задаёт сам

     # ---- Валидация НЕСКОЛЬКИХ полей сразу (метод validate, без подчёркивания) ----
    def validate(self, data):
        # data — это словарь со всеми полями, которые прошли через отдельные validate_<field>
        # При partial=True (PATCH) сюда попадают ТОЛЬКО явно переданные поля —
        # если клиент прислал один order_status, ключей "product"/"services"
        # в data вообще не будет. Раньше data.get(..., []) в этом случае молча
        # трактовал заказ как "пустой", хотя товары/услуги уже были в БД.
        # Поэтому если поле не передано — берём текущее значение из instance,
        # а не считаем его пустым.
        if "product" in data:
            products = data["product"]
        elif self.instance is not None:
            products = list(self.instance.product.all())
        else:
            products = []

        if "services" in data:
            services = data["services"]
        elif self.instance is not None:
            services = list(self.instance.services.all())
        else:
            services = []

        # Проверяем: заказ должен содержать хотя бы 1 товар ИЛИ хотя бы 1 услугу
        if not products and not services:
            raise serializers.ValidationError(
                "Заказ должен содержать хотя бы один товар или одну услугу."
            )

        # Доп.услуга, привязанная к товару, обязана ссылаться на товар,
        # который реально есть в этом заказе — иначе неясно, к чему она
        # вообще относится (та самая проблема, из-за которой это поле и
        # появилось: раньше гравировка была глобальным флагом заказа)
        if "attached_services" in data:
            product_ids_in_order = {p.id for p in products}
            for entry in data["attached_services"]:
                product = entry["product_id"]
                if product.id not in product_ids_in_order:
                    raise serializers.ValidationError(
                        {"attached_services": f"Товар «{product.product_name}» не найден в этом заказе."}
                    )

        # Способ получения (самовывоз/доставка) и предзаказ — та же логика
        # "не передано в PATCH -> берём из instance", что и для
        # product/services выше
        def field_or_instance(field_name, fallback):
            if field_name in data:
                return data[field_name]
            if self.instance is not None:
                return getattr(self.instance, field_name)
            return fallback

        fulfillment_type = field_or_instance("fulfillment_type", Order.FULFILLMENT_PICKUP)
        delivery_address = field_or_instance("delivery_address", "")
        preorder_requested = field_or_instance("preorder_requested", False)
        preorder_date = field_or_instance("preorder_date", None)

        if fulfillment_type == Order.FULFILLMENT_DELIVERY and not delivery_address.strip():
            raise serializers.ValidationError(
                {"delivery_address": "Укажите адрес доставки."}
            )
        if preorder_requested:
            if preorder_date is None:
                raise serializers.ValidationError(
                    {"preorder_date": "Укажите желаемую дату получения заказа."}
                )
            if preorder_date < timezone.localdate():
                raise serializers.ValidationError(
                    {"preorder_date": "Дата получения не может быть в прошлом."}
                )

        # Поля доп.опций не должны оставаться в БД, если клиент их отключил
        # (например, переключился с доставки на самовывоз через PATCH)
        data["delivery_address"] = delivery_address if fulfillment_type == Order.FULFILLMENT_DELIVERY else ""
        data["preorder_date"] = preorder_date if preorder_requested else None

        return data   # ОБЯЗАТЕЛЬНО вернуть data целиком

    def create(self, validated_data):
        attached_services_data = validated_data.pop("attached_services", [])
        order = super().create(validated_data)
        self._sync_attached_services(order, attached_services_data)
        return order

    def update(self, instance, validated_data):
        # None (ключ вообще не пришёл) отличаем от [] (клиент явно очистил
        # список) — как и с product_ids/service_ids, "не передано" не трогает
        # уже сохранённые привязанные услуги
        attached_services_data = validated_data.pop("attached_services", None)
        order = super().update(instance, validated_data)
        if attached_services_data is not None:
            self._sync_attached_services(order, attached_services_data)
        return order

    def _sync_attached_services(self, order, attached_services_data):
        # Полностью заменяем набор привязанных услуг присланным списком —
        # то же поведение "replace целиком", что и у product_ids/service_ids
        order.service_items.all().delete()
        for entry in attached_services_data:
            service = entry["service_id"]
            OrderServiceItem.objects.create(
                order=order,
                product=entry["product_id"],
                service=service,
                service_name=service.service_name,
                price_snapshot=service.service_price,   # снимок цены сервером, не от клиента
                details=entry.get("details", ""),
            )
