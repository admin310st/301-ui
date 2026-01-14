# Redirects Implementation Plan (with domain_role)

---

## 🚨 BACKEND REQUIREMENTS (Critical for Implementation)

### ✅ Минимально необходимо (блокирует frontend разработку):

**1. Добавить поле `domain_role` в GET /sites/:siteId/redirects**

```typescript
// Пример response:
{
  "ok": true,
  "site_id": 10,
  "site_name": "Main Landing",
  "redirects": [
    {
      "id": 1,
      "domain_id": 45,
      "domain_name": "cryptoboss.pics",
      "domain_role": "acceptor",  // ← NEW (критично!)
      "zone_id": 12,
      "zone_name": "cryptoboss.pics",
      "template_id": "T1",
      "params": { "target_url": "https://cryptoboss.com" },
      "status_code": 301,
      "enabled": true,
      "sync_status": "synced",
      "cf_rule_id": "abc123",
      "clicks_total": 12847,
      "clicks_today": 142,
      "clicks_yesterday": 128,
      "trend": "up",
      "created_at": "2025-01-10T08:00:00Z",
      "updated_at": "2025-01-12T10:00:00Z"
    }
  ],
  "zone_limits": [
    {
      "zone_id": 12,
      "zone_name": "cryptoboss.pics",
      "used": 2,
      "max": 10
    }
  ],
  "total": 2
}
```

**Как вычислять `domain_role`:**
- `"acceptor"` - домен является target для других доменов (или primary domain сайта без редиректа)
- `"donor"` - домен имеет настроенный redirect rule (редиректит на другой домен)
- `"reserve"` - домен привязан к сайту, но НЕ имеет redirect rule (резервный)

**Зачем это нужно:**
- UI использует role для группировки, badges, bulk actions logic
- Без role придется вычислять на фронте (сложнее, менее надежно)
- С role UI остается почти без изменений (только mock → API)

---

### 🎯 Желательно (не блокирует MVP, улучшает UX):

**2. Опциональные поля для badges:**

```typescript
{
  "domain_status": "active" | "parked" | "expired",  // Статус домена
  "cf_implementation": "single_redirect" | "bulk_redirect" | "worker"  // Тип CF реализации
}
```

**Если этих полей нет** - просто убираем соответствующие badges из UI.

---

### 📋 Альтернатива (если domain_role невозможен):

Frontend может вычислять role самостоятельно (см. раздел 17), но это:
- ❌ Сложнее поддерживать
- ❌ Может быть неточно для внешних target_url
- ❌ Требует пересчета при каждом изменении

**Рекомендация:** Добавить `domain_role` на backend (single source of truth).

---

## TL;DR

Если backend добавит `domain_role: "acceptor" | "donor" | "reserve"` в `GET /sites/:siteId/redirects`, то UI можно оставить почти без изменений. Только замена mock data на API + правильное использование cache/inflight.

---

## 1. Backend: минимальная доработка контракта

### Добавить в GET /sites/:siteId/redirects

**На каждый домен/redirect в payload:**

```typescript
{
  id: number;
  domain_id: number;
  domain_name: string;
  domain_role: "acceptor" | "donor" | "reserve";  // ← NEW (критично для UI)
  zone_id: number;
  template_id: string;
  // ... остальные поля
}
```

**Желательно (но не блокирует MVP):**

- `domain_status: "active" | "parked" | "expired"` - для status badge
- `site_flag: string` - для flag badge (если есть в концепции)
- `cf_implementation: "single_redirect" | "bulk_redirect" | "worker"` - для CF implementation badge

**Если этих полей нет** - просто убираем соответствующие badges из UI (минимальные визуальные потери).

---

## 2. Источник данных: один GET на site

### Правило: Search/Filters/Sort НЕ триггерят API

**Один базовый запрос:**

```typescript
GET /sites/:siteId/redirects → кэшируем (TTL 30s) + withInFlight + abortPrevious
```

**Client-side обработка:**
- ✅ Search по domain/target → локально
- ✅ Filter chips (Projects/Configured/Sync/Enabled) → локально
- ✅ Сортировка → локально
- ✅ Группировка (project → site → acceptor/donor) → локально

