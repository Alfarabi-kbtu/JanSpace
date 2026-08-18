from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category


class CategoryModelTests(TestCase):
    # Category — одна модель на категории товаров И услуг сразу (два CharField
    # вместо одного name, см. CLAUDE.md), __str__ должен показывать заполненное поле

    def test_str_returns_product_category_when_set(self):
        category = Category.objects.create(product_category="Электроника")
        self.assertEqual(str(category), "Электроника")

    def test_str_returns_service_category_when_product_category_is_empty(self):
        category = Category.objects.create(service_category="Ремонт")
        self.assertEqual(str(category), "Ремонт")

    def test_str_falls_back_to_id_when_both_fields_empty(self):
        category = Category.objects.create()
        self.assertEqual(str(category), f"Category #{category.id}")


class CategoryApiTests(APITestCase):
    # /api/categories/ — доступен на чтение всем, на запись только is_staff (IsAdminOrReadOnly)

    def setUp(self):
        self.category = Category.objects.create(product_category="Электроника")
        self.staff_user = User.objects.create_user(
            username="admin", password="Admin-Pass!1", is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username="user", password="User-Pass!1"
        )
        self.list_url = reverse("category-list")
        self.detail_url = reverse("category-detail", args=[self.category.id])

    def test_list_categories_is_public(self):
        # Arrange — категория уже создана в setUp

        # Act
        response = self.client.get(self.list_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["product_category"], "Электроника")

    def test_retrieve_category_is_public(self):
        # Arrange
        # Act
        response = self.client.get(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.category.id)

    def test_create_category_without_authentication_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(self.list_url, {"product_category": "Одежда"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_category_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.post(self.list_url, {"product_category": "Одежда"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_category_as_staff_user_creates_category(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.post(self.list_url, {"product_category": "Одежда"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(product_category="Одежда").exists())

    def test_update_category_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.patch(
            self.detail_url, {"product_category": "Электроника (обновлено)"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        self.assertEqual(self.category.product_category, "Электроника (обновлено)")

    def test_update_category_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.patch(self.detail_url, {"product_category": "Взлом"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_category_as_staff_user_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.staff_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.category.id).exists())

    def test_delete_category_as_regular_user_returns_403(self):
        # Arrange
        self.client.force_authenticate(user=self.regular_user)

        # Act
        response = self.client.delete(self.detail_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Category.objects.filter(id=self.category.id).exists())
