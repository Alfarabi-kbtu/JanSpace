# JanSpace — Backend (Django REST Framework)

Этот файл читается Claude Code в начале каждой сессии.
Держи его актуальным: если Claude делает ошибку из-за незнания
особенности проекта — допиши её сюда.

## Что это за проект

JanSpace — бэкенд на Django REST Framework. Расположен в
`C:\JanSpace\Backend\`. Состоит из шести доменных приложений:

- `categories` — категории товаров/услуг
- `products` — товары
- `services` — услуги
- `orders` — заказы (используется UUID как primary key)
- `complaints` — жалобы/претензии
- `messengers` — переписка/уведомления

Плюс `accounts` — регистрация, JWT-авторизация, профиль пользователя.
У `accounts` НЕТ своей модели User — используется стандартный
`django.contrib.auth.models.User` (`accounts/models.py` пустой,
поэтому и нет `accounts/migrations/0001_initial.py`).

`core/` — это НЕ Django-приложение, а набор утилит
(`core/permissions.py`, `core/middleware.py`). Не добавляй его
в `INSTALLED_APPS` и не создавай для него `apps.py`.

## Стиль кода (важно!)

- Код должен быть простым и читаемым, а не "умным" и компактным.
  Приоритет — чтобы человек мог легко понять и изменить код,
  а не чтобы он был написан в минимальное число строк.
- Каждый нетривиальный блок кода должен сопровождаться комментарием,
  объясняющим ЧТО делает код и ЗАЧЕМ (не просто пересказ кода словами).
- Не переписывай целые файлы ради маленькой правки — делай точечные,
  минимальные изменения (targeted fixes), если явно не попросили
  рефакторинг.
- Перед тем как что-то "исправлять", проверь раздел "Известные особенности
  проекта" ниже — то, что выглядит как баг, может быть ожидаемым поведением.

## Технологический стек

- Django + Django REST Framework
- Аутентификация: JWT через `djangorestframework-simplejwt`
- Django Channels + Daphne — WebSocket (обновления статуса заказа в реальном времени)
- Redis — channel layer для Channels, поднимается через Docker
- django-storages + boto3 — хранение файлов в S3
- Pillow — конвертация изображений в JPEG и ресайз при сохранении моделей
- python-decouple — секреты и конфигурация через `.env`
- Отправка почты (сброс пароля) — через Gmail SMTP

## Известные особенности проекта (НЕ баги)

Эти вещи могут выглядеть как ошибка, но таковой не являются:

1. **`redis-py` должен быть `<5.0.0`** в requirements.txt.
   В redis-py 5.x есть `asyncio.timeout()`, несовместимый с Windows.
   Не предлагай обновить redis-py до последней версии.

2. **`manage.py` должен вызывать**
   `asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())`
   ДО импортов Django. Это фикс для асинхронности Channels на Windows.

3. **`daphne` должен идти первым в `INSTALLED_APPS`** — иначе Channels
   работает некорректно.

4. **`Category` имеет ДВА отдельных поля названия** — `product_category`
   и `service_category` (оба `CharField`, `blank=True, null=True`), а не
   одно общее `name`. Так сделано намеренно, чтобы одна модель
   обслуживала категории и товаров, и услуг одновременно.

5. Поведения, которые НЕ являются багами при тестировании:
   - `is_available=false` при отправке form-data — ожидаемо в
     определённых сценариях сериализации.
   - `429 Too Many Requests` после нескольких попыток — это работает
     throttling (`LoginRateThrottle`, `RegisterRateThrottle`,
     `PasswordResetRateThrottle` в `accounts/throttles.py`).
   - `200 OK` при повторном подключении к уже открытому WebSocket —
     нормальное поведение переподключения.

6. **`DATABASES` использует PostgreSQL, не SQLite** (`config/settings.py`).
   Раньше был захардкожен `django.db.backends.sqlite3` — при докеризации
   осознанно переключили на Postgres (драйвер `psycopg2-binary` уже был
   в requirements) через переменные `POSTGRES_*` в `.env`. Файл
   `db.sqlite3` в корне — старый, из локальной SQLite-разработки, больше
   не используется и данные из него в Postgres не переносились.

## Архитектурные паттерны, которых нужно придерживаться

- Модели разбиты по отдельным файлам внутри каждого приложения
  (не один большой `models.py`).
- `DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'` — не меняй,
  это решает предупреждения о миграциях.
