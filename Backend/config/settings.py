"""
Django settings for config project.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config   # ⬅ импортируем функцию config() из python-decouple
# Именно она читает значения из файла .env

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

BASE_DIR = Path(__file__).resolve().parent.parent


# ==== Секреты и настройки окружения ====
# Вместо того чтобы писать значение прямо в коде, вызываем config("ИМЯ_ПЕРЕМЕННОЙ")
# decouple сам найдёт файл .env в корне проекта и возьмёт оттуда значение по этому ключу

SECRET_KEY = config('SECRET_KEY')
# Если ключа SECRET_KEY нет в .env — Django упадёт с понятной ошибкой при старте,
# это специально, чтобы вы не забыли создать .env

DEBUG = config('DEBUG', default=False, cast=bool)
# default=False — если переменной DEBUG нет в .env, по умолчанию будет False (безопаснее)
# cast=bool — ОБЯЗАТЕЛЬНО, потому что все значения в .env — это текст ("True"),
# без cast=bool Python бы читал это как строку "True", а не как булево значение

# ==== Sentry (мониторинг необработанных ошибок / 500-х) ====
# SENTRY_DSN не обязателен: если его нет в .env (например, на локальной
# машине разработчика), default='' и sentry_sdk.init() просто не вызывается —
# ошибки при этом идут только в консоль/логи, как раньше, без падения при старте
SENTRY_DSN = config('SENTRY_DSN', default='')

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        # SENTRY_ENVIRONMENT нужен, чтобы в Sentry не путать ошибки с прода
        # и с локальной разработки/staging — по умолчанию считаем, что это dev
        environment=config('SENTRY_ENVIRONMENT', default='development'),
        # send_default_pii=False — не отправлять в Sentry персональные данные
        # пользователя (IP, cookies, тело запроса) вместе с ошибкой
        send_default_pii=False,
        # traces_sample_rate=0 — нам нужен только мониторинг ошибок,
        # а не трейсинг производительности запросов (это отдельная, платная функция)
        traces_sample_rate=0,
    )

# ALLOWED_HOSTS читаем из .env как строку через запятую (например "localhost,127.0.0.1")
# и разбиваем на список — так же можно будет добавить домен при деплое, не трогая код
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# ==== Настройки для работы за прокси Railway (или любым другим PaaS) ====
# Railway сам терминирует HTTPS на своей границе и проксирует запросы к
# контейнеру обычным HTTP, добавляя заголовок X-Forwarded-Proto. Без этой
# строки request.is_secure() внутри Django всегда возвращал бы False, даже
# когда пользователь зашёл по https — из-за этого SECURE_SSL_REDIRECT ниже
# ушёл бы в бесконечный редирект
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CSRF_TRUSTED_ORIGINS — начиная с Django 4+ обязателен для POST-запросов
# (например, через админку) при работе за прокси. Берём из .env, чтобы не
# хардкодить домен — на Railway это будет https://<project>.up.railway.app
# или ваш кастомный домен
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='').split(',') if config('CSRF_TRUSTED_ORIGINS', default='') else []

# Эти настройки безопасны только когда есть настоящий HTTPS (прод за Railway).
# Гейтим через `not DEBUG`, чтобы локальный docker-compose (DEBUG=True, без
# HTTPS) не сломался — иначе SECURE_SSL_REDIRECT перенаправлял бы локальные
# http-запросы в никуда
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000   # 1 год — стандартное значение для HSTS
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

INSTALLED_APPS = [
    'daphne',   # ⬅ должен быть ПЕРВЫМ в списке — заменяет стандартный runserver на ASGI-версию

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'channels',   # ⬅ добавили

    'accounts',
    'categories',
    'products',
    'services',
    'orders',
    'complaints',
    'messengers',
]

# ASGI вместо WSGI — обязательно для WebSocket
ASGI_APPLICATION = 'config.asgi.application'

# Channel layer — общее "хранилище сообщений", через которое разные
# WebSocket-подключения могут обмениваться событиями (использует Redis)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            # REDIS_HOST по умолчанию 127.0.0.1 — для локального запуска без Docker.
            # В docker-compose Redis — отдельный контейнер с именем "redis", и мы
            # переопределяем REDIS_HOST=redis через .env/docker-compose, т.к. по
            # 127.0.0.1 из контейнера с приложением Redis-контейнер не достучаться
            "hosts": [(config('REDIS_HOST', default='127.0.0.1'), config('REDIS_PORT', default=6379, cast=int))],
        },
    },
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise — отдаёт статику (админка, DRF browsable API) прямо из
    # процесса Daphne. На Railway перед контейнером нет nginx, который бы
    # мог сделать это вместо нас, поэтому раздаём сами. ОБЯЗАТЕЛЬНО сразу
    # после SecurityMiddleware — так требует сам whitenoise
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# PostgreSQL вместо SQLite — драйвер psycopg2-binary уже был в requirements.
# POSTGRES_DB/USER/PASSWORD обязательны (без default), как и SECRET_KEY выше —
# чтобы Django явно упал при старте, если забыли задать их в .env.
# POSTGRES_HOST по умолчанию 'localhost' — для запуска без Docker (нужен локальный
# Postgres). В docker-compose POSTGRES_HOST=db — это имя контейнера с базой.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB'),
        'USER': config('POSTGRES_USER'),
        'PASSWORD': config('POSTGRES_PASSWORD'),
        'HOST': config('POSTGRES_HOST', default='localhost'),
        'PORT': config('POSTGRES_PORT', default=5432, cast=int),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
# STATIC_ROOT — куда `collectstatic` соберёт все статические файлы в один
# каталог. Без него collectstatic падает с ошибкой ("не указан STATIC_ROOT").
# WhiteNoise раздаёт файлы именно отсюда
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ==== DRF ====
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],

    # ⬇ добавляем троттлинг
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",   # для неавторизованных (по IP)
        "rest_framework.throttling.UserRateThrottle",   # для авторизованных (по юзеру)
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",    # неавторизованный юзер — не больше 20 запросов в минуту
        "user": "100/minute",   # авторизованный — 100 в минуту
        "login": "5/minute",             # не больше 5 попыток логина в минуту с одного IP
        "password_reset": "3/minute",
        "register": "5/minute",
    },
    
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,   # по 20 объектов на страницу
}

# ==== JWT ====
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# ==== CORS ====
# CORS_ALLOWED_ORIGINS читаем из .env как строку через запятую — по
# умолчанию локальный фронтенд для разработки. На Railway задайте реальный
# домен фронтенда через переменную окружения, ничего не трогая в коде
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
).split(',')

# settings.py

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

EMAIL_HOST_USER = config('EMAIL_HOST_USER')      # Твоя гугл-почта
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')    # Тот самый 16-значный пароль приложения
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# Ссылка на фронтенд — куда попадёт пользователь по клику в письме,
# чтобы там ввести новый пароль. По умолчанию — локальный фронтенд;
# на Railway задайте реальный адрес через .env
FRONTEND_RESET_PASSWORD_URL = config(
    'FRONTEND_RESET_PASSWORD_URL',
    default='http://localhost:3000/reset-password',
)

# ==== AWS S3 (хранилище медиафайлов) ====
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME')

AWS_S3_FILE_OVERWRITE = False   # если два файла загрузят с одинаковым именем — не перезаписывать, а добавить суффикс
AWS_DEFAULT_ACL = None           # не выставляем ACL на уровне файла — управляем доступом через политику бакета
AWS_S3_SIGNATURE_VERSION = "s3v4"

# Django 5+ использует новый формат STORAGES вместо старого DEFAULT_FILE_STORAGE
STORAGES = {
    "default": {
        # "default" — это хранилище для файлов, загружаемых через ImageField/FileField
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        # статику (CSS/JS/админка) пока оставляем на локальном диске — это не обязательно грузить в S3
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Базовый URL, по которому будут доступны файлы (для формирования ссылок в API-ответах)
MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/"