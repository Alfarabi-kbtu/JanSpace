from rest_framework import serializers
from .models import Services
from categories.serializers import CategorySerializer


class ServicesSerializer(serializers.ModelSerializer):
    service_category = CategorySerializer(read_only=True)

    service_category_id = serializers.PrimaryKeyRelatedField(
        queryset=Services._meta.get_field("service_category").related_model.objects.all(),
        source="service_category",
        write_only=True,
        required=False
    )

    class Meta:
        model = Services
        fields = ["id", "service_name", "service_category", "service_category_id", "service_price", "is_available", "image"]
        
    def validate_service_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Цена услуги должна быть больше нуля.")
        return value

    def validate_service_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Название услуги не может быть пустым.")
        return value