- Права доступа — через `core/permissions.py`
  (`IsAdminOrReadOnly` и подобные), не дублируй логику прав в самих
  вьюсетах.
- Во вьюсетах с относящимися друг к другу моделями используй
  `select_related` / `prefetch_related`, чтобы не плодить N+1 запросы.
- Пагинация — глобальная, `PageNumberPagination`, `PAGE_SIZE=20`.
  Не переопределяй её локально без причины.
- `db_index=True` уже стоит на `is_available` и `order_status` —
  это осознанное решение для производительности, не убирай.
- Изменение статуса заказа триггерит `group_send` через `pre_save`
  сигнал в `orders/signals.py` → `OrderStatusConsumer` в
  `orders/consumers.py`. Если меняешь логику статусов заказа — проверь
  этот сигнал.
- JWT для WebSocket читается из query-параметров через
  `JWTAuthMiddleware` в `core/middleware.py`.
- `Product` и `Services` переопределяют `save()`, чтобы сжать
  загруженную картинку через Pillow перед сохранением (конвертация
  в RGB, resize до 1200x1200, JPEG quality=80). Логика в
  `_compress_image()` в `products/models.py` и `services/models.py`
  (продублирована в обоих файлах — если меняешь одну, проверь вторую).
- Троттлинг с кастомными scope (`login`, `register`, `password_reset`)
  не работает "из коробки" через `DEFAULT_THROTTLE_CLASSES` — каждая
  вьюха в `accounts/views.py` явно указывает свой `throttle_classes`
  (классы определены в `accounts/throttles.py`).

## Команды

```powershell
# активировать виртуальное окружение
.venv\Scripts\Activate.ps1

# запустить сервер разработки
python manage.py runserver

# применить миграции
python manage.py migrate

# создать миграции после изменения моделей
python manage.py makemigrations

# запустить тесты (когда появятся)
python manage.py test
# запустить один тестовый класс/метод
python manage.py test orders.tests.OrderTestCase.test_status_change
```

Redis поднимается через Docker Desktop (используется как channel layer
для Django Channels) — перед запуском WebSocket-функциональности
убедись, что контейнер запущен. Если работаешь через `docker compose`
(см. ниже), Redis поднимается автоматически вместе с остальными сервисами.

Все `tests.py` файлы сейчас пустые заглушки (см. roadmap ниже) —
`pytest` без `pytest-django` конфигурации не запустится, используй
`python manage.py test`.

### Docker (docker-compose)

Проект дockerизован: `Dockerfile` (образ web-приложения на daphne),
`docker-compose.yml` (сервисы `web`, `db` — PostgreSQL 16, `redis`),
`entrypoint.sh` (ждёт готовности Postgres и накатывает миграции при
каждом старте контейнера `web`).

```powershell
# собрать образы и поднять все три сервиса (web, db, redis) в фоне
docker compose up --build -d

# посмотреть логи web-контейнера (Django/Daphne)
docker compose logs web -f

# статус контейнеров
docker compose ps

# остановить всё, данные Postgres сохраняются в volume backend_postgres_data
docker compose down

# остановить и ПОЛНОСТЬЮ удалить данные Postgres (осторожно!)
docker compose down -v
```

Код проекта смонтирован volume’ом в контейнер `web` (см.
`docker-compose.yml`), поэтому `runserver` внутри контейнера подхватывает
изменения файлов на хосте так же, как при локальном запуске — пересборка
образа (`--build`) нужна только после изменения `requirments.txt` или
`Dockerfile`.

