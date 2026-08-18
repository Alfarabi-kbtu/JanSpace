from django.contrib import admin
from .models import Complaints


@admin.register(Complaints)
class ComplaintsAdmin(admin.ModelAdmin):
    list_display = ("user", "complaint_address", "created_at")
    search_fields = ("complaint_address", "complaint_text")