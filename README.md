# 301 UI Worker

Модульный фронтенд для проекта **301.st**, который отвечает за:

- страницы аутентификации (логин, регистрация, восстановление пароля);
- единый **UI Style Guide** (`/ui-style-guide`), где описаны токены, компоненты и паттерны интерфейса;
- интеграцию с backend-API (см. [API wiki](https://github.com/admin310st/301/wiki/API));
- развёртывание всего этого как **Cloudflare Worker** под `app.301.st`.

Текущая кодовая база — это **“Layer 0 / Stage 2”** из дорожной карты, описанной в `docs/ui-roadmap.ru.md`: фундамент для будущего кабинета, работы с доменами, потоками (TDS), сайтами, редиректами и админ-инструментами.

---

## Архитектура и стек

**Технологии**

- **TypeScript + Vite** — сборка фронтенда, модульный код, HMR.
- **Cloudflare Worker + Wrangler** — деплой и хостинг статики и скриптов.
- **Vanilla DOM-JS** — без React/Vue; тонкие модули для форм и состояния.
- **Cloudflare Turnstile** — защита форм логина/регистрации/ресета.
- **Webstudio интеграция** — вспомогательный модуль `utils/webstudio.ts` для проброса токена и состояния в макеты Webstudio.

**Логическая структура**

- `index.html` — разметка форм, хуки через `data-*` атрибуты.
- `src/api` — типизированный клиент для `/auth`-эндпоинтов.
- `src/forms` — инициализация и обработчики форм (логин/регистрация/ресет/верификация).
- `src/state` — хранение токена, вызовы `/auth/me` и `/auth/refresh`, обновление UI.
- `src/ui` — хелперы для работы с DOM, отображения ошибок/уведомлений, скрытия/показа блоков по атрибутам (`data-onlogin`, `data-onlogout`, `data-auth-email`).
- `src/utils` — общие утилиты (обработка JSON-ошибок, логгер, Webstudio).
- `src/turnstile.ts` — загрузка и перерендер Turnstile, reset для повторных отправок.
- `docs/` — UI Style Guide и roadmap по дальнейшему развитию интерфейса.

---

## UI Style Guide (Layer 0)

Файл `docs/StyleGuide.md` и страница `/ui-style-guide` на `app.301.st` — это:

- единый источник правды по:
  - цветовым токенам (`--bg`, `--panel`, `--brand`, `--muted`, `--shadow-*` и т.д.),
  - компонентам (`btn`, `btn-chip`, `Table Search Bar`, таблицы доменов, dropdown-меню),
  - иконам (набор `mono/*` и `brand/*` с `currentColor`);
- основа, которой должны придерживаться и разработчики, и Codex при создании новых экранов:
  - экраны кабинета,
  - управление доменами,
  - TDS/streams, сайты, редиректы и пр.

**Важно:**
При добавлении новых компонентов/поправок сначала обновляется Style Guide, затем этот паттерн переиспользуется в боевых страницах (а не наоборот).

### UI process

1. Любое новое состояние/вариант компонента сначала описывается в `docs/StyleGuide.md` + добавляется пример на `/ui-style-guide`.
2. Только после этого паттерн используется на боевых страницах.
3. Codex не должен изобретать новые размеры, цвета или отступы вне существующих токенов и компонентов.

### UI Consistency Policy

> Все компоненты должны повторять структуры, описанные в `docs/StyleGuide.md`.
>
> Демки (`/static/ui-style-guide.html`, `/static/icons-preview.html`) являются эталонным отображением и должны всегда совпадать с документацией.
>
> Все изменения в UI требуют:
>
> 1. обновления стилей
> 2. обновления демки
> 3. обновления документации

---

## Текущее покрытие по аутентификации

Репозиторий реализует все основные флоу `/auth` из [API wiki](https://github.com/admin310st/301/wiki/API), но есть известные расхождения по контракту (см. ниже).

### Реализовано

- **Логин по email + пароль**  
  - Turnstile обязателен.  
  - После успешного логина UI:
    - сохраняет `access_token`,
    - делает запрос к `/auth/me`,
    - обновляет видимые блоки через `data-onlogin` и `data-auth-email`.  
  - Код:
    - `src/forms/login.ts`
    - `src/api/auth.ts → login()`
    - `src/state/auth-state.ts`

- **Регистрация (email + пароль)**  
  - Turnstile обязателен.  
  - Проверка силы пароля на клиенте.  
  - После успешного запроса пользователю показывается сообщение о подтверждении по email.  
  - Код:
    - `src/forms/register.ts`
    - `src/api/auth.ts → register()`
    - `src/api/types.ts → RegisterRequest/Response`

- **Сброс пароля (reset)**  
  - Запрос ссылки/кода на email или Telegram-идентификатор.
  - Проверка reset-сессии и CSRF, пошаговый флоу:
    - `reset-request`, `reset-verify`, `reset-confirm`.
  - Код:
    - `src/forms/reset-request.ts`
    - `src/forms/reset-verify.ts`
    - `src/forms/reset-confirm.ts`
    - `src/api/auth.ts → reset*`

- **Подтверждение email / Omni-токен**  
  - Эндпоинт `/auth/verify` обрабатывает:
    - верификацию регистрации,
    - подтверждение ресета и прочих Omni-флоу.
  - UI читает `?type=register|reset&token=...` из URL, выбирает сценарий и отправляет токен на `/auth/verify`.
  - Код:
    - `src/forms/verify.ts`
    - `src/api/auth.ts → verifyToken()`
    - `src/api/types.ts → VerifyRequest/Response`

- **OAuth-старты**  
  - Ссылки для авторизации через Google и GitHub.
  - Код:
    - `src/social/google.ts`
    - `src/social/github.ts`

- **Состояние сессии**  
  - Хранение токена, вызовы `/auth/refresh` и `/auth/me`.
  - Подписка UI на изменения состояния (кабинет, хедер и т.п.).
  - Код:
    - `src/state/auth-state.ts`

---

## Известные расхождения с API (backlog для доработки)

По результатам сверки с [API wiki](https://github.com/admin310st/301/wiki/API):

1. **Форма /auth/verify (Omni-токен)**  
   - API ожидает `{"token": "..."}` (тип зашит в токен).  
   - UI сейчас отправляет `{ type: 'register', token }` и не использует этот эндпоинт для reset-флоу.  
   - Нужно:
     - перестать отправлять `type` в теле запроса,
     - правильно обрабатывать reset/phone/OTP сценарии.

2. **Форма логина**  
   - API поддерживает вход по `email` **или** `phone` + пароль.  
   - Текущая форма UI работает только с email.  
   - Требуется:
     - расширить форму/валидацию и запрос, чтобы поддерживать телефон.

3. **Типы ответа `/auth/login` и `/auth/me`**  
   - API возвращает `active_account_id`, список `accounts`, `expires_in`.  
   - Клиентские типы сейчас учитывают только `access_token` + минимальный `user`.  
   - UI игнорирует выбор аккаунта, что будет проблемой, когда появится мульти-аккаунтный кабинет.

4. **Ответ на регистрацию**  
   - API возвращает `{ status, mode, channel, token }`.  
   - UI до сих пор ожидает, что придёт `access_token`/`user`, и трактует ответ как “регистрация завершена”.  
   - Нужно:
     - привести типы к реальному ответу,
     - явно показывать пользователю, что требуется подтверждение (email/SMS/TG).

Эти четыре пункта — минимальный backlog, который нужно реализовать, чтобы фронтенд полностью совпадал с контрактом backend-API.

---

## Project structure (быстрый обзор)

```text
301-ui/
├── index.html            # Входная разметка, формы, data-* hooks
├── public/               # Скомпилированные ассеты (output Vite)
├── src/
│   ├── api/              # Клиент и типы для /auth
│   ├── forms/            # Инициализация и логика форм
│   ├── social/           # OAuth (Google, GitHub)
│   ├── state/            # Состояние аутентификации
│   ├── ui/               # DOM-утилиты, нотификации, видимость блоков
│   ├── utils/            # Общие хелперы + Webstudio интеграция
│   ├── turnstile.ts      # Cloudflare Turnstile
│   └── main.ts           # Точка входа Vite, bootstrap всех форм
├── static/               # Локальные статические файлы
├── docs/                 # Style Guide и UI roadmap
├── vite.config.ts        # Конфиг Vite (сборка в public/)
├── tsconfig.json         # Strict TS, алиасы
└── wrangler.toml         # Cloudflare Worker deploy config
```

---

## EN summary (short)

For non-Russian readers:

> 301 UI Worker is a modular frontend for 301.st authentication pages and the shared UI style guide.
> It is built with TypeScript + Vite and deployed as a Cloudflare Worker under `app.301.st`.
> The repo implements login/register/reset flows with Turnstile, Omni-token verification and OAuth starts, and exposes a UI style guide that should be reused across the future user cabinet, domains, TDS/streams, sites and admin tools.
> See `docs/ui-roadmap.ru.md` for the long-term UI roadmap and the [API wiki](https://github.com/admin310st/301/wiki/API) for backend contracts.

