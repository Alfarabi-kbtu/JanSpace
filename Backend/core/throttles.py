# core/throttles.py

from rest_framework.throttling import AnonRateThrottle


# Отдельный throttle-scope для публичного чтения каталога (categories/
# products/services/messengers). Общий scope "anon" (20/мин) рассчитан на
# чувствительные действия (login/register используют свои ещё более
# строгие scope) — для каталога он слишком мал: один переход по страницам
# сайта уже делает 2-3 параллельных GET (категории + товары/услуги), и
# обычный просмотр сайта за минуту исчерпывает лимит. Используем свой,
# более щедрый scope "catalog_read" (см. DEFAULT_THROTTLE_RATES в settings.py),
# не трогая limits остальных эндпоинтов.
#
# Для авторизованных запросов по-прежнему используем стандартный
# UserRateThrottle (scope "user", 100/мин) — его НЕ дублируем здесь под
# тем же "catalog_read", иначе на анонимных запросах оба throttle-класса
# пишут в один и тот же cache-key (UserRateThrottle.get_cache_key для
# неавторизованного запроса тоже падает обратно на IP) и список из
# category/products/services/messengers viewsets будет тратить лимит
# в 2 раза быстрее, чем кажется.
class CatalogAnonRateThrottle(AnonRateThrottle):
    scope = "catalog_read"
