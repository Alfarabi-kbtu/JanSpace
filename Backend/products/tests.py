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
from .models import Product


def _generate_test_image(name="original.png", size=(2000, 1500), image_format="PNG"):
    # Генерируем настоящую картинку в памяти (без файлов на диске), чтобы
    # проверить реальную работу Product._compress_image(), а не подделать её моком
    buffer = BytesIO()
    Image.new("RGBA", size, color=(255, 0, 0, 128)).save(buffer, format=image_format)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type="image/png")


class ProductApiTests(APITestCase):
    # /api/products/ — доступен на чтение всем, на запись только is_staff (IsAdminOrReadOnly)

    def setUp(self):
        self.category = Category.objects.create(product_category="Электроника")
        self.other_category = Category.objects.create(product_category="Бытовая техника")
        self.staff_user = User.objects.create_user(
            username="admin", password="Admin-Pass!1", is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username="user", password="User-Pass!1"
        )
        self.product = Product.objects.create(
            product_name="Телефон",
            product_category=self.category,
            price=Decimal("100.00"),
            is_available=True,
        )
        self.list_url = reverse("product-list")
        self.detail_url = reverse("product-detail", args=[self.product.id])

    def test_list_products_is_public(self):
        # Arrange — товар уже создан в setUp

        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["product_name"], "Телефон")

    def test_retrieve_product_returns_nested_category(self):
        # product_category в ответе — вложенный объект (CategorySerializer),
        # а не просто id, см. ProductSerializer
        # Arrange
        # Act
        response = self.client.get(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["product_category"]["product_category"], "Электроника"
        )

    def test_filter_products_by_is_available(self):
        # Arrange
        Product.objects.create(
            product_name="Сломанный телефон",
            price=Decimal("50.00"),
            is_available=False,
        )

        # Act
        response = self.client.get(self.list_url, {"is_available": "true"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["product_name"] for item in response.data["results"]]
        self.assertIn("Телефон", names)
        self.assertNotIn("Сломанный телефон", names)

    def test_filter_products_by_category(self):
        # Arrange
        Product.objects.create(
            product_name="Холодильник",
            product_category=self.other_category,
            price=Decimal("500.00"),
        )

        # Act
        response = self.client.get(self.list_url, {"product_category": self.category.id})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["product_name"] for item in response.data["results"]]
        self.assertEqual(names, ["Телефон"])

    def test_create_product_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(
            self.list_url, {"product_name": "Планшет", "price": "300.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_product_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.post(
            self.list_url, {"product_name": "Планшет", "price": "300.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_product_as_staff_user_creates_product(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(
            self.list_url,
            {
                "product_name": "Планшет",
                "price": "300.00",
                "product_category_id": self.category.id,
            },
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(product_name="Планшет")
        self.assertEqual(product.product_category, self.category)

    def test_create_product_with_nonpositive_price_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)
        invalid_prices = ["0", "-10.00"]

        for price in invalid_prices:
            with self.subTest(price=price):
                # Act
                response = self.client.post(
                    self.list_url, {"product_name": "Планшет", "price": price}
                )

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_product_with_blank_name_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(
            self.list_url, {"product_name": "   ", "price": "100.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_product_with_too_short_name_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(
            self.list_url, {"product_name": "A", "price": "100.00"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_product_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.patch(self.detail_url, {"price": "150.00"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("150.00"))

    def test_delete_product_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.product.id).exists())

    @override_settings(
        STORAGES={
            "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
            "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
        }
    )
    def test_create_product_with_image_gets_compressed_to_jpeg(self):
        # Реальный прогон Product._compress_image(): загружаем PNG 2000x1500 —
        # ожидаем JPEG, вписанный в 1200x1200. Storage переключаем на InMemory,
        # чтобы тест не пытался реально загрузить файл в S3 (см. config/settings.py)
        # Arrange
        self.client.force_authenticate(user=self.staff_user)
        image = _generate_test_image()

        # Act
        response = self.client.post(
            self.list_url,
            {"product_name": "Постер", "price": "20.00", "image": image},
            format="multipart",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(product_name="Постер")
        self.assertTrue(product.image.name.endswith(".jpg"))

        with Image.open(product.image) as saved_image:
            self.assertEqual(saved_image.format, "JPEG")
            self.assertLessEqual(saved_image.width, 1200)
            self.assertLessEqual(saved_image.height, 1200)
