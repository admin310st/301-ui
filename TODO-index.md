# TODO Index - 301-ui Development Roadmap

Централизованный план развития UI для 301.st с приоритизацией задач по этапам.

**Текущее состояние:** Layer 0-3 завершены
**Следующий этап:** Layer 4 (Redirects) - ожидаем backend API

---

## 🔥 Критические задачи (High Priority)

### Known Issues (Backend fixes needed)

- [ ] **Detach domain from site issue**
  - **Проблема:** При detach домена от сайта (`DELETE /sites/:id/domains/:domainId`), домен удаляется из проекта целиком вместо того, чтобы остаться в проекте как свободный домен
  - **Ожидаемое поведение:** Домен должен остаться в проекте, только открепиться от сайта
  - **Статус:** ⏳ Отдано на доработку backend
  - **Workaround:** Пока отключен функционал detach в UI (dialog показывается, но не выполняется)

### Layer 2 Completion: Domains Real API Integration

**Цель:** Подключить Domains к real API, заменить mock data

- [ ] **API Integration**
  - [ ] Подключить GET `/domains` endpoint
  - [ ] Реализовать POST `/domains/zones/batch` (bulk add domains)
  - [ ] Sync domains from Cloudflare integrations
  - [ ] Sync domains from registrar integrations
  - [ ] Real-time health checks (SSL validation, DNS verification)

- [ ] **Bulk Actions Implementation**
  - [ ] Export selected domains (CSV/JSON)
  - [ ] Bulk change status (active/paused/test/retired)
  - [ ] Bulk move to project
  - [ ] Bulk toggle monitoring ON/OFF
  - [ ] Bulk delete with confirmation

- [ ] **Domain Inspector Enhancements**
  - [ ] Add DNS records tab (view/edit)
  - [ ] Add subdomain creation form
  - [ ] Add history/activity log tab
  - [ ] Add analytics tab (traffic preview)

- [ ] **Filters & Search Improvements**
  - [ ] Implement all filter chips (Health, Status, Provider, Project, Role, Expiry)
  - [ ] Advanced search syntax: `status:active provider:cloudflare .ru`
  - [ ] Save filter presets to localStorage
  - [ ] URL params для фильтров (bookmarkable views)

**Зависимости:** Backend API endpoints для domains CRUD
**Оценка:** 2-3 недели
**Файлы:** `TODO-domains.md` (детальный план)

---

## 🚀 Следующий этап: Layer 4 (Redirects)

### Redirect Rules Management

**Цель:** Реализовать систему простых редиректов (301/302/307)

**Статус:** ⏳ Ожидаем реализацию backend API

- [ ] **Redirects Page** (`/redirects.html`)
  - [ ] Глобальная таблица redirect rules (Name, Scope, Source, Target, Code, Status, Updated)
  - [ ] Search functionality
  - [ ] Create Redirect drawer
  - [ ] Edit Redirect drawer
  - [ ] Loading/empty states

- [ ] **Redirect Rule Editor**
  - [ ] Scope selector (global / project / domain)
  - [ ] Source conditions (domain + path/match pattern)
  - [ ] Target URL input
  - [ ] HTTP code selector (301/302/307)
  - [ ] Options: keep query / drop query
  - [ ] Preview redirect logic

- [ ] **API Integration**
  - [ ] GET `/redirects` - список всех redirect rules
  - [ ] GET `/projects/:id/redirects` - redirects для проекта
  - [ ] GET `/redirects/:id` - детали redirect rule
  - [ ] POST `/redirects` - создание redirect (global/project/domain scope)
  - [ ] PATCH `/redirects/:id` - обновление redirect
  - [ ] DELETE `/redirects/:id` - удаление redirect
  - [ ] POST `/redirects/:id/sync` - sync with Cloudflare (если CF-managed)

