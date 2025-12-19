# TODO: Domains Page Development

Roadmap for `/domains.html` implementation and enhancement.

## ✅ Этап 1: MVP / Скелет страницы (COMPLETED)

**Status:** ✅ Complete (2025-12-19)

- [x] Create domains.html with dashboard layout
- [x] Implement basic table structure (6 columns: Select, Domain, Status, Health, Expires, Actions)
- [x] Add mock data (35 domains with realistic distribution)
- [x] Create domains.ts with table rendering logic
- [x] Implement domain inspector drawer (slide-in panel with overview)
- [x] Add "Add domains" modal with textarea input
- [x] Implement dropdown action menus for individual domains
- [x] Add search functionality (filter by domain/project)
- [x] CSS styling for table, drawer, modal, health icons
- [x] Fix icon references (use only existing icons from sprite)
- [x] Remove redundant "All Domains" header
- [x] Simplify Expires column (use badge colors for dates)
- [x] Routing integration (vite.config.ts, worker.ts)

**Файлы:**
- `domains.html` - main page
- `src/domains/domains.ts` - UI logic
- `src/domains/mock-data.ts` - 35 mock domains
- `static/css/site.css` - styles for drawer, modal, health-icons

**Commit:** 5 commits pushed to main
- Add Domains page MVP (Etap 1: Page skeleton)
- Polish domains page UI (cosmetic fixes)
- Fix dropdown logic to use CSS classes
- Fix non-existent icon references
- Polish domains table UI

---

## 📐 Этап 1.5: Архитектурное решение - Drawer-first approach

**Status:** 📋 Architectural guideline (approved 2025-12-19)

### **Философия: Drawer = единая точка управления доменом**

**Принцип:** Все операции над одним доменом идут через единый Drawer с вкладками, а не через модалки или отдельные страницы.

**Почему это правильно:**

**UX причины:**
- Пользователь не теряет контекст (таблица остается видимой)
- Drawer = идеальный формат для объектной модели (Domain = объект)
- Скорость работы выше (переключение вкладок мгновенное, без перерисовки)
- Консистентный паттерн для всего приложения (domains/projects/integrations)

**Технические причины:**
- Один компонент → меньше багов (вместо 10 модалок = 1 drawer + 7 вкладок)
- Один API call `/domains/:id` загружается 1 раз, данные шарятся между вкладками
- Расширяемость через добавление новых секций (webhooks, analytics, etc.)

---

### **1. Индивидуальные действия (dropdown ⋯)**

Dropdown menu содержит только **quick actions** и **destructive** операции. Все настройки и просмотр данных — через Drawer.

```
Quick actions (выполняются сразу, без UI):
├─ Re-check health          [refresh]          → API + toast
├─ Re-check abuse status    [alert-triangle]   → API + toast
├─ Sync with registrar      [sync]             → API + toast
├─ Toggle monitoring        [bell]             → API + state update
└─ Apply security preset    [shield-account]   → Default preset OR open drawer→Security

Navigate to other features:
└─ View analytics           [analytics]        → /analytics?domain=example.com

Destructive:
└─ Delete domain            [delete]           → Confirmation modal
```

**Логика "Apply security preset":**
- Если у проекта есть дефолтный пресет → применяет сразу (API + toast)
- Если нет дефолта → открывает drawer на вкладке "Security" для выбора

**Что НЕ в dropdown:**
- ❌ "Manage redirects" → это в drawer tab "Routing"
- ❌ "DNS / Zone settings" → это в drawer tab "DNS"
- ❌ "SSL settings" → это в drawer tab "SSL"
- ❌ "Security settings" → это в drawer tab "Security"

---

### **2. Действие по умолчанию (кнопка в строке таблицы)**

```
Open inspector  [pencil-circle]  → Opens drawer on "Overview" tab
```

Одна кнопка в каждой строке таблицы. Открывает drawer для детального просмотра и управления доменом.

---

### **3. Drawer tabs (структура инспектора)**

Drawer загружает `/domains/:id` **один раз** при открытии. Данные шарятся между всеми вкладками.

