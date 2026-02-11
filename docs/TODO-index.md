# 301-ui TODO Index

**Центральный индекс всех задач проекта.** Используй этот файл как навигацию по roadmap'у и детальным TODO.

---

## 📍 Текущий фокус (2026-02-11)

**Приоритет:** Redirects polish done, Streams/TDS next

**Сегодня (2026-02-11):**
- ✅ API types aligned with backend source + API probe tool
- ✅ Redirects: safeCall migration (R1), adapter removal (R3)
- ✅ Redirects: template selector for donor drawer (T1/T5/T6/T7)

**Следующие задачи:**
1. 🎯 **Streams/TDS page** — Layer 5 (см. TODO-streams.md)
2. 📋 **i18n pass** для Redirects и Domains (0 data-i18n)
3. 📋 **Add Redirect wizard** (stub exists in drawer.ts)

---

## 🗺️ Общая картина

### Иерархия сущностей (из `docs/301-wiki/Appendix.md`)

```
Account (Аккаунт клиента)
  └─ Project (Проект/Кампания)
       └─ Site (Сайт/Whitepage)
            └─ Zone (Cloudflare Zone)
                 └─ Domain (Домен)
```

### UI Roadmap (из `docs/ui-roadmap.ru.md`)

```
✅ Layer 0: Auth pages, UI Style Guide
✅ Layer 1: Integrations (Cloudflare, Namecheap)
✅ Layer 2: Domains (real API, filters, bulk actions)
✅ Layer 3: Projects, Sites (CRUD, tabs navigation)
✅ Layer 4: Redirects (full API, Cloudflare sync)
🎯 Layer 5: Streams/TDS (NEXT)
⏳ Layer 6: UX enhancements, bulk actions
⏳ Layer 7: Admin tools (System, Jobs, Market)
```

---

## 📋 Детальные TODO файлы

### 1. Domains (`TODO-domains.md`)

**Статус:** ✅ Core complete — Real API integration done (2025-01-31)

**Файл:** [`TODO-domains.md`](TODO-domains.md)

**Реализовано:**
- [x] Таблица доменов (6 колонок) + search & filters
- [x] Domain inspector drawer + Add Domains drawer (batch API)
- [x] Dropdown actions, IDN support, DNS NS check
- [x] Real API integration (GET /domains, project filter, persistence)
- [x] Bulk actions (attach/detach, sync)

**Осталось:**
- [ ] Drawer tabs (Overview, Routing, DNS, SSL, Security, Monitoring, Logs)
- [ ] Stat-cards в header
- [ ] Пагинация (stub ready)
- [ ] i18n coverage

---

### 2. Redirects

**Статус:** ✅ Feature-complete (2026-02-11)

**Цель:** Core функциональность 301.st - управление redirect rules

**Структура:**
```
redirects.html
src/redirects/
  ├─ redirects.ts       # UI logic (table, filters, bulk actions)
  ├─ drawer.ts          # Redirect drawer (template selector, config, sync)
  ├─ helpers.ts         # Computed values (getTargetUrl) from API types
  ├─ state.ts           # Multi-site state management (dedup)
  ├─ site-selector.ts   # Project + Site selectors (API-driven)
  ├─ filters-config.ts  # Filter definitions
  ├─ filters-ui.ts      # Filter chips rendering
  └─ sync-status.ts     # Cloudflare sync status
src/api/
  └─ redirects.ts       # API client for redirects endpoints
```

**Реализовано:**
- [x] Full table with hierarchy (acceptor/donor/reserve)
- [x] API Layer, State Management, Project/Site selectors
- [x] Filters: Configured, Sync, Enabled
- [x] Drawer: template selector (T1/T5/T6/T7), config, sync
- [x] Pre-fill target URL with acceptor domain
- [x] Bulk actions (enable/disable/delete/sync selected)
- [x] Site-level actions (T3/T4 canonical, clear redirects)
- [x] Cloudflare sync + error handling
- [x] safeCall migration (R1), adapter removal (R3)

