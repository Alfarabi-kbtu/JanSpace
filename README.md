# JanSpace

Интернет-магазин товаров и связанных с ними услуг: каталог, корзина,
оформление заказа (самовывоз/доставка, предзаказ, доп.услуги вроде
гравировки), личный кабинет с историей заказов и статусом в реальном
времени.

Бэкенд и фронтенд — два отдельных проекта в одном репозитории,
общаются по REST API + WebSocket.

## Стек

**Backend** (`Backend/`)
- Django + Django REST Framework
- JWT-аутентификация (`djangorestframework-simplejwt`)
- Django Channels + Daphne — WebSocket, обновление статуса заказа в реальном времени
- PostgreSQL, Redis (channel layer для Channels)
- django-storages + boto3 — хранение изображений товаров/услуг в S3
- Pillow — сжатие и конвертация загружаемых изображений
- Sentry (опционально) — мониторинг ошибок

**Frontend** (`Frontend/`)
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Vitest — юнит-тесты бизнес-логики

## Возможности

- Каталог товаров и услуг с категориями и фильтрами
- Регистрация/вход по JWT, сброс пароля по email, профиль
- Корзина (хранится на клиенте): отдельные товары и услуги, плюс
  доп.услуги (гравировка и т.п.), привязываемые к конкретному товару —
  каждая со своей ценой, зафиксированной на момент оформления заказа
- Оформление заказа: самовывоз или платная доставка, опциональный предзаказ с датой получения
- История заказов и статус заказа, обновляющийся в реальном времени по WebSocket
- Форма жалоб/обращений
- Django admin — управление каталогом, заказами, жалобами; жалобы можно
  открыть отдельной группе пользователей только на просмотр (без
  редактирования и удаления) через встроенные разрешения Django
- Rate limiting на вход/регистрацию/сброс пароля

## Структура репозитория

```
JanSpace/
├── Backend/     # Django REST Framework API
│   ├── accounts/       # регистрация, JWT, профиль
│   ├── categories/     # категории товаров/услуг
│   ├── products/       # товары
│   ├── services/       # услуги
│   ├── orders/         # заказы, статусы, WebSocket-уведомления
│   ├── complaints/     # жалобы/обращения
│   ├── messengers/     # ссылки на соцсети
│   └── core/           # общие права доступа, middleware (не Django-приложение)
└── Frontend/    # Next.js
    └── src/
        ├── app/         # страницы (App Router)
        ├── components/  # переиспользуемые компоненты
        └── lib/         # API-клиент, корзина, форматирование, авторизация
```

Подробности по каждой части — в `Backend/CLAUDE.md` и `Frontend/CLAUDE.md`
(контракт API, особенности реализации, roadmap).

## Быстрый старт (Docker)

Нужен Docker Desktop. Поднимает сразу всё: PostgreSQL, Redis, Django и Next.js.

```powershell
cd Backend
copy .env.example .env   # заполнить своими значениями, см. ниже
docker compose up --build -d
```

- Бэкенд: http://localhost:8000
- Фронтенд: http://localhost:3000
- Django admin: http://localhost:8000/admin

### Переменные окружения

**`Backend/.env`** — обязательные: `SECRET_KEY`, `DEBUG`,
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`.
Опциональные (с разумными дефолтами для локальной разработки):
`POSTGRES_HOST`, `POSTGRES_PORT`, `REDIS_HOST`, `REDIS_PORT`,
`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_RESET_PASSWORD_URL`,
`SENTRY_DSN`, `SENTRY_ENVIRONMENT`.

**`Frontend/.env.local`** (создайте вручную, файла-примера для него нет —
он в `.gitignore` целиком):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Полный список и назначение каждой переменной — в `Backend/CLAUDE.md`.

## Локальный запуск без Docker

```powershell
# Backend
cd Backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirments.txt
python manage.py migrate
python manage.py runserver

# Frontend (в отдельном терминале)
cd Frontend
npm install
npm run dev
```

Для WebSocket-функциональности (статус заказа в реальном времени)
локально нужен запущенный Redis.

## Тесты

```powershell
# Backend — Django TestCase, покрыты все приложения
cd Backend
python manage.py test

# Frontend — Vitest, покрыта бизнес-логика в src/lib/*
cd Frontend
npm test
```

## Деплой

Проект подготовлен к продакшену на Render (`render.yaml` в корне репозитория,
health-check, whitenoise для статики, security-настройки под HTTPS-прокси)
— см. раздел "Продакшен (Render)" в `Backend/CLAUDE.md`. Сам деплой
(применение `render.yaml` через Render Dashboard, переменные окружения)
пока не выполнен.