#### **Overview** [details]

**Секции:**
- **Summary:** Expires, Status, Health (SSL + Abuse)
- **Quick actions:** Sync, Re-check health, Toggle monitoring (кнопки)
- **Languages block:** Set as primary domain for language

**Languages example:**
```html
<section class="card card--panel">
  <header class="card__header">
    <h3 class="h5">Languages</h3>
  </header>
  <div class="card__body">
    <div class="language-list">
      <div class="language-item">
        <span class="flag-emoji">🇷🇺</span>
        <span>RU</span>
        <strong>example.ru</strong>
        <span class="badge badge--ok badge--sm">Primary</span>
      </div>
      <div class="language-item">
        <span class="flag-emoji">🇬🇧</span>
        <span>EN</span>
        <strong>en.example.com</strong>
      </div>
    </div>
  </div>
</section>
```

**Flag rendering strategy:**
- **Now (MVP):** Unicode emoji (🇷🇺 🇺🇸 🇬🇧) для Languages
- **Future (TDS):** `flag-icons` library для GEO-таргетинга (200+ стран)

**CSS for emoji flags:**
```css
.flag-emoji {
  font-family: "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif;
  font-size: 1.25em;
  line-height: 1;
  display: inline-block;
  vertical-align: middle;
}
```

#### **Routing** [directions-fork]

- Redirect rules for this domain
- Add/Edit/Delete rules
- Rule priorities and conditions

#### **DNS** [dns]

- Zone records (A, CNAME, TXT, MX, etc.)
- Nameservers
- Cloudflare proxy status (orange cloud on/off)
- DNSSEC status

#### **SSL** [lock]

- Certificate details (issuer, validity, fingerprint)
- Expiry date and auto-renewal settings
- Force HTTPS toggle
- SSL/TLS mode (Flexible, Full, Full Strict)

#### **Security** [shield-account]

- Abuse status & history
- Blocklist checks (Google Safe Browsing, Spamhaus, etc.)
- **Security presets:** Select & apply presets
- Security events log (blocked requests, rate limits, etc.)

#### **Monitoring** [web-sync]

- Uptime status (online/offline)
- Response times graph (last 24h/7d/30d)
- Alert settings (email/telegram notifications)
- Monitoring history and incidents

#### **Logs** [logs]

- Sync history (registrar sync, Cloudflare sync)
- Configuration changes (who changed what and when)
- Webhook events (incoming webhooks from external services)
- Error logs (failed syncs, API errors, etc.)

---

### **4. Bulk Actions (при выборе ≥1 домена)**

Bulk actions появляются в sticky panel внизу экрана при выборе хотя бы одного домена.

```
Enable monitoring          [bell]             → API + toast
Disable monitoring         [bell] (muted)     → API + toast
Re-check health            [refresh]          → API + toast
Re-check abuse status      [alert-triangle]   → API + toast
Sync expiration            [sync]             → API + toast
Apply security preset      [shield-account]   → Modal with preset selection
Delete selected            [delete]           → Confirmation modal
```

**Принцип:** Bulk actions = копии quick actions из dropdown, но для N доменов.

---

### **5. Search & Filters (верх таблицы)**

```
Search domains/projects    [magnify]          → Фильтрует таблицу
Open filters panel         [filter]           → Dropdown с фильтрами по status/provider/project
```

---

### **Drawer Header enhancements (будущее)**

```html
<header class="drawer__header">
  <div class="drawer__title">
    <h2 class="h4">example.com</h2>
    <span class="badge badge--ok">Active</span>
  </div>

  <div class="drawer__actions">
    <!-- Quick actions bar -->
    <button class="btn-icon" title="Sync now" data-action="sync-domain">
      <span class="icon" data-icon="mono/refresh"></span>
    </button>

    <button class="btn-icon" title="Open domain" data-action="open-domain">
      <span class="icon" data-icon="mono/open-in-new"></span>
    </button>

    <!-- Navigation arrows (prev/next domain in filtered table) -->
    <div class="btn-group">
      <button class="btn-icon" title="Previous domain">
        <span class="icon" data-icon="mono/chevron-up"></span>
      </button>
      <button class="btn-icon" title="Next domain">
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
    </div>

    <button class="btn-close" data-drawer-close>
      <span class="icon" data-icon="mono/close"></span>
    </button>
  </div>
</header>
```