- [ ] **Integration with Projects & Domains**
  - [ ] "Add redirect" button в project detail
  - [ ] Quick redirect creation из domain inspector
  - [ ] Индикация в таблице доменов: домен с редиректом

**Зависимости:**
- ⏳ Backend API для redirects CRUD (в разработке)

**Оценка:** 2-3 недели (после готовности backend)

---

## 📋 Средний приоритет (Medium Priority)

### Layer 5: Streams/TDS

**Цель:** Реализовать систему управления потоками трафика (TDS/клоака)

**Статус:** 📋 В планах (после Redirects)

- [ ] **Streams Page** (`/streams.html`)
  - [ ] Глобальная таблица streams (Name, Type, Input Domains, Output Sites, Status, Updated)
  - [ ] Search functionality
  - [ ] Create Stream drawer
  - [ ] Edit Stream drawer
  - [ ] Loading/empty states

- [ ] **Stream Editor (TDS Logic)**
  - [ ] Visual stream builder (conditions + actions)
  - [ ] GEO targeting с флагами (flag-icons library integration)
  - [ ] Device targeting (mobile/desktop)
  - [ ] Referrer targeting (search/social/direct/custom)
  - [ ] Weight distribution (% split между сайтами)
  - [ ] Fallback configuration

- [ ] **Stream Detail View**
  - [ ] Overview tab (summary, входные домены, output targets)
  - [ ] Domains tab (список доменов с метками "поверх сайта")
  - [ ] Logic tab (TDS editor)
  - [ ] Logs tab (активность, ошибки)

- [ ] **API Integration**
  - [ ] GET `/streams` - список всех streams
  - [ ] GET `/projects/:id/streams` - streams для проекта
  - [ ] GET `/streams/:id` - детали stream
  - [ ] POST `/projects/:id/streams` - создание stream
  - [ ] PATCH `/streams/:id` - обновление stream
  - [ ] DELETE `/streams/:id` - удаление stream

- [ ] **Integration with Sites & Domains**
  - [ ] "Enable TDS on this domain" shortcut в site detail
  - [ ] Индикация в таблице доменов: домен с клоакой vs простой redirect
  - [ ] Preview stream logic при hover над доменом

**Зависимости:**
- Backend API для streams CRUD
- flag-icons library (npm install flag-icons)

**Оценка:** 3-4 недели
**UI Components:** Stream builder, GEO selector с флагами, weight distribution UI

### Projects & Sites Enhancements

- [ ] **Project Statistics**
  - [ ] Real-time stats в project overview tab (traffic, domains count, sites count)
  - [ ] Stat-cards компонент (успех/warn/info states)
  - [ ] Traffic trends graph (simple line chart)

- [ ] **Project Filtering**
  - [ ] Filter projects by status (active/paused/archived)
  - [ ] Filter by brand tag
  - [ ] Save filter state to URL params

- [ ] **Project Actions**
  - [ ] Duplicate project functionality (real implementation, not placeholder)
  - [ ] Archive project (status change + hide from main list)
  - [ ] Project templates (quick start with pre-configured settings)

- [ ] **Sites Enhancements**
  - [ ] Site analytics (traffic metrics, conversion tracking)
  - [ ] Advanced site configuration:
    - Custom headers
    - SSL settings
    - Robots.txt override
    - Meta tags customization

### UI/UX Improvements

- [ ] **Empty States**
  - [ ] Доработать все empty states (консистентные иконки, CTA)
  - [ ] "Getting started" wizard для новых пользователей
  - [ ] Onboarding tooltips для первого визита

- [ ] **Loading States**
  - [ ] Skeleton screens для таблиц (вместо spinner)
  - [ ] Progressive loading (показывать partial data)
  - [ ] Optimistic UI updates (instant feedback до API response)

- [ ] **Error States**
  - [ ] 404 page (custom design)
  - [ ] 500 page (custom design)
  - [ ] Network error handling (offline mode, retry button)
  - [ ] Form validation improvements (inline errors, focus management)

