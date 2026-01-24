# Cloudflare Tools — Техническое задание

## Концепция

**Расширение браузера** для массовых операций с Cloudflare, работающее напрямую с CF API через Global API Key. Решает проблему rate-limits и квот при bulk-операциях.

**Название:** Cloudflare Tools
**Тип:** Browser Extension (Chrome/Firefox)
**Репозиторий:** Отдельный (не monorepo)
**Связь с 301.st:** Ссылки на основной проект, без API интеграции

## Почему расширение браузера?

1. **Нет CORS ограничений** — расширения могут делать любые HTTP запросы
2. **Доверие пользователей** — установка из официального магазина расширений
3. **Безопасность** — `chrome.storage.local` надёжнее чем localStorage
4. **Интеграция с CF** — можно добавить кнопки прямо в Cloudflare Dashboard
5. **Global API Key без лимитов** — полный доступ к CF API без ограничений
6. **Трафик** — приложение приводит пользователей к основному проекту 301.st

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  Browser Extension                      │
│                  (Cloudflare Tools)                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Popup UI   │  │ Background   │  │  Content     │  │
│  │  (main app)  │  │   Worker     │  │  Script      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                  │          │
│         ▼                ▼                  ▼          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Domain Parser│  │  CF API      │  │  CF Dashboard│  │
│  │ (from 301-ui)│  │  Client      │  │  Integration │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│              chrome.storage.local                       │
│       (Global API Key encrypted, never leaves ext)      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ (no CORS!)
                   ┌─────────────┐
                   │ Cloudflare  │
                   │ API Direct  │
                   └─────────────┘
```

### Extension Components

| Component | Назначение |
|-----------|------------|
| **Popup** | Основной UI: auth, bulk create, results |
| **Background Worker** | API запросы, хранение credentials |
| **Content Script** | Интеграция с dash.cloudflare.com (опционально) |

### Auth Headers (Global API Key)
```
X-Auth-Email: user@example.com
X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda41
```

## Переиспользуемый код из 301-ui

### 1. Domain Parser (`src/domains/add-domains-drawer.ts`)

**Regex для извлечения доменов:**
```typescript
// Matches: example.com, xn--domain.net, sub.domain.co.uk, домен.рф
const DOMAIN_REGEX = /\b((?=[a-z0-9-]{1,63}\.)(?:xn--)?[a-z0-9]+(?:-[a-z0-9]+)*\.)+(?:xn--)?[a-z0-9-]{2,63}\b/gi;
```

**Функции для выноса:**
```typescript
// Парсинг доменов из текста
function parseDomains(text: string): string[] {
  const matches = text.match(DOMAIN_REGEX) || [];
  return [...new Set(matches.map(d => d.toLowerCase().trim()))]
    .filter(hasValidTLD)
    .sort();
}

// Валидация TLD (должен содержать хотя бы одну букву)
function hasValidTLD(domain: string): boolean {
  const tld = domain.split('.').pop() || '';
  return /[a-z]/i.test(tld);
}
```

### 2. IDN Utilities (`src/utils/idn.ts`)

```typescript
import punycode from 'punycode.js';

// Decode punycode → Unicode (для отображения)
export function decodeDomain(domain: string): string;

// Проверка на punycode
export function isPunycode(domain: string): boolean;