**Повторный API вызов только:**
- Смена site в dropdown (с abortPrevious)
- Explicit Refresh button (force cache skip)
- Автоматический refetch через TTL (30s)

**Drawer data:**
- `GET /redirects/:id` - только если drawer открывается и данных строки недостаточно
- В большинстве случаев данных из site list хватает

---

## 3. UI: что сохраняем 1:1 (текущий дизайн)

### Оставляем БЕЗ изменений:

✅ **Header:**
- Sync indicator dropdown (с actions)
- Search bar
- Reset filters button

✅ **Table:**
- Collapsible grouping (project → site → domains)
- Current columns: Domain, Target, Activity, Status, Actions
- Checkbox для mass-select

✅ **Bulk actions bar:**
- Sticky bar (показывается при выборе)
- Enable/Disable/Delete/Sync to CF

✅ **Drawer:**
- Redirect inspector (view/edit)
- Confirm dialog для delete

✅ **Filters:**
- Chips row (инжектится JS)
- Projects/Configured/Sync/Enabled filters

### Все это работает как сейчас, только data source = API вместо mock!

---

## 4. Как используется domain_role

### Роль определяет:

**Acceptor (target domain):**
- Рендерится как destination/primary row в группе
- Badge "Target" (если такой есть в моках)
- Действия: ограничены или скрыты (по текущим правилам UI)
- Не участвует в bulk actions (опционально, по логике UI)

**Donor (source domain):**
- Обычный домен-источник редиректа
- Полный набор row actions (Edit/Enable/Disable/Delete)
- Участвует в bulk actions
- Может быть donor БЕЗ редиректа → показываем как "reserve" (если enabled=false или has_redirect=false)

**Reserve (резервный домен):**
- Домен без редиректа (но привязан к сайту)
- Badge "Reserve" или "No redirect"
- Можно добавить редирект через drawer

### Группировка:

```
Project: CryptoBoss
  Site: Main Landing
    ↳ cryptoboss.pics (acceptor) - Target badge
      ↳ promo.cryptoboss.pics (donor) → cryptoboss.pics
      ↳ old.cryptoboss.pics (donor) → cryptoboss.pics
      ↳ reserve1.pics (reserve) - No redirect badge
```

**С role backend делает всю сложную логику**, UI просто рендерит:
- acceptor → primary row
- donor → child row
- reserve → child row (другой badge)

---

## 5. Колонки: минимальные изменения

### Текущие колонки сохраняются:

| Column | Content | Changes |
|--------|---------|---------|
| ☑️ Checkbox | Mass-select | No changes |
| Domain | Domain name + badges | ✅ Добавить Template badge (badge--xs) внутри cell |
| Target | target_url или "—" | No changes (computed from template/params) |
| Activity | clicks_total, clicks_today, trend | No changes |
| Status | enabled badge + sync_status badge | No changes |
| Actions | Edit button + dropdown (Enable/Disable/Delete) | No changes |

### Domain cell structure (с role):

```html
<div class="domain-cell">
  <span class="domain-cell__name">cryptoboss.pics</span>

  <!-- Existing badges (если backend вернет) -->
  <span class="badge badge--xs badge--neutral">active</span>  <!-- domain_status -->
  <span class="badge badge--xs badge--neutral">🇷🇺</span>     <!-- site_flag -->

  <!-- NEW: Template badge (as secondary info) -->
  <span class="badge badge--xs badge--success" title="non-www → www">T3</span>

  <!-- NEW: Preset badge (if present) -->
  <span class="badge badge--xs badge--ghost" title="Created from preset P1">P1</span>

  <!-- Role badge (existing logic) -->
  <span class="badge badge--neutral">Target</span>  <!-- if acceptor -->
  <span class="badge badge--neutral">Reserve</span> <!-- if reserve -->
</div>
```

**Преимущество:**
- ✅ Не добавляем новую колонку (не ломаем responsive)
- ✅ Template info видна сразу
- ✅ Паттерн "несколько badges в ячейке" уже используется

