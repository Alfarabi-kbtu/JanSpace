from decimal import Decimal
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from categories.models import Category
from .models import Services


def _generate_test_image(name="original.png", size=(2000, 1500), image_format="PNG"):
    # Генерируем настоящую картинку в памяти (без файлов на диске), чтобы
    # проверить реальную работу Services._compress_image(), а не подделать её моком
    buffer = BytesIO()
    Image.new("RGBA", size, color=(255, 0, 0, 128)).save(buffer, format=image_format)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type="image/png")


class ServicesApiTests(APITestCase):
    # /api/services/ — доступен на чтение всем, на запись только is_staff (IsAdminOrReadOnly)

    def setUp(self):
        self.category = Category.objects.create(service_category="Ремонт")
        self.other_category = Category.objects.create(service_category="Уборка")
        self.staff_user = User.objects.create_user(
            username="admin", password="Admin-Pass!1", is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username="user", password="User-Pass!1"
        )
        self.service = Services.objects.create(
            service_name="Ремонт телефона",
            service_category=self.category,
            service_price=Decimal("100.00"),
            is_available=True,
        )
        self.list_url = reverse("service-list")
        self.detail_url = reverse("service-detail", args=[self.service.id])

    def test_list_services_is_public(self):
        # Arrange — услуга уже создана в setUp

        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["service_name"], "Ремонт телефона")

    def test_retrieve_service_returns_nested_category(self):
        # service_category в ответе — вложенный объект (CategorySerializer),
        # а не просто id, см. ServicesSerializer
        # Arrange
        # Act
        response = self.client.get(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["service_category"]["service_category"], "Ремонт"
        )

    def test_filter_services_by_is_available(self):
        # Arrange
        Services.objects.create(
            service_name="Недоступная услуга",
            service_price=Decimal("50.00"),
            is_available=False,
        )

        # Act
        response = self.client.get(self.list_url, {"is_available": "true"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["service_name"] for item in response.data["results"]]
        self.assertIn("Ремонт телефона", names)
        self.assertNotIn("Недоступная услуга", names)

    def test_filter_services_by_category(self):
        # Arrange
        Services.objects.create(
            service_name="Уборка квартиры",
            service_category=self.other_category,
            service_price=Decimal("500.00"),
        )

        # Act
        response = self.client.get(self.list_url, {"service_category": self.category.id})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["service_name"] for item in response.data["results"]]
        self.assertEqual(names, ["Ремонт телефона"])

    def test_create_service_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(
            self.list_url, {"service_name": "Диагностика", "service_price": "300.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_service_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.post(
            self.list_url, {"service_name": "Диагностика", "service_price": "300.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_service_as_staff_user_creates_service(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(
            self.list_url,
            {
                "service_name": "Диагностика",
                "service_price": "300.00",
                "service_category_id": self.category.id,
            },
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        service = Services.objects.get(service_name="Диагностика")
        self.assertEqual(service.service_category, self.category)

    def test_create_service_with_nonpositive_price_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)
        invalid_prices = ["0", "-10.00"]

        for price in invalid_prices:
            with self.subTest(price=price):
                # Act
                response = self.client.post(
                    self.list_url, {"service_name": "Диагностика", "service_price": price}
                )

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_service_with_blank_name_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(
            self.list_url, {"service_name": "   ", "service_price": "100.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_service_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.patch(self.detail_url, {"service_price": "150.00"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.service_price, Decimal("150.00"))

    def test_update_service_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.patch(self.detail_url, {"service_price": "150.00"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_service_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Services.objects.filter(id=self.service.id).exists())

    def test_delete_service_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Services.objects.filter(id=self.service.id).exists())

    @override_settings(
        STORAGES={
            "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        }
    )
    def test_create_service_with_image_gets_compressed_to_jpeg(self):
        # Реальный прогон Services._compress_image(): загружаем PNG 2000x1500 —
        # ожидаем JPEG, вписанный в 1200x1200. Storage переключаем на InMemory,
        # чтобы тест не пытался реально загрузить файл в S3 (см. config/settings.py)
        # Arrange
        self.client.force_authenticate(user=self.staff_user)
        image = _generate_test_image()

        # Act
        response = self.client.post(
            self.list_url,
            {"service_name": "Фотосъёмка", "service_price": "20.00", "image": image},
            format="multipart",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        service = Services.objects.get(service_name="Фотосъёмка")
        self.assertTrue(service.image.name.endswith(".jpg"))

        with Image.open(service.image) as saved_image:
            self.assertEqual(saved_image.format, "JPEG")
            self.assertLessEqual(saved_image.width, 1200)
            self.assertLessEqual(saved_image.height, 1200)
