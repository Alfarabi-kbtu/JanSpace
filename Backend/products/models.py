from django.db import models
from categories.models import Category
from PIL import Image   # Pillow — для сжатия/ресайза картинки перед сохранением
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys


class Product(models.Model):
    id = models.AutoField(primary_key=True)
    product_name = models.CharField(max_length=255)
    product_category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="products"
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True, db_index=True)

    # upload_to="products/" — файлы будут складываться в папку products/ внутри бакета
    image = models.ImageField(upload_to="products/", blank=True, null=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return self.product_name

    def save(self, *args, **kwargs):
        # Если картинка загружена — сжимаем её перед сохранением
        if self.image:
            self.image = self._compress_image(self.image)
        super().save(*args, **kwargs)

    @staticmethod
    def _compress_image(image_field):
        # Открываем загруженную картинку через Pillow
        img = Image.open(image_field)

        # Конвертируем в RGB — на случай PNG с прозрачностью (RGBA),
        # т.к. JPEG не поддерживает альфа-канал
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Ограничиваем максимальный размер (например, не больше 1200px по ширине),
        # thumbnail сохраняет пропорции автоматически
        max_size = (1200, 1200)
        img.thumbnail(max_size, Image.LANCZOS)

        # Сохраняем в память с сжатием (quality=80 — хороший баланс качество/размер)
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=80, optimize=True)
        buffer.seek(0)

        # Оборачиваем обратно в файл, который Django сможет сохранить
        return InMemoryUploadedFile(
            buffer, "ImageField",
            f"{image_field.name.split('.')[0]}.jpg",   # меняем расширение на .jpg
            "image/jpeg",
            sys.getsizeof(buffer),
            None
        )