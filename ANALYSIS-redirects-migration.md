# Redirects Migration Analysis

## Сводка

Полное сравнение существующей UI реализации (на моках) с новым backend API для планирования миграции без потери дизайна и функционала.

**Статус:** ✅ UI готов на 85%, API готов на 100%. Требуется интеграция с минимальными изменениями в UI.

---

## 1. Что УЖЕ реализовано в UI (на моках)

### 1.1 Страница redirects.html

**Основные компоненты:**
- ✅ Header с названием страницы + sync status indicator (dropdown)
- ✅ Search bar (поиск по домену/target)
- ✅ Filter chips (Projects, Configured, Sync, Enabled) с data-priority для адаптивности
- ✅ Table с группировкой по project/site
- ✅ Bulk actions bar (sticky, появляется при выборе)
- ✅ Redirect inspector drawer (сайдбар для просмотра/редактирования)
- ✅ Bulk delete confirmation dialog

**Колонки таблицы:**
1. Checkbox (для bulk selection)
2. Domain (название + статус домена + роль: acceptor/donor/reserve)
3. Target (target_url или "—" если нет редиректа)
4. Activity (clicks_total, clicks_today, trend)
5. Status (enabled badge + sync status badge)
6. Actions (три точки → dropdown menu)

**Grouping:**
- По project_id + site_id
- Collapsible groups (chevron для сворачивания/разворачивания)
- Показывает количество доменов в группе

### 1.2 TypeScript модули

**src/redirects/redirects.ts** (~45K строк):
- Рендеринг таблицы: `renderProjectRow()`, `renderRedirectRow()`
- Поиск: `handleSearch()` с debounce
- Фильтрация: `applyFilters()` с multi-select support
- Selection state: `selectedRedirects` Set + `updateBulkActionsBar()`
- Dropdown actions: Edit, Enable/Disable, Delete
- Bulk actions: Enable Selected, Disable Selected, Delete Selected, Sync to CF

**src/redirects/mock-data.ts** (~27K строк):
- `DomainRedirect` interface:
  ```typescript
  interface DomainRedirect {
    id: number;
    domain_id: number;
    domain: string;
    domain_status: DomainStatus; // active/pending/error
    role: DomainRole; // acceptor/donor/reserve
    target_url: string | null;
    has_redirect: boolean;
    redirect_code: RedirectCode; // 301/302
    enabled: boolean;
    cf_rule_id: string | null;
    cf_implementation: CfImplementation; // single_redirect/bulk_redirect/worker
    sync_status: SyncStatus; // never/pending/synced/error
    site_id: number;
    site_name: string;
    project_id: number;
    project_name: string;
    analytics?: RedirectAnalytics; // clicks_total, clicks_today, clicks_yesterday, trend
  }
  ```

**src/redirects/drawer.ts** (~22K строк):
- `openDrawer(redirectId)` - загружает данные редиректа и открывает drawer
- `closeDrawer()` - закрывает drawer + reset form
- `handleSave()` - сохранение изменений редиректа
- `openBulkAddDrawer()` - массовое добавление доменов в редиректы

**src/redirects/sync-status.ts**:
- `calculateSyncStats()` - считает synced/pending/error/total
- `updateSyncIndicator()` - обновляет индикатор в header
- `SyncStats` interface:
  ```typescript
  interface SyncStats {
    synced: number;
    pending: number;
    error: number;
    total: number;
    ratio: number; // synced / total
    lastSync?: string; // ISO date
  }
  ```

**src/redirects/filters-config.ts**:
- Конфигурация фильтров: Project, Configured, Sync, Enabled
- Multi-select support с data-priority (critical/high/medium/low)

**src/redirects/filters-ui.ts**:
- Рендеринг filter chips с dropdown
- `initFilterUI()` - обработчики кликов по фильтрам
- Badge с количеством выбранных фильтров
- Clear selection для multi-select

### 1.3 Дизайн-система

