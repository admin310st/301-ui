# 301 UI Worker

Модульный фронтенд для проекта **301.st**, который отвечает за:

- страницы аутентификации (логин, регистрация, восстановление пароля);
- управление интеграциями (Cloudflare accounts, domain registrars);
- единый **UI Style Guide** (`/ui-style-guide`), где описаны токены, компоненты и паттерны интерфейса;
- интеграцию с backend-API (см. `docs/301-wiki/` — локальная документация в виде git submodule);
- развёртывание всего этого как **Cloudflare Worker** под `app.301.st`.

Текущая кодовая база — это **"Layer 0-1 / Stage 2"** из дорожной карты, описанной в `docs/ui-roadmap.ru.md`: фундамент для будущего кабинета, работы с доменами, потоками (TDS), сайтами, редиректами и админ-инструментами.

> **📖 API Документация (git submodule)**
> Полная спецификация API находится в `docs/301-wiki/` и подключена как git submodule.
> Для получения последних обновлений документации выполните:
> ```bash
> git submodule update --remote docs/301-wiki
> ```
> Ключевые файлы:
> - `docs/301-wiki/API_Auth.md` — authentication endpoints
> - `docs/301-wiki/API_Integrations.md` — integrations CRUD
> - `docs/301-wiki/Data_Model.md` — database schema

⚠️ IMPORTANT — static assets path

We use Vite with `publicDir: "static"` and deploy from `public/`.
At runtime all assets are served from the **site root**:

- `static/img/foo.svg` → `/img/foo.svg`
- `static/icons/sprite.svg` → `/icons/sprite.svg`

Do NOT reference `/static/...` in HTML/CSS/JS. Always use absolute root paths (`/img/...`, `/css/...`, `/js/...`).

Cloudflare Workers serves `public/` as the origin root.

---

## Архитектура и стек

**Технологии**

- **TypeScript + Vite** — сборка фронтенда, модульный код, HMR.
- **Cloudflare Worker + Wrangler** — деплой и хостинг статики и скриптов.
- **Vanilla DOM-JS** — без React/Vue; тонкие модули для форм и состояния.
- **HTML Partials System** — кастомный Vite-плагин для переиспользования компонентов (header, footer, sidebar) без дублирования кода.
- **Cloudflare Turnstile** — защита форм логина/регистрации/ресета.
- **Webstudio интеграция** — вспомогательный модуль `utils/webstudio.ts` для проброса токена и состояния в макеты Webstudio.

**Логическая структура**

- `index.html`, `dashboard.html`, `wizard.html`, `integrations.html`, `ui-style-guide.html` — HTML-страницы с использованием partials.
- `partials/` — переиспользуемые компоненты (header-top, header-utility, footer, sidebar).
- `src/api` — типизированный клиент для `/auth` и `/integrations` эндпоинтов:
  - `auth.ts` — login, register, reset, verify, me, refresh
  - `integrations.ts` — CRUD для integration keys (Cloudflare, Namecheap)
  - `types.ts` — TypeScript типы для всех API контрактов
- `src/forms` — инициализация и обработчики форм (логин/регистрация/ресет/верификация/cloudflare-wizard).
- `src/state` — хранение токена, вызовы `/auth/me` и `/auth/refresh`, обновление UI.
- `src/ui` — хелперы для работы с DOM:
  - отображение ошибок/уведомлений
  - скрытие/показ блоков по атрибутам (`data-onlogin`, `data-onlogout`, `data-auth-email`)
  - `integrations.ts` — загрузка и рендеринг таблицы integration keys
- `src/i18n` — интернационализация (EN/RU), namespace структура для всех разделов дашборда. Полные конвенции: `.claude/i18n-conventions.md`.
- `src/utils` — общие утилиты (обработка JSON-ошибок, логгер, Webstudio).
- `src/turnstile.ts` — загрузка и перерендер Turnstile, reset для повторных отправок.
- `src/worker.ts` — Cloudflare Worker с логикой роутинга и ранним редиректом для залогиненных пользователей.
- `docs/` — UI Style Guide, roadmap, и git submodule с API документацией (`docs/301-wiki/`).
- `.claude/` — агенты и конвенции для работы с кодом (ui-code-reviewer, pr-review-bot, i18n-conventions).
- `CHANGELOG.md` — история изменений проекта.

**Auth Redirect Strategy**

Приложение использует двухуровневую стратегию редиректа залогиненных пользователей с `/` на `/dashboard.html`:

1. **Worker-level redirect (Cloudflare)** — `worker.ts` проверяет session cookie и делает HTTP 307 redirect до загрузки HTML. Самый быстрый вариант, работает на Edge.
2. **Client-side fallback** — inline скрипт в `<head>` index.html проверяет `/auth/refresh` и делает redirect через `location.replace()`. Обеспечивает портируемость на любой хостинг (Vercel, Netlify, статика).

