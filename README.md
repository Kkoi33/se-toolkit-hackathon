# TopicTimer Tracker

Минималистичный веб-таймер Pomodoro, который привязывает учебные сессии к предметам и отслеживает историю обучения.

## Быстрый старт

### Локальный запуск (без Docker)

1. Убедитесь, что у вас установлен **Node.js 18+**
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Запустите сервер:
   ```bash
   npm start
   ```
   или для разработки с авто-перезагрузкой:
   ```bash
   npm run dev
   ```
4. Откройте браузер по адресу: **http://localhost:3000**

### Запуск через Docker

1. Убедитесь, что Docker и Docker Compose установлены
2. Запустите:
   ```bash
   docker compose up -d
   ```
3. Откройте: **http://localhost:3000**

## Использование

1. Выберите существующий предмет или добавьте новый
2. Нажмите **Start** для начала фокус-сессии (25 мин)
3. Используйте **Pause/Resume** по необходимости
4. Нажмите **Stop & Log** для сохранения сессии
5. Просматривайте историю и статистику за неделю

## Технологии

- **Backend:** Node.js + Express + SQLite
- **Frontend:** Vanilla JS + Chart.js
- **Данные:** SQLite (файл `study.db`)

## Структура проекта

```
├── server.js          # Express сервер + API маршруты
├── database.js        # SQLite подключение и инициализация
├── package.json       # Зависимости проекта
├── .env               # Переменные окружения (PORT)
├── public/
│   ├── index.html     # Главная страница
│   ├── app.js         # Клиентская логика (таймер, API)
│   └── style.css      # Стили
└── docker-compose.yml # Docker конфигурация
```

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/topics` | Получить все предметы |
| POST | `/api/topics` | Создать предмет `{name}` |
| GET | `/api/sessions` | Получить последние сессии |
| POST | `/api/sessions` | Создать сессию `{topic_id, start_time, duration_minutes}` |
| GET | `/api/stats/weekly` | Статистика за неделю |