### i18n Coverage Expansion

- [ ] **Complete i18n for all sections**
  - [x] Auth pages (✅ done)
  - [x] Integrations (✅ done)
  - [x] Projects (✅ done)
  - [x] Sites (✅ done)
  - [ ] Domains (partial, needs completion)
  - [ ] Streams (pending)
  - [ ] Redirects (pending)
  - [ ] Analytics (pending)

- [ ] **Language selector improvements**
  - [ ] Detect browser language on first visit
  - [ ] Save preference to user profile (backend)
  - [ ] Add more languages (DE, ES, PT?)

---

## 🔧 Технический долг (Technical Debt)

### API Contract Gaps

**Цель:** Привести UI в соответствие с `docs/301-wiki/API.md`

- [ ] **Auth Flow Fixes**
  - [ ] `/auth/verify` - отправлять только `{token}` (не `{type, token}`)
  - [ ] Login form - добавить поддержку `phone` (не только `email`)
  - [ ] Login/me responses - обрабатывать `active_account_id`, `accounts[]`, `expires_in`
  - [ ] Registration response - обрабатывать `{status, mode, channel, token}` (не ожидать `access_token`)

**Зависимости:** `docs/301-wiki/API_Auth.md`
**Оценка:** 1 неделя

### Performance Optimization

**Текущий подход:** Поэтапная оптимизация параллельно с развитием функционала

**Layer 2 завершение (API integration для Domains/Integrations):**
- [ ] Event delegation для всех таблиц (domains, integrations, projects, sites)
  - Рефакторинг вместе с подключением API (одним заходом)
  - Pattern: один listener на table container вместо N listeners на каждую строку

**Layer 3-4 (Projects/Sites/Streams):**
- [ ] Code splitting с `manualChunks` (когда bundle >300KB)
  - Lazy loading для модальных окон и drawers
  - Dynamic imports для редко используемых модулей
- [ ] Bundle analyzer review (`npm run build:analyze`)

**Layer 5-6 (TDS/масштабирование):**
- [ ] Виртуализация таблиц (когда реальные данные >500 строк)
  - Использовать `virtual-scroller` или custom implementation
- [ ] Web Workers для фильтрации (если клиентская обработка тормозит)

**Pre-production (Layer 7):**
- [ ] Edge caching headers (Cloudflare Workers)
- [ ] Preload/Prefetch критичных ресурсов
- [ ] Image optimization (WebP, lazy loading)

**Метрики для решений:**
- Bundle >300KB → code splitting
- Таблица >500 строк → virtualization
- FCP >2s → lazy loading
- LCP >2.5s → preload, image optimization

### Code Quality

- [ ] **TypeScript strict mode improvements**
  - [ ] Убрать все `any` типы (заменить на конкретные types)
  - [ ] Добавить strict null checks
  - [ ] Включить `noImplicitAny` и `strictNullChecks` в tsconfig

- [ ] **Error handling standardization**
  - [ ] Единый error boundary pattern
  - [ ] Consistent error logging (structured logs)
  - [ ] User-friendly error messages (не показывать stack traces)

- [ ] **Testing setup**
  - [ ] Unit tests для API clients (Vitest)
  - [ ] Integration tests для форм
  - [ ] E2E tests для критичных флоу (Playwright)

---

## 🎨 UI Style Guide Evolution

### Design System Updates

- [ ] **Component Library Expansion**
  - [ ] Data visualization components (charts, graphs)
  - [ ] Advanced form controls (date range picker, multi-select with search)
  - [ ] Toast notifications system (success/error/info/warning)
  - [ ] Modal/Dialog система (confirm, alert, custom)

- [ ] **Accessibility Improvements**
  - [ ] ARIA labels audit (все интерактивные элементы)
  - [ ] Keyboard navigation improvements (focus management, skip links)
  - [ ] Screen reader testing (NVDA, JAWS)
  - [ ] Color contrast audit (WCAG AA compliance)