---

## 6. Массовые действия (bulk)

### Остаются в текущем UX:

**Bulk actions bar (sticky):**
- Показывается при выборе ≥1 domain
- Actions: Enable / Disable / Delete / Sync to CF

**Логика zone-aware:**

```typescript
// Bulk enable/disable
async function bulkUpdateEnabled(ids: number[], enabled: boolean) {
  // N × PATCH /redirects/:id (в параллель)
  await Promise.all(ids.map(id => updateRedirect(id, { enabled })));

  // Optimistic update локально
  bulkUpdateEnabledLocal(ids, enabled);

  // Invalidate cache (без immediate refetch)
  invalidateCacheByPrefix('redirects:site:');
}

// Bulk sync to CF
async function bulkSyncToCloudflare(selectedIds: number[]) {
  // Группируем по zone_id
  const redirectsByZone = groupByZone(selectedIds);

  // POST /zones/:id/apply-redirects для каждой зоны
  for (const [zoneId, redirects] of redirectsByZone) {
    await applyZoneRedirects(zoneId);
  }
}
```

**Роль помогает:**
- Исключать acceptor из bulk actions (если так задумано)
- Правильно показывать reserve domains (без редиректа)

---

## 7. Drawer (inspector)

### Остается текущий drawer (minimal changes):

**Edit redirect:**
```typescript
async function handleSaveRedirect(redirectId: number, updates: UpdateRedirectRequest) {
  // API call
  await updateRedirect(redirectId, updates);

  // Optimistic update
  updateRedirectLocal(redirectId, updates);

  // Invalidate cache (без immediate refetch)
  invalidateCacheByPrefix('redirects:site:');

  closeDrawer();
}
```

**Create redirect:**
```typescript
async function handleCreateRedirect(domainId: number, data: CreateRedirectRequest) {
  // API call
  const response = await createRedirect(domainId, data);

  // Optimistic update
  addRedirect(response.redirect);

  // Invalidate cache
  invalidateCacheByPrefix('redirects:site:');

  closeDrawer();
}
```

**Apply preset:**
```typescript
async function handleApplyPreset(domainId: number, presetId: string, params: any) {
  // API call
  const response = await applyPreset(domainId, { preset_id: presetId, params });

  // Optimistic update (добавляем N redirects)
  response.redirect_ids.forEach(id => {
    // TODO: fetch details or use partial data
  });

  // Invalidate cache
  invalidateCacheByPrefix('redirects:site:');

  closeDrawer();
}
```

---

## 8. Cache Strategy (TTL + Invalidation)

### Cache Keys & TTL:

| Данные | Cache Key | TTL | In-Flight Key | Abort Key |
|--------|-----------|-----|---------------|-----------|
| Templates | `redirects:templates:v1` | 24h | Same | - |
| Presets | `redirects:presets:v1` | 24h | Same | - |
| Site redirects | `redirects:site:${siteId}:v1` | 30s | Same | `redirects:listSite` |
| Redirect detail | `redirect:${id}:v1` | 30s | Same | - |
| Zone status | `redirects:zone:${zoneId}:status:v1` | 15s | Same | `redirects:zoneStatus:${zoneId}` |

### Invalidation Rules:

**После мутаций:**
- CREATE/PATCH/DELETE redirect → `invalidateCacheByPrefix('redirects:site:')` + `invalidateCache('redirect:${id}:v1')`
- Apply zone redirects → `invalidateCacheByPrefix('redirects:site:')` + `invalidateCache('redirects:zone:${zoneId}:status:v1')`

**НЕ делаем immediate refetch** - полагаемся на:
1. Optimistic updates (UI обновился сразу)
2. Cache TTL (через 30s данные обновятся автоматически)
3. Explicit Refresh button (если пользователю нужно сейчас)

---

## 9. API Module Structure

### src/api/redirects.ts

