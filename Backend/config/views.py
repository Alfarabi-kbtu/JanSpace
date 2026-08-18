from django.http import JsonResponse


def health_check(request):
    # Простой health-check для Railway (healthcheckPath в railway.toml) —
    # подтверждает, что процесс Daphne поднялся и отвечает на запросы,
    # без обращения к БД/Redis, чтобы не блокировать деплой их временной
    # недоступностью
    return JsonResponse({"status": "ok"})