- [ ] **Mobile Responsiveness**
  - [ ] Drawer overlay для sidebar на mobile (уже есть)
  - [ ] Touch gestures (swipe to close drawer)
  - [ ] Mobile-optimized tables (collapse columns, horizontal scroll)
  - [ ] Bottom sheet pattern для mobile forms

### Dark/Light Theme

- [ ] **Theme polish**
  - [ ] Audit all color tokens (убрать hardcoded colors)
  - [ ] Smooth theme transitions (CSS transitions)
  - [ ] Theme per component (allow overrides)
  - [ ] High contrast mode (accessibility)

---

## 🌟 Долгосрочные планы (Low Priority)

### Layer 6: Analytics

- [ ] **Traffic Analytics Dashboard**
  - [ ] Overview stats (visitors, pageviews, unique visitors)
  - [ ] Traffic by GEO (map visualization)
  - [ ] Traffic by device (mobile/desktop breakdown)
  - [ ] Referrer analysis (search/social/direct)
  - [ ] Conversion tracking (по потокам и сайтам)

- [ ] **Performance Metrics**
  - [ ] Core Web Vitals (LCP, FID, CLS)
  - [ ] Server response times
  - [ ] Cloudflare analytics integration

### Layer 7: Admin Tools

- [ ] **System Health**
  - [ ] API/System status dashboard
  - [ ] D1/KV storage metrics
  - [ ] Cron jobs status и results
  - [ ] Backup и cleanup logs

- [ ] **Jobs & Queue**
  - [ ] Background jobs queue (sync доменов, update redirects)
  - [ ] Job status monitoring
  - [ ] Retry/cancel job controls

- [ ] **Logs & Webhooks**
  - [ ] Incoming webhooks log (HostTracker, CF Events)
  - [ ] Webhook processing status
  - [ ] Debug logs viewer

- [ ] **Market / Partner Integrations**
  - [ ] "Магазин" интеграций и пресетов
  - [ ] CPA-сети integrations
  - [ ] Шаблоны потоков (templates)
  - [ ] Pre-configured workers/flows

---

## 📊 Метрики успеха

### Performance Targets

- **FCP (First Contentful Paint):** <1.5s
- **LCP (Largest Contentful Paint):** <2.5s
- **TTI (Time to Interactive):** <3.5s
- **Bundle size:** <300KB (gzipped)
- **Lighthouse score:** >90

### UX Targets

- **Zero layout shifts** (CLS = 0)
- **Instant feedback** на все действия (<100ms)
- **Skeleton screens** для всех loading states
- **Keyboard navigation** работает везде
- **Mobile-friendly** (touch targets >44px)

### Code Quality Targets

- **TypeScript strict mode** enabled
- **Test coverage:** >80%
- **No console.error** в production
- **All images optimized** (WebP + lazy loading)
- **All API calls cached** (где возможно)

---

## 🗂️ Связанные документы

- **`docs/ui-roadmap.ru.md`** - Полная дорожная карта по всем модулям
- **`docs/StyleGuide.md`** - UI Style Guide (single source of truth)
- **`docs/301-wiki/`** - API спецификация (git submodule)
- **`CHANGELOG.md`** - История изменений
- **`TODO-domains.md`** - Детальный план по доменам
- **`.claude/i18n-conventions.md`** - Конвенции по интернационализации

---

## 📝 Обновление этого документа

Этот файл обновляется при каждом крупном milestone:

- ✅ После завершения Layer (перемещаем задачи в "Завершено")
- ✅ При добавлении новых фич (добавляем в соответствующий раздел)
- ✅ При обнаружении технического долга (добавляем в "Technical Debt")
- ✅ При изменении приоритетов (переупорядочиваем секции)

**Последнее обновление:** 2026-01-07 (Layer 0-3 завершены)