Это dev-сборка (см. "Известные особенности" ниже про DEBUG/ALLOWED_HOSTS).
Для продакшена используется Render, а не отдельный prod `docker-compose`
с nginx — см. раздел "Продакшен (Render)" ниже.

### Продакшен (Render)

Прод — Render (PaaS), не голый docker-compose. Решение сменилось с Railway
на Render — если где-то в старых заметках/коммитах встречается Railway,
это устаревшее. Render сам терминирует HTTPS и проксирует запросы к
контейнеру — поэтому в отличие от типичного prod-докера здесь НЕТ
nginx/certbot и НЕТ отдельного `docker-compose.prod.yml`.

Деплой описан как IaC в `render.yaml` (корень репозитория, не в `Backend/`,
т.к. Render Blueprint читает его из корня подключённого репозитория) —
применяется через Render Dashboard → New → Blueprint. Поднимает три
сервиса разом:
- `janspace-db` — managed Postgres;
- `janspace-redis` — managed Key Value (Redis-совместимый) для channel layer;
- `janspace-backend` — сам Django/Daphne, из `Backend/Dockerfile`.

Переменные подключения к Postgres/Redis (`POSTGRES_*`, `REDIS_HOST`,
`REDIS_PORT`) смэплены в `render.yaml` на эти managed-сервисы через
`fromDatabase`/`fromService` — в `settings.py` для этого ничего менять не
пришлось, он по-прежнему читает их как обычные переменные окружения.
Секреты и домен-специфичные значения (`SECRET_KEY`, `AWS_*`, `EMAIL_*`,
`ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`,
`FRONTEND_RESET_PASSWORD_URL`) помечены в `render.yaml` как `sync: false` —
значит, их нужно вручную ввести в Render Dashboard → `janspace-backend` →
Environment после первого применения blueprint'а, в файле они не хранятся.

`render.yaml`'s `dockerCommand` переопределяет команду запуска из Dockerfile —
вместо `python manage.py runserver` (dev-сервер, не для продакшена)
продакшен запускается через `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
($PORT назначает сам Render). `entrypoint.sh` из Dockerfile всё равно
выполняется первым (ждёт Postgres, делает `migrate` и `collectstatic`) —
`dockerCommand` лишь подменяет то, что `entrypoint.sh` в итоге запустит
через `exec "$@"`.

`collectstatic` сознательно не запускается на этапе `docker build`: на
этом этапе ещё нет `SECRET_KEY`/`POSTGRES_*`/`AWS_*` из окружения, а
`settings.py` требует их сразу при импорте — поэтому `collectstatic`
запускается в `entrypoint.sh` при СТАРТЕ контейнера, вместе с `migrate`.
Раздаёт собранную статику `whitenoise` (`STATIC_ROOT`, `WhiteNoiseMiddleware`
сразу после `SecurityMiddleware`) — на Render перед контейнером нет
nginx, который бы мог сделать это вместо Django.

`config/urls.py` → `/health/` (`config/views.py::health_check`) — health-check
для `render.yaml` (`healthCheckPath`), не трогает БД/Redis, чтобы их
временная недоступность не блокировала сам факт "контейнер поднялся".

`SECURE_PROXY_SSL_HEADER` в `settings.py` обязателен при работе за
прокси Render — без него `request.is_secure()` всегда `False`, и
`SECURE_SSL_REDIRECT` ушёл бы в бесконечный редирект. Секьюрити-настройки
(`SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`...)
гейтятся через `if not DEBUG`, чтобы локальный docker-compose (DEBUG=True,
без HTTPS) не сломался.

Free-план Render для Postgres автоматически удаляется через 30 дней —
`render.yaml` использует `plan: free` по умолчанию (дёшево для старта), но
перед тем как это станет реальным продакшеном с настоящими данными, нужно
вручную сменить план в Render Dashboard на платный, иначе база исчезнет.

### Обязательные переменные в `.env`

Без них `manage.py` упадёт при старте (`SECRET_KEY`, `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD` — сразу, остальные — при первом
обращении к соответствующей функциональности):
`SECRET_KEY`, `DEBUG`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`,
`AWS_S3_REGION_NAME`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.

