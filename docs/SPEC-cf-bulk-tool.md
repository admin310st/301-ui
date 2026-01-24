# Cloudflare Tools — Техническое задание

## Концепция

**Standalone браузерное приложение** для массовых операций с Cloudflare, работающее напрямую с CF API через Global API Key. Решает проблему rate-limits и квот при bulk-операциях.

**Название:** Cloudflare Tools
**Репозиторий:** Отдельный (не monorepo)
**Связь с 301.st:** Ссылки на основной проект, без API интеграции

## Почему отдельный продукт?

1. **Квоты Scoped Tokens** — CF ограничивает операции через API tokens с ограниченными правами
2. **Global API Key без лимитов** — полный доступ к CF API без ограничений
3. **Безопасность** — Global API Key не должен покидать браузер пользователя
4. **Трафик** — приложение приводит пользователей к основному проекту 301.st

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Tools                       │
│                   (Static SPA)                          │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Domain Parser│  │  CF API      │  │  Results     │  │
│  │ (from 301-ui)│  │  Client      │  │  Export      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                 Browser LocalStorage                    │
│         (Global API Key never leaves browser)           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ Cloudflare  │
                   │ API Direct  │
                   │             │
                   │ Headers:    │
                   │ X-Auth-Email│
                   │ X-Auth-Key  │
                   └─────────────┘
```

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
Framework:      Vanilla TS (как 301-ui) или Preact (если нужен реактивный UI)
Build:          Vite
Styling:        CSS из 301-ui (theme.css, site.css)
Icons:          Icon sprite из 301-ui
Deployment:     GitHub Pages / Cloudflare Pages / Static hosting
```

## Структура проекта

```
cf-bulk-tool/
├── index.html
├── src/
│   ├── main.ts
│   ├── api/
│   │   ├── cf-client.ts      # Direct Cloudflare API client
│   │   └── types.ts          # CF API types
│   ├── domains/
│   │   ├── parser.ts         # Copied from 301-ui
│   │   └── validator.ts
│   ├── ui/
│   │   ├── auth-form.ts
│   │   ├── bulk-create.ts
│   │   ├── bulk-delete.ts
│   │   ├── progress.ts
│   │   └── results.ts
│   ├── storage/
│   │   └── credentials.ts    # LocalStorage management
│   └── i18n/
│       └── ...               # Copied structure from 301-ui
├── static/
│   ├── css/                  # From 301-ui
│   └── icons/                # From 301-ui
└── package.json
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

1. **Global API Key ТОЛЬКО в браузере** — никогда не отправляется на внешние серверы
2. **CORS** — CF API поддерживает браузерные запросы с `X-Auth-*` headers
3. **Опциональное шифрование** — localStorage с AES (пароль при входе)
4. **Auto-logout** — по таймауту неактивности
5. **No tracking** — никакой аналитики, никаких внешних скриптов
6. **Clear credentials** — кнопка полной очистки данных

## UI/UX

### Страницы

1. **Auth** — ввод credentials
2. **Dashboard** — выбор операции
3. **Bulk Create** — создание зон
4. **Bulk Delete** — удаление зон
5. **Results** — результаты операции
6. **Settings** — настройки приложения

### Дизайн

- Использовать CSS из 301-ui (dark theme по умолчанию)
- Те же компоненты: buttons, inputs, cards, panels
- Адаптивный layout

## Deployment

### Option 1: GitHub Pages
```bash
npm run build
# Deploy dist/ to gh-pages branch
```

### Option 2: Cloudflare Pages
```bash
# Connect repo to CF Pages
# Build command: npm run build
# Output: dist/
```

### Option 3: Subdomain 301.st
```
https://bulk.301.st
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
