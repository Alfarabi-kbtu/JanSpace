from django.contrib import admin
from .models import Category   # импорт модели из этого же приложения


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("__str__", "kind")
    list_filter = ("kind",)