**Navigation arrows:** Позволяют быстро переключаться между доменами, не закрывая drawer. Берут домены из текущей отфильтрованной таблицы.

---

### **Принципы консистентности**

| Тип действия              | Где находится    | Поведение                              |
|---------------------------|------------------|----------------------------------------|
| Quick actions (no UI)     | Dropdown + Bulk  | API call + toast, drawer не открывается |
| View/Configure (has UI)   | Drawer tabs      | Open drawer, load data once            |
| Navigate to other page    | Dropdown         | Redirect (например, Analytics)         |
| Destructive               | Dropdown + Bulk  | Confirmation modal                     |
| Per-domain settings       | Drawer Overview  | Inline controls (Languages, monitoring) |

---

### **Flag-icons integration roadmap**

**Phase 1 (Domains page, Languages block):**
- Use **Unicode emoji** (🇷🇺 🇺🇸 🇬🇧 🇩🇪 🇫🇷)
- Lightweight, native support, good enough for 5-10 languages
- CSS class `.flag-emoji` for consistent size

**Phase 2 (TDS/Streams, GEO-таргетинг):**
- Install `flag-icons` library: `npm install flag-icons`
- Import in `vite.config.ts`: `import 'flag-icons/css/flag-icons.min.css'`
- Use `<span class="fi fi-ru fis"></span>` for country flags (square variant)
- Covers all 200+ countries (ISO 3166-1)
- Consistent rendering across all platforms (SVG-based)
- Size: ~100KB minified CSS (can be tree-shaked if needed)

**Why two-phase approach:**
- Unicode emoji = fast MVP for Languages (no dependencies)
- flag-icons = production-ready for TDS when we need all countries

---

### **Mobile behavior**

- Drawer занимает 100% экрана (fullscreen overlay)
- Tabs превращаются в вертикальный список или accordion
- Navigation arrows скрываются (swipe gestures для prev/next)

---

### **Keyboard shortcuts (future)**

```
Esc       → Close drawer
Arrow ↑↓  → Navigate between domains
Tab       → Switch between tabs
Cmd+K     → Quick search in drawer
```

---

### **Задачи для реализации:**

- [ ] Обновить drawer HTML структуру (добавить tabs navigation)
- [ ] Создать tab switching logic (vanilla JS)
- [ ] Реализовать 7 вкладок (Overview, Routing, DNS, SSL, Security, Monitoring, Logs)
- [ ] Добавить Languages block в Overview с emoji флагами
- [ ] Обновить dropdown menu (убрать дублирующие пункты)
- [ ] Добавить navigation arrows в drawer header
- [ ] Реализовать prev/next domain navigation
- [ ] CSS для `.flag-emoji` класса
- [ ] Документировать flag-icons для будущего TDS

---

## 🎯 Этап 2: Фильтры и поиск

**Status:** 📋 Planned

**Цели:**
- Добавить фильтры по статусу домена (active, expired, expiring, blocked, pending)
- Добавить фильтр по провайдеру (cloudflare, namecheap, namesilo, manual)
- Добавить фильтр по проекту (select dropdown с автокомплитом)
- Улучшить существующий search (добавить debounce, подсветку результатов)
- Сохранять состояние фильтров в URL query params

**Задачи:**
- [ ] Создать компонент фильтров в card__header
- [ ] Реализовать multi-select для статусов (dropdown с чекбоксами)
- [ ] Реализовать select для провайдеров
- [ ] Добавить кнопку "Clear filters"
- [ ] Добавить badge с количеством активных фильтров
- [ ] Реализовать комбинированную фильтрацию (search + filters)
- [ ] Сохранять фильтры в URLSearchParams
- [ ] Восстанавливать фильтры при загрузке страницы
- [ ] Добавить debounce (300ms) для search input
- [ ] i18n для всех текстов фильтров