Оба механизма работают независимо: на CF Workers срабатывает первый уровень, на других платформах — второй. Body страницы скрыт (`opacity: 0`) до завершения проверки, чтобы избежать "flash" формы логина.

---

## Build & Serve

- **IMPORTANT:** `vite.config.ts` uses `publicDir: 'static'`, so assets are emitted from the site root. Examples: `static/img/foo.svg` → `/img/foo.svg` (not `/static/img/foo.svg`). During build `static/` is copied to `public/`, and Cloudflare Workers serve files from `public/`.
- PurgeCSS reports (`build/purge-report/**`) are for local inspection only and must not be committed.

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

- Компоненты в `/ui-style-guide.html` считаются эталоном.
- Если на демо-страницах используются те же компоненты (например, Table Search Bar в таблицах), верстка должна копироваться из эталонного блока 1:1.
- Нельзя создавать вторые версии одного и того же компонента с отличающейся разметкой.

### UI process

1. Любое новое состояние/вариант компонента сначала описывается в `docs/StyleGuide.md` + добавляется пример на `/ui-style-guide`.
2. Только после этого паттерн используется на боевых страницах.
3. Codex не должен изобретать новые размеры, цвета или отступы вне существующих токенов и компонентов.

### UI Consistency Policy

> Все компоненты должны повторять структуры, описанные в `docs/StyleGuide.md`.
>
> Демки (`/ui-style-guide.html`, `/icons-preview.html`) являются эталонным отображением и должны всегда совпадать с документацией.
>
> Все изменения в UI требуют:
>
> 1. обновления стилей
> 2. обновления демки
> 3. обновления документации

> **Repository Ecology Rule**
> Whenever design system updates are introduced, all UI components and all demo pages must be refactored to follow the new rules.
> No page in the system is allowed to use outdated paddings, heights, or markup.
> StyleGuide + demo pages = single source of truth.
> Codex must always update demos when changing components and attach dark/light + mobile screenshots for the affected demos.

### Repository hygiene

- Build outputs (including `/dist`, `/public`, `/build/`) and PurgeCSS reports (`/build/purge-report/`) are local/CI-only and must **never** be committed.
- Keep purge tooling (`npm run purge:report`) for local inspection of unused CSS, but do not add its artifacts to git history.

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

## Текущее покрытие по интеграциям

Репозиторий реализует полный CRUD для управления интеграциями с внешними сервисами, следуя спецификации из `docs/301-wiki/API_Integrations.md`.

### Реализовано

- **Cloudflare Bootstrap Flow**
  - Wizard страница (`/wizard.html`) для подключения CF-аккаунта
  - Bootstrap token → Working token flow через `/integrations/cloudflare/init`
  - Автоматический редирект на `/integrations.html` после успешного подключения
  - Код:
    - `src/forms/cf-wizard.ts`
    - `src/api/integrations.ts → initCloudflare()`
    - `src/api/types.ts → InitCloudflareRequest/Response`

- **Integrations Management**
  - Страница `/integrations.html` с таблицей всех подключенных интеграций
  - Колонки: Provider, Alias, External ID, Status, Connected Date, Actions
  - Provider badges с иконками (Cloudflare, Namecheap, NameSilo, HostTracker, Google Analytics, Yandex Metrica)
  - Status badges (active/expired/revoked) с цветовой индикацией
  - Код:
    - `src/ui/integrations.ts`
    - `src/api/integrations.ts → getIntegrationKeys()`

- **CRUD Operations**
  - `GET /integrations/keys` — список всех integration keys
  - `GET /integrations/keys/:id` — детали конкретной интеграции
  - `POST /integrations/cloudflare/init` — создание Cloudflare интеграции
  - `POST /integrations/namecheap/init` — создание Namecheap интеграции (UI готов, backend pending)
  - `PATCH /integrations/keys/:id` — обновление alias/status
  - `DELETE /integrations/keys/:id` — удаление интеграции с confirmation dialog
  - Код:
    - `src/api/integrations.ts`
    - `src/api/types.ts → IntegrationKey, UpdateKeyRequest`

- **Page States**
  - Loading state (spinner/skeleton)
  - Empty state с CTA кнопкой "Connect Cloudflare"
  - Table state с полным функционалом CRUD

- **i18n Coverage**
  - Полная поддержка EN/RU для integrations раздела
  - Namespace `integrations.*` в `src/i18n/locales/en.ts` и `ru.ts`

### Планируется

- **Namecheap Integration** — UI готов, ожидается backend реализация
- **NameSilo Integration** — запланировано в roadmap
- **HostTracker Integration** — мониторинг доменов и сервисов
- **Analytics Integrations** — Google Analytics, Yandex Metrica

---

## Известные расхождения с API (backlog для доработки)