**Осталось:**
- [ ] Add Redirect wizard (stub exists in drawer.ts)
- [ ] i18n (0 data-i18n attributes)

**API Endpoints (из `docs/301-wiki/API_Redirects.md`):**
| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/redirects/templates` | GET | Шаблоны T1-T7 |
| `/redirects/presets` | GET | Пресеты P1-P5 |
| `/sites/:siteId/redirects` | GET | Домены сайта с редиректами |
| `/domains/:domainId/redirects` | POST | Создать редирект (template_id, params) |
| `/redirects/:id` | PATCH | Обновить редирект |
| `/redirects/:id` | DELETE | Удалить редирект |
| `/zones/:id/apply-redirects` | POST | Синхронизация в CF |

**Ключевые паттерны:**
- Template T1 "Domain → Domain" — основной сценарий (redirect к acceptor домену)
- Pre-fill target URL с acceptor domain для one-click setup
- Lимит 10 правил на зону (Free Plan)
- Sync status: pending → synced | error

---

### 3. Projects

**Статус:** ✅ COMPLETED (Layer 3)

**Реализовано:**
- [x] Table with search, dropdown actions, delete confirmation
- [x] Create/Edit drawers, detail view with tabs (Integrations, Domains, Sites, Streams)
- [x] Real API (CRUD), attach/detach integrations & domains
- [x] i18n (EN/RU)

---

### 4. Sites

**Статус:** ✅ COMPLETED (Layer 3)

**Реализовано:**
- [x] Global sites list + sites in project detail (Sites tab)
- [x] Create/Edit drawers, manage site domains (attach/detach)
- [x] Real API (CRUD), search, domain management
- [x] i18n (EN/RU)

---

### 5. Streams/TDS (Приоритет #4)

**Статус:** ✅ Documented (TODO-streams.md создан 2025-12-24, aligned with mini-tds)

**Файлы:**
- [`TODO-streams.md`](../TODO-streams.md) - Complete UI implementation epic
- [`docs/mini-tds-analysis.md`](mini-tds-analysis.md) - Production TDS API analysis (investblog/mini-tds)

**Цель:** Traffic Distribution System - распределение трафика по офферам

**Основные компоненты:**
- ✅ Context bar (project/site/domain selectors)
- ✅ Pipeline strip (Traffic Shield → TDS Rules → Target/Origin)
- ✅ Rules table with priority controls (up/down arrows)
- ✅ Drawer-based rule editor (conditions, targets, weights)
- ✅ Draft/publish workflow with sticky banner
- ✅ Onboarding checklist card

**Milestones (6 этапов, ~6-9 дней):**
1. Page skeleton + context bar + pipeline strip
2. Welcome screen + onboarding checklist
3. Rules table + add rule drawer (MVP)
4. Rule editor logic (conditions, targets, weights)
5. Priority controls (reorder UX)
6. Draft/publish workflow + filters

**API Alignment:**
- ✅ Data structure выровнена с mini-tds (RouteRule format)
- ✅ Match/Action паттерн вместо nested conditions
- ✅ Support для weighted_redirect (A/B тесты)
- ✅ ETag-based updates (optimistic locking)

**Детали:** См. полный эпик в `TODO-streams.md` с HTML/CSS примерами и mock data

---

## 🎯 Порядок разработки

### Фаза 1: Core Pages ✅ COMPLETED

```
1. Redirects page     ✅ DONE (full API integration, CF sync)
   └─ Типы: 301, 302, cloaking, worker
   └─ Условия: geo, device, UTM
   └─ Priority ordering

2. Projects page      ✅ DONE (CRUD, tabs, integrations)
   └─ Таблица проектов
   └─ Detail view с табами
   └─ Attach/detach integrations и domains

3. Sites page         ✅ DONE (CRUD, domain management)
   └─ Связь с Projects
   └─ Manage site domains
   └─ Attach/detach domains

