# python:3.13-slim — совпадает с локальной версией Python (.venv/pyvenv.cfg),
# чтобы поведение в контейнере не отличалось от локальной разработки
FROM python:3.13-slim

# Не создавать .pyc файлы и не буферизовать stdout/stderr —
# иначе логи Django не будут сразу видны в `docker compose logs`
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# psycopg2-binary — это wheel-пакет со встроенным libpq, поэтому системный
# libpq-dev/gcc для сборки НЕ нужны. netcat нужен только entrypoint.sh,
# чтобы дождаться готовности Postgres перед стартом Django (см. entrypoint.sh)
RUN apt-get update \
    && apt-get install -y --no-install-recommends netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Сначала копируем только requirements — так Docker закэширует слой
# pip install и не будет переустанавливать зависимости при каждом
# изменении кода приложения (requirments.txt — так называется файл в проекте)
COPY requirments.txt .
RUN pip install --no-cache-dir -r requirments.txt

# Теперь копируем остальной код проекта
COPY . .

RUN chmod +x entrypoint.sh render-start.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
# runserver — тот же dev-сервер, что описан в CLAUDE.md для локального запуска.
# Он именно daphne (ASGI) "под капотом", т.к. 'daphne' первым в INSTALLED_APPS
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
