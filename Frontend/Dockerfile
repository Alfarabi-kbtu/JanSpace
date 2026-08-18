# node:24-alpine — совпадает с локальной версией Node на хосте, чтобы
# поведение в контейнере не отличалось от локальной разработки (см. подход
# в Backend/Dockerfile: там python:3.13-slim выбран по той же причине)
FROM node:24-alpine

WORKDIR /app

# Сначала копируем только манифесты — так Docker закэширует слой
# npm ci и не будет переустанавливать зависимости при каждом изменении
# кода приложения
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Это dev-режим (аналог runserver у бэкенда): код монтируется поверх
# образа volume'ом в docker-compose.yml, next dev сам подхватывает изменения.
# node_modules при этом НЕ монтируются с хоста — см. комментарий в
# Backend/docker-compose.yml про frontend_node_modules (иначе Windows-сборка
# Turbopack из хостового node_modules конфликтует с Linux-контейнером)
CMD ["npm", "run", "dev"]
