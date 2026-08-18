from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Messengers


class MessengersApiTests(APITestCase):
    # /api/messengers/ — доступен на чтение всем, на запись только is_staff
    # (IsAdminOrReadOnly), тот же паттерн, что у categories

    def setUp(self):
        self.messenger = Messengers.objects.create(
            whatsapp="https://wa.me/1234567890",
            telegram="https://t.me/example",
        )
        self.staff_user = User.objects.create_user(
            username="admin", password="Admin-Pass!1", is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username="user", password="User-Pass!1"
        )
        self.list_url = reverse("messenger-list")
        self.detail_url = reverse("messenger-detail", args=[self.messenger.id])

    def test_list_messengers_is_public(self):
        # Arrange — запись уже создана в setUp

        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["results"][0]["whatsapp"], "https://wa.me/1234567890"
        )

    def test_retrieve_messenger_is_public(self):
        # Arrange
        # Act
        response = self.client.get(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["telegram"], "https://t.me/example")

    def test_create_messenger_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(self.list_url, {"instagram": "https://instagram.com/example"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_messenger_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.post(self.list_url, {"instagram": "https://instagram.com/example"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_messenger_as_staff_user_creates_messenger(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(
            self.list_url, {"instagram": "https://instagram.com/example"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Messengers.objects.filter(instagram="https://instagram.com/example").exists()
        )

    def test_create_messenger_with_all_fields_blank_succeeds(self):
        # Все поля модели blank=True, null=True — запись без единой ссылки
        # должна быть валидной
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(self.list_url, {})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_messenger_with_invalid_url_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(self.list_url, {"tiktok": "not-a-valid-url"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_messenger_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.patch(
            self.detail_url, {"tiktok": "https://tiktok.com/@example"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.messenger.refresh_from_db()
        self.assertEqual(self.messenger.tiktok, "https://tiktok.com/@example")

    def test_update_messenger_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.patch(
            self.detail_url, {"tiktok": "https://tiktok.com/@hacker"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_messenger_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Messengers.objects.filter(id=self.messenger.id).exists())

    def test_delete_messenger_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Messengers.objects.filter(id=self.messenger.id).exists())