По результатам сверки с `docs/301-wiki/API_Auth.md`:

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
├── index.html            # Главная страница (auth forms)
├── dashboard.html        # Дашборд (с сайдбаром)
├── wizard.html           # Cloudflare Setup Wizard
├── integrations.html     # Integrations Management
├── ui-style-guide.html   # UI Style Guide (демо компонентов)
├── partials/             # Переиспользуемые компоненты
│   ├── header-top.hbs    # Лого, навигация, язык, тема
│   ├── header-utility.hbs# Помощь, уведомления, user menu
│   ├── footer.hbs        # Футер с брендом
│   └── sidebar.hbs       # Сайдбар навигации
├── public/               # Скомпилированные ассеты (output Vite)
├── src/
│   ├── api/              # Клиент и типы для API
│   │   ├── auth.ts       # /auth endpoints
│   │   ├── integrations.ts # /integrations endpoints
│   │   ├── client.ts     # Base fetch wrapper
│   │   └── types.ts      # TypeScript types for all API contracts
│   ├── forms/            # Инициализация и логика форм
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── reset-*.ts
│   │   ├── verify.ts
│   │   └── cf-wizard.ts  # Cloudflare bootstrap form
│   ├── social/           # OAuth (Google, GitHub)
│   ├── state/            # Состояние аутентификации
│   ├── ui/               # DOM-утилиты, нотификации, видимость блоков
│   │   ├── integrations.ts # Integrations page logic
│   │   └── ...           # Other UI helpers
│   ├── i18n/             # Internationalization (EN/RU)
│   │   └── locales/      # Translation files
│   ├── utils/            # Общие хелперы + Webstudio интеграция
│   ├── turnstile.ts      # Cloudflare Turnstile
│   ├── worker.ts         # Cloudflare Worker entry point
│   └── main.ts           # Client-side entry point, bootstrap всех форм
├── static/               # Локальные статические файлы
├── docs/                 # Documentation
│   ├── StyleGuide.md     # UI Style Guide documentation
│   ├── ui-roadmap.ru.md  # UI Roadmap
│   └── 301-wiki/         # API docs (git submodule)
│       ├── API_Auth.md
│       ├── API_Integrations.md
│       └── Data_Model.md
├── .claude/              # Claude Code agents и команды
│   ├── agents/           # Кастомные агенты (ui-code-reviewer, pr-review-bot)
│   └── commands/         # Slash-команды (/uix, /pr)
├── vite.config.ts        # Конфиг Vite (сборка в public/, partials plugin)
├── tsconfig.json         # Strict TS, алиасы
├── wrangler.toml         # Cloudflare Worker deploy config
├── CHANGELOG.md          # История изменений
├── CLAUDE.md             # Инструкции для Claude Code
└── README.md             # Этот файл
```

---

## HTML Partials System

Для устранения дублирования кода header/footer/sidebar используется кастомный Vite-плагин с поддержкой partials:

**Использование в HTML:**
```html
<header class="site-header" role="banner">
{{> header-top}}

  <div class="utility-bar">
    <!-- Page-specific breadcrumbs -->
{{> header-utility}}
  </div>
</header>

<main class="page-shell app-shell">
{{> sidebar activePage="dashboard"}}
  <!-- Content -->
</main>

{{> footer}}
```

**Преимущества:**
- Изменение header требует правки только 1 файла вместо 4+
- Автоматическое применение изменений ко всем страницам
- Подготовка к 20+ страницам из roadmap (Layers 1-7)
- Нет внешних зависимостей, работает через кастомный Vite-плагин

**Partials:**
- `header-top.hbs` — Лого, навигация, переключатель языка, тема
- `header-utility.hbs` — Help, уведомления, меню пользователя, logout
- `footer.hbs` — Футер с брендом и ссылками
- `sidebar.hbs` — Навигация с динамическим `is-active` состоянием

Подробности в коммите `0a4f8e8` и `CHANGELOG.md`.

---

## EN summary (short)

For non-Russian readers:

> 301 UI Worker is a modular frontend for 301.st authentication pages, integrations management, and the shared UI style guide.
> It is built with TypeScript + Vite and deployed as a Cloudflare Worker under `app.301.st`.
>
> **Current features:**
> - Login/register/reset flows with Turnstile
> - Omni-token verification and OAuth starts
> - Integrations management (Cloudflare accounts, domain registrars)
> - Full CRUD for integration keys
> - Cloudflare bootstrap wizard
> - UI style guide for consistent design across future features
>
> **Documentation:**
> - API specification: `docs/301-wiki/` (git submodule)
>   - Update with: `git submodule update --remote docs/301-wiki`
> - UI Roadmap: `docs/ui-roadmap.ru.md`
> - Style Guide: `docs/StyleGuide.md`
>
> The repo is currently at **Layer 0-1 / Stage 2** of the roadmap: foundation for the future user cabinet, domains, TDS/streams, sites and admin tools.