// Форматирование для UI
export function formatDomainDisplay(domain: string, mode: 'compact' | 'full'): string;
```

### 3. CSS Components (`static/css/`)
- `theme.css` — design tokens, colors, spacing
- `site.css` — buttons, inputs, cards, panels
- `tables.css` — data tables (для списка зон)
- `drawers.css` — side panels

### 4. Icon Sprite
- `static/icons-sprite.svg`
- `static/img/icons-src/` — source SVGs

### 5. i18n Structure (`src/i18n/`)
- Структура локалей
- Переключатель языков
- Функция `t()` для переводов

## Функциональность

### MVP (Phase 1)

#### Авторизация (Global API Key only)
- [ ] Ввод CF Account Email + Global API Key
- [ ] Валидация через `GET /user` (проверка ключа)
- [ ] Получение списка аккаунтов `GET /accounts`
- [ ] Хранение в localStorage (encrypted опционально)
- [ ] "Remember me" checkbox
- [ ] Ссылка на инструкцию получения Global API Key

#### Bulk Zone Creation
- [ ] Textarea для вставки доменов/текста
- [ ] Парсер доменов (из 301-ui)
- [ ] Preview с количеством и списком
- [ ] Выбор CF Account (если несколько)
- [ ] Настройки зоны:
  - [ ] Plan (free/pro/business/enterprise)
  - [ ] Jump start (auto DNS scan)
  - [ ] Type (full/partial)
- [ ] Batch создание с progress bar
- [ ] Retry logic для failed domains
- [ ] Results: success/failed/skipped списки

#### Bulk Zone Deletion
- [ ] Список существующих зон (с поиском)
- [ ] Multi-select для удаления
- [ ] Confirmation dialog
- [ ] Batch удаление с progress

#### Export/Import
- [ ] Export results as CSV/JSON
- [ ] Export zone list
- [ ] Import domains from CSV

### Phase 2 (Extended)

#### DNS Management
- [ ] Bulk DNS record creation
- [ ] Template records (apply to multiple zones)
- [ ] DNS record export/import

#### Zone Settings
- [ ] Bulk SSL mode change
- [ ] Bulk security level
- [ ] Bulk cache settings

#### Ссылки на 301.st
- [ ] "Powered by 301.st" в footer
- [ ] CTA после успешных операций
- [ ] About page с описанием 301.st

## Технический стек

```
Manifest:       Manifest V3 (Chrome/Firefox compatible)
Framework:      Vanilla TS (как 301-ui) или Preact (popup UI)
Build:          Vite + CRXJS или WXT (extension bundler)
Styling:        CSS из 301-ui (theme.css, site.css)
Icons:          Icon sprite из 301-ui
Stores:         Chrome Web Store, Firefox Add-ons
```

### Рекомендуемый bundler: WXT
```bash
npm create wxt@latest cloudflare-tools
```
- Поддержка Manifest V3
- Hot reload при разработке
- Одновременная сборка для Chrome и Firefox

## Структура проекта

```
cloudflare-tools/
├── manifest.json             # Extension manifest
├── src/
│   ├── popup/                # Popup UI (main interface)
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── components/
│   │       ├── auth-form.ts
│   │       ├── bulk-create.ts
│   │       ├── bulk-delete.ts
│   │       ├── progress.ts
│   │       └── results.ts
│   ├── background/           # Service Worker
│   │   └── index.ts          # API calls, credential management
│   ├── content/              # Content script (optional)
│   │   └── cf-dashboard.ts   # Inject into dash.cloudflare.com
│   ├── shared/
│   │   ├── api/
│   │   │   ├── cf-client.ts  # Cloudflare API client
│   │   │   └── types.ts
│   │   ├── domains/
│   │   │   ├── parser.ts     # Copied from 301-ui
│   │   │   └── idn.ts        # Copied from 301-ui
│   │   ├── storage/
│   │   │   └── credentials.ts # chrome.storage.local wrapper
│   │   └── i18n/
│   │       └── ...
│   └── assets/
│       ├── css/              # From 301-ui
│       └── icons/            # Extension icons (16, 48, 128px)
├── wxt.config.ts             # WXT config
└── package.json
```

### Manifest V3 (упрощённый)
```json
{
  "manifest_version": 3,
  "name": "Cloudflare Tools",
  "version": "1.0.0",
  "description": "Bulk operations for Cloudflare zones",
  "permissions": ["storage"],
  "host_permissions": ["https://api.cloudflare.com/*"],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [{
    "matches": ["https://dash.cloudflare.com/*"],
    "js": ["content/cf-dashboard.js"]
  }]
}
```

## Cloudflare API

### Base URL
```
https://api.cloudflare.com/client/v4
```

### Auth Headers
```typescript
const headers = {
  'X-Auth-Email': email,
  'X-Auth-Key': globalApiKey,
  'Content-Type': 'application/json',
};
```

### User & Accounts
```
GET    /user                     # Verify credentials, get user info
GET    /accounts                 # List accounts (for account selection)
```

### Zones
```
POST   /zones                    # Create zone
GET    /zones                    # List zones (with pagination)
DELETE /zones/:id                # Delete zone
GET    /zones/:id                # Zone details
PATCH  /zones/:id                # Update zone settings
```

### DNS (Phase 2)
```
POST   /zones/:id/dns_records    # Create DNS record
GET    /zones/:id/dns_records    # List DNS records
DELETE /zones/:id/dns_records/:r # Delete DNS record
```

## Безопасность

1. **Global API Key ТОЛЬКО локально** — хранится в `chrome.storage.local`, никогда не покидает расширение
2. **Нет внешних серверов** — все запросы идут напрямую к api.cloudflare.com
3. **Minimal permissions** — только `storage` и `host_permissions` для CF API
4. **Опциональное шифрование** — AES encryption для credentials (мастер-пароль)
5. **Auto-lock** — блокировка по таймауту неактивности
6. **No tracking** — никакой аналитики, никаких внешних скриптов
7. **Clear credentials** — кнопка полной очистки данных
8. **Open source** — код открыт для аудита

## UI/UX

### Popup Views (400x600px recommended)

1. **Auth** — ввод Email + Global API Key
2. **Dashboard** — выбор операции, статус подключения
3. **Bulk Create** — textarea + preview + progress
4. **Bulk Delete** — список зон + multi-select
5. **Results** — success/failed списки + export
6. **Settings** — auto-lock timeout, clear data

### Дизайн

- CSS из 301-ui (dark theme по умолчанию)
- Компактный layout для popup (400-600px width)
- Те же компоненты: buttons, inputs, cards, panels
- Sticky header с navigation tabs

### Content Script (опционально)

Интеграция с dash.cloudflare.com:
- Кнопка "Bulk Add" на странице Websites
- Кнопка "Export Zones" в toolbar
- Quick actions в контекстном меню

## Deployment

### Chrome Web Store
```bash
npm run build
# Upload dist/chrome.zip to Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/devconsole
```

### Firefox Add-ons
```bash
npm run build
# Upload dist/firefox.zip to Firefox Add-ons
# https://addons.mozilla.org/developers/
```

### Manual Install (для тестирования)
```bash
npm run build
# Chrome: chrome://extensions → Load unpacked → dist/chrome
# Firefox: about:debugging → Load Temporary Add-on → dist/firefox/manifest.json
```

## Roadmap

| Phase | Scope | Timeline |
|-------|-------|----------|
| 1 | Auth + Bulk Create + Results | 1-2 weeks |
| 2 | Bulk Delete + Export | 1 week |
| 3 | DNS Management | 1-2 weeks |
| 4 | 301.st Integration | 1 week |

## Связь с 301.st

Приложение должно приводить трафик к основному проекту:

### Обязательные ссылки
- **Header/Footer:** "Powered by 301.st" с ссылкой
- **После операций:** "Manage your domains in 301.st Dashboard"
- **About page:** Описание 301.st с CTA

### Messaging
```
"Cloudflare Tools — free bulk operations for CF zones.
For advanced domain management, redirects and TDS — try 301.st"
```

### Будущая интеграция (Phase 2+)
- OAuth login через 301.st
- Sync созданных зон в 301.st
- Import/export между приложениями

---

## Решения (зафиксировано)

| Вопрос | Решение |
|--------|---------|
| Название | Cloudflare Tools |
| Репозиторий | Отдельный |
| Auth метод | Global API Key only |
| 301.st интеграция | Ссылки, без API |

---

## Следующие шаги

1. [x] ~~Определиться с архитектурой~~ — Global API Key, отдельный repo
2. [ ] Создать репозиторий `cloudflare-tools`
3. [ ] Скопировать переиспользуемый код из 301-ui
4. [ ] Реализовать CF API client (Global API Key auth)
5. [ ] MVP: Auth + Bulk Zone Create
