from django.http import JsonResponse


def health_check(request):
    # Простой health-check для Render (healthCheckPath в render.yaml) —
    # подтверждает, что процесс Daphne поднялся и отвечает на запросы,
    # без обращения к БД/Redis, чтобы не блокировать деплой их временной
    # недоступностью
    return JsonResponse({"status": "ok"})