`POSTGRES_HOST` (default `localhost`), `POSTGRES_PORT` (default `5432`),
`REDIS_HOST` (default `127.0.0.1`), `REDIS_PORT` (default `6379`) и
`ALLOWED_HOSTS` (default `localhost,127.0.0.1`) необязательны локально —
но `docker-compose.yml` переопределяет `POSTGRES_HOST=db` и
`REDIS_HOST=redis`, т.к. внутри docker-сети сервисы видны друг другу по
имени контейнера, а не по `localhost`.

Для прода на Render также нужны: `ALLOWED_HOSTS` — домен Render/кастомный
домен; `CSRF_TRUSTED_ORIGINS` — тот же домен с `https://`; `CORS_ALLOWED_ORIGINS`
и `FRONTEND_RESET_PASSWORD_URL` — реальный домен фронтенда (по умолчанию оба
смотрят на `localhost:3000`, что верно только для локальной разработки).
Все перечисленные выше заводятся в Render Dashboard вручную (см. раздел
"Продакшен (Render)") — `render.yaml` их специально не заполняет.

**Символы `$` в значениях `.env` (например в `SECRET_KEY`) должны быть
удвоены (`$$`)** — иначе docker-compose интерпретирует `$X` как ссылку на
переменную окружения и молча вырезает её при передаче в контейнер
(`python-decouple` на удвоение не реагирует, для приложения это просто
два подряд идущих символа `$`).

### Опциональные переменные в `.env`

- `SENTRY_DSN` — если не задан (default=''), `sentry_sdk.init()` в
  `config/settings.py` просто не вызывается, приложение работает как раньше
  (ошибки только в консоль/логи). Задайте её, чтобы включить отправку
  необработанных исключений (500-х) в Sentry.
- `SENTRY_ENVIRONMENT` — подпись окружения в Sentry (`development`,
  `staging`, `production`), по умолчанию `development`. Имеет смысл только
  вместе с `SENTRY_DSN`.

## Что в разработке / roadmap

- [x] Юнит- и интеграционные тесты (Django TestCase) — покрыты все семь
      приложений: `accounts`, `categories`, `products`, `services`, `orders`,
      `complaints`, `messengers`
- [x] Интеграция Sentry для мониторинга 500-х ошибок — `sentry_sdk.init()`
      в `config/settings.py`, включается через `SENTRY_DSN` в `.env`
      (см. "Опциональные переменные" выше)
- [x] Докеризация для локальной разработки — `Dockerfile` +
      `docker-compose.yml` (`web`/`db`/`redis`), см. раздел "Docker" выше
- [x] Продакшен-хардening (код готов, PaaS-агностичный) — `whitenoise` +
      `STATIC_ROOT`, `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS`,
      health-check `/health/`, env-driven
      `CORS_ALLOWED_ORIGINS`/`FRONTEND_RESET_PASSWORD_URL`.
      См. раздел "Продакшен (Render)" выше
- [x] `render.yaml` (корень репозитория) — Blueprint на Postgres + Key Value
      (Redis) + web-сервис, код готов, не применялся
- [ ] Применить `render.yaml` в Render Dashboard (New → Blueprint), задать
      `SECRET_KEY`/`AWS_*`/`EMAIL_*`/`ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS`/
      `CORS_ALLOWED_ORIGINS`/`FRONTEND_RESET_PASSWORD_URL` в Render-дэшборде
      — это уже действия в самом Render, не в коде
- [ ] Донастройка и кастомизация этого CLAUDE.md по ходу работы

## Как со мной работать

- Делись выводом терминала и трейсбеками ошибок как есть — не нужно
  их пересказывать.
- Предпочтение — точечные исправления, а не переписывание файлов целиком.
- Явно говори, если что-то — ожидаемое поведение, а не баг (см. раздел
  выше), чтобы не тратить время на "исправление" того, что и так работает.