**Полностью соответствует UI Style Guide:**
- Filter chips с dropdown меню (`.btn-chip.btn-chip--dropdown`)
- Bulk actions bar (`.bulk-actions` sticky bar)
- Table с data-priority для адаптивности
- Drawer pattern для inspector
- Dialog pattern для подтверждений
- Badges (`.badge.badge--success`, `.badge.badge--warning`, etc.)
- Dropdown меню (`.dropdown.dropdown__menu`)

### 1.4 Фичи, которых НЕТ в новом API

❌ **Role-based logic** (acceptor/donor/reserve):
- UI показывает роль домена (acceptor = основной, donor = донор, reserve = резервный)
- API не возвращает `role` - только domain_id + target_url
- **Решение:** Убрать role-based badges из таблицы (или вычислять на фронте по target_url)

❌ **cf_implementation field** (single_redirect/bulk_redirect/worker):
- UI показывает способ реализации редиректа в CF
- API не возвращает это поле
- **Решение:** Убрать из таблицы или вычислять на фронте (все через Single Redirects)

❌ **Bulk Add Drawer** (массовое добавление доменов):
- UI имеет drawer для добавления нескольких доменов за раз
- API не поддерживает batch create (только по одному домену)
- **Решение:** Оставить UI, но делать несколько POST запросов последовательно

---

## 2. Что предоставляет новый Backend API

### 2.1 Endpoints

**Reference endpoints (не требуют изменений UI):**
- `GET /redirects/templates` - список шаблонов T1-T7
- `GET /redirects/presets` - список пресетов P1-P5

**CRUD endpoints:**
- `GET /sites/:siteId/redirects` - список редиректов для сайта + zone_limits[]
- `GET /domains/:domainId/redirects` - список редиректов для домена + zone_limit
- `GET /redirects/:id` - данные одного редиректа
- `POST /domains/:domainId/redirects` - создать редирект из шаблона
- `POST /domains/:domainId/redirects/preset` - создать редиректы из пресета
- `PATCH /redirects/:id` - обновить редирект
- `DELETE /redirects/:id` - удалить редирект

**Sync endpoint:**
- `POST /zones/:id/apply-redirects` - применить все редиректы зоны в CF (основной endpoint для синхронизации)

**Limits endpoint:**
- `GET /zones/:id/redirect-limits` - получить лимиты зоны (used/max/available)

### 2.2 Data Model

**Redirect object (из API):**
```typescript
interface ApiRedirect {
  id: number;
  domain_id: number;
  domain_name: string;
  zone_id: number;
  zone_name: string;
  template_id: string; // T1-T7
  preset_id: string | null; // P1-P5 или null
  preset_order: number | null;
  rule_name: string;
  params: Record<string, any>; // зависит от шаблона
  status_code: 301 | 302;
  enabled: boolean;
  sync_status: 'never' | 'pending' | 'synced' | 'error';
  cf_rule_id: string | null;
  cf_ruleset_id?: string;
  last_synced_at?: string;
  last_error?: string | null;
  clicks_total: number;
  clicks_today: number;
  clicks_yesterday: number;
  trend: 'up' | 'down' | 'neutral';
  created_at: string;
  updated_at: string;
}
```

**Zone Limit object:**
```typescript
interface ZoneLimit {
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
  available?: number;
}
```

### 2.3 Templates (T1-T7)

**Новая концепция, которой НЕТ в моках:**

| ID | Name | Description | Category | Params |
|----|------|-------------|----------|--------|
| T1 | Domain → Domain | Редирект всего домена на другой домен | domain | target_url |
| T3 | non-www → www | SEO canonical (apex → www) | canonical | — |
| T4 | www → non-www | SEO canonical (www → apex) | canonical | — |
| T5 | Path prefix → Path | Редирект по префиксу пути | path | source_path, target_path |
| T6 | Exact path → URL | Редирект точного пути на URL | path | source_path, target_url |
| T7 | Maintenance | Временный редирект на maintenance | temporary | target_url |

**Решение для UI:**
- Добавить поле "Template" в таблицу (показывать template_id + название)
- Добавить "Create from template" wizard в drawer

### 2.4 Presets (P1-P5)

**Новая концепция, которой НЕТ в моках:**

