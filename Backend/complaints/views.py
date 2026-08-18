from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Complaints
from .serializers import ComplaintsSerializer


class ComplaintsViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # пользователь видит только свои жалобы
        return Complaints.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)