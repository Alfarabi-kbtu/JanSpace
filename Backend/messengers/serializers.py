from rest_framework import serializers
from .models import Messengers


class MessengersSerializer(serializers.ModelSerializer):
    class Meta:
        model = Messengers
        fields = "__all__"