| ID | Name | Description | Rules Count |
|----|------|-------------|-------------|
| P1 | SEO Canonical (www) | example.com → www.example.com | 1 (T3) |
| P2 | SEO Canonical (non-www) | www.example.com → example.com | 1 (T4) |
| P3 | Domain Migration | old.com → new.com + canonical | 2 (T1 + T3) |
| P4 | Maintenance Mode | Все запросы → maintenance | 1 (T7) |
| P5 | Full Migration | old.com + path redirects → new.com | 2+N (T1 + T3 + T5×N) |

**Решение для UI:**
- Добавить "Apply preset" wizard в drawer
- Показывать preset badge в таблице (если preset_id не null)

### 2.5 Zone Limits Widget

**Новая фича, которой НЕТ в моках:**

API возвращает zone_limits[] в ответах GET /sites/:siteId/redirects:
```json
"zone_limits": [
  {
    "zone_id": 12,
    "zone_name": "cryptoboss.pics",
    "used": 2,
    "max": 10
  }
]
```

**Решение для UI:**
- Добавить виджет "Zone Limits" в header или sidebar
- Показывать progress bar (used/max) для каждой зоны
- Warning при приближении к лимиту (used >= 80% max)

---

## 3. Mapping: Моки → API

### 3.1 Table Columns

| Mock Column | API Field | Notes |
|-------------|-----------|-------|
| domain | domain_name | ✅ Прямое соответствие |
| domain_status | — | ❌ Нет в API (убрать badge или получать из /domains/:id) |
| role | — | ❌ Нет в API (убрать или вычислять на фронте) |
| target_url | params.target_url | ⚠️ Зависит от template_id (T1/T6/T7 = params.target_url, T3/T4 = вычислять) |
| has_redirect | — | ❌ Нет в API (заменить на template_id !== null) |
| redirect_code | status_code | ✅ Прямое соответствие |
| enabled | enabled | ✅ Прямое соответствие |
| cf_rule_id | cf_rule_id | ✅ Прямое соответствие |
| cf_implementation | — | ❌ Нет в API (убрать) |
| sync_status | sync_status | ✅ Прямое соответствие |
| site_id, site_name | — | ⚠️ Нет в GET /redirects/:id, но есть в GET /sites/:siteId/redirects |
| project_id, project_name | — | ⚠️ Нет в API (получать из /sites/:id или кешировать на фронте) |
| analytics | clicks_total, clicks_today, clicks_yesterday, trend | ✅ Прямое соответствие |

### 3.2 Actions Mapping

| Mock Action | API Endpoint | Notes |
|-------------|--------------|-------|
| Load table | GET /sites/:siteId/redirects | ✅ Заменить mock data на API |
| Search | — | ✅ Client-side (как сейчас) |
| Filter | — | ✅ Client-side (как сейчас) |
| Open drawer | GET /redirects/:id | ✅ Заменить mock data на API |
| Save changes | PATCH /redirects/:id | ✅ Добавить API вызов |
| Delete | DELETE /redirects/:id | ✅ Добавить API вызов |
| Enable/Disable | PATCH /redirects/:id | ✅ Использовать {enabled: true/false} |
| Bulk enable/disable | — | ⚠️ Нет batch endpoint (делать N × PATCH) |
| Bulk delete | — | ⚠️ Нет batch endpoint (делать N × DELETE) |
| Sync to CF | POST /zones/:id/apply-redirects | ✅ Добавить API вызов |

### 3.3 Sync Status Logic

**Mock:**
- `never` - редирект создан, но не синхронизирован
- `pending` - ожидает синхронизации (после edit/create)
- `synced` - синхронизирован с CF
- `error` - ошибка синхронизации

**API:**
- ✅ Полностью соответствует mock
- После PATCH/DELETE/POST: sync_status = 'pending'
- После POST /zones/:id/apply-redirects: sync_status = 'synced' (или 'error' если failed)

---

## 4. Gaps Analysis

### 4.1 Что есть в API, но НЕТ в UI

