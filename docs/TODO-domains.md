# TODO: Domains Page Development

Roadmap for `/domains.html` implementation and enhancement.

## ✅ Этап 1: MVP / Скелет страницы (COMPLETED)

**Status:** ✅ Complete (2025-12-19, updated 2025-12-20)

### Core Features
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

### IDN Support (2025-12-20)
- [x] Create `src/utils/idn.ts` with punycode encoding/decoding helpers
- [x] Add `mono/idn.svg` icon to sprite
- [x] Implement compact badge display for IDN domains in table
- [x] Show full punycode in inspector drawer
- [x] Add IDN test domains to mock data (Russian, Chinese)

### Inspector Drawer Enhancements (2025-12-20)
- [x] Add copy domain button in drawer header (copies punycode)
- [x] Add open domain in new tab button
- [x] Move Status badge from header to Overview section
- [x] Add color-coded status display (.text-ok, .text-danger, .text-warning)
- [x] Implement visual feedback for copy action (green icon for 2s)

### DNS Configuration (2025-12-22)
- [x] Create `src/utils/dns.ts` with DNS over HTTPS (Google DNS API) support
- [x] Add nameserver check to domain inspector drawer
- [x] Implement Cloudflare NS detection (checks for `cloudflare.com` in NS records)
- [x] Add DNS Configuration section to drawer with status badges
- [x] Display NS records with Cloudflare brand icons
- [x] Add status badges: "On Cloudflare" (success), "Mixed NS" (warning), "Not on Cloudflare" (neutral)
- [x] Fix badge wrapping (`white-space: nowrap`)
- [x] Add `.detail-label--with-badge` CSS class for responsive badge positioning

### API Alignment (2025-12-20)
- [x] Rename `domain` → `domain_name` in mock data (matches backend)
- [x] Rename `provider` → `registrar` in mock data (matches UI requirements)
- [x] Create `docs/API-domains-actual-vs-ui.md` with detailed backend comparison
- [x] Document missing fields: `registrar` (critical!), monitoring fields
- [x] Document enum values from SQL schema (blocked_reason, ssl_status)
- [x] Define ssl_status mapping: DB 'error'→UI 'invalid', DB 'none'→UI 'off'

### CSS Improvements (2025-12-20, updated 2025-12-22)
- [x] Add `.badge--ok` and `.badge--warning` variants
- [x] Fix textarea background (use `--bg-elevated`)
- [x] Add `.stack-inline` utilities for horizontal spacing
- [x] Add `.stack-list` size variants (xs, sm, md, lg) using design tokens
- [x] Add `white-space: nowrap` to `.badge` class to prevent text wrapping

**Файлы:**
- `domains.html` - main page
- `src/domains/domains.ts` - UI logic
- `src/domains/mock-data.ts` - 35+ mock domains with IDN examples + 301.st test domain
- `src/utils/idn.ts` - IDN helpers (2025-12-20)
- `src/utils/dns.ts` - DNS over HTTPS utilities (2025-12-22)
- `static/css/site.css` - styles for drawer, modal, health icons, badges, stack utilities
- `static/img/icons-src/mono/idn.svg` - IDN badge icon (2025-12-20)
- `docs/API-domains-actual-vs-ui.md` - backend API comparison (2025-12-20)

**Commits:** 15+ commits pushed to main
- Initial MVP (5 commits, 2025-12-19)
- IDN support (2025-12-20)
- Inspector drawer enhancements (2025-12-20)
- Badge variants and CSS fixes (2025-12-20)
- API documentation and alignment (2025-12-20)
- DNS nameserver check feature (2025-12-22)
- Design system improvements (.stack-list, badge fixes) (2025-12-22)

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

- [x] ✅ Добавить кнопки copy/open в drawer header (2025-12-20)
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

## ✅ Этап 1.6: Add Domains Drawer - Batch Zone Creation (COMPLETED)

**Status:** ✅ Complete (2025-12-27)

### Философия

Add Domains = отдельный drawer для массового добавления доменов через API `/domains/zones/batch`.
Drawer-first подход применен не только для просмотра/редактирования (inspector drawer), но и для создания доменов.

### Реализованный функционал

#### Core Features
- [x] **Drawer UI** с двумя view-состояниями: Input View и Results View
- [x] **CF Account Selector** - btn-chip dropdown в стиле redirects drawer
- [x] **Domain extraction** - парсинг сырого текста (email уведомления от регистраторов, списки, смешанный контент)
- [x] **Real-time preview** - детектированные домены показываются live с счетчиком
- [x] **API Integration** - `POST /domains/zones/batch` с реальным создаNием зон в Cloudflare
- [x] **Results View** - группировка по NS серверам (домены в одном батче получают одинаковые NS)
- [x] **Visual feedback** - compact summary panel, orange style для mixed results (success + errors)
- [x] **Copy functionality** - копирование NS серверов и списков доменов с зеленой подсветкой кнопки
- [x] **No integrations state** - warning panel с кнопкой "Connect Cloudflare" если нет интеграций
- [x] **Lazy loading** - интеграции загружаются только при открытии drawer (MutationObserver)
- [x] **Error handling** - показ ошибок по доменам (already_exists, not_registrable, api_error)