```typescript
import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix, invalidateCache } from './cache';
import { withInFlight, abortPrevious } from './ui-client';

// ============================================================================
// Reference Data (TTL 24h)
// ============================================================================

export async function getTemplates(): Promise<Template[]> {
  const cacheKey = 'redirects:templates:v1';
  const cached = getCached<Template[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<{ templates: Template[] }>('/redirects/templates');
    setCache(cacheKey, response.templates, 24 * 60 * 60 * 1000);
    return response.templates;
  });
}

export async function getPresets(): Promise<Preset[]> {
  const cacheKey = 'redirects:presets:v1';
  const cached = getCached<Preset[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<{ presets: Preset[] }>('/redirects/presets');
    setCache(cacheKey, response.presets, 24 * 60 * 60 * 1000);
    return response.presets;
  });
}

// ============================================================================
// Site Redirects (TTL 30s)
// ============================================================================

export async function getSiteRedirects(
  siteId: number,
  options: { force?: boolean } = {}
): Promise<GetSiteRedirectsResponse> {
  const cacheKey = `redirects:site:${siteId}:v1`;

  if (!options.force) {
    const cached = getCached<GetSiteRedirectsResponse>(cacheKey);
    if (cached) return cached;
  }

  return withInFlight(cacheKey, async () => {
    const signal = abortPrevious('redirects:listSite');
    const response = await apiFetch<GetSiteRedirectsResponse>(
      `/sites/${siteId}/redirects`,
      { signal }
    );
    setCache(cacheKey, response, 30000);
    return response;
  });
}

// ============================================================================
// Mutations (с invalidation, без immediate refetch)
// ============================================================================

export async function createRedirect(
  domainId: number,
  data: CreateRedirectRequest
): Promise<CreateRedirectResponse> {
  const response = await apiFetch<CreateRedirectResponse>(
    `/domains/${domainId}/redirects`,
    { method: 'POST', body: JSON.stringify(data) }
  );

  invalidateCacheByPrefix('redirects:site:');
  return response;
}

export async function updateRedirect(
  id: number,
  data: UpdateRedirectRequest
): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${id}:v1`);
}

export async function deleteRedirect(id: number): Promise<void> {
  await apiFetch(`/redirects/${id}`, { method: 'DELETE' });

  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${id}:v1`);
}

export async function applyZoneRedirects(zoneId: number): Promise<ApplyRedirectsResponse> {
  const response = await apiFetch<ApplyRedirectsResponse>(
    `/zones/${zoneId}/apply-redirects`,
    { method: 'POST' }
  );

  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirects:zone:${zoneId}:status:v1`);

  return response;
}
```

---

## 10. TypeScript Types

### src/api/types.ts (additions)

```typescript
// ============================================================================
// Redirects Types (с domain_role)
// ============================================================================

export type DomainRole = 'acceptor' | 'donor' | 'reserve';

export interface Redirect {
  id: number;
  domain_id: number;
  domain_name: string;
  domain_role: DomainRole;  // ← От backend
  domain_status?: 'active' | 'parked' | 'expired';  // ← Опционально от backend
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
  cf_implementation?: 'single_redirect' | 'bulk_redirect' | 'worker';  // ← Опционально
  last_synced_at?: string;
  last_error?: string | null;
  clicks_total: number;
  clicks_today: number;
  clicks_yesterday: number;
  trend: 'up' | 'down' | 'neutral';
  created_at: string;
  updated_at: string;
}

export interface GetSiteRedirectsResponse {
  ok: boolean;
  site_id: number;
  site_name: string;
  redirects: Redirect[];
  zone_limits: ZoneLimit[];
  total: number;
}

// ... остальные types из предыдущего плана
```

---

## 11. State Management

### src/redirects/state.ts (без изменений из предыдущего плана)

State остается таким же - optimistic updates, listeners, loadSiteRedirects(), etc.

Единственное отличие - теперь `redirect.domain_role` приходит из API, не вычисляется.

---

## 12. UI Rendering (minimal changes)

### src/redirects/redirects.ts

```typescript
/**
 * Render redirect row (with domain_role from API)
 */