4. Streams/TDS page   🎯 NEXT (см. TODO-streams.md)
   └─ Visual stream editor
   └─ GEO targeting с flag-icons
```

### Фаза 2: API Integration ✅ COMPLETED

- ✅ Real API для Redirects
- ✅ Real API для Projects
- ✅ Real API для Sites
- ✅ Real API для Domains (миграция завершена 2025-01-31)

### Фаза 3: Advanced Features (in progress)

- 🎯 Streams/TDS page (следующий этап)
- [ ] Drawer tabs для Domains (7 tabs)
- [ ] Advanced bulk actions
- [ ] Analytics integration

---

## ⚡ Performance & Optimization

### Monitoring (NOW)

**Bundle analyzer:**
- ✅ Добавлен `rollup-plugin-visualizer`
- ✅ Script: `npm run build:analyze`
- ✅ Output: `build/bundle-stats.html` (не коммитится)

**Когда запускать:**
- После каждого добавления библиотеки
- Перед выходом в production
- При подозрении на "раздувание" бандла

### Performance Patterns (документировано, применяется при API integration)

**Event Delegation для таблиц:**
```typescript
// ❌ Плохо: N обработчиков на N строк
rows.forEach(row => row.addEventListener('click', handler));

// ✅ Хорошо: 1 обработчик на всю таблицу
table.addEventListener('click', (e) => {
  const row = e.target.closest('[data-domain-id]');
  if (!row) return;
  handleRowClick(row.dataset.domainId);
});
```

**Когда применять:**
- ✅ При подключении API для Domains (Layer 2 завершение)
- ✅ При подключении API для Integrations
- ✅ Для всех будущих таблиц (Redirects, Projects, Sites, Streams)

**Эффект:**
- Меньше памяти на event listeners
- Быстрее рендер таблиц
- Проще добавлять/удалять строки динамически

### Optimization Roadmap

**Layer 2 завершение (при API integration):**
- Event delegation для `src/domains/domains.ts`
- Event delegation для `src/ui/integrations.ts`

**Layer 3-4 (Projects/Sites/Redirects):**
- Code splitting с `manualChunks` (когда бандл >300KB)
- Lazy loading для тяжёлых модальных окон

**Layer 5-6 (TDS/Streams, масштабирование):**
- Виртуализация таблиц (когда реальные данные >500 строк)
- Web Workers для клиентской фильтрации (если тормозит)

**Pre-production (Layer 7):**
- Edge caching headers (Cloudflare Workers)
- Preload/Prefetch для критичных ресурсов
- Service Worker (если нужен offline режим)

### Code Splitting Strategy (когда bundle >300KB)

**Текущая проблема (анализ 2025-12-24):**
- Main bundle: 181.56 KB → 50.06 KB gzipped ✅ Пока OK
- Monolithic bundle: все страницы грузят весь код (domains, redirects, integrations, account)
- Dynamic import conflicts: попытки lazy load игнорируются из-за static imports в main.ts

**Проблемный паттерн:**
```typescript
// main.ts импортирует ВСЁ сразу (на всех страницах):
import { initDomainsPage } from '@domains/domains';      // Только для domains.html
import { initRedirectsPage } from '@redirects/redirects'; // Только для redirects.html
import { initIntegrationsPage } from '@ui/integrations';  // Только для integrations.html
import { initAccountPage } from '@forms/account';         // Только для account.html
```

**Решение A — Entry Points Pattern (рекомендовано для MPA):**

Создать отдельные entry points для групп страниц:

```typescript
// src/main-common.ts — общее для всех страниц
export { initTheme } from '@ui/theme';
export { initSidebarNav } from '@ui/sidebar-nav';
export { applyTranslations, initLangSwitcher } from '@i18n/dom';
// ... базовый UI

// src/main-auth.ts — только для index.html (auth pages)
import * as common from './main-common';
import { initLoginForm } from '@forms/login';
import { initRegisterForm } from '@forms/register';
// ... auth-specific код

