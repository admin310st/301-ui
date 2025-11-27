# 301 UI Worker

Cloudflare Worker, который публикует статичные страницы авторизации 301.st и отдает публичные переменные окружения для фронтенда. Проект закрывает **Этап 1 (HTML + JS)** из [дорожной карты](docs/ui-roadmap.ru.md).

## Что уже работает (Этап 1)

- Статичная страница авторизации с формами **login** и **register** из `public/index.html` + `auth.js`.
- Формы вызывают API в проде (`https://api.301.st/auth/{register|login}`) и отправляют `turnstile_token` в теле запроса.
- Turnstile рендерится через публичный ключ, который воркер берет из секрета `TURNSTILE_SITEKEY` и отдает на `/env` как `{ "turnstileSitekey": "..." }`.
- Есть базовый вывод статусов формы и заглушка для будущего редиректа после логина.
- Кнопки OAuth (Google, GitHub) ведут на `/auth/success/`, где токен из API прокидывается в клиент и происходит редирект в SaaS.

## Структура

- `wrangler.toml` – конфигурация воркера (`301-app`, ассеты из `public/`).
- `src/worker.ts` – минимальный воркер: раздает статические файлы и отвечает на `/env` содержимым `TURNSTILE_SITEKEY`.
- `public/` – статичная страница авторизации (`index.html`, `auth.js`, `auth.css`).
- `docs/ui-roadmap.ru.md` – план развития интерфейса (этапы от HTML+JS до полноценного SPA).
- `docs/301-wiki/` – Git submodule с Wiki основного проекта `admin310st/301`. Основная API-спецификация хранится в `docs/301-wiki/API.md`.
- `package.json` – скрипты и зависимость `wrangler`.

## API-документация

Этот репозиторий не хранит копию API-описания вручную.  
Вместо этого подключен Git submodule с Wiki основного проекта 301:

- Путь к Wiki: `docs/301-wiki/`
- Основная спецификация API: `docs/301-wiki/API.md`

### Обновление Wiki

Чтобы подтянуть последние изменения из Wiki:

```bash
git submodule update --remote --merge