✅ **Templates (T1-T7)** - требуется wizard для создания редиректов из шаблонов
✅ **Presets (P1-P5)** - требуется wizard для применения пресетов
✅ **Zone Limits Widget** - требуется виджет в header/sidebar
✅ **rule_name** - API поддерживает кастомные названия правил (в UI нет поля для этого)
✅ **preset_id + preset_order** - API связывает редиректы с пресетами (в UI нет отображения)
✅ **last_synced_at, last_error** - API возвращает детали синхронизации (в UI нет)

### 4.2 Что есть в UI, но НЕТ в API

❌ **Role field** (acceptor/donor/reserve) - убрать из таблицы
❌ **cf_implementation field** - убрать из таблицы
❌ **domain_status** - получать из /domains/:id или убрать badge
❌ **Batch CRUD** - API не поддерживает batch create/update/delete (делать N запросов)

### 4.3 Архитектурные различия

**Mock:**
- Группировка по project_id + site_id (данные в mock-data.ts)
- Все данные загружаются за раз

**API:**
- Endpoint GET /sites/:siteId/redirects возвращает список редиректов для сайта
- Нет группировки по проектам в одном запросе
- **Решение:** Загружать данные по site_id (из URL параметра или фильтра)

---

## 5. Migration Strategy

### 5.1 Фаза 1: Minimal Viable Integration (MVP)

**Цель:** Заменить моки на реальные API вызовы с минимальными изменениями UI.

**Задачи:**

1. **Создать API модуль** `src/api/redirects.ts`:
   - `getTemplates()` → GET /redirects/templates
   - `getPresets()` → GET /redirects/presets
   - `getSiteRedirects(siteId)` → GET /sites/:siteId/redirects
   - `getRedirect(id)` → GET /redirects/:id
   - `createRedirect(domainId, data)` → POST /domains/:domainId/redirects
   - `updateRedirect(id, data)` → PATCH /redirects/:id
   - `deleteRedirect(id)` → DELETE /redirects/:id
   - `applyZoneRedirects(zoneId)` → POST /zones/:id/apply-redirects
   - `getZoneLimits(zoneId)` → GET /zones/:id/redirect-limits

2. **Обновить types** `src/api/types.ts`:
   - Добавить `Redirect`, `Template`, `Preset`, `ZoneLimit` interfaces
   - Скопировать из API_Redirects.md

3. **Обновить src/redirects/redirects.ts**:
   - Заменить `import { mockRedirects } from './mock-data'` на `import { getSiteRedirects } from '@api/redirects'`
   - В `loadRedirects()`: вызывать `getSiteRedirects(siteId)` вместо чтения mock-data
   - Добавить handling для zone_limits[] из ответа

4. **Обновить src/redirects/drawer.ts**:
   - В `openDrawer(id)`: вызывать `getRedirect(id)` вместо поиска в mock-data
   - В `handleSave()`: вызывать `updateRedirect(id, data)`

5. **Обновить таблицу (redirects.html + redirects.ts)**:
   - Убрать колонки: role, cf_implementation, domain_status
   - Добавить колонку: Template (template_id + название)
   - Обновить Actions dropdown: добавить "Sync to CF"

6. **Обновить sync-status.ts**:
   - Добавить `syncToCloudflare(zoneId)` с вызовом `applyZoneRedirects(zoneId)`
   - Обновить sync indicator в header после успешной синхронизации

7. **Тестирование:**
   - Загрузка таблицы из API
   - Открытие drawer + загрузка данных редиректа
   - Сохранение изменений (PATCH)
   - Удаление (DELETE)
   - Enable/Disable (PATCH с {enabled: true/false})
   - Sync to CF (POST /zones/:id/apply-redirects)

**Результат:** UI работает с реальным API, основные CRUD операции функционируют.

---

### 5.2 Фаза 2: Templates & Presets Wizards

**Цель:** Добавить UI для создания редиректов из шаблонов и пресетов.

**Задачи:**

1. **Create Redirect Wizard (из шаблона)**:
   - Добавить кнопку "Create redirect" в header (рядом с sync indicator)
   - Drawer с выбором template (T1-T7)
   - Динамические поля ввода params в зависимости от выбранного template
   - Submit → POST /domains/:domainId/redirects

