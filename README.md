# 301 UI Worker

Модульный фронтенд для страниц авторизации 301.st на Vite. Проект собирает статичный билд в `public/`, который раздает Cloudflare Worker из `src/worker.ts`. Поддержаны Turnstile, полные auth-флоу (login/register/reset/verify) и OAuth (Google, GitHub).

## Структура

```
301-ui/
├── index.html            # Vite entry, формы c data-* атрибутами
├── public/               # Готовый билд (outDir Vite)
├── src/
│   ├── api/              # API-клиент и типы
│   ├── forms/            # Инициализация форм (login/register/reset/verify)
│   ├── social/           # OAuth-потоки Google/GitHub
│   ├── state/            # Auth-state, токен, /me, refresh
│   ├── ui/               # DOM утилиты, уведомления, видимость
│   ├── utils/            # Общие хелперы (json/errors/logger/webstudio)
│   ├── turnstile.ts      # Авто-рендер и reset Turnstile
│   └── main.ts           # Точка входа Vite
├── static/               # Статичные ассеты для разработки
├── vite.config.ts        # Сборка в public/
├── tsconfig.json         # strict TS + alias
└── wrangler.toml         # Деплой Cloudflare Worker
```

### Основные модули
- **API** (`src/api`): `apiFetch` добавляет Bearer-токен, парсит JSON и кидает типизированную ошибку `{ status, body }`. Модуль `auth.ts` закрывает login/register/reset/verify, OAuth старты и logout.
- **Auth state** (`src/state/auth-state.ts`): хранение токена в `localStorage`, загрузка `/me`, авто-refresh, синхронизация вкладок через `storage` event, подписки на изменения.
- **Forms** (`src/forms`): каждая форма ищется по `data-form="login|register|reset-request|reset-confirm|verify"`, ставит состояния `pending/error/success` и вызывает соответствующий API-флоу. Ошибки выводятся в `[data-status]`.
- **Turnstile** (`src/turnstile.ts`): автозагрузка скрипта, рендер `.turnstile-widget`, кеш токена формы, `resetTurnstile()` после ошибок.
- **UI** (`src/ui`): `dom.ts` (qs/qsa/toggle/setFormState), `notifications.ts` (глобальные сообщения), `visibility.ts` (data-onlogin/onlogout/auth-email).
- **OAuth** (`src/social`) Google/GitHub: старт через `/oauth/*/start`, сохранение токена из `?token=...` на `/auth/success`, редирект в `/account`.

## Запуск локально

```bash
npm install
npm run dev        # Vite dev server http://localhost:5173
```

## Сборка

```bash
npm run build      # Билд в public/
npm run preview    # Локальный превью из собранных файлов
```

## Деплой через Wrangler

```bash
npm run build
wrangler deploy    # использует wrangler.toml, раздаёт public/
```

## Интеграция с Webstudio

- Подключайте собранный `public/` как статический хостинг, скрипт `src/main.ts` ищет формы по data-атрибутам и включает Turnstile, поэтому важно сохранить разметку:
  - формы: `data-form="login"`, `data-form="register"`, `data-form="reset-request"`, `data-form="reset-confirm"`, `data-form="verify"`
  - капча: `.turnstile-widget` + скрытый `input[name="turnstile_token"]`
  - состояния: `[data-status]` внутри формы
  - видимость: `data-onlogin`, `data-onlogout`, `data-auth-email`
- При успешном OAuth страница `/auth/success?token=...` сохранит токен, вызовет `/me` и отправит пользователя в `/account`.
- Для интеграции переменных Webstudio оставлен хелпер `src/utils/webstudio.ts` (setWSVar, authFetchBuster) — при необходимости подключите его в свои модули.

## Проверка

- `npm run dev` — быстрая проверка работы форм и Turnstile
- `npm run build` — гарантирует, что Vite собирает `public/`
- Cloudflare Worker из `src/worker.ts` отдаёт `public/` и `/env` с `TURNSTILE_SITEKEY`
