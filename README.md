# Expense Tracker

Небольшое учебное full-stack приложение для учёта личных расходов.
Используется как исходный (baseline) репозиторий для курсовой работы по Software Engineering.

- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite, uvicorn
- **Frontend:** React 19, Vite, JavaScript, [HeroUI v3](https://heroui.com/docs/react/getting-started) + Tailwind CSS v4
- **Тесты:** pytest + FastAPI TestClient (backend), Vitest + React Testing Library (frontend)

## Возможности

- добавление, редактирование и удаление расходов;
- фильтр списка по категории;
- сводка: сумма по каждой категории и общий итог;
- отображение состояния загрузки и ошибок запросов;
- светлая и тёмная темы (с сохранением выбора).

Категории: `food`, `transport`, `entertainment`, `utilities`, `other`.

## Структура проекта

```
.
├── backend/
│   ├── app/
│   │   ├── main.py            # создание FastAPI-приложения, CORS, /api/health
│   │   ├── config.py          # настройки из переменных окружения / .env
│   │   ├── database.py        # движок SQLAlchemy, сессии, get_db()
│   │   ├── models.py          # ORM-модель Expense
│   │   ├── schemas.py         # Pydantic-схемы и перечисление Category
│   │   ├── crud.py            # операции с БД и calculate_summary()
│   │   └── routers/
│   │       └── expenses.py    # эндпоинты /api/expenses и /api/summary
│   ├── tests/
│   │   ├── conftest.py        # фикстуры: отдельная тестовая SQLite-база
│   │   └── test_expenses.py   # тесты API и расчёта сводки
│   ├── seed.py                # заполняет базу 10 вымышленными расходами
│   ├── pytest.ini
│   ├── ruff.toml              # настройки линтера ruff
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExpenseForm.jsx
│   │   │   ├── ExpenseList.jsx
│   │   │   ├── Summary.jsx
│   │   │   └── ThemeSwitcher.jsx
│   │   ├── __tests__/
│   │   │   ├── App.test.jsx
│   │   │   ├── ExpenseActions.test.jsx
│   │   │   ├── ExpenseForm.test.jsx
│   │   │   └── Summary.test.jsx
│   │   ├── App.jsx
│   │   ├── api.js             # запросы к backend
│   │   ├── categories.js      # категории, форматирование сумм и дат
│   │   ├── index.css          # подключение Tailwind CSS и стилей HeroUI
│   │   ├── main.jsx           # точка входа, I18nProvider (локаль ru-RU)
│   │   └── setupTests.js
│   ├── index.html
│   ├── eslint.config.js       # настройки линтера ESLint
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

## REST API

Все пути начинаются с `/api`. Интерактивная документация: http://localhost:8000/docs

| Метод  | Путь                    | Описание                                                  |
|--------|-------------------------|-----------------------------------------------------------|
| GET    | `/api/expenses`         | Список расходов; фильтр: `?category=food`                 |
| POST   | `/api/expenses`         | Создать расход                                            |
| PUT    | `/api/expenses/{id}`    | Изменить расход (полная замена)                           |
| DELETE | `/api/expenses/{id}`    | Удалить расход                                            |
| GET    | `/api/summary`          | Сумма по каждой категории и общий итог                    |
| GET    | `/api/health`           | Проверка работоспособности                                |

Пример тела запроса для POST/PUT:

```json
{
  "amount": 12.5,
  "category": "food",
  "description": "Обед",
  "date": "2025-03-01"
}
```

Пример ответа `/api/summary`:

```json
{
  "by_category": {"food": 81.55, "transport": 21.6, "entertainment": 24.9, "utilities": 70.0, "other": 7.0},
  "total": 205.05
}
```

## Требования

- Python 3.11 или новее
- Node.js 20.19+ или 22.12+ (рекомендуется актуальная LTS-версия), вместе с npm

## Переменные окружения (необязательно)

Приложение работает без настройки. Чтобы изменить значения по умолчанию, скопируйте `.env.example` в `.env` в корне репозитория:

```bash
cp .env.example .env          # macOS / Linux
copy .env.example .env        # Windows (cmd или PowerShell)
```

| Переменная     | По умолчанию              | Где используется |
|----------------|---------------------------|------------------|
| `DATABASE_URL` | файл `backend/expenses.db` | backend          |
| `CORS_ORIGINS` | `http://localhost:5173`   | backend          |
| `VITE_API_URL` | `http://localhost:8000`   | frontend         |

## Backend

### Установка

macOS / Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows (PowerShell):

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Если PowerShell запрещает запуск скрипта активации, выполните один раз
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, либо используйте cmd: `.venv\Scripts\activate.bat`.

### Тестовые данные

Из папки `backend` с активированным виртуальным окружением (одинаково для всех ОС):

```bash
python seed.py
```

Скрипт **удаляет все существующие расходы** и добавляет 10 вымышленных.

### Запуск

```bash
uvicorn app.main:app --reload
```

API будет доступен по адресу http://localhost:8000, документация — http://localhost:8000/docs.
База `backend/expenses.db` создаётся автоматически при первом запуске.

### Тесты

```bash
pytest
```

Тесты используют отдельную временную SQLite-базу и не затрагивают `expenses.db`.

### Линтер

```bash
ruff check .
```

Ruff устанавливается вместе с остальными зависимостями из `requirements.txt`; настройки — в `ruff.toml`.

## Frontend

Интерфейс построен по рекомендациям [HeroUI v3](https://heroui.com/docs/react/getting-started)
(компоненты основаны на React Aria):

- **Компоненты:** `Card`, `Form`, `NumberField`, `Select`, `TextField`, `DateField` — форма;
  `Table`, `Chip`, `Tooltip`, `AlertDialog` — список с подтверждением удаления;
  `Meter`, `Separator` — сводка; `Toast` — уведомления об успешных действиях;
  `Alert` — ошибки загрузки с кнопкой «Повторить»; `Skeleton` — состояние загрузки;
  `EmptyState` — пустой список; `ToggleButtonGroup` + `useTheme` — переключатель темы.
- **Варианты кнопок по смыслу:** `primary` — одно главное действие (добавить/сохранить),
  `tertiary` — отмена, `danger` — необратимое удаление, `ghost` — иконки действий в строках таблицы.
- **Цвета — только семантические токены** (`bg-background`, `text-muted`, `bg-accent-soft`,
  `border-separator` и т. д.), поэтому светлая и тёмная темы работают без отдельных стилей.
- **Иконки** — [`@gravity-ui/icons`](https://gravity-ui.com/icons) (используются в примерах HeroUI).

### Тёмная тема

Переключатель в шапке: светлая / тёмная / как в системе. Хук `useTheme` из HeroUI сохраняет выбор
в `localStorage` и ставит на `<html>` класс и атрибут `data-theme`. Небольшой скрипт в `index.html`
применяет сохранённую тему до загрузки React, чтобы страница не «мигала» светлой темой.

### Подключение HeroUI

HeroUI v3 не требует провайдера; стили подключаются в `src/index.css`:

```css
@import "tailwindcss";
@import "@heroui/styles";
```

Tailwind CSS v4 подключён через плагин `@tailwindcss/vite` в `vite.config.js`.
Поля даты и суммы используют русскую локаль (`I18nProvider locale="ru-RU"` в `main.jsx`):
дата вводится как ДД.ММ.ГГГГ, дробная часть суммы — через запятую.

Откройте второй терминал (backend должен быть запущен). Команды одинаковы для Windows, macOS и Linux.

### Установка

```bash
cd frontend
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

Приложение откроется по адресу http://localhost:5173.
Порт фиксирован (`strictPort`), так как backend разрешает CORS только для него.

### Тесты

```bash
npm test
```

### Линтер

```bash
npm run lint
```

ESLint проверяет код по правилам `@eslint/js` и `eslint-plugin-react-hooks`; настройки — в `eslint.config.js`.

### Сборка

```bash
npm run build
```

Готовые файлы появятся в `frontend/dist`. Проверить сборку локально: `npm run preview`.

## Быстрый старт

macOS / Linux:

```bash
# терминал 1
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload

# терминал 2
cd frontend
npm install
npm run dev
```

Windows (PowerShell):

```powershell
# терминал 1
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload

# терминал 2
cd frontend
npm install
npm run dev
```
