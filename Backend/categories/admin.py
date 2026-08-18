from django.contrib import admin
from .models import Category   # импорт модели из этого же приложения

# register() делает модель видимой и редактируемой в /admin/
admin.site.register(Category)