**UI компоненты:**
```html
<div class="card__filters">
  <div class="filter-group">
    <label>Status</label>
    <div class="dropdown dropdown--multiselect">
      <!-- checkboxes for statuses -->
    </div>
  </div>
  <div class="filter-group">
    <label>Provider</label>
    <select class="input input--sm">
      <!-- options -->
    </select>
  </div>
  <button class="btn btn--sm btn--ghost" data-action="clear-filters">
    Clear filters
  </button>
</div>
```

**API (будущее):**
- `GET /domains?status=active,expiring&provider=cloudflare&search=example`

---

## 🎯 Этап 3: Bulk Actions (массовые действия)

**Status:** 📋 Planned

**Цели:**
- Реализовать выбор нескольких доменов через checkboxes
- Добавить панель bulk actions при выборе ≥1 домена
- Реализовать массовые операции: sync, attach to project, change monitoring, delete

**Задачи:**
- [ ] Улучшить логику select all (учитывать текущие фильтры)
- [ ] Создать sticky panel для bulk actions (появляется внизу экрана)
- [ ] Добавить счетчик выбранных доменов
- [ ] Реализовать массовые операции:
  - [ ] Sync with registrar
  - [ ] Sync with Cloudflare
  - [ ] Attach to project (select project modal)
  - [ ] Enable/disable monitoring
  - [ ] Mark as test/retired
  - [ ] Bulk delete (with confirmation)
- [ ] Добавить progress bar для длительных операций
- [ ] Показывать результаты операций (success/error summary)
- [ ] Сбрасывать selection после выполнения операции

**UI компоненты:**
```html
<div class="bulk-actions" data-bulk-actions hidden>
  <div class="bulk-actions__info">
    <span><strong>5</strong> domains selected</span>
  </div>
  <div class="bulk-actions__controls">
    <button class="btn btn--sm" data-action="bulk-sync">Sync</button>
    <button class="btn btn--sm" data-action="bulk-attach">Attach to project</button>
    <button class="btn btn--sm btn--danger" data-action="bulk-delete">Delete</button>
  </div>
</div>
```

**CSS:**
- Sticky positioning для bulk actions panel
- Slide-up animation
- Mobile responsive (stack buttons vertically)

---

## 🎯 Этап 4: Статистика в header

**Status:** 📋 Planned

**Цели:**
- Добавить summary cards с ключевыми метриками над таблицей
- Сделать cards кликабельными (применяют соответствующие фильтры)

**Задачи:**
- [ ] Создать stat-cards компонент
- [ ] Вычислять метрики из данных:
  - Total domains
  - Active domains
  - Expiring soon (≤30 days)
  - Expired
  - SSL issues (expiring/invalid)
  - Monitoring enabled
- [ ] Добавить иконки для каждой метрики
- [ ] Сделать cards интерактивными (клик → применяет фильтр)
- [ ] Добавить trend indicators (↑↓ изменение за период)
- [ ] Адаптивная grid (4 колонки на desktop, 2 на tablet, 1 на mobile)

**UI структура:**
```html
<div class="stats-grid">
  <div class="stat-card" data-filter="all">
    <div class="stat-card__icon">
      <span class="icon" data-icon="mono/dns"></span>
    </div>
    <div class="stat-card__value">143</div>
    <div class="stat-card__label">Total domains</div>
  </div>
  <div class="stat-card stat-card--ok" data-filter="status:active">
    <div class="stat-card__value">89</div>
    <div class="stat-card__label">Active</div>
  </div>
  <div class="stat-card stat-card--warning" data-filter="expiring">
    <div class="stat-card__value">12</div>
    <div class="stat-card__label">Expiring soon</div>
  </div>
  <div class="stat-card stat-card--danger" data-filter="status:expired">
    <div class="stat-card__value">3</div>
    <div class="stat-card__label">Expired</div>
  </div>
</div>
```

---

