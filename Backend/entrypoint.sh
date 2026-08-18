#!/bin/sh
# Выполняется при каждом старте контейнера web, до команды из CMD (см. Dockerfile)
set -e

# Ждём, пока Postgres-контейнер не начнёт принимать соединения на POSTGRES_PORT.
# Без этого при "docker compose up" Django стартует раньше, чем Postgres успевает
# подняться, и migrate падает с connection refused.
echo "Ожидаем Postgres ($POSTGRES_HOST:$POSTGRES_PORT)..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 0.5
done
echo "Postgres готов."

# Применяем миграции автоматически при каждом старте — удобно для локальной
# разработки (не нужно руками заходить в контейнер после docker compose up)
python manage.py migrate --noinput

# Собираем статику в STATIC_ROOT (см. settings.py), чтобы WhiteNoise было
# что раздавать. Не может выполняться на этапе "docker build" — settings.py
# требует SECRET_KEY/POSTGRES_*/AWS_* из окружения, а на этапе сборки
# образа их ещё нет, поэтому запускаем здесь, при старте контейнера
python manage.py collectstatic --noinput

# exec "$@" — заменяет процесс entrypoint.sh на CMD из Dockerfile
# (python manage.py runserver ...), чтобы Django стал PID 1 и корректно
# получал сигналы остановки от docker compose down / Ctrl+C
exec "$@"
