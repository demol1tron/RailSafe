## Запуск

```bash
# Для разработки можно запустить сразу с compose-defaults.
docker compose up -d --build

# Для сервера скопируйте .env.example в .env и замените секреты/пароль.
```

После сборки интерфейс доступен по `https://<IP-сервера>/`, Swagger — `/api/docs`.

Учётная запись разработки по умолчанию:

- email: `admin@example.com`
- password: `admin123` (или значение `ADMIN_INITIAL_PASSWORD` из `.env`)
