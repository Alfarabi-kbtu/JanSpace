#!/bin/sh
# Команда запуска для Render (см. render.yaml, dockerCommand). Вынесена в
# отдельный файл, а не вписана инлайн в render.yaml, потому что Render не
# пропускает dockerCommand через обычный shell-парсинг "&&"/кавычек —
# инлайн-строка вида `sh -c "migrate && collectstatic && daphne ..."`
# трактовалась как ОДНА команда с пробелами в имени и падала с
# "not found". Один файл с явным shebang — однозначно для любого способа
# запуска, без догадок о токенизации.
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Бутстрап первого суперюзера без доступа к shell (Render Shell — платная
# фича, на free-плане недоступна). createsuperuser --noinput сам читает
# DJANGO_SUPERUSER_USERNAME/_EMAIL/_PASSWORD из окружения — если их нет,
# просто пропускаем; если юзер с таким именем уже есть, команда упадёт с
# "already taken" — глушим через `|| true`, чтобы это не валило весь
# старт контейнера на повторных деплоях
if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  python manage.py createsuperuser --noinput || true
fi

exec daphne -b 0.0.0.0 -p "$PORT" config.asgi:application
