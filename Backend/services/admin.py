from django.contrib import admin
from .models import Services


@admin.register(Services)
class ServicesAdmin(admin.ModelAdmin):
    list_display = ("service_name", "service_category", "service_price", "is_available")
    list_filter = ("is_available", "service_category")
    search_fields = ("service_name",)