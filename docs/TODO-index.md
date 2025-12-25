# 301-ui TODO Index

**Центральный индекс всех задач проекта.** Используй этот файл как навигацию по roadmap'у и детальным TODO.

---

## 📍 Текущий фокус (2025-12-22)

**Приоритет:** Создание core страниц на мокапах (UI впереди бэкенда)

**Следующие 3 задачи:**
1. 🎯 **Redirects page** - ключевая функциональность платформы (301.st)
2. 🎯 **Projects page** - верхний уровень иерархии
3. 🎯 **Sites page** - управление сайтами/whitepages

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
✅ Layer 2: Domains MVP
🎯 Layer 3: Projects, Sites, Streams (CURRENT)
🎯 Layer 4: Redirects, TDS logic
⏳ Layer 5: Global state management
⏳ Layer 6: UX enhancements, bulk actions
⏳ Layer 7: Admin tools (System, Jobs, Market)
```

---

## 📋 Детальные TODO файлы

### 1. Domains (`TODO-domains.md`)

**Статус:** ✅ Этап 1 MVP завершен (2025-12-19), DNS features добавлены (2025-12-22)

**Файл:** [`TODO-domains.md`](../TODO-domains.md)

**Реализовано:**
- ✅ Таблица доменов (6 колонок)
- ✅ Search & filters UI
- ✅ Domain inspector drawer
- ✅ Add domains modal
- ✅ Dropdown actions
- ✅ IDN support (punycode)
- ✅ DNS nameserver check (Google DNS API)
- ✅ Cloudflare NS detection
- ✅ Mock data (35+ domains)

**Следующие этапы:**
- Этап 2: Работающие фильтры (по статусу, провайдеру, проекту)
- Этап 3: Bulk actions API integration
- Этап 4: Stat-cards в header
- Этап 5: Сортировка таблицы
- Этап 6: Пагинация
- Этап 7: Real API integration
- Этап 8: Drawer tabs (Overview, Routing, DNS, SSL, Security, Monitoring, Logs)

**Блокеры для API:**
- ⚠️ Поле `registrar` отсутствует в БД
- ⚠️ Monitoring поля (`abuse_status`, `last_check_at`) отсутствуют

---

### 2. Redirects (NEW, Приоритет #1)

**Статус:** 📋 Planned (создать `TODO-redirects.md`)

**Цель:** Core функциональность 301.st - управление redirect rules

**Структура:**
```
redirects.html
src/redirects/
  ├─ redirects.ts       # UI logic
  ├─ mock-data.ts       # 20-30 mock rules
  └─ types.ts           # RedirectRule interface
```

**Задачи MVP (Этап 1, ~2-3 дня):**
- [ ] Создать `redirects.html` с dashboard layout
- [ ] Создать mock data:
  - `rule_type`: 301, 302, cloaking, worker
  - `source_path`, `target_url`
  - `conditions`: geo, device, utm_source
  - `priority`, `enabled`
- [ ] Таблица правил с фильтрами:
  - By domain
  - By type (301/302/cloaking/worker)
  - By status (enabled/disabled)
- [ ] Drawer для создания/редактирования правила
- [ ] Form validation (URL format, path format)
- [ ] Priority ordering (number input)
- [ ] i18n (EN/RU)

**Mock data example:**
```typescript
interface RedirectRule {
  id: number;
  domain_id: number;
  domain_name: string;    // денормализация
  rule_type: '301' | '302' | 'cloaking' | 'worker';
  source_path: string;    // /promo, /special, *
  target_url: string;
  conditions: {
    geo?: string[];       // ['RU', 'UA']
    device?: 'mobile' | 'desktop' | 'tablet';
    utm_source?: string;
  };
  priority: number;
  enabled: boolean;
  created_at: string;
}
```

**Детали:** Создать детальный `TODO-redirects.md` при старте разработки

---

### 3. Projects (NEW, Приоритет #2)

**Статус:** 📋 Planned (создать `TODO-projects.md`)

**Цель:** Верхний уровень иерархии - управление проектами/кампаниями

**Структура:**
```
projects.html
src/projects/
  ├─ projects.ts        # UI logic
  ├─ mock-data.ts       # 10-15 mock projects
  └─ types.ts           # Project interface
