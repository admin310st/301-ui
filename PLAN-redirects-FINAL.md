# Redirects Implementation Plan (FINAL)

**Дата:** 2026-01-18
**Статус:** Backend API готов, начинаем фронтенд
**Backend код проверен:** `src/api/redirects/redirects.ts` содержит `domain_role`

---

## Backend API: Реальная структура

**Endpoint:** `GET /sites/:siteId/redirects`

```typescript
// РЕАЛЬНЫЙ response (проверено в коде backend)
{
  "ok": true,
  "site_id": number,
  "site_name": string,
  "domains": [                        // ← Массив ВСЕХ доменов сайта
    {
      "domain_id": number,
      "domain_name": string,
      "domain_role": "acceptor" | "donor" | "reserve",  // ← УЖЕ ЕСТЬ!
      "zone_id": number | null,
      "zone_name": string | null,
      "redirect": {                   // ← Вложенный объект ИЛИ null
        "id": number,
        "template_id": string,
        "preset_id": string | null,
        "preset_order": number | null,
        "rule_name": string,
        "params": Record<string, any>,
        "status_code": 301 | 302,
        "enabled": boolean,
        "sync_status": "pending" | "synced" | "error",
        "cf_rule_id": string | null,
        "clicks_total": number,
        "clicks_today": number,
        "clicks_yesterday": number,
        "trend": "up" | "down" | "neutral",
        "created_at": string,
        "updated_at": string
      } | null                        // ← null = домен без редиректа
    }
  ],
  "zone_limits": [
    {
      "zone_id": number,
      "zone_name": string,
      "used": number,
      "max": 10                       // CF_FREE_PLAN_LIMIT
    }
  ],
  "total_domains": number,
  "total_redirects": number
}
```

**Ключевые факты:**
- `domain_role` **УЖЕ реализован** на backend (d.role as domain_role в SQL)
- **LEFT JOIN** — возвращаются ВСЕ домены сайта, даже без редиректов
- Роли автоматически управляются: создание redirect → `donor`, удаление → `reserve`
- T3/T4 (canonical) НЕ меняют роль

---

## TypeScript Types (обновлённые)

### src/api/types.ts

```typescript
// ============================================================================
// Redirects Types (соответствуют реальному API)
// ============================================================================

export type DomainRole = 'acceptor' | 'donor' | 'reserve';
export type SyncStatus = 'pending' | 'synced' | 'error';
export type Trend = 'up' | 'down' | 'neutral';

/**
 * Redirect rule (вложенный объект внутри SiteDomain)
 */
export interface RedirectRule {
  id: number;
  template_id: string;
  preset_id: string | null;
  preset_order: number | null;
  rule_name: string;
  params: Record<string, any>;
  status_code: 301 | 302;
  enabled: boolean;
  sync_status: SyncStatus;
  cf_rule_id: string | null;
  clicks_total: number;
  clicks_today: number;
  clicks_yesterday: number;
  trend: Trend;
  created_at: string;
  updated_at: string;
}

/**
 * Domain with optional redirect (основная единица в таблице)
 */
export interface SiteDomain {
  domain_id: number;
  domain_name: string;
  domain_role: DomainRole;
  zone_id: number | null;
  zone_name: string | null;
  redirect: RedirectRule | null;  // null = домен без редиректа
}

/**
 * Zone limit info
 */
export interface ZoneLimit {
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
}

/**
 * GET /sites/:siteId/redirects response
 */
export interface GetSiteRedirectsResponse {
  ok: boolean;
  site_id: number;
  site_name: string;
  domains: SiteDomain[];
  zone_limits: ZoneLimit[];
  total_domains: number;
  total_redirects: number;
}

/**
 * Template (T1-T7)
 */
export interface RedirectTemplate {
  id: string;
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

/**
 * Preset (P1-P5)
 */
export interface RedirectPreset {
  id: string;
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

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateRedirectRequest {
  template_id: string;
  rule_name?: string;
  params: Record<string, any>;
  status_code?: 301 | 302;
}

export interface CreateRedirectResponse {
  ok: boolean;
  redirect: RedirectRule;
  zone_limit: ZoneLimit;
}

export interface UpdateRedirectRequest {
  rule_name?: string;
  params?: Record<string, any>;
  status_code?: 301 | 302;
  enabled?: boolean;
}

export interface ApplyPresetRequest {
  preset_id: string;
  params: Record<string, any>;
}

export interface ApplyPresetResponse {
  ok: boolean;
  preset_id: string;
  preset_name: string;
  created_count: number;
  redirect_ids: number[];
  zone_limit: ZoneLimit;
}

export interface ApplyRedirectsResponse {
  ok: boolean;
  zone_id: number;
  cf_zone_id: string;
  cf_ruleset_id: string;
  rules_applied: number;
  synced_rules: Array<{ id: number; cf_rule_id: string }>;
  warnings?: string[];
}
```