// src/main-dashboard.ts — для защищенных страниц с sidebar
import * as common from './main-common';
import { initSidebarToggle } from '@ui/sidebar-toggle';
// ... dashboard-specific код

// src/main-domains.ts — только для domains.html
import './main-dashboard'; // наследует dashboard
import { initDomainsPage } from '@domains/domains';

// src/main-integrations.ts — только для integrations.html
import './main-dashboard';
import { initIntegrationsPage } from '@ui/integrations';
```

**vite.config.ts:**
```typescript
build: {
  rollupOptions: {
    input: {
      'main-auth': resolve(__dirname, 'src/main-auth.ts'),
      'main-dashboard': resolve(__dirname, 'src/main-dashboard.ts'),
      'main-domains': resolve(__dirname, 'src/main-domains.ts'),
      'main-integrations': resolve(__dirname, 'src/main-integrations.ts'),
      'main-redirects': resolve(__dirname, 'src/main-redirects.ts'),
    }
  }
}
```

**HTML страницы:**
```html
<!-- index.html -->
<script type="module" src="/src/main-auth.ts"></script>

<!-- domains.html -->
<script type="module" src="/src/main-domains.ts"></script>
```

**Эффект:**
- index.html: ~30-40 KB (только auth код)
- domains.html: ~50-60 KB (common + dashboard + domains)
- Каждая страница грузит только нужный код

---

**Решение B — manualChunks (альтернатива, сложнее):**

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-i18n': ['@i18n'],
        'vendor-utils': ['@utils'],
        'ui-common': ['@ui/theme', '@ui/sidebar-nav', '@ui/notifications'],
        'forms-auth': ['@forms/login', '@forms/register', '@forms/reset-request'],
        'page-domains': ['@domains/domains', '@domains/filters', '@domains/bulk-actions'],
        'page-redirects': ['@redirects/redirects'],
        'page-integrations': ['@ui/integrations', '@api/integrations'],
      }
    }
  }
}
```

**Эффект:**
- Автоматическое разделение на chunks
- Vite сам определяет, какие chunks грузить на каждой странице
- Сложнее контролировать, какие chunks попадут куда

---

**Рекомендация:**
- **Для MPA проекта:** Entry Points Pattern (Решение A)
  - Явный контроль над тем, что грузится на каждой странице
  - Проще отлаживать
  - Чище git diff при изменениях
- **Для SPA проекта:** manualChunks (Решение B)

**Метрики для решений:**
- Bundle >300KB → code splitting
- Таблица >500 строк → virtualization
- FCP >2s → lazy loading, code splitting
- LCP >2.5s → image optimization, preload

---

## 📚 Документация и конвенции

### Архитектура

- **Иерархия сущностей:** `docs/301-wiki/Appendix.md`
- **UI Roadmap:** `docs/ui-roadmap.ru.md`
- **API Auth spec:** `docs/301-wiki/API_Auth.md`
- **API Integrations spec:** `docs/301-wiki/API_Integrations.md`
- **Domains API gap analysis:** `docs/API-domains-actual-vs-ui.md`

### Конвенции

- **i18n guidelines:** `.claude/i18n-conventions.md`
- **UI Style Guide:** `docs/StyleGuide.md` (canonical source)
- **Custom agents:** `.claude/agents/ui-code-reviewer.md`
- **Project instructions:** `CLAUDE.md`

### Инструменты

- **Icon preview:** `/icons-preview.html`
- **Slash commands:** `.claude/commands/uix.md` (UI review)

---

## 🔄 Workflow

### Создание новой страницы

1. **Создать детальный TODO:**
   ```bash
   # Пример: TODO-redirects.md
   - Этап 1: MVP/Скелет
   - Этап 2: Filters
   - Этап 3: Bulk actions
   - Этап 4: API integration
   ```

2. **Добавить в этот индекс:**
   - Обновить раздел с новым TODO файлом
   - Указать статус и приоритет

