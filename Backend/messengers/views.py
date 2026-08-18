from rest_framework import viewsets
from .models import Messengers
from .serializers import MessengersSerializer
from core.permissions import IsAdminOrReadOnly


class MessengersViewSet(viewsets.ModelViewSet):
    queryset = Messengers.objects.all()
    serializer_class = MessengersSerializer
    permission_classes = [IsAdminOrReadOnly]