---

## State Management (обновлённый)

### src/redirects/state.ts

```typescript
/**
 * Redirects state management
 * Работает с SiteDomain[] (домены с вложенными redirect | null)
 */

import type { SiteDomain, ZoneLimit } from '@api/types';
import { getSiteRedirects } from '@api/redirects';

// ============================================================================
// State
// ============================================================================

interface RedirectsState {
  currentSiteId: number | null;
  siteName: string;
  domains: SiteDomain[];          // ← Основной массив (домены + redirect | null)
  zoneLimits: ZoneLimit[];
  totalDomains: number;
  totalRedirects: number;
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

let state: RedirectsState = {
  currentSiteId: null,
  siteName: '',
  domains: [],
  zoneLimits: [],
  totalDomains: 0,
  totalRedirects: 0,
  loading: false,
  error: null,
  lastLoadedAt: null,
};

// Listeners
const listeners: Array<(state: RedirectsState) => void> = [];

function notifyListeners() {
  listeners.forEach(fn => fn(state));
}

export function onStateChange(fn: (state: RedirectsState) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getState(): RedirectsState {
  return state;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Load domains/redirects for a site
 */
export async function loadSiteRedirects(
  siteId: number,
  options: { force?: boolean } = {}
): Promise<void> {
  state.loading = true;
  state.error = null;
  state.currentSiteId = siteId;
  notifyListeners();

  try {
    const response = await getSiteRedirects(siteId, options);

    state.siteName = response.site_name;
    state.domains = response.domains;
    state.zoneLimits = response.zone_limits;
    state.totalDomains = response.total_domains;
    state.totalRedirects = response.total_redirects;
    state.lastLoadedAt = Date.now();
    state.loading = false;
    notifyListeners();
  } catch (error: any) {
    state.loading = false;
    state.error = error.message || 'Failed to load redirects';
    notifyListeners();
  }
}

/**
 * Refresh current site (force cache skip)
 */
export async function refreshRedirects(): Promise<void> {
  if (!state.currentSiteId) return;
  await loadSiteRedirects(state.currentSiteId, { force: true });
}

// ============================================================================
// Optimistic Updates
// ============================================================================

/**
 * Update redirect in domain (optimistic)
 */
export function updateDomainRedirect(
  domainId: number,
  updates: Partial<import('@api/types').RedirectRule>
): void {
  const domain = state.domains.find(d => d.domain_id === domainId);
  if (!domain || !domain.redirect) return;

  Object.assign(domain.redirect, updates);

  // If enabled/params changed, mark as pending
  if ('enabled' in updates || 'params' in updates) {
    domain.redirect.sync_status = 'pending';
  }

  notifyListeners();
}

/**
 * Remove redirect from domain (optimistic)
 * Domain stays in list with redirect: null, role: 'reserve'
 */
export function removeRedirectFromDomain(domainId: number): void {
  const domain = state.domains.find(d => d.domain_id === domainId);
  if (!domain || !domain.redirect) return;

  const zoneId = domain.zone_id;

  // Clear redirect, set role to reserve
  domain.redirect = null;
  domain.domain_role = 'reserve';

  // Update zone limit
  if (zoneId) {
    const zoneLimit = state.zoneLimits.find(z => z.zone_id === zoneId);
    if (zoneLimit) {
      zoneLimit.used = Math.max(0, zoneLimit.used - 1);
    }
  }

  state.totalRedirects = Math.max(0, state.totalRedirects - 1);

  notifyListeners();
}

/**
 * Add redirect to domain (optimistic, after create API call)
 */
export function addRedirectToDomain(
  domainId: number,
  redirect: import('@api/types').RedirectRule,
  newRole: import('@api/types').DomainRole = 'donor'
): void {
  const domain = state.domains.find(d => d.domain_id === domainId);
  if (!domain) return;

  domain.redirect = redirect;
  domain.domain_role = newRole;

  // Update zone limit
  if (domain.zone_id) {
    const zoneLimit = state.zoneLimits.find(z => z.zone_id === domain.zone_id);
    if (zoneLimit) {
      zoneLimit.used++;
    }
  }

  state.totalRedirects++;

  notifyListeners();
}

/**
 * Bulk update enabled status (optimistic)
 */
export function bulkUpdateEnabled(domainIds: number[], enabled: boolean): void {
  state.domains.forEach(domain => {
    if (domainIds.includes(domain.domain_id) && domain.redirect) {
      domain.redirect.enabled = enabled;
      domain.redirect.sync_status = 'pending';
    }
  });

  notifyListeners();
}

/**
 * Mark zone as synced (optimistic)
 */
export function markZoneSynced(zoneId: number, syncedRedirectIds: number[]): void {
  state.domains.forEach(domain => {
    if (domain.zone_id === zoneId && domain.redirect) {
      if (syncedRedirectIds.includes(domain.redirect.id)) {
        domain.redirect.sync_status = 'synced';
      }
    }
  });

  notifyListeners();
}

/**
 * Clear state
 */
export function clearState(): void {
  state = {
    currentSiteId: null,
    siteName: '',
    domains: [],
    zoneLimits: [],
    totalDomains: 0,
    totalRedirects: 0,
    loading: false,
    error: null,
    lastLoadedAt: null,
  };
  notifyListeners();
}

// ============================================================================
// Selectors (computed)
// ============================================================================

/**
 * Get domains with redirects only
 */
export function getDomainsWithRedirects(): SiteDomain[] {
  return state.domains.filter(d => d.redirect !== null);
}

/**
 * Get domains without redirects (reserve)
 */
export function getReserveDomains(): SiteDomain[] {
  return state.domains.filter(d => d.redirect === null);
}

/**
 * Get acceptor domain (primary target)
 */
export function getAcceptorDomain(): SiteDomain | undefined {
  return state.domains.find(d => d.domain_role === 'acceptor');
}

/**
 * Get pending sync count
 */
export function getPendingSyncCount(): number {
  return state.domains.filter(d => d.redirect?.sync_status === 'pending').length;
}
```

