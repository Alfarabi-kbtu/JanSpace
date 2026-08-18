from rest_framework import serializers
from .models import Order
from products.serializers import ProductSerializer
from services.serializers import ServicesSerializer


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

    class Meta:
        model = Order
        fields = [
            "order_id", "order_date", "order_status", "user",
            "product", "product_ids",
            "services", "service_ids",
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
        return data   # ОБЯЗАТЕЛЬНО вернуть data целиком