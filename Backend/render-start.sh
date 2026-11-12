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

exec daphne -b 0.0.0.0 -p "$PORT" config.asgi:application
