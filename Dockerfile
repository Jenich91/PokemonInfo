# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY ./app/package*.json ./
RUN npm install

# Копируем все файлы приложения в контейнер
COPY ./app ./

# Собираем приложение
RUN npm run build

# Устанавливаем сервер для обслуживания статических файлов
RUN npm install -g serve

# Открываем порт сервера
EXPOSE 3000

# Запускаем сервер для обслуживания статических файлов
CMD ["serve", "-s", "build"]
