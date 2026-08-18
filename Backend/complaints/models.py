from django.db import models
from django.contrib.auth.models import User   # для поля user (FK)
class Complaints(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="complaints"
    )

    complaint_address = models.EmailField(
        help_text="Email, на который нужно ответить по жалобе"
    )

    complaint_text = models.TextField()

    # Небольшое дополнение (не было в вводных, но полезно) —
    # дата создания жалобы. Если не нужно — просто удалите это поле.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Complaint"
        verbose_name_plural = "Complaints"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Complaint from {self.user} ({self.complaint_address})"