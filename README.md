# AI Interview Platform

Микросервисное приложение для проведения видео-собеседований с AI HR.

## Особенности

- ✅ Видеоконференция с поддержкой камеры и микрофона
- ✅ Чат в реальном времени между кандидатом и AI HR
- ✅ Интеграция с Whisper для автоматической транскрипции речи
- ✅ Таймер собеседования
- ✅ Автоматическое сохранение транскрипции в JSON и TXT форматах
- ✅ Уникальные ссылки для каждого собеседования
- ✅ Минималистичный дизайн в черно-белой-фиолетовой палитре

## Технологический стек

**Backend:**
- FastAPI 0.115.13
- SQLAlchemy 2.0.36
- Pydantic 2.9.2
- WebSocket поддержка
- SQLite база данных

**Frontend:**
- React 18.3.1
- TypeScript
- Vite
- Lucide React (иконки)

## Структура проекта

```
vtb_mortech_ai_sobes/
├── backend/                 # FastAPI сервер
│   ├── app/
│   │   ├── models.py       # Модели базы данных
│   │   ├── database.py     # Настройка БД
│   │   └── routers/        # API роутеры
│   ├── main.py             # Точка входа
│   ├── requirements.txt    # Зависимости Python
│   └── start.bat          # Скрипт запуска (Windows)
├── frontend/               # React приложение
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── services/       # Сервисы (Whisper клиент)
│   │   └── main.tsx       # Точка входа
│   ├── package.json       # Зависимости Node.js
│   └── start.bat         # Скрипт запуска (Windows)
└── test_create_interview.py # Скрипт для создания тестового интервью
```

## Запуск приложения

### Предварительные требования

- Python 3.9+
- Node.js 18+
- npm или yarn

### 1. Запуск Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Или используйте готовый скрипт:
```bash
cd backend
start.bat
```

Backend будет доступен по адресу: http://localhost:8000

### 2. Запуск Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Или используйте готовый скрипт:
```bash
cd frontend
start.bat
```

Frontend будет доступен по адресу: http://localhost:3000

### 3. Создание тестового интервью

```bash
python test_create_interview.py
```

Скрипт создаст тестовое интервью и выведет ссылку для подключения.

## API Endpoints

### Создание интервью
```http
POST /api/v1/interviews/
Content-Type: application/json

{
  "candidate_name": "Имя Кандидата",
  "candidate_id": "unique_candidate_id",
  "position": "Название позиции",
  "recommended_duration": 60,
  "knowledge_base": "Дополнительная информация",
  "description": "Описание собеседования"
}
```

**Ответ:**
```json
{
  "id": 1,
  "unique_link": "uuid-string",
  "full_link": "http://localhost:3000/interview/uuid-string",
  "candidate_name": "Имя Кандидата",
  "position": "Название позиции",
  "status": "not_started",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Получение интервью по ссылке
```http
GET /api/v1/interviews/{unique_link}
```

### Управление интервью
```http
PATCH /api/v1/interviews/{interview_id}/start   # Начать интервью
PATCH /api/v1/interviews/{interview_id}/finish  # Завершить интервью
GET /api/v1/interviews/{interview_id}/status    # Статус интервью
```

### WebSocket для чата
```
ws://localhost:8000/api/v1/chat/{interview_id}/ws
```

## Интеграция с Whisper

Приложение интегрируется с Whisper WebSocket сервером по адресу:
```
wss://mojarung-whisper-websocket-6dd5.twc1.net
```

При включении микрофона автоматически начинается запись и транскрипция речи кандидата.

## Структура базы данных

### Таблица interviews
- `id` - Уникальный ID
- `unique_link` - Уникальная ссылка для доступа
- `candidate_name` - Имя кандидата
- `candidate_id` - ID кандидата
- `position` - Позиция
- `status` - Статус (not_started, started, finished)
- `recommended_duration` - Рекомендуемая длительность
- `started_at` - Время начала
- `finished_at` - Время окончания
- `actual_duration` - Фактическая длительность

### Таблица chat_messages
- `id` - Уникальный ID сообщения
- `interview_id` - ID интервью
- `content` - Текст сообщения
- `role` - Роль (candidate, ai_hr, recruiter)
- `timestamp` - Время отправки

## Файлы транскрипции

После завершения интервью создаются два файла:

1. **JSON файл** - структурированные данные с метаинформацией
2. **TXT файл** - простой текстовый формат для чтения

Файлы сохраняются в папку `backend/transcripts/`

## Troubleshooting

### Backend не запускается
- Проверьте, что установлен Python 3.9+
- Убедитесь, что все зависимости установлены: `pip install -r requirements.txt`
- Проверьте, что порт 8000 свободен

### Frontend не запускается
- Проверьте, что установлен Node.js 18+
- Убедитесь, что зависимости установлены: `npm install`
- Проверьте, что порт 3000 свободен

### WebSocket не подключается
- Убедитесь, что backend запущен
- Проверьте консоль браузера на ошибки
- Убедитесь, что нет блокировки CORS

### Whisper не работает
- Проверьте подключение к интернету
- Убедитесь, что микрофон подключен и разрешен в браузере
- Проверьте доступность сервера Whisper

## Лицензия

MIT License