2. **Apply Preset Wizard**:
   - Добавить кнопку "Apply preset" в header или в drawer
   - Список пресетов (P1-P5) с описанием
   - Динамические поля ввода params (если пресет требует)
   - Submit → POST /domains/:domainId/redirects/preset

3. **Template column в таблице**:
   - Показывать template_id + короткое название (T1: Domain → Domain)
   - Badge для canonical templates (T3/T4) зеленого цвета
   - Badge для maintenance (T7) красного цвета

4. **Preset badge в таблице**:
   - Если preset_id не null, показывать badge с названием пресета
   - Tooltip с описанием пресета

**Результат:** Пользователи могут создавать редиректы через UI wizards, а не только редактировать существующие.

---

### 5.3 Фаза 3: Zone Limits Widget

**Цель:** Показывать пользователям лимиты редиректов по зонам.

**Задачи:**

1. **Zone Limits Widget в header**:
   - Рядом с sync indicator
   - Dropdown с progress bars для каждой зоны (used/max)
   - Warning badge если used >= 80% max

2. **Pre-validation перед созданием редиректа**:
   - Проверять zone limit перед открытием Create Redirect Wizard
   - Если used >= max, показывать error message с предложением удалить другие редиректы

3. **Live update после create/delete**:
   - После успешного POST /domains/:id/redirects: обновить widget (used++)
   - После успешного DELETE /redirects/:id: обновить widget (used--)

**Результат:** Пользователи видят лимиты зон и предупреждения перед превышением.

---

### 5.4 Фаза 4: Analytics Enhancements

**Цель:** Улучшить отображение аналитики кликов.

**Задачи:**

1. **Activity column improvements**:
   - Добавить sparkline chart для визуализации trend
   - Tooltip с детализацией (clicks_total, clicks_today, clicks_yesterday)

2. **Analytics drawer tab**:
   - Добавить вкладку "Analytics" в drawer
   - График кликов по дням (требует новый API endpoint)
   - Breakdown по странам/устройствам (если API будет поддерживать)

**Результат:** Пользователи видят детальную аналитику кликов по редиректам.

---

## 6. Technical Details

### 6.1 API Module Structure

```typescript
// src/api/redirects.ts

import { apiFetch } from './client';
import type {
  Template,
  Preset,
  Redirect,
  ZoneLimit,
  CreateRedirectRequest,
  UpdateRedirectRequest,
  ApplyPresetsRequest,
} from './types';

export async function getTemplates(): Promise<Template[]> {
  const res = await apiFetch<{ templates: Template[] }>('/redirects/templates');
  return res.templates;
}

export async function getPresets(): Promise<Preset[]> {
  const res = await apiFetch<{ presets: Preset[] }>('/redirects/presets');
  return res.presets;
}

export async function getSiteRedirects(siteId: number): Promise<{
  redirects: Redirect[];
  zone_limits: ZoneLimit[];
  total: number;
}> {
  return apiFetch(`/sites/${siteId}/redirects`);
}

export async function getRedirect(id: number): Promise<Redirect> {
  const res = await apiFetch<{ redirect: Redirect }>(`/redirects/${id}`);
  return res.redirect;
}

export async function createRedirect(
  domainId: number,
  data: CreateRedirectRequest
): Promise<Redirect> {
  const res = await apiFetch<{ redirect: Redirect }>(`/domains/${domainId}/redirects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.redirect;
}

export async function updateRedirect(
  id: number,
  data: UpdateRedirectRequest
): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteRedirect(id: number): Promise<void> {
  await apiFetch(`/redirects/${id}`, { method: 'DELETE' });
}

export async function applyZoneRedirects(zoneId: number): Promise<{
  rules_applied: number;
  synced_rules: Array<{ id: number; cf_rule_id: string }>;
  warnings?: string[];
}> {
  return apiFetch(`/zones/${zoneId}/apply-redirects`, { method: 'POST' });
}

export async function getZoneLimits(zoneId: number): Promise<ZoneLimit> {
  return apiFetch(`/zones/${zoneId}/redirect-limits`);
}
```

### 6.2 Types Updates

```typescript
// src/api/types.ts

