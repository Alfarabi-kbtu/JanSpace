from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Complaints


class ComplaintsApiTests(APITestCase):
    # /api/complaints/ — только для авторизованных, каждый юзер видит и может
    # управлять только своими жалобами (get_queryset фильтрует по user,
    # тот же паттерн, что и в orders/views.py)

    def setUp(self):
        self.user = User.objects.create_user(username="ivan", password="Ivan-Pass!1")
        self.other_user = User.objects.create_user(username="petr", password="Petr-Pass!1")
        self.list_url = reverse("complaint-list")

    def _detail_url(self, complaint):
        return reverse("complaint-detail", args=[complaint.id])

    def _payload(self, **overrides):
        # user намеренно не передаём — он read_only в ComplaintsSerializer
        # и проставляется во view через perform_create(user=request.user)
        payload = {
            "complaint_address": "ivan@example.com",
            "complaint_text": "Товар пришёл повреждённым, прошу разобраться.",
        }
        payload.update(overrides)
        return payload

    def test_list_complaints_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_complaints_returns_only_own_complaints(self):
        # Arrange
        own_complaint = Complaints.objects.create(
            user=self.user,
            complaint_address="ivan@example.com",
            complaint_text="Моя собственная жалоба на плохое качество.",
        )
        Complaints.objects.create(
            user=self.other_user,
            complaint_address="petr@example.com",
            complaint_text="Чужая жалоба, которую я видеть не должен.",
        )
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(returned_ids, [own_complaint.id])

    def test_create_complaint_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(self.list_url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_complaint_succeeds_and_assigns_current_user(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.list_url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint = Complaints.objects.get(id=response.data["id"])
        self.assertEqual(complaint.user, self.user)

    def test_create_complaint_without_user_field_in_body_succeeds(self):
        # user — read_only, клиенту не нужно (и не нужно было бы уметь)
        # передавать его самому, чтобы создать жалобу
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.list_url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_complaint_ignores_user_field_from_request_body(self):
        # perform_create() в ComplaintsViewSet всегда проставляет user=request.user,
        # даже если клиент попытается подсунуть чужого юзера в теле запроса
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.list_url, self._payload(user=self.other_user.id)
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint = Complaints.objects.get(id=response.data["id"])
        self.assertEqual(complaint.user, self.user)

    def test_create_complaint_with_short_text_returns_400(self):
        # validate_complaint_text() требует минимум 10 символов после strip()
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.list_url, self._payload(complaint_text="коротко")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_complaint_with_invalid_email_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.list_url, self._payload(complaint_address="not-an-email")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_created_at_is_read_only_and_set_automatically(self):
        # created_at — auto_now_add, DRF помечает такие поля read_only
        # автоматически, значение из запроса должно игнорироваться
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.list_url, self._payload(created_at="2000-01-01T00:00:00Z")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint = Complaints.objects.get(id=response.data["id"])
        self.assertNotEqual(complaint.created_at.year, 2000)

    def test_retrieve_other_users_complaint_returns_404(self):
        # queryset уже отфильтрован по user, поэтому чужая жалоба выглядит
        # как несуществующая (404), а не как запрещённая (403)
        # Arrange
        other_complaint = Complaints.objects.create(
            user=self.other_user,
            complaint_address="petr@example.com",
            complaint_text="Чужая жалоба, недоступная для просмотра.",
        )
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.get(self._detail_url(other_complaint))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_complaint_succeeds(self):
        # Arrange
        complaint = Complaints.objects.create(
            user=self.user,
            complaint_address="ivan@example.com",
            complaint_text="Жалоба, которую владелец сам и удалит.",
        )
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.delete(self._detail_url(complaint))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Complaints.objects.filter(id=complaint.id).exists())

    def test_delete_other_users_complaint_returns_404(self):
        # Arrange
        other_complaint = Complaints.objects.create(
            user=self.other_user,
            complaint_address="petr@example.com",
            complaint_text="Чужая жалоба, которую нельзя удалить.",
        )
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.delete(self._detail_url(other_complaint))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Complaints.objects.filter(id=other_complaint.id).exists())