---

## UI Rendering (обновлённый)

### Работа с SiteDomain вместо Redirect

```typescript
// src/redirects/redirects.ts

import type { SiteDomain } from '@api/types';

/**
 * Render domain row (домен + redirect | null)
 */
function renderDomainRow(domain: SiteDomain): string {
  const { redirect } = domain;
  const isSelected = selectedDomains.has(domain.domain_id);

  // Role badge
  let roleBadge = '';
  if (domain.domain_role === 'acceptor') {
    roleBadge = '<span class="badge badge--neutral">Target</span>';
  } else if (domain.domain_role === 'reserve') {
    roleBadge = '<span class="badge badge--ghost">Reserve</span>';
  }

  // Template badge (only if has redirect)
  const templateBadge = redirect?.template_id
    ? `<span class="badge badge--xs badge--${getTemplateBadgeColor(redirect.template_id)}" title="${getTemplateName(redirect.template_id)}">${redirect.template_id}</span>`
    : '';

  // Target URL
  const targetUrl = redirect ? getTargetUrl(domain, redirect) : null;

  // Activity (only if has redirect)
  const activityHtml = redirect
    ? `<div class="activity-cell">
         <span class="activity-cell__total">${formatNumber(redirect.clicks_total)}</span>
         <span class="activity-cell__today text-muted">+${redirect.clicks_today}</span>
         ${redirect.trend !== 'neutral' ? `<span class="icon activity-cell__trend--${redirect.trend}" data-icon="mono/trending-${redirect.trend}"></span>` : ''}
       </div>`
    : '<span class="text-muted">—</span>';

  // Status (only if has redirect)
  const statusHtml = redirect
    ? `<div class="status-cell">
         <span class="badge badge--sm badge--${redirect.enabled ? 'success' : 'default'}">${redirect.enabled ? 'On' : 'Off'}</span>
         <span class="badge badge--sm badge--${getSyncBadgeColor(redirect.sync_status)}">${redirect.sync_status}</span>
       </div>`
    : '<span class="text-muted">—</span>';

  // Actions
  const actionsHtml = redirect
    ? `<div class="btn-group">
         <button class="btn-icon" type="button" data-action="edit" data-domain-id="${domain.domain_id}">
           <span class="icon" data-icon="mono/pencil-circle"></span>
         </button>
         <div class="dropdown" data-dropdown>
           <button class="btn-icon btn-icon--ghost dropdown__trigger" type="button">
             <span class="icon" data-icon="mono/dots-vertical"></span>
           </button>
           <div class="dropdown__menu dropdown__menu--align-right" role="menu">
             <button class="dropdown__item" data-action="toggle-enabled" data-domain-id="${domain.domain_id}">
               <span class="icon" data-icon="mono/${redirect.enabled ? 'eye-off' : 'eye'}"></span>
               <span>${redirect.enabled ? 'Disable' : 'Enable'}</span>
             </button>
             <hr class="dropdown__divider" />
             <button class="dropdown__item dropdown__item--danger" data-action="delete" data-domain-id="${domain.domain_id}">
               <span class="icon" data-icon="mono/delete"></span>
               <span>Delete</span>
             </button>
           </div>
         </div>
       </div>`
    : `<button class="btn btn--sm btn--ghost" data-action="add-redirect" data-domain-id="${domain.domain_id}">
         <span class="icon" data-icon="mono/plus"></span>
         <span>Add redirect</span>
       </button>`;

  return `
    <tr class="${isSelected ? 'is-selected' : ''}" data-domain-id="${domain.domain_id}" data-role="${domain.domain_role}">
      <td data-priority="critical">
        <div class="domain-cell">
          <span class="domain-cell__name">${domain.domain_name}</span>
          ${templateBadge}
          ${roleBadge}
        </div>
      </td>
      <td data-priority="high">
        ${targetUrl ? `<code class="target-url">${targetUrl}</code>` : '<span class="text-muted">—</span>'}
      </td>
      <td data-priority="high">${activityHtml}</td>
      <td data-priority="low">${statusHtml}</td>
      <td data-priority="critical">${actionsHtml}</td>
      <td>
        ${redirect ? `<input type="checkbox" ${isSelected ? 'checked' : ''} data-checkbox />` : ''}
      </td>
    </tr>
  `;
}

/**
 * Compute target URL based on template
 */
function getTargetUrl(domain: SiteDomain, redirect: import('@api/types').RedirectRule): string | null {
  const { template_id, params } = redirect;

  // T1, T6, T7: explicit target_url
  if (params?.target_url) {
    return params.target_url;
  }

  // T3: non-www → www
  if (template_id === 'T3') {
    return `https://www.${domain.domain_name}`;
  }

  // T4: www → non-www
  if (template_id === 'T4') {
    return `https://${domain.domain_name.replace(/^www\./, '')}`;
  }

  // T5: path redirect
  if (template_id === 'T5' && params?.source_path && params?.target_path) {
    return `${params.source_path} → ${params.target_path}`;
  }

  return null;
}
```

---

## Grouping Strategy

**Группировка в таблице:**

```
Site: Main Landing (3 domains, 2 redirects)
├── cryptoboss.pics        [Target]          —           —           —
├── promo.cryptoboss.pics  [T1] [donor]      → cryptoboss.pics   12.8K   synced
├── old.cryptoboss.pics    [T3]              → www.old...        0       pending
└── reserve.pics           [Reserve]         —           —           [+ Add redirect]
```

**Логика:**
1. Acceptor первым (target header)
2. Donors с редиректами (основной контент)
3. Reserve без редиректов (внизу, с кнопкой "Add redirect")

```typescript
function getSortedDomains(): SiteDomain[] {
  const { domains } = getState();

  return [...domains].sort((a, b) => {
    // Acceptor first
    if (a.domain_role === 'acceptor') return -1;
    if (b.domain_role === 'acceptor') return 1;

    // Donors (with redirects) before reserve
    if (a.redirect && !b.redirect) return -1;
    if (!a.redirect && b.redirect) return 1;

    // Alphabetical within same category
    return a.domain_name.localeCompare(b.domain_name);
  });
}
```

---

## Implementation Phases

### Phase 1: API Layer (4-6h)

**Files:**
- `src/api/redirects.ts` — API client
- `src/api/types.ts` — TypeScript types (обновить)

**Checklist:**
- [ ] `getTemplates()` — TTL 24h
- [ ] `getPresets()` — TTL 24h
- [ ] `getSiteRedirects(siteId, options)` — TTL 30s, abortPrevious
- [ ] `getRedirect(id)` — TTL 30s
- [ ] `createRedirect(domainId, data)`
- [ ] `updateRedirect(id, data)`
- [ ] `deleteRedirect(id)`
- [ ] `applyZoneRedirects(zoneId)`
- [ ] Types: `SiteDomain`, `RedirectRule`, `ZoneLimit`, etc.

### Phase 2: State Management (4-6h)

**Files:**
- `src/redirects/state.ts` — State + optimistic updates

**Checklist:**
- [ ] State interface (domains[], zoneLimits[], etc.)
- [ ] `loadSiteRedirects(siteId, options)`
- [ ] `refreshRedirects()`
- [ ] `updateDomainRedirect()` — optimistic
- [ ] `removeRedirectFromDomain()` — optimistic
- [ ] `addRedirectToDomain()` — optimistic
- [ ] `bulkUpdateEnabled()` — optimistic
- [ ] `markZoneSynced()` — optimistic
- [ ] Selectors: `getDomainsWithRedirects()`, `getAcceptorDomain()`, etc.

### Phase 3: UI Integration (6-8h)

**Files:**
- `src/redirects/redirects.ts` — Table rendering
- `redirects.html` — Page structure (minor updates)

**Checklist:**
- [ ] Remove mock-data import
- [ ] Use `state.domains` as data source
- [ ] `renderDomainRow(domain: SiteDomain)`
- [ ] Client-side filtering (search, sync status, enabled)
- [ ] Site selector dropdown
- [ ] Refresh button
- [ ] Selection management (checkbox)
- [ ] Row actions (edit, toggle, delete)

### Phase 4: Bulk Actions (3-4h)

**Checklist:**
- [ ] Bulk enable/disable — N × PATCH + optimistic
- [ ] Bulk delete — N × DELETE + optimistic
- [ ] Bulk sync to CF — group by zone_id, POST apply

### Phase 5: Drawer (4-6h)

**Files:**
- `src/redirects/drawer.ts` — Edit/Create drawer

**Checklist:**
- [ ] Edit redirect — `updateRedirect()` + optimistic
- [ ] Create redirect — template selector, `createRedirect()` + optimistic
- [ ] Apply preset — preset selector, `applyPreset()` + optimistic
- [ ] Delete confirmation

---

## Testing Checklist

### API Layer
- [ ] `getSiteRedirects()` returns `domains[]` with correct structure
- [ ] Cache works (second call returns cached data)
- [ ] `abortPrevious` cancels previous request on site change
- [ ] Force refresh skips cache

### State Management
- [ ] `loadSiteRedirects()` populates state
- [ ] Optimistic updates work (enable/disable/delete)
- [ ] Rollback on API error

### UI
- [ ] Table renders all domains (acceptor, donor, reserve)
- [ ] Acceptor shows "Target" badge, no checkbox
- [ ] Reserve shows "Add redirect" button
- [ ] Donors show redirect info + actions
- [ ] Search filters client-side (no API call)
- [ ] Site selector triggers `loadSiteRedirects()` with abort

### Bulk Actions
- [ ] Selection works (checkbox, select all)
- [ ] Bulk enable/disable updates all selected
- [ ] Bulk delete removes all selected
- [ ] Sync to CF groups by zone

---

## Key Differences from Previous Plans

| Aspect | Previous Plan | This Plan (FINAL) |
|--------|--------------|-------------------|
| Response structure | `redirects[]` flat | `domains[]` with nested `redirect \| null` |
| Main entity | `Redirect` | `SiteDomain` |
| Domain role | Computed or from `domain_role` | From `domain_role` (confirmed in backend) |
| Domains without redirects | Separate endpoint | Included in same response (`redirect: null`) |
| Total counts | `total` | `total_domains` + `total_redirects` |

---

## Files to Create/Update

### New Files
- `src/api/redirects.ts`
- `src/redirects/state.ts`

### Update Files
- `src/api/types.ts` — Add redirect types
- `src/redirects/redirects.ts` — Replace mock with API
- `src/redirects/drawer.ts` — Use API for CRUD
- `redirects.html` — Minor: site selector, refresh button

### Remove
- `src/redirects/mock-data.ts` (after integration complete)

---

## Next Steps

1. **PR-A: API Layer** — Create `src/api/redirects.ts` with proper caching
2. **PR-B: State** — Create `src/redirects/state.ts` with optimistic updates
3. **PR-C: UI Wiring** — Connect table to state, remove mock-data
4. **PR-D: Bulk Actions** — Implement multi-select operations
5. **PR-E: Drawer** — Create/Edit/Delete flows

**Estimated:** 22-30 hours total

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Is `domain_role` in API? | **Yes** — confirmed in backend code |
| Are ALL domains returned? | **Yes** — LEFT JOIN, `redirect: null` for domains without |
| Response structure? | `domains[]` with nested `redirect \| null` |
| Zone limits included? | **Yes** — `zone_limits[]` in response |