export interface Template {
  id: string; // T1-T7
  name: string;
  description: string;
  category: 'domain' | 'canonical' | 'path' | 'temporary';
  preservePath: boolean;
  preserveQuery: boolean;
  defaultStatusCode: 301 | 302;
  params: Array<{
    name: string;
    type: 'url' | 'path';
    required: boolean;
    description: string;
  }>;
}

export interface Preset {
  id: string; // P1-P5
  name: string;
  description: string;
  useCase: string;
  rulesCount: number | string;
  rules: Array<{
    template_id: string;
    order: number | string;
    description: string;
  }>;
}

export interface Redirect {
  id: number;
  domain_id: number;
  domain_name: string;
  zone_id: number;
  zone_name: string;
  template_id: string;
  preset_id: string | null;
  preset_order: number | null;
  rule_name: string;
  params: Record<string, any>;
  status_code: 301 | 302;
  enabled: boolean;
  sync_status: 'never' | 'pending' | 'synced' | 'error';
  cf_rule_id: string | null;
  cf_ruleset_id?: string;
  last_synced_at?: string;
  last_error?: string | null;
  clicks_total: number;
  clicks_today: number;
  clicks_yesterday: number;
  trend: 'up' | 'down' | 'neutral';
  created_at: string;
  updated_at: string;
}

export interface ZoneLimit {
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
  available?: number;
}

export interface CreateRedirectRequest {
  template_id: string;
  rule_name?: string;
  params: Record<string, any>;
  status_code?: 301 | 302;
}

export interface UpdateRedirectRequest {
  rule_name?: string;
  params?: Record<string, any>;
  status_code?: 301 | 302;
  enabled?: boolean;
}

export interface ApplyPresetsRequest {
  preset_id: string;
  params: Record<string, any>;
}
```

### 6.3 Table Column Updates

**Старая структура (моки):**
```html
<th>Domain</th>
<th>Target</th>
<th>Activity</th>
<th>Status</th>
<th>Actions</th>
```

**Новая структура (API):**
```html
<th data-priority="critical">Domain</th>
<th data-priority="medium">Template</th>
<th data-priority="high">Target</th>
<th data-priority="high">Activity</th>
<th data-priority="low">Status</th>
<th data-priority="critical">Actions</th>
```

**Render function update:**
```typescript
// OLD (mock)
<td>
  <div class="domain-cell">
    <span class="domain-cell__name">${domain}</span>
    <span class="badge badge--${roleColor}">${role}</span>
  </div>
</td>

// NEW (API)
<td data-priority="critical">
  <div class="domain-cell">
    <span class="domain-cell__name">${redirect.domain_name}</span>
  </div>
</td>
<td data-priority="medium">
  <span class="badge badge--${templateColor}">${redirect.template_id}: ${templateName}</span>
