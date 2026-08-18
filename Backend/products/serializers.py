from rest_framework import serializers
from .models import Product
from categories.serializers import CategorySerializer   # вложенный сериализатор категории


class ProductSerializer(serializers.ModelSerializer):
    # read_only=True — категория отдаётся в ответе полным объектом (id, названия),
    # но НЕ используется при создании/редактировании товара
    product_category = CategorySerializer(read_only=True)

    # отдельное поле только для записи: сюда передаём id категории при создании/обновлении
    # (source указывает, что оно пишет в то же поле модели product_category)
    product_category_id = serializers.PrimaryKeyRelatedField(
        queryset=Product._meta.get_field("product_category").related_model.objects.all(),
        source="product_category",
        write_only=True,
        required=False
    )

    class Meta:
        model = Product
        fields = ["id", "product_name", "product_category", "product_category_id", "price", "is_available", "image"]
        
    # ---- Валидация одного поля: price ----
    def validate_price(self, value):
        # value — это то значение, которое пришло от клиента для поля price
        if value <= 0:
            # raise ValidationError — DRF сам вернёт клиенту 400 Bad Request
            # с понятным сообщением об ошибке
            raise serializers.ValidationError("Цена должна быть больше нуля.")
        return value   # ОБЯЗАТЕЛЬНО вернуть value, иначе поле "потеряется"

    # ---- Валидация одного поля: product_name ----
    def validate_product_name(self, value):
        # .strip() убирает пробелы по краям — чтобы "   " не прошло как валидное название
        if not value.strip():
            raise serializers.ValidationError("Название товара не может быть пустым.")
        if len(value) < 2:
            raise serializers.ValidationError("Название товара слишком короткое.")
        return value