## 🎯 Этап 5: Сортировка таблицы

**Status:** 📋 Planned

**Цели:**
- Добавить сортировку по колонкам
- Сохранять порядок сортировки в URL

**Задачи:**
- [ ] Добавить иконки сортировки в заголовки таблицы
- [ ] Реализовать сортировку для колонок:
  - Domain (alphabetical)
  - Status (priority order: expired > expiring > blocked > pending > active)
  - Expires (date)
- [ ] Добавить визуальную индикацию активной сортировки
- [ ] Сохранять sort order в URLSearchParams
- [ ] Комбинировать с фильтрами и поиском

**UI:**
```html
<th class="th-sort" data-sort="domain" data-order="asc">
  Domain
  <span class="icon icon--xs" data-icon="mono/arrow-up"></span>
</th>
```

---

## 🎯 Этап 6: Пагинация

**Status:** 📋 Planned

**Цели:**
- Реализовать работающую пагинацию (сейчас footer статичен)
- Добавить выбор размера страницы (25/50/100)

**Задачи:**
- [ ] Реализовать slice данных по страницам
- [ ] Добавить навигацию: Previous / Next / Page numbers
- [ ] Добавить select для page size
- [ ] Сохранять page и page_size в URL
- [ ] Показывать корректный диапазон "Showing 1-25 of 143"
- [ ] Сбрасывать на первую страницу при изменении фильтров/поиска
- [ ] Keyboard navigation (arrow keys для prev/next)

**UI updates:**
```html
<footer class="card__footer" data-table-footer>
  <div class="pagination">
    <span class="pagination__info">
      Showing <strong>1-25</strong> of <strong>143</strong>
    </span>
    <div class="pagination__controls">
      <button class="btn btn--sm btn--ghost" data-action="prev-page">Previous</button>
      <div class="pagination__pages">
        <button class="btn btn--sm btn--ghost is-active">1</button>
        <button class="btn btn--sm btn--ghost">2</button>
        <button class="btn btn--sm btn--ghost">3</button>
        <span>...</span>
        <button class="btn btn--sm btn--ghost">6</button>
      </div>
      <button class="btn btn--sm btn--ghost" data-action="next-page">Next</button>
    </div>
    <select class="input input--sm" data-page-size>
      <option value="25">25 / page</option>
      <option value="50">50 / page</option>
      <option value="100">100 / page</option>
    </select>
  </div>
</footer>
```

---

## 🎯 Этап 7: Real API Integration

**Status:** 📋 Planned

**Цели:**
- Подключить страницу к реальному backend API
- Заменить mock data на live data
- Реализовать CRUD операции

**Задачи:**
- [ ] Создать `src/api/domains.ts` с методами:
  - `getDomains(filters)` - GET /domains
  - `getDomain(id)` - GET /domains/:id
  - `addDomains(domains[])` - POST /domains/bulk
  - `updateDomain(id, data)` - PATCH /domains/:id
  - `deleteDomain(id)` - DELETE /domains/:id
  - `syncDomains(ids[])` - POST /domains/sync
  - `attachToProject(ids[], projectId)` - POST /domains/attach
- [ ] Добавить TypeScript types в `src/api/types.ts`:
  - Domain interface (из wiki)
  - DomainFilters
  - DomainStats
- [ ] Обновить `src/domains/domains.ts`:
  - Заменить mockDomains на API calls
  - Добавить error handling
  - Добавить loading states
  - Реализовать retry logic
- [ ] Подключить к WebSocket для real-time updates (опционально)
- [ ] Добавить оптимистичные обновления UI
- [ ] Кешировать данные (simple in-memory cache с TTL)

**API endpoints (из docs/301-wiki/):**
- `GET /domains` - список доменов с фильтрацией
- `GET /domains/:id` - детали домена
- `POST /domains/bulk` - добавление доменов
- `PATCH /domains/:id` - обновление домена
- `DELETE /domains/:id` - удаление домена
- `POST /domains/sync` - синхронизация с провайдерами

---

## 🎯 Этап 8: Inspector drawer enhancements

**Status:** 📋 Planned

**Цели:**
- Расширить drawer с детальной информацией о домене
- Добавить секции: Redirects, Streams, History, DNS records

**Задачи:**
- [ ] Добавить tabs в drawer:
  - Overview (current)
  - Redirects (rules for this domain)
  - Streams (TDS attached to this domain)
  - History (sync log, changes)
  - DNS Records (show CF zone records)
- [ ] Реализовать inline editing для некоторых полей
- [ ] Добавить quick actions в drawer header:
  - Sync now
  - Open in Cloudflare dashboard
  - Copy domain to clipboard
- [ ] Добавить timeline компонент для History
- [ ] Показывать связанные сущности (project, site, stream)
- [ ] Добавить badges для warnings/errors

**UI structure:**
```html
<div class="drawer__body">
  <nav class="tabs">
    <button class="tab is-active">Overview</button>
    <button class="tab">Redirects</button>
    <button class="tab">Streams</button>
    <button class="tab">History</button>
  </nav>
  <div class="tab-content">
    <!-- dynamic content -->
  </div>
</div>
```

---

## 🎯 Этап 9: i18n Coverage

**Status:** 📋 Planned

**Цели:**
- Добавить полную поддержку EN/RU для страницы доменов
- Следовать конвенциям из `.claude/i18n-conventions.md`

**Задачи:**
- [ ] Создать namespace `domains` в `src/i18n/locales/en.ts`
- [ ] Создать namespace `domains` в `src/i18n/locales/ru.ts`
- [ ] Добавить переводы для:
  - Page header (title, subtitle)
  - Table headers
  - Status labels (active, expired, expiring, blocked, pending)
  - Provider labels
  - Action buttons
  - Modal content
  - Drawer content
  - Filter labels
  - Bulk action labels
  - Empty/loading/error states
  - Success/error messages
- [ ] Применить data-i18n атрибуты ко всем UI элементам
- [ ] Обновить mock data (добавить project names на разных языках)
- [ ] Тестировать переключение языка (EN ↔ RU)

**Translation structure:**
```typescript
// src/i18n/locales/en.ts
export default {
  domains: {
    pageTitle: 'Domains',
    pageSubtitle: 'Manage all domains connected to your Traffic Control Plane.',
    table: {
      headers: {
        select: 'Select',
        domain: 'Domain',
        status: 'Status',
        health: 'Health',
        expires: 'Expires',
        actions: 'Actions'
      },
      status: {
        active: 'Active',
        expired: 'Expired',
        expiring: 'Expiring',
        blocked: 'Blocked',
        pending: 'Pending'
      }
    },
    actions: {
      addDomains: 'Add domains',
      inspect: 'Inspect',
      manageRedirects: 'Manage redirects',
      // ...
    }
  }
}
```

---

## 📚 Документация

- [ ] Обновить CLAUDE.md (добавить информацию о domains page)
- [ ] Обновить README.md (добавить Domains в структуру проекта)
- [ ] Обновить ui-roadmap.ru.md (отметить прогресс по Layer 2.2)
- [x] Создать TODO-domains.md (этот файл)
- [x] Обновить CHANGELOG.md (добавить Domains page в [Unreleased])

---

## 🐛 Known Issues

- None yet

---

## 💡 Future Ideas

- **Saved views:** Пользователь может сохранять наборы фильтров как "views" (например, "Expiring domains", "My project domains")
- **Export:** Экспорт списка доменов в CSV/JSON
- **Domain health monitoring:** Автоматическая проверка SSL, DNS, доступности
- **Bulk import:** Загрузка доменов из CSV файла
- **Domain templates:** Шаблоны для быстрого создания доменов с предустановками
- **Analytics integration:** Показывать статистику трафика для каждого домена
- **Cost tracking:** Отображение стоимости регистрации/продления
- **Expiry notifications:** Email/Telegram уведомления о скором истечении
- **Auto-renewal:** Автоматическое продление доменов через API регистраторов

---

**Last updated:** 2025-12-19