3. **Следовать паттернам:**
   - Dashboard layout (`layout-dashboard`)
   - Sidebar navigation (`{{> sidebar}}`)
   - Table + drawer pattern (как в Domains)
   - Mock data first, API later
   - i18n с первого дня

4. **Проверить через UI reviewer:**
   ```bash
   /uix
   ```

### Обновление прогресса

1. Обновить детальный TODO (`TODO-{page}.md`)
2. Обновить этот индекс (статус, даты)
3. Обновить `CHANGELOG.md`

---

## ⚠️ Известные блокеры

### Backend API gaps

**Redirects:**
- ⚠️ [#164](https://github.com/admin310st/301-ui/issues/164) — API returns duplicate `domain_id` when domain has T1 + T3/T4 redirects (frontend `dedupDomains()` workaround in state.ts)
- ⚠️ [#165](https://github.com/admin310st/301-ui/issues/165) — Post-probe type gaps (zone_id types, missing fields)

**Domains:**
- ⚠️ Поле `registrar` отсутствует в SQL schema
- ⚠️ Мониторинг поля (`abuse_status`, `last_check_at`) отсутствуют

---

## 🎨 Design System

**Single source of truth:** `docs/StyleGuide.md`

**Ключевые правила:**
- No fixed heights (только `font-size × line-height + padding × 2`)
- Unified control system (buttons, chips, inputs, search)
- Design tokens (CSS variables)
- Icon sizing: `1.25em` inside controls
- Orange buttons ONLY for Cloudflare actions (`.btn--cf`)

**При любых UI изменениях:**
1. Обновить `docs/StyleGuide.md`
2. Проверить через `/uix` (UI reviewer agent)
3. Убедиться, что все страницы следуют новым правилам

---

## 📅 История обновлений

- **2026-02-11**: Redirects polish & TODO cleanup
  - Template selector for donor drawer (T1/T5/T6/T7 with dynamic fields)
  - safeCall migration (R1) — all redirects API calls wrapped
  - Adapter removal (R3) — UI uses ExtendedRedirectDomain directly
  - API types aligned with backend source + API probe tool
  - Cleaned up all TODO files and roadmap

- **2026-02-08**: Redirects page — actions & sync fixes
  - Wire up T3/T4 template actions (handleApplyTemplate)
  - Implement handleClearSiteRedirects with real API
  - Fix handleSyncAll: filter only pending/error zones (was syncing ALL)
  - Fix initSyncStatus: idempotent event listeners (was duplicating)
  - Add re-entry guard to prevent double sync
  - Added ESLint + Vitest + CI pipeline
  - Audited TODO-redirects.md against actual code state

- **2025-01-31**: Domains API Migration Complete
  - Real API integration for domains (GET /domains)
  - Project filter with real projects from API
  - Project selection persistence across pages (Domains ↔ Redirects)
  - Cleaned up completed PLAN files from repository
  - Updated README.md, ui-roadmap.ru.md, TODO-index.md with current status

- **2025-01-18**: Redirects Real API Integration
  - Fixed multi-site parallel loading (site-specific abort keys)
  - Project/Site selectors fully API-driven (removed mocks)
  - Drawer pre-fills target URL with acceptor domain for one-click setup
  - Fixed createRedirect API call (removed invalid `enabled` field)
  - Updated TODO-index with detailed Redirects progress

- **2025-12-24**: Добавлен TDS/Streams epic
  - Создан детальный `TODO-streams.md` с 6 milestones
  - Mapped все компоненты к existing design patterns
  - Определены HTML/CSS структуры, mock data, implementation order

- **2025-12-22**: Создан центральный индекс TODO
  - Согласован порядок разработки (Redirects → Projects → Sites)
  - Добавлены секции для будущих TODO файлов
  - Определены MVP задачи для каждой страницы

---

**Последнее обновление:** 2026-02-11

**Next action:** Streams/TDS page implementation (Layer 5)