</td>
```

---

## 7. Implementation Checklist

### Фаза 1: MVP (Minimal Viable Integration)

- [ ] Создать `src/api/redirects.ts` с функциями API
- [ ] Обновить `src/api/types.ts` (добавить Redirect, Template, Preset, ZoneLimit)
- [ ] Обновить `src/redirects/redirects.ts`:
  - [ ] Заменить mock data на `getSiteRedirects(siteId)`
  - [ ] Обновить `renderRedirectRow()` (убрать role/cf_implementation, добавить template)
  - [ ] Добавить handling для zone_limits[]
- [ ] Обновить `src/redirects/drawer.ts`:
  - [ ] В `openDrawer()`: вызывать `getRedirect(id)`
  - [ ] В `handleSave()`: вызывать `updateRedirect(id, data)`
- [ ] Обновить таблицу (redirects.html):
  - [ ] Убрать колонки: role, cf_implementation, domain_status
  - [ ] Добавить колонку: Template
- [ ] Обновить Actions dropdown:
  - [ ] Добавить "Sync to CF" action
- [ ] Обновить `src/redirects/sync-status.ts`:
  - [ ] Добавить `syncToCloudflare(zoneId)` с вызовом API
- [ ] Тестирование:
  - [ ] Загрузка таблицы из API
  - [ ] Открытие drawer + загрузка редиректа
  - [ ] Сохранение изменений (PATCH)
  - [ ] Удаление (DELETE)
  - [ ] Enable/Disable
  - [ ] Sync to CF

### Фаза 2: Templates & Presets

- [ ] Создать drawer "Create Redirect"
  - [ ] Выбор template (T1-T7)
  - [ ] Динамические поля params
  - [ ] Submit → POST /domains/:id/redirects
- [ ] Создать drawer "Apply Preset"
  - [ ] Список пресетов (P1-P5)
  - [ ] Динамические поля params
  - [ ] Submit → POST /domains/:id/redirects/preset
- [ ] Обновить таблицу:
  - [ ] Template column с badges
  - [ ] Preset badge (если preset_id не null)
- [ ] Добавить i18n ключи для templates/presets

### Фаза 3: Zone Limits Widget

- [ ] Создать widget в header (рядом с sync indicator)
- [ ] Dropdown с progress bars для zone limits
- [ ] Warning badge при used >= 80% max
- [ ] Pre-validation перед созданием редиректа
- [ ] Live update после create/delete

### Фаза 4: Analytics

- [ ] Улучшить Activity column (sparkline chart)
- [ ] Добавить вкладку Analytics в drawer
- [ ] График кликов по дням (требует API endpoint)

---

## 8. Risk Assessment

### 8.1 Низкий риск

✅ **Замена mock data на API** - прямое соответствие интерфейсов
✅ **CRUD операции** - API поддерживает все нужные endpoints
✅ **Sync logic** - API имеет endpoint для синхронизации
✅ **Дизайн** - UI Style Guide полностью покрывает все компоненты

### 8.2 Средний риск

⚠️ **Batch operations** - API не поддерживает batch CRUD (нужно делать N запросов)
⚠️ **Grouping by project** - API не возвращает project_name (нужно кешировать на фронте)
⚠️ **Zone limits validation** - нужно добавить pre-validation перед созданием редиректов

### 8.3 Высокий риск

❌ **Role-based logic** - API не поддерживает role (acceptor/donor/reserve), нужно решить как показывать или убрать из UI
❌ **cf_implementation** - API не возвращает тип реализации (single/bulk/worker), нужно убрать из таблицы

---

## 9. Recommended Approach

**Приоритет:** Фаза 1 (MVP) → Фаза 2 (Templates/Presets) → Фаза 3 (Zone Limits) → Фаза 4 (Analytics)

**Стартовая точка:**
1. Создать `src/api/redirects.ts` с базовыми функциями
2. Обновить `src/api/types.ts`
3. Обновить `src/redirects/redirects.ts` для загрузки данных из API
4. Протестировать MVP на реальных данных

**Ключевые решения:**
- ✅ Убрать role/cf_implementation из таблицы (не поддерживается API)
- ✅ Добавить template column (новая концепция из API)
- ✅ Использовать GET /sites/:siteId/redirects для загрузки таблицы
- ✅ Batch operations реализовать через N запросов (Promise.all)

**Временная оценка:**
- Фаза 1 (MVP): ~8-12 часов
- Фаза 2 (Templates/Presets): ~6-8 часов
- Фаза 3 (Zone Limits): ~3-4 часа
- Фаза 4 (Analytics): ~4-6 часов

**Итого:** ~21-30 часов разработки для полной интеграции.

---

## 10. Conclusion

**Существующий UI на 85% готов к интеграции с реальным API.**

**Основные изменения:**
- Убрать 3 колонки (role, cf_implementation, domain_status)
- Добавить 1 колонку (Template)
- Создать 2 wizard'а (Create from Template, Apply Preset)
- Добавить Zone Limits Widget

**Дизайн полностью сохраняется** - все компоненты (table, drawer, filters, bulk actions) остаются без изменений.

**Рекомендация:** Начать с Фазы 1 (MVP) для валидации API интеграции, затем последовательно добавлять Templates/Presets/Zone Limits.
