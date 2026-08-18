from django.db import models
from categories.models import Category
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys


class Services(models.Model):
    id = models.AutoField(primary_key=True)
    service_name = models.CharField(max_length=255)
    service_category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="services"
    )
    service_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True, db_index=True)

    image = models.ImageField(upload_to="services/", blank=True, null=True)

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"

    def __str__(self):
        return self.service_name

    def save(self, *args, **kwargs):
        if self.image:
            self.image = self._compress_image(self.image)
        super().save(*args, **kwargs)

    @staticmethod
    def _compress_image(image_field):
        img = Image.open(image_field)
        if img.mode != "RGB":
            img = img.convert("RGB")

        max_size = (1200, 1200)
        img.thumbnail(max_size, Image.LANCZOS)

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=80, optimize=True)
        buffer.seek(0)

        return InMemoryUploadedFile(
            buffer, "ImageField",
            f"{image_field.name.split('.')[0]}.jpg",
            "image/jpeg",
            sys.getsizeof(buffer),
            None
        )