```

**Задачи MVP (Этап 1, ~1-2 дня):**
- [ ] Создать `projects.html` с dashboard layout
- [ ] Создать mock data:
  - `project_name`, `brand_tag`
  - `commercial_terms` (RS, CPA, фикс)
  - `start_date`, `end_date`
  - Счетчики: sites count, domains count, streams count
- [ ] Таблица проектов
- [ ] Stat-cards с метриками
- [ ] Drawer inspector с Overview
- [ ] Add project form
- [ ] i18n (EN/RU)

**Mock data example:**
```typescript
interface Project {
  id: number;
  project_name: string;
  brand_tag: string;
  commercial_terms: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'completed';
  sites_count: number;
  domains_count: number;
  streams_count: number;
}
```

**Детали:** Создать детальный `TODO-projects.md` при старте разработки

---

### 4. Sites (NEW, Приоритет #3)

**Статус:** 📋 Planned (создать `TODO-sites.md`)

**Цель:** Управление сайтами/whitepages, связь с проектами

**Структура:**
```
sites.html
src/sites/
  ├─ sites.ts           # UI logic
  ├─ mock-data.ts       # 15-20 mock sites
  └─ types.ts           # Site interface
```

**Задачи MVP (Этап 1, ~2 дня):**
- [ ] Создать `sites.html` с dashboard layout
- [ ] Создать mock data:
  - `site_name`, `lang_code` (ru, en, fr)
  - `primary_domain_id` (денормализация)
  - `tds_enabled`, `monitoring_enabled`
  - `integrations_json` (GA, YM)
  - Связь с `project_id`
- [ ] Таблица сайтов
- [ ] Filter by project
- [ ] Select project при создании
- [ ] Primary domain selector (dropdown из domains)
- [ ] Languages, TDS toggle, monitoring toggle
- [ ] i18n (EN/RU)

**Mock data example:**
```typescript
interface Site {
  id: number;
  site_name: string;
  project_id: number;
  project_name: string;    // денормализация
  lang_code: 'ru' | 'en' | 'fr' | 'de' | 'es';
  primary_domain_id: number;
  primary_domain_name: string;  // денормализация
  tds_enabled: boolean;
  monitoring_enabled: boolean;
  integrations_json: {
    google_analytics?: string;
    yandex_metrica?: string;
  };
  status: 'active' | 'paused';
}
```

**Детали:** Создать детальный `TODO-sites.md` при старте разработки

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

## 🎯 Порядок разработки (согласовано 2025-12-22)

### Фаза 1: Core Pages на мокапах (UI впереди бэкенда)

**Вариант A - По функциональной важности (ВЫБРАН):**

```
1. Redirects page     ⭐ ПРИОРИТЕТ (core продукта)
   └─ Типы: 301, 302, cloaking, worker
   └─ Условия: geo, device, UTM
   └─ Priority ordering

2. Projects page
   └─ Таблица проектов
   └─ Stat-cards
   └─ Drawer inspector

3. Sites page
   └─ Связь с Projects
   └─ Primary domain selector
   └─ Languages, TDS toggle

4. Streams/TDS page (позже)
   └─ Visual stream editor
   └─ GEO targeting с flag-icons
```

**Почему Redirects первыми:**
- ✅ Это ключевая фича платформы (301.st)
- ✅ Можно показать без полной иерархии
- ✅ UI-паттерны применимы к другим страницам
- ✅ Сразу видна ценность продукта

### Фаза 2: API Integration

**После создания всех UI на мокапах:**
- Real API для Redirects
- Real API для Projects
- Real API для Sites
- Real API для Domains (блокер: поле `registrar`)

### Фаза 3: Advanced Features

- Drawer tabs для Domains (7 tabs)
- Bulk actions
- Advanced filters
- Analytics integration

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
- **UI Style Guide demo:** `/ui-style-guide` (legacy, not maintained)
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

### Backend API gaps (блокируют real integration)

**Domains:**
- ❌ Поле `registrar` отсутствует в SQL schema (требует миграции БД)
- ⚠️ Поле `project_lang` требует JOIN с таблицей `sites`
- ⚠️ Мониторинг поля (`abuse_status`, `last_check_at`) отсутствуют

**Решение:** Продолжать на мокапах, пока бэкенд не готов

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

- **2025-12-24**: Добавлен TDS/Streams epic
  - Создан детальный `TODO-streams.md` с 6 milestones
  - Mapped все компоненты к existing design patterns
  - Определены HTML/CSS структуры, mock data, implementation order

- **2025-12-22**: Создан центральный индекс TODO
  - Согласован порядок разработки (Redirects → Projects → Sites)
  - Добавлены секции для будущих TODO файлов
  - Определены MVP задачи для каждой страницы

---

**Последнее обновление:** 2025-12-24

**Next action:** Создать `TODO-redirects.md` и начать разработку Redirects page