function renderRedirectRow(redirect: Redirect): string {
  const isSelected = selectedRedirects.has(redirect.id);
  const targetUrl = getTargetUrl(redirect);
  const templateName = getTemplateName(redirect.template_id);

  // Template badge (secondary info in Domain cell)
  const templateBadge = redirect.template_id
    ? `<span class="badge badge--xs badge--${getTemplateBadgeColor(redirect.template_id)}" title="${templateName}">${redirect.template_id}</span>`
    : '';

  // Preset badge
  const presetBadge = redirect.preset_id
    ? `<span class="badge badge--xs badge--ghost" title="Created from preset ${redirect.preset_id}">${redirect.preset_id}</span>`
    : '';

  // Role badge (existing logic, now using API field)
  let roleBadge = '';
  if (redirect.domain_role === 'acceptor') {
    roleBadge = '<span class="badge badge--neutral" title="Redirect target (main site domain)">Target</span>';
  } else if (redirect.domain_role === 'reserve') {
    roleBadge = '<span class="badge badge--neutral" title="Reserve domain (no redirect)">Reserve</span>';
  }

  // Domain status badge (if provided by backend)
  const statusBadge = redirect.domain_status && redirect.domain_status !== 'active'
    ? `<span class="badge badge--xs badge--${redirect.domain_status === 'parked' ? 'neutral' : 'danger'}">${redirect.domain_status}</span>`
    : '';

  return `
    <tr class="${isSelected ? 'is-selected' : ''}" data-redirect-id="${redirect.id}" data-role="${redirect.domain_role}">
      <td>
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-checkbox />
      </td>
      <td data-priority="critical">
        <div class="domain-cell">
          <span class="domain-cell__name">${redirect.domain_name}</span>
          ${statusBadge}
          ${templateBadge}
          ${presetBadge}
          ${roleBadge}
        </div>
      </td>
      <td data-priority="high">
        ${targetUrl ? `<code class="target-url">${targetUrl}</code>` : '<span class="text-muted">—</span>'}
      </td>
      <td data-priority="high">
        <div class="activity-cell">
          <span class="activity-cell__total">${formatNumber(redirect.clicks_total)}</span>
          <span class="activity-cell__today text-muted">+${redirect.clicks_today} today</span>
          ${redirect.trend !== 'neutral' ? `<span class="icon activity-cell__trend activity-cell__trend--${redirect.trend}" data-icon="mono/trending-${redirect.trend}"></span>` : ''}
        </div>
      </td>
      <td data-priority="low">
        <div class="status-cell">
          <span class="badge badge--sm badge--${redirect.enabled ? 'success' : 'default'}">
            ${redirect.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <span class="badge badge--sm badge--${getSyncBadgeColor(redirect.sync_status)}">
            ${redirect.sync_status}
          </span>
        </div>
      </td>
      <td data-priority="critical">
        <div class="btn-group">
          <button class="btn-icon" type="button" data-action="edit" data-redirect-id="${redirect.id}">
            <span class="icon" data-icon="mono/pencil-circle"></span>
          </button>
          <div class="dropdown" data-dropdown>
            <button class="btn-icon btn-icon--ghost dropdown__trigger" type="button">
              <span class="icon" data-icon="mono/dots-vertical"></span>
            </button>
            <div class="dropdown__menu dropdown__menu--align-right" role="menu">
              ${redirect.domain_role !== 'acceptor' ? `
                <button class="dropdown__item" type="button" data-action="toggle-enabled" data-redirect-id="${redirect.id}">
                  <span class="icon" data-icon="mono/${redirect.enabled ? 'eye-off' : 'eye'}"></span>
                  <span>${redirect.enabled ? 'Disable' : 'Enable'}</span>
                </button>
              ` : ''}
              <hr class="dropdown__divider" />
              <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete" data-redirect-id="${redirect.id}">
                <span class="icon" data-icon="mono/delete"></span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}
```

**Ключевое отличие от mock version:**
- ✅ `redirect.domain_role` приходит из API (не вычисляется на фронте)
- ✅ Template/Preset badges добавлены внутри Domain cell
- ✅ Остальная логика рендеринга БЕЗ изменений

---

## 13. Разбивка на PR

### PR-A: API Layer + Cache/InFlight/Abort

**Scope:**
- Создать `src/api/redirects.ts` с правильным использованием cache/withInFlight/abortPrevious
- Обновить `src/api/types.ts` (добавить Redirect, Template, Preset, ZoneLimit с `domain_role`)

**Критерий готовности:**
- ✅ `getTemplates()` - работает с cache 24h
- ✅ `getPresets()` - работает с cache 24h
- ✅ `getSiteRedirects(siteId)` - работает с cache 30s + abortPrevious
- ✅ CRUD endpoints (create/update/delete/apply) с invalidation
- ✅ TypeScript types полностью соответствуют API

---

### PR-B: State Management + Optimistic Updates

**Scope:**
- Создать `src/redirects/state.ts` с single source of truth
- Optimistic update functions (add/update/remove/bulkUpdate)
- Listener pattern для reactive UI

**Критерий готовности:**
- ✅ `loadSiteRedirects(siteId)` загружает данные через API
- ✅ `refreshRedirects()` делает force cache skip
- ✅ Optimistic updates работают для всех мутаций
- ✅ State updates триггерят UI re-render

---

### PR-C: Page Wiring (Mock → API)

**Scope:**
- Обновить `src/redirects/redirects.ts` для работы с state.ts
- Убрать импорт mock-data
- Client-side filters/search (без API вызовов)
- Site selector в header

**Критерий готовности:**
- ✅ Таблица рендерится из `getState().redirects`
- ✅ Search/filters работают client-side
- ✅ Site selector переключает контекст (с abortPrevious)
- ✅ Refresh button делает force reload
- ✅ `domain_role` используется для badges/группировки

---

### PR-D: Bulk Actions (Zone-Aware)

**Scope:**
- Bulk enable/disable (N × PATCH + optimistic update)
- Bulk delete (N × DELETE + optimistic update)
- Bulk sync to CF (группировка по zone_id + POST apply)

**Критерий готовности:**
- ✅ Bulk actions bar показывается при выборе
- ✅ Enable/Disable работает для N redirects (с progress)
- ✅ Delete работает с подтверждением
- ✅ Sync to CF группирует по зонам и синхронизирует

---

### PR-E: Drawer (Create/Edit/Preset)

**Scope:**
- Обновить drawer для работы с API
- Create redirect from template
- Apply preset
- Edit redirect (с optimistic update)

**Критерий готовности:**
- ✅ Drawer открывается с данными из `getRedirect(id)` или site list
- ✅ Edit сохраняет через `updateRedirect()` + optimistic update
- ✅ Create работает через `createRedirect()` + optimistic update
- ✅ Apply preset работает через `applyPreset()` + optimistic update

---

## 14. Временная оценка

| PR | Scope | Hours |
|----|-------|-------|
| PR-A | API Layer + Cache | 4-6h |
| PR-B | State Management | 4-6h |
| PR-C | Page Wiring (Mock → API) | 6-8h |
| PR-D | Bulk Actions | 3-4h |
| PR-E | Drawer (Create/Edit/Preset) | 4-6h |

**Итого:** ~21-30 часов (как и в предыдущем плане)

**Критическая зависимость:** PR-A + PR-B блокируют остальные. PR-C/D/E можно делать параллельно после PR-B.

---

## 15. Backend Contract (Request to API Team)

### Минимальные изменения для MVP:

**1. Добавить `domain_role` в GET /sites/:siteId/redirects:**

```typescript
{
  "redirects": [
    {
      "id": 1,
      "domain_id": 45,
      "domain_name": "cryptoboss.pics",
      "domain_role": "acceptor",  // ← NEW (критично!)
      "zone_id": 12,
      "template_id": "T1",
      // ... rest
    }
  ]
}
```

**Как вычислять `domain_role` на backend:**
- `acceptor` - домен является target_url для других доменов (или primary domain сайта без редиректа)
- `donor` - домен имеет redirect rule (редиректит на другой домен)
- `reserve` - домен привязан к сайту, но НЕТ redirect rule

**2. Опционально (nice to have, не блокирует):**

- `domain_status: "active" | "parked" | "expired"` - статус домена
- `cf_implementation: "single_redirect" | "bulk_redirect" | "worker"` - тип реализации в CF

Если этих полей нет - просто убираем соответствующие badges из UI.

---

## 16. Преимущества подхода с domain_role

### ✅ Минимальные изменения в UI:

- Группировка работает как сейчас
- Badges показываются как сейчас
- Bulk actions logic как сейчас
- Reserve domains видны в UI

### ✅ Стабильная логика:

- Backend определяет роль (single source of truth)
- Фронт не угадывает/не вычисляет
- Нет race conditions при изменении target_url

### ✅ Быстрая миграция:

- Заменить mock data на API
- Добавить cache/inflight
- Все остальное работает!

---

## 17. Альтернатива (если backend НЕ добавит role)

### Вычислять role на фронте:

```typescript
function computeDomainRole(redirect: Redirect, allRedirects: Redirect[]): DomainRole {
  // Если redirect.target_url === null → acceptor (primary domain)
  if (!redirect.target_url && !redirect.template_id) {
    return 'acceptor';
  }

  // Если другие домены редиректят на этот → acceptor
  const isTarget = allRedirects.some(r =>
    r.params?.target_url === `https://${redirect.domain_name}` ||
    r.params?.target_url === redirect.domain_name
  );
  if (isTarget) {
    return 'acceptor';
  }

  // Если есть redirect rule → donor
  if (redirect.template_id) {
    return 'donor';
  }

  // Иначе → reserve
  return 'reserve';
}
```

**Проблемы этого подхода:**
- ❌ Сложнее поддерживать
- ❌ Может быть неточно (если target_url внешний)
- ❌ Нужно пересчитывать при каждом изменении

**Вывод:** Лучше попросить backend добавить `domain_role`.

---

## 18. Checklist для MVP

### Backend Ready:
- [ ] `domain_role` добавлен в `GET /sites/:siteId/redirects`
- [ ] `domain_status` добавлен (опционально)
- [ ] Templates/Presets endpoints работают

### Frontend Ready:
- [ ] PR-A: API Layer готов (cache + inflight + abort)
- [ ] PR-B: State Management готов (optimistic updates)
- [ ] PR-C: Page Wiring готов (mock → API, filters client-side)
- [ ] PR-D: Bulk Actions готовы (zone-aware sync)
- [ ] PR-E: Drawer готов (create/edit/preset)

### Testing:
- [ ] Загрузка redirects при выборе site (с cache + abortPrevious)
- [ ] Search/filters работают client-side (без API вызовов)
- [ ] Refresh button делает force cache skip
- [ ] CRUD operations работают с optimistic updates
- [ ] Bulk actions работают (enable/disable/delete/sync)
- [ ] Drawer работает (create/edit/preset)
- [ ] Cache TTL работает (auto-refresh через 30s)
- [ ] Группировка по domain_role работает

---

## 19. Риски и Mitigation

### Риск 1: Backend не добавит domain_role вовремя

**Mitigation:**
- Синтетически вычислять role на фронте (см. раздел 17)
- Упростить UI (убрать группировку, показывать плоский список)

### Риск 2: Cache TTL слишком короткий/длинный

**Mitigation:**
- Начать с 30s, корректировать по feedback
- Explicit Refresh button всегда доступен

### Риск 3: Optimistic updates не синхронны с backend

**Mitigation:**
- После каждой мутации: invalidate cache
- Auto-refresh через TTL подтянет актуальные данные
- Explicit Refresh для urgent cases

---

## 20. Next Steps

1. **Согласовать с backend team:** Добавление `domain_role` в API
2. **Начать PR-A:** API Layer + Cache (не блокируется backend, можно работать с mock)
3. **Параллельно PR-B:** State Management
4. **После PR-A + PR-B:** PR-C/D/E в любом порядке

**Estimated delivery:** ~3-4 недели (если backend готов через 1 неделю)
