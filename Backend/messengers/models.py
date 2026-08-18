from django.db import models
# Больше ничего не нужно — модель ни на что не ссылается
class Messengers(models.Model):
    whatsapp = models.URLField(blank=True, null=True)
    telegram = models.URLField(blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)

    class Meta:
        verbose_name = "Messenger links"
        verbose_name_plural = "Messenger links"

    def __str__(self):
        return "Messenger links"