#### UX Improvements (итерации по фидбеку)
- [x] Компактный summary banner (panel вместо card)
- [x] Оранжевый стиль для mixed results (panel--warning)
- [x] Группировка NS по парам (домены в батче = одинаковые NS)
- [x] Info panel общий для всех NS групп (не дублируется)
- [x] Убраны Zone ID badges (не нужны пользователю)
- [x] Убрана кнопка "Add more" (глючила, упрощен flow до "Go to Domains" + "Close")
- [x] Ghost style для copy buttons (btn-icon--ghost)
- [x] Field layout для селектора (hint под кнопкой, не справа)
- [x] Fix: Submit button queries fresh DOM (не кешируется)
- [x] Fix: Copy feedback на кнопке, не на иконке (btn-icon--success)

#### API Integration
- [x] Использование `key_alias` вместо несуществующего `alias`
- [x] Обновлен `IntegrationKey` type в соответствии с реальным API:
  - `key_alias: string` (не `alias`)
  - `kv_key: string` (добавлено)
  - `provider_scope?: string` (JSON string, не parsed object)
- [x] Правильные поля для визуала: `key_alias || Account #${id}`

#### Техническая реализация
- [x] **MutationObserver** для lazy loading интеграций
- [x] **Dropdown pattern** из redirects drawer (btn-chip с chevron)
- [x] **NS grouping logic** - Map<string, Domain[]> по ключу `ns1,ns2`
- [x] **Copy handlers** - `copySingleNameserver()`, `copyDomainsList()` с setTimeout для green flash
- [x] **State management** - `currentState` с count/domains/selected integration
- [x] **Form reset** - очистка после успешного создания

### Файлы

**Созданные/обновленные:**
- `src/domains/add-domains-drawer.ts` - полная имплементация (450+ строк)
- `partials/add-domains-drawer.hbs` - drawer markup с btn-chip dropdown
- `src/api/types.ts` - исправлен IntegrationKey type
- `src/i18n/locales/ru.ts` - исправлен перевод ошибки not_registrable

**API endpoints используемые:**
- `GET /integrations/keys` - список CF аккаунтов
- `POST /domains/zones/batch` - создание зон батчем

### Следующие шаги (не критично, future)

- [ ] Добавить валидацию доменов перед отправкой (check TLD, max length)
- [ ] Добавить progress indicator для batch creation (если >10 доменов)
- [ ] Сохранять последний выбранный CF account в localStorage
- [ ] Добавить "Recently added" секцию в Results View
- [ ] i18n coverage для всех текстов drawer

---

## 🎯 Этап 2: Фильтры и поиск

**Status:** 📋 Planned

**Цели:**
- Добавить фильтры по статусу домена (active, expired, expiring, blocked, pending)
- **ПРИОРИТЕТ:** Добавить фильтр "Неиспользуемые домены" (reserve/unused status) — важно использовать трафик!
- Добавить фильтр по провайдеру (cloudflare, namecheap, namesilo, manual)
- Добавить фильтр по проекту (select dropdown с автокомплитом)
- Улучшить существующий search (добавить debounce, подсветку результатов)
- Сохранять состояние фильтров в URL query params

**Задачи:**
- [ ] Создать компонент фильтров в card__header
- [ ] **Реализовать quick-filter "Unused domains" (reserve status) - первый/приоритетный фильтр**
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
- [x] ~~Добавить progress bar для длительных операций~~ → **Реализовано** в `src/ui/loading-indicator.ts` (shimmer bar с CF-оранжевым цветом). Использовать `window.withLoading(promise, 'cf')` для операций с Cloudflare
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
- Создать адаптер для маппинга DomainRecord → Domain

**Важно:**
- ✅ Документация API: `docs/API-domains-actual-vs-ui.md`
- ⚠️ Критичное: поле `registrar` отсутствует в БД (блокер интеграции)
- ✅ Enum маппинг определён (ssl_status, blocked_reason)

**Задачи:**

### API Client
- [ ] Создать `src/api/domains.ts` с методами:
  - `getDomains(filters)` - GET /domains
  - `getDomain(id)` - GET /domains/:id
  - `addDomains(domains[])` - POST /domains/bulk
  - `updateDomain(id, data)` - PATCH /domains/:id
  - `deleteDomain(id)` - DELETE /domains/:id
  - `syncDomains(ids[])` - POST /domains/sync
  - `attachToProject(ids[], projectId)` - POST /domains/attach

### TypeScript Types
- [ ] Добавить в `src/api/types.ts`:
  - `DomainRecord` interface (бекенд структура)
  - `Domain` interface (UI структура, уже есть в mock-data.ts)
  - `DomainFilters` interface
  - `DomainStats` interface

### Data Adapter
- [ ] Создать `src/domains/domain-adapter.ts` с функцией `adaptDomainRecord()`:
  - Маппинг `zone_id` → `cf_zone_id`
  - Маппинг `expired_at` → `expires_at`
  - Вычисление `status` из `blocked` + `expired_at`
  - Маппинг `ssl_status`: 'none'/'error' → 'off'/'invalid'
  - Fallback для `registrar` → 'manual' (пока нет в БД)
  - Fallback для `project_lang` → null (требует JOIN с sites)
  - Fallback для мониторинг полей → defaults

### UI Updates
- [ ] Обновить `src/domains/domains.ts`:
  - Заменить mockDomains на API calls
  - Использовать адаптер для конвертации данных
  - Добавить error handling
  - Добавить loading states (UI: использовать `withLoading(promise, 'cf')` из `src/ui/loading-indicator.ts`)
  - Реализовать retry logic
- [ ] Обновить `src/domains/mock-data.ts`:
  - Экспортировать только `Domain` interface
  - Перенести `DomainRecord` в `src/api/types.ts`
  - Оставить mock данные для dev/testing

### Optimization
- [ ] Подключить к WebSocket для real-time updates (опционально)
- [ ] Добавить оптимистичные обновления UI
- [ ] Кешировать данные (simple in-memory cache с TTL)

**API endpoints:**
- `GET /domains` - список доменов с фильтрацией
- `GET /domains/:id` - детали домена
- `POST /domains/bulk` - добавление доменов
- `PATCH /domains/:id` - обновление домена
- `DELETE /domains/:id` - удаление домена
- `POST /domains/sync` - синхронизация с провайдерами

**Блокеры:**
- ❌ Поле `registrar` отсутствует в SQL schema (требует миграции БД)
- ⚠️ Поле `project_lang` требует JOIN с таблицей `sites`
- ⚠️ Мониторинг поля (`abuse_status`, `last_check_at`) отсутствуют

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
- [x] Создать docs/API-domains-actual-vs-ui.md (детальное сравнение API vs UI, 2025-12-20)

---

## 🐛 Known Issues

- None yet

---

## 💡 Future Ideas

### Domains Page Features

- **Saved views:** Пользователь может сохранять наборы фильтров как "views" (например, "Expiring domains", "My project domains")
- **Export:** Экспорт списка доменов в CSV/JSON
- **Domain health monitoring:** Автоматическая проверка SSL, DNS, доступности
- **Bulk import:** Загрузка доменов из CSV файла
- **Configuration presets & Domain templates:** Пресеты конфигурации для быстрого применения настроек к доменам
  - **Примеры пресетов:**
    - **Sedo Parking:** DNS + HTML мета-теги для монетизации через Sedo (параметры общеизвестны: nameservers, verification tags)
    - **CloudFlare Security:** WAF rules + rate limiting + bot protection
    - **High-traffic:** CDN + cache settings + optimization
    - **Development:** Staging environment settings
  - **Функции:**
    - Один клик для применения пресета к домену/группе доменов
    - Bulk apply для массового применения
    - Кастомные пресеты (пользователь создает свои шаблоны)
    - Export/import пресетов между проектами
- **Analytics integration:** Показывать статистику трафика для каждого домена
- **Cost tracking:** Отображение стоимости регистрации/продления
- **Expiry notifications:** Email/Telegram уведомления о скором истечении
- **Auto-renewal:** Автоматическое продление доменов через API регистраторов

### Sidebar UI Enhancements

- **Sidebar badges and notification icons:** ✅ Реализовано. Адаптивная система индикаторов.
  - **В развернутом сайдбаре:**
    - Badges (с текстом/цифрами) - видимы, используются для счетчиков (domains: 143, tasks: 5)
    - Notification icons (точки 0.5rem) - видимы, используются для статусов (warnings, errors)
  - **В свернутом сайдбаре:**
    - Badges - скрыты (недостаточно места)
    - Notification icons - видимы, выровнены по центру справа от основной иконки
  - **Цвета notification icons:** `var(--warning)` (желтый) для предупреждений, `var(--danger)` (красный) для ошибок
  - **Иконки:** `mono/circle-alert` для алертов
  - **Применение:** Показывать комбинацию badges + notification icons по разделам (например, badge "35" + красная точка = 35 доменов с ошибками)

- **Dynamic setup/onboarding status indicators:** 📋 Planned
  - **Цель:** Показывать текущий статус setup на пункте "Overview" в сайдбаре
  - **Источник данных:** Фронтенд вычисляет статус на основе уже загруженных данных (integrations, domains)
  - **Логика статусов:**
    - Нет интеграций → `notificationColor: 'warning'`, `notificationTitle: 'Connect integration first'`
    - Есть интеграции, нет доменов → `notificationColor: 'warning'`, `notificationTitle: 'Add domains to continue'`
    - Всё готово → статусы убираются
  - **Реализация:**
    - Создать `src/ui/sidebar-status.ts` с функцией `updateSidebarSetupStatus()`
    - Вызывать после загрузки данных на страницах Integrations/Domains
    - Хранить состояние в `src/state/app-state.ts` (in-memory)
  - **Опционально:** Показывать текущий шаг визарда (1/3, 2/3, 3/3)

---

**Last updated:** 2025-12-22
