# orders/signals.py

from django.db.models.signals import pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Order


@receiver(pre_save, sender=Order)
def notify_order_status_change(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_order = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return

    if old_order.order_status != instance.order_status:
        channel_layer = get_channel_layer()
        group_name = f"user_{instance.user.id}_orders"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "order_status_update",
                "order_id": str(instance.order_id),
                "order_status": instance.order_status,
            }
        )