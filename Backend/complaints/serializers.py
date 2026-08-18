from rest_framework import serializers
from .models import Complaints


class ComplaintsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaints
        fields = "__all__"
        # user проставляется во view (perform_create -> user=request.user),
        # клиент не должен и не может задавать его сам — иначе DRF считает
        # это поле обязательным для записи и требует его в теле запроса
        # (см. тот же паттерн в OrderSerializer.read_only_fields)
        read_only_fields = ["user"]

    def validate_complaint_text(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Текст жалобы слишком короткий, опишите проблему подробнее (минимум 10 символов)."
            )
        return value

    # EmailField уже сам проверяет формат email (test@test.com),
    # доп. валидация тут обычно не нужна — оставляем как есть