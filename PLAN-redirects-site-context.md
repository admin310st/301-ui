# Redirects Implementation Plan (Site Context)

## Обзор подхода

**Основная концепция:** Redirects page работает в контексте выбранного Site (dropdown "Site: ..."), Projects фильтр становится вторичным/опциональным.

**Ключевые принципы:**
- ✅ Один базовый запрос: `GET /sites/:siteId/redirects`
- ✅ Все фильтры/поиск/сортировка - строго client-side (не триггерят API)
- ✅ Использование `withInFlight` + `cache.ts` для минимизации API вызовов
- ✅ `abortPrevious` при смене Site
- ✅ Optimistic updates вместо immediate refetch после мутаций
- ✅ Существующая таблица redirects.html остается как источник дизайна

---

## 1. Архитектура кэширования

### 1.1 Cache Keys

| Данные | Cache Key | TTL | Invalidation |
|--------|-----------|-----|--------------|
| Templates | `redirects:templates:v1` | 24h | Manual (версия схемы) |
| Presets | `redirects:presets:v1` | 24h | Manual (версия схемы) |
| Site redirects | `redirects:site:${siteId}:v1` | 30s | После любой мутации для этого site |
| Zone status | `redirects:zone:${zoneId}:status:v1` | 15s | После apply-redirects для этой зоны |

### 1.2 Паттерн GET с кэшированием

```typescript
export async function getSiteRedirects(siteId: number): Promise<GetSiteRedirectsResponse> {
  // 1. Check cache first (fast return)
  const cacheKey = `redirects:site:${siteId}:v1`;
  const cached = getCached<GetSiteRedirectsResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Cache miss - fetch with in-flight guard
  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetSiteRedirectsResponse>(`/sites/${siteId}/redirects`);

    // 3. Store in cache (30s TTL)
    setCache(cacheKey, response, 30000);
    return response;
  });
}
```

### 1.3 Паттерн мутации с optimistic update

```typescript
export async function updateRedirect(id: number, data: UpdateRedirectRequest): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  // Invalidate site cache (без immediate refetch)
  // UI обновится через optimistic update, refetch произойдет через 30s или по explicit Refresh
  invalidateCacheByPrefix('redirects:site:');
}
```

### 1.4 In-Flight Keys

| Operation | Key | Purpose |
|-----------|-----|---------|
| Load templates | `redirects:templates:v1` | Дедупликация параллельных загрузок |
| Load presets | `redirects:presets:v1` | Дедупликация параллельных загрузок |
| Load site redirects | `redirects:site:${siteId}:v1` | Дедупликация параллельных загрузов одного site |
| Load zone status | `redirects:zone:${zoneId}:status:v1` | Дедупликация параллельных загрузок статуса зоны |

### 1.5 Abort Keys

| Operation | Key | Purpose |
|-----------|-----|---------|
| Load site redirects | `redirects:listSite` | Отменять при смене site в dropdown |
| Load zone status | `redirects:zoneStatus:${zoneId}` | Отменять при быстром переключении групп |

---

## 2. API Module Structure

### 2.1 src/api/redirects.ts

```typescript
/**
 * API client for Redirects
 * Base URL: https://api.301.st
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix, invalidateCache } from './cache';
import { withInFlight, abortPrevious } from './ui-client';
import type {
  Template,
  Preset,
  Redirect,
  ZoneLimit,
  GetSiteRedirectsResponse,
  GetRedirectResponse,
  CreateRedirectRequest,
  CreateRedirectResponse,
  UpdateRedirectRequest,
  ApplyPresetRequest,
  ApplyPresetResponse,
  ApplyRedirectsResponse,
  ZoneLimitResponse,
} from './types';

// ============================================================================
// Reference Data (долгоживущие, почти статичные)
// ============================================================================

/**
 * Get available redirect templates (T1-T7)
 * TTL: 24h
 */
export async function getTemplates(): Promise<Template[]> {
  const cacheKey = 'redirects:templates:v1';
  const cached = getCached<Template[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<{ templates: Template[] }>('/redirects/templates');
    setCache(cacheKey, response.templates, 24 * 60 * 60 * 1000); // 24h
    return response.templates;
  });
}

/**
 * Get available redirect presets (P1-P5)
 * TTL: 24h
 */
export async function getPresets(): Promise<Preset[]> {
  const cacheKey = 'redirects:presets:v1';
  const cached = getCached<Preset[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<{ presets: Preset[] }>('/redirects/presets');
    setCache(cacheKey, response.presets, 24 * 60 * 60 * 1000); // 24h
    return response.presets;
  });
}

// ============================================================================
// Site Redirects (основной рабочий список)
// ============================================================================

/**
 * Get all redirects for a site (with zone limits)
 * TTL: 30s
 * Supports abort on site change
 *
 * @param siteId Site ID
 * @param options.force Skip cache (for explicit Refresh button)
 */
export async function getSiteRedirects(
  siteId: number,
  options: { force?: boolean } = {}
): Promise<GetSiteRedirectsResponse> {
  const cacheKey = `redirects:site:${siteId}:v1`;

  // Skip cache if force refresh
  if (!options.force) {
    const cached = getCached<GetSiteRedirectsResponse>(cacheKey);
    if (cached) return cached;
  }

  // Fetch with in-flight guard + abort support
  return withInFlight(cacheKey, async () => {
    // Abort previous request for this operation (last wins)
    const signal = abortPrevious('redirects:listSite');

    const response = await apiFetch<GetSiteRedirectsResponse>(
      `/sites/${siteId}/redirects`,
      { signal }
    );

    // Store in cache (30s TTL)
    setCache(cacheKey, response, 30000);
    return response;
  });
}

/**
 * Get single redirect details
 * TTL: 30s
 */
export async function getRedirect(id: number): Promise<Redirect> {
  const cacheKey = `redirect:${id}:v1`;
  const cached = getCached<Redirect>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetRedirectResponse>(`/redirects/${id}`);
    setCache(cacheKey, response.redirect, 30000);
    return response.redirect;
  });
}

// ============================================================================
// Mutations (с инвалидацией кэша, без immediate refetch)
// ============================================================================

/**
 * Create redirect from template
 * Invalidates: site cache (no immediate refetch, optimistic update in UI)
 */
export async function createRedirect(
  domainId: number,
  data: CreateRedirectRequest
): Promise<CreateRedirectResponse> {
  const response = await apiFetch<CreateRedirectResponse>(
    `/domains/${domainId}/redirects`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  // Invalidate site cache (будет refetch через TTL или explicit Refresh)
  // UI делает optimistic update локально
  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${response.redirect.id}:v1`);

  return response;
}

/**
 * Create redirects from preset
 * Invalidates: site cache
 */
export async function applyPreset(
  domainId: number,
  data: ApplyPresetRequest
): Promise<ApplyPresetResponse> {
  const response = await apiFetch<ApplyPresetResponse>(
    `/domains/${domainId}/redirects/preset`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  // Invalidate site cache
  invalidateCacheByPrefix('redirects:site:');

  return response;
}

/**
 * Update redirect
 * Invalidates: site cache, redirect detail cache
 */
export async function updateRedirect(
  id: number,
  data: UpdateRedirectRequest
): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  // Invalidate caches (UI updates optimistically)
  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${id}:v1`);
}

/**
 * Delete redirect
 * Invalidates: site cache, redirect detail cache
 */
export async function deleteRedirect(id: number): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'DELETE',
  });

  // Invalidate caches (UI removes from local list optimistically)
  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${id}:v1`);
}

/**
 * Apply all redirects for a zone to Cloudflare
 * Invalidates: site cache, zone status cache
 */
export async function applyZoneRedirects(zoneId: number): Promise<ApplyRedirectsResponse> {
  const response = await apiFetch<ApplyRedirectsResponse>(
    `/zones/${zoneId}/apply-redirects`,
    {
      method: 'POST',
    }
  );

  // Invalidate caches
  invalidateCacheByPrefix('redirects:site:'); // Site может содержать несколько зон
  invalidateCache(`redirects:zone:${zoneId}:status:v1`);

  return response;
}

// ============================================================================
// Zone Status (опциональный, lazy-loaded)
// ============================================================================

/**
 * Get zone redirect limits and status
 * TTL: 15s
 * Used for: zone limits widget, lazy-loading zone details
 */
export async function getZoneLimits(zoneId: number): Promise<ZoneLimitResponse> {
  const cacheKey = `redirects:zone:${zoneId}:status:v1`;
  const cached = getCached<ZoneLimitResponse>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    // Abort previous request for this zone (fast switching)
    const signal = abortPrevious(`redirects:zoneStatus:${zoneId}`);

    const response = await apiFetch<ZoneLimitResponse>(
      `/zones/${zoneId}/redirect-limits`,
      { signal }
    );

    // Store in cache (15s TTL - короткий, т.к. статус меняется часто)
    setCache(cacheKey, response, 15000);
    return response;
  });
}
```

### 2.2 src/api/types.ts (новые типы)

```typescript
// ============================================================================
// Redirects Types
// ============================================================================

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

export interface GetSiteRedirectsResponse {
  ok: boolean;
  site_id: number;
  site_name: string;
  redirects: Redirect[];
  zone_limits: ZoneLimit[];
  total: number;
}

export interface GetRedirectResponse {
  ok: boolean;
  redirect: Redirect;
}

export interface CreateRedirectRequest {
  template_id: string;
  rule_name?: string;
  params: Record<string, any>;
  status_code?: 301 | 302;
}

export interface CreateRedirectResponse {
  ok: boolean;
  redirect: Redirect;
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

export interface ZoneLimitResponse {
  ok: boolean;
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
  available: number;
}
```

---

## 3. State Management (src/redirects/state.ts)

**Цель:** Единственный источник правды для redirects page, minimizing API calls через optimistic updates.

```typescript
/**
 * Redirects state management
 * Single source of truth for redirects page
 */

import type { Redirect, ZoneLimit } from '@api/types';
import { getSiteRedirects } from '@api/redirects';

// ============================================================================
// State
// ============================================================================

interface RedirectsState {
  currentSiteId: number | null;
  redirects: Redirect[];
  zoneLimits: ZoneLimit[];
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

let state: RedirectsState = {
  currentSiteId: null,
  redirects: [],
  zoneLimits: [],
  loading: false,
  error: null,
  lastLoadedAt: null,
};

// Listeners for state changes
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
 * Load redirects for a site
 * @param siteId Site ID
 * @param options.force Skip cache (for explicit Refresh button)
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

    state.redirects = response.redirects;
    state.zoneLimits = response.zone_limits;
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
 * Refresh current site redirects (force cache skip)
 */
export async function refreshRedirects(): Promise<void> {
  if (!state.currentSiteId) return;
  await loadSiteRedirects(state.currentSiteId, { force: true });
}

/**
 * Optimistic update: add new redirect to local list
 * Called after successful createRedirect() API call
 */
export function addRedirect(redirect: Redirect): void {
  state.redirects.push(redirect);

  // Update zone limit (increment used)
  const zoneLimit = state.zoneLimits.find(z => z.zone_id === redirect.zone_id);
  if (zoneLimit) {
    zoneLimit.used++;
    if (zoneLimit.available !== undefined) {
      zoneLimit.available--;
    }
  }

  notifyListeners();
}

/**
 * Optimistic update: update redirect in local list
 * Called after successful updateRedirect() API call
 */
export function updateRedirectLocal(id: number, updates: Partial<Redirect>): void {
  const redirect = state.redirects.find(r => r.id === id);
  if (!redirect) return;

  // Apply updates
  Object.assign(redirect, updates);

  // If enabled/params changed, set sync_status to pending
  if ('enabled' in updates || 'params' in updates) {
    redirect.sync_status = 'pending';
  }

  notifyListeners();
}

/**
 * Optimistic update: remove redirect from local list
 * Called after successful deleteRedirect() API call
 */
export function removeRedirect(id: number): void {
  const redirect = state.redirects.find(r => r.id === id);
  if (!redirect) return;

  // Remove from list
  state.redirects = state.redirects.filter(r => r.id !== id);

  // Update zone limit (decrement used)
  const zoneLimit = state.zoneLimits.find(z => z.zone_id === redirect.zone_id);
  if (zoneLimit) {
    zoneLimit.used--;
    if (zoneLimit.available !== undefined) {
      zoneLimit.available++;
    }
  }

  notifyListeners();
}

/**
 * Optimistic update: mark redirects as synced after apply
 * Called after successful applyZoneRedirects() API call
 */
export function markZoneSynced(zoneId: number, syncedIds: number[]): void {
  state.redirects.forEach(redirect => {
    if (redirect.zone_id === zoneId && syncedIds.includes(redirect.id)) {
      redirect.sync_status = 'synced';
      redirect.last_synced_at = new Date().toISOString();
    }
  });

  notifyListeners();
}

/**
 * Bulk update: enable/disable multiple redirects
 */
export function bulkUpdateEnabled(ids: number[], enabled: boolean): void {
  state.redirects.forEach(redirect => {
    if (ids.includes(redirect.id)) {
      redirect.enabled = enabled;
      redirect.sync_status = 'pending';
    }
  });

  notifyListeners();
}

/**
 * Clear state (on site change or logout)
 */
export function clearState(): void {
  state = {
    currentSiteId: null,
    redirects: [],
    zoneLimits: [],
    loading: false,
    error: null,
    lastLoadedAt: null,
  };
  notifyListeners();
}
```

---

## 4. UI Layer Structure

### 4.1 Page Initialization (redirects.html)

**Изменения минимальные:**
- Добавить Site selector в header (dropdown)
- **НЕ добавлять** отдельную колонку Template (не ломаем визуальный баланс)
- Template badge добавляется внутри Domain cell как вторичная информация
- Убрать колонки: role, cf_implementation (если есть в моках)

**Колонки таблицы (как сейчас):**
1. ☑️ Checkbox (для mass-select)
2. Domain (+ Template badge + Preset badge внутри cell)
3. Target
4. Activity
5. Status
6. Actions

```html
<!-- Header with Site selector -->
<header class="page-header">
  <div class="page-header__title">
    <h1>Redirects</h1>

    <!-- Site selector (main context switcher) -->
    <div class="dropdown" data-dropdown="site-selector">
      <button class="btn-chip btn-chip--dropdown dropdown__trigger" type="button">
        <span class="btn-chip__icon" data-icon="mono/package"></span>
        <span class="btn-chip__label" data-site-name>Select site</span>
        <span class="btn-chip__chevron" data-icon="mono/chevron-down"></span>
      </button>
      <div class="dropdown__menu" role="menu">
        <!-- Populated from projects/sites API -->
        <div data-site-options></div>
      </div>
    </div>
  </div>

  <div class="page-header__actions">
    <!-- Sync indicator -->
    <div class="sync-indicator" data-sync-indicator>
      <span class="sync-indicator__icon" data-icon="mono/cloud-check"></span>
      <span class="sync-indicator__text">All synced</span>
    </div>

    <!-- Refresh button -->
    <button class="btn-icon" type="button" data-action="refresh" title="Refresh">
      <span class="icon" data-icon="mono/refresh"></span>
    </button>

    <!-- Create redirect button -->
    <button class="btn btn--primary" type="button" data-action="create-redirect">
      <span class="icon" data-icon="mono/plus"></span>
      <span>Create redirect</span>
    </button>
  </div>
</header>

<!-- Controls row: search + filters -->
<div class="controls-row">
  <div class="search-bar">
    <input type="search" placeholder="Search by domain or target..." data-search />
  </div>

  <!-- Filters (client-side, no API calls) -->
  <div class="filters" data-filters>
    <!-- Project filter (опциональный, если redirects содержат project_id) -->
    <!-- Configured filter -->
    <!-- Sync filter -->
    <!-- Enabled filter -->
  </div>
</div>

<!-- Table (колонки как сейчас, БЕЗ отдельной Template column) -->
<table class="table" data-redirects-table>
  <thead>
    <tr>
      <th><input type="checkbox" data-select-all /></th>
      <th data-priority="critical">Domain</th>
      <th data-priority="high">Target</th>
      <th data-priority="high">Activity</th>
      <th data-priority="low">Status</th>
      <th data-priority="critical">Actions</th>
    </tr>
  </thead>
  <tbody data-redirects-tbody>
    <!-- Rows rendered dynamically -->
  </tbody>
</table>

<!-- Bulk actions bar (sticky, показывается при выборе) -->
<div class="bulk-actions" data-bulk-actions hidden>
  <div class="bulk-actions__info">
    <span data-selection-count>0</span> selected
  </div>
  <div class="bulk-actions__buttons">
    <button class="btn btn--sm" data-action="bulk-enable">Enable</button>
    <button class="btn btn--sm" data-action="bulk-disable">Disable</button>
    <button class="btn btn--sm btn--danger" data-action="bulk-delete">Delete</button>
    <button class="btn btn--sm" data-action="bulk-sync">Sync to CF</button>
  </div>
</div>
```

### 4.2 src/redirects/redirects.ts (updated)

**Основные изменения:**
- Убрать импорт mock-data
- Использовать state.ts как источник данных
- Все фильтры/поиск - локально (computed derivation)
- При смене site: `loadSiteRedirects(newSiteId)` с abortPrevious

```typescript
/**
 * Redirects page UI controller
 * Works in Site context, all filters are client-side
 */

import {
  loadSiteRedirects,
  refreshRedirects,
  onStateChange,
  getState,
  updateRedirectLocal,
  removeRedirect,
  bulkUpdateEnabled,
} from './state';
import { updateRedirect, deleteRedirect, applyZoneRedirects } from '@api/redirects';
import type { Redirect } from '@api/types';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';

// ============================================================================
// State: Current Filters and Selection
// ============================================================================

interface FilterState {
  search: string;
  project: string[];
  configured: string[];
  sync: string[];
  enabled: string[];
}

let currentFilters: FilterState = {
  search: '',
  project: [],
  configured: [],
  sync: [],
  enabled: [],
};

let selectedRedirects = new Set<number>();
let collapsedGroups = new Set<number>();

// ============================================================================
// Computed: Filtered Redirects (client-side only)
// ============================================================================

function getFilteredRedirects(): Redirect[] {
  const { redirects } = getState();

  return redirects.filter(redirect => {
    // Search filter (domain or target)
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      const matchesDomain = redirect.domain_name.toLowerCase().includes(search);
      const targetUrl = getTargetUrl(redirect);
      const matchesTarget = targetUrl && targetUrl.toLowerCase().includes(search);
      if (!matchesDomain && !matchesTarget) return false;
    }

    // Configured filter
    if (currentFilters.configured.length > 0) {
      const hasRedirect = redirect.template_id !== null;
      if (currentFilters.configured.includes('has-redirect') && !hasRedirect) return false;
      if (currentFilters.configured.includes('no-redirect') && hasRedirect) return false;
    }

    // Sync filter
    if (currentFilters.sync.length > 0) {
      if (!currentFilters.sync.includes(redirect.sync_status)) return false;
    }

    // Enabled filter
    if (currentFilters.enabled.length > 0) {
      const enabledStr = redirect.enabled ? 'enabled' : 'disabled';
      if (!currentFilters.enabled.includes(enabledStr)) return false;
    }

    // Project filter (опциональный, если есть project_id в данных)
    // TODO: Implement if needed

    return true;
  });
}

// ============================================================================
// Helpers
// ============================================================================

function getTargetUrl(redirect: Redirect): string | null {
  // T1, T6, T7 имеют params.target_url
  if (redirect.params?.target_url) {
    return redirect.params.target_url;
  }

  // T3: non-www → www (computed)
  if (redirect.template_id === 'T3') {
    return `https://www.${redirect.domain_name}`;
  }

  // T4: www → non-www (computed)
  if (redirect.template_id === 'T4') {
    const domain = redirect.domain_name.replace(/^www\./, '');
    return `https://${domain}`;
  }

  // T5: path prefix redirect (показываем source → target paths)
  if (redirect.template_id === 'T5' && redirect.params?.source_path && redirect.params?.target_path) {
    return `${redirect.params.source_path} → ${redirect.params.target_path}`;
  }

  return null;
}

// ============================================================================
// Render Functions
// ============================================================================

function renderTable(): void {
  const tbody = document.querySelector<HTMLElement>('[data-redirects-tbody]');
  if (!tbody) return;

  const filtered = getFilteredRedirects();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          ${currentFilters.search || hasActiveFilters()
            ? 'No redirects match your filters'
            : 'No redirects yet. Create your first redirect.'}
        </td>
      </tr>
    `;
    return;
  }

  // Render rows
  tbody.innerHTML = filtered.map(redirect => renderRedirectRow(redirect)).join('');
}

function renderRedirectRow(redirect: Redirect): string {
  const isSelected = selectedRedirects.has(redirect.id);
  const targetUrl = getTargetUrl(redirect);
  const templateName = getTemplateName(redirect.template_id); // TODO: load from getTemplates()

  // Template badge (as secondary info in Domain cell)
  const templateBadge = redirect.template_id
    ? `<span class="badge badge--xs badge--${getTemplateBadgeColor(redirect.template_id)}" title="${templateName}">${redirect.template_id}</span>`
    : '';

  // Preset badge (if redirect was created from preset)
  const presetBadge = redirect.preset_id
    ? `<span class="badge badge--xs badge--ghost" title="Created from preset ${redirect.preset_id}">${redirect.preset_id}</span>`
    : '';

  return `
    <tr class="${isSelected ? 'is-selected' : ''}" data-redirect-id="${redirect.id}">
      <td>
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-checkbox />
      </td>
      <td data-priority="critical">
        <div class="domain-cell">
          <span class="domain-cell__name">${redirect.domain_name}</span>
          ${templateBadge}
          ${presetBadge}
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
              <button class="dropdown__item" type="button" data-action="toggle-enabled" data-redirect-id="${redirect.id}">
                <span class="icon" data-icon="mono/${redirect.enabled ? 'eye-off' : 'eye'}"></span>
                <span>${redirect.enabled ? 'Disable' : 'Enable'}</span>
              </button>
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

/**
 * Get template badge color based on category
 */
function getTemplateBadgeColor(templateId: string): string {
  // T3/T4 (canonical) = success (green)
  if (templateId === 'T3' || templateId === 'T4') return 'success';
  // T7 (maintenance) = danger (red)
  if (templateId === 'T7') return 'danger';
  // T1/T5/T6 (domain/path redirects) = neutral (gray)
  return 'neutral';
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Site selector change (main context switch)
 * Aborts previous request automatically via abortPrevious in API module
 */
function handleSiteChange(siteId: number): void {
  // Clear selection and filters
  selectedRedirects.clear();
  currentFilters = {
    search: '',
    project: [],
    configured: [],
    sync: [],
    enabled: [],
  };

  // Load redirects for new site (with abortPrevious)
  loadSiteRedirects(siteId);
}

/**
 * Refresh button (force cache skip)
 */
function handleRefresh(): void {
  refreshRedirects();
}

/**
 * Search input (client-side, no API call)
 */
let searchDebounceTimer: number;
function handleSearch(value: string): void {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    currentFilters.search = value.trim();
    renderTable();
  }, 300);
}

/**
 * Filter change (client-side, no API call)
 */
function handleFilterChange(filterId: string, value: string, checked: boolean): void {
  const filter = currentFilters[filterId as keyof FilterState] as string[];

  if (checked) {
    if (!filter.includes(value)) filter.push(value);
  } else {
    const idx = filter.indexOf(value);
    if (idx >= 0) filter.splice(idx, 1);
  }

  renderTable();
}

/**
 * Toggle enabled (optimistic update + API call)
 */
async function handleToggleEnabled(id: number): Promise<void> {
  const redirect = getState().redirects.find(r => r.id === id);
  if (!redirect) return;

  const newEnabled = !redirect.enabled;

  // Optimistic update
  updateRedirectLocal(id, { enabled: newEnabled });

  try {
    // API call (invalidates cache, no refetch)
    await updateRedirect(id, { enabled: newEnabled });
  } catch (error: any) {
    // Rollback on error
    updateRedirectLocal(id, { enabled: !newEnabled });
    showGlobalMessage('error', error.message || 'Failed to update redirect');
  }
}

/**
 * Delete redirect (optimistic update + API call)
 */
async function handleDelete(id: number): Promise<void> {
  const confirmed = confirm('Delete this redirect? This will remove it from Cloudflare on next sync.');
  if (!confirmed) return;

  // Optimistic update
  removeRedirect(id);

  try {
    // API call (invalidates cache, no refetch)
    await deleteRedirect(id);
    showGlobalMessage('success', 'Redirect deleted');
  } catch (error: any) {
    // TODO: Rollback on error (need to re-add to list)
    showGlobalMessage('error', error.message || 'Failed to delete redirect');
    refreshRedirects(); // Force reload on error
  }
}

/**
 * Bulk actions: enable/disable (optimistic update + N API calls)
 */
async function handleBulkUpdateEnabled(enabled: boolean): Promise<void> {
  const ids = Array.from(selectedRedirects);
  if (ids.length === 0) return;

  // Optimistic update
  bulkUpdateEnabled(ids, enabled);

  // API calls in parallel (each invalidates cache)
  const results = await Promise.allSettled(
    ids.map(id => updateRedirect(id, { enabled }))
  );

  // Check for errors
  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length > 0) {
    showGlobalMessage('warning', `${errors.length} redirects failed to update`);
    refreshRedirects(); // Force reload on partial failure
  } else {
    showGlobalMessage('success', `${ids.length} redirects ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Clear selection
  selectedRedirects.clear();
  renderTable();
  updateBulkActionsBar();
}

/**
 * Bulk delete (optimistic update + N API calls)
 */
async function handleBulkDelete(): Promise<void> {
  const ids = Array.from(selectedRedirects);
  if (ids.length === 0) return;

  const confirmed = confirm(`Delete ${ids.length} redirects?`);
  if (!confirmed) return;

  // Optimistic update
  ids.forEach(id => removeRedirect(id));

  // API calls in parallel
  const results = await Promise.allSettled(
    ids.map(id => deleteRedirect(id))
  );

  // Check for errors
  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length > 0) {
    showGlobalMessage('warning', `${errors.length} redirects failed to delete`);
    refreshRedirects(); // Force reload on partial failure
  } else {
    showGlobalMessage('success', `${ids.length} redirects deleted`);
  }

  // Clear selection
  selectedRedirects.clear();
  renderTable();
  updateBulkActionsBar();
}

/**
 * Sync to CF (for selected zone)
 */
async function handleSyncToCloudflare(): Promise<void> {
  // TODO: Determine zone_id from selected redirects
  // For now, assume single zone per site (может быть несколько зон на site)

  const { zoneLimits } = getState();
  if (zoneLimits.length === 0) return;

  // TODO: Show zone picker if multiple zones
  const zoneId = zoneLimits[0].zone_id;

  try {
    const response = await applyZoneRedirects(zoneId);

    // Update local sync statuses (optimistic)
    // markZoneSynced(zoneId, response.synced_rules.map(r => r.id));

    showGlobalMessage('success', `${response.rules_applied} redirects synced to Cloudflare`);

    // Force refresh to get latest sync statuses from backend
    refreshRedirects();
  } catch (error: any) {
    showGlobalMessage('error', error.message || 'Failed to sync redirects');
  }
}

// ============================================================================
// Selection Management
// ============================================================================

function handleCheckboxChange(redirectId: number, checked: boolean): void {
  if (checked) {
    selectedRedirects.add(redirectId);
  } else {
    selectedRedirects.delete(redirectId);
  }

  renderTable();
  updateBulkActionsBar();
}

function handleSelectAll(checked: boolean): void {
  const filtered = getFilteredRedirects();

  if (checked) {
    filtered.forEach(r => selectedRedirects.add(r.id));
  } else {
    selectedRedirects.clear();
  }

  renderTable();
  updateBulkActionsBar();
}

function updateBulkActionsBar(): void {
  const bar = document.querySelector<HTMLElement>('[data-bulk-actions]');
  const countEl = document.querySelector<HTMLElement>('[data-selection-count]');

  if (!bar || !countEl) return;

  if (selectedRedirects.size > 0) {
    bar.hidden = false;
    countEl.textContent = String(selectedRedirects.size);
  } else {
    bar.hidden = true;
  }
}

// ============================================================================
// Initialization
// ============================================================================

export function initRedirectsPage(): void {
  // Subscribe to state changes
  onStateChange((state) => {
    renderTable();
    updateSyncIndicator();
  });

  // Initialize site selector
  initSiteSelector();

  // Event delegation for table actions
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Checkbox
    const checkbox = target.closest<HTMLInputElement>('[data-checkbox]');
    if (checkbox) {
      const row = checkbox.closest<HTMLElement>('[data-redirect-id]');
      if (row) {
        const id = parseInt(row.getAttribute('data-redirect-id')!, 10);
        handleCheckboxChange(id, checkbox.checked);
      }
      return;
    }

    // Select all
    const selectAll = target.closest<HTMLInputElement>('[data-select-all]');
    if (selectAll) {
      handleSelectAll(selectAll.checked);
      return;
    }

    // Action buttons
    const action = target.closest<HTMLElement>('[data-action]');
    if (action) {
      const actionType = action.getAttribute('data-action');
      const redirectId = action.getAttribute('data-redirect-id');

      switch (actionType) {
        case 'refresh':
          handleRefresh();
          break;
        case 'toggle-enabled':
          if (redirectId) handleToggleEnabled(parseInt(redirectId, 10));
          break;
        case 'delete':
          if (redirectId) handleDelete(parseInt(redirectId, 10));
          break;
        case 'bulk-enable':
          handleBulkUpdateEnabled(true);
          break;
        case 'bulk-disable':
          handleBulkUpdateEnabled(false);
          break;
        case 'bulk-delete':
          handleBulkDelete();
          break;
        case 'bulk-sync':
          handleSyncToCloudflare();
          break;
      }
    }
  });

  // Search input
  const searchInput = document.querySelector<HTMLInputElement>('[data-search]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearch((e.target as HTMLInputElement).value);
    });
  }

  // TODO: Initialize filters (chip dropdowns)
}

function initSiteSelector(): void {
  // TODO: Populate site dropdown from projects/sites API
  // On selection: handleSiteChange(siteId)
}

function updateSyncIndicator(): void {
  // TODO: Calculate sync stats from state.redirects
  // Update indicator UI (synced/pending/error counts)
}

// Helper functions
function getTemplateName(templateId: string): string {
  // TODO: Load from getTemplates() and cache
  const names: Record<string, string> = {
    T1: 'Domain → Domain',
    T3: 'non-www → www',
    T4: 'www → non-www',
    T5: 'Path prefix',
    T6: 'Exact path',
    T7: 'Maintenance',
  };
  return names[templateId] || templateId;
}

function getTemplateBadgeColor(templateId: string): string {
  if (templateId === 'T3' || templateId === 'T4') return 'success'; // Canonical
  if (templateId === 'T7') return 'danger'; // Maintenance
  return 'default';
}

function getSyncBadgeColor(status: string): string {
  if (status === 'synced') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'error') return 'danger';
  return 'default'; // never
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function hasActiveFilters(): boolean {
  return (
    currentFilters.search !== '' ||
    currentFilters.project.length > 0 ||
    currentFilters.configured.length > 0 ||
    currentFilters.sync.length > 0 ||
    currentFilters.enabled.length > 0
  );
}
```

---

## 5. Implementation Checklist

### Phase 1: API Layer + State (MVP для интеграции)

- [ ] Создать `src/api/redirects.ts` с правильным использованием withInFlight + cache
  - [ ] `getTemplates()` - TTL 24h
  - [ ] `getPresets()` - TTL 24h
  - [ ] `getSiteRedirects(siteId, options)` - TTL 30s, с abortPrevious
  - [ ] `getRedirect(id)` - TTL 30s
  - [ ] `createRedirect(domainId, data)`
  - [ ] `applyPreset(domainId, data)`
  - [ ] `updateRedirect(id, data)`
  - [ ] `deleteRedirect(id)`
  - [ ] `applyZoneRedirects(zoneId)`
  - [ ] `getZoneLimits(zoneId)` - TTL 15s, с abortPrevious

- [ ] Обновить `src/api/types.ts`
  - [ ] Template, Preset, Redirect, ZoneLimit interfaces
  - [ ] Request/Response types

- [ ] Создать `src/redirects/state.ts`
  - [ ] State definition (currentSiteId, redirects[], zoneLimits[], loading, error)
  - [ ] onStateChange() listener pattern
  - [ ] loadSiteRedirects(siteId, options)
  - [ ] refreshRedirects()
  - [ ] Optimistic update functions (addRedirect, updateRedirectLocal, removeRedirect, etc.)

### Phase 2: UI Integration

- [ ] Обновить `redirects.html`
  - [ ] Добавить Site selector в header
  - [ ] Сохранить колонки как есть: Checkbox, Domain, Target, Activity, Status, Actions
  - [ ] **НЕ добавлять** отдельную колонку Template (не ломаем баланс)
  - [ ] Refresh button
  - [ ] Create redirect button

- [ ] Обновить `src/redirects/redirects.ts`
  - [ ] Убрать импорт mock-data
  - [ ] Использовать state.ts как источник
  - [ ] renderRedirectRow(): добавить Template badge (badge--xs) внутри Domain cell
  - [ ] renderRedirectRow(): добавить Preset badge (badge--xs badge--ghost) внутри Domain cell
  - [ ] getTemplateBadgeColor(): цвета для T1-T7 (canonical=success, maintenance=danger, остальные=neutral)
  - [ ] getFilteredRedirects() - client-side filtering
  - [ ] handleSiteChange() с loadSiteRedirects()
  - [ ] handleRefresh() с refreshRedirects()
  - [ ] handleToggleEnabled() с optimistic update
  - [ ] handleDelete() с optimistic update
  - [ ] handleBulkUpdateEnabled() с optimistic update
  - [ ] handleBulkDelete() с optimistic update
  - [ ] handleSyncToCloudflare()

- [ ] Обновить `src/redirects/drawer.ts`
  - [ ] В openDrawer(): использовать getRedirect(id) вместо mock data
  - [ ] В handleSave(): использовать updateRedirect(id, data) с optimistic update

- [ ] Обновить `src/redirects/sync-status.ts`
  - [ ] calculateSyncStats() из state.redirects
  - [ ] updateSyncIndicator() с zone limits

### Phase 3: Wizards (Templates & Presets)

- [ ] Create Redirect Wizard
  - [ ] Drawer с выбором template (T1-T7)
  - [ ] Динамические поля params в зависимости от template
  - [ ] Submit → createRedirect() с optimistic update

- [ ] Apply Preset Wizard
  - [ ] Drawer с списком presets (P1-P5)
  - [ ] Динамические поля params
  - [ ] Submit → applyPreset() с optimistic update

### Phase 4: Zone Limits Widget

- [ ] Создать widget в header
- [ ] Dropdown с progress bars для zone_limits[]
- [ ] Warning badge при used >= 80% max
- [ ] Pre-validation перед созданием редиректа

### Phase 5: Testing

- [ ] Загрузка redirects при выборе site (с abortPrevious)
- [ ] Смена site (abort предыдущего запроса)
- [ ] Refresh button (force cache skip)
- [ ] Search (client-side, no API)
- [ ] Filters (client-side, no API)
- [ ] Toggle enabled (optimistic update + API)
- [ ] Delete (optimistic update + API)
- [ ] Bulk enable/disable (optimistic + N API calls)
- [ ] Bulk delete (optimistic + N API calls)
- [ ] Sync to CF (apply-redirects)
- [ ] Cache TTL expiration (redirects auto-refresh через 30s)
- [ ] Template/Preset wizards

---

## 6. Key Differences from Mock Implementation

| Aspect | Mock Implementation | New Implementation |
|--------|--------------------|--------------------|
| Data source | `mock-data.ts` | `GET /sites/:siteId/redirects` через cache |
| Context | Global (all redirects) | Site-specific (Site dropdown) |
| Filtering | Client-side | Client-side (no change) |
| Search | Client-side | Client-side (no change) |
| Table columns | Domain, Role, Target, Activity, Status, Actions | Domain (+ Template/Preset badges), Target, Activity, Status, Actions |
| Domain cell | Domain name + role badge | Domain name + **Template badge** + **Preset badge** (secondary info) |
| Template display | Not used | Badge внутри Domain cell (badge--xs, T1-T7) |
| Preset display | Not used | Badge внутри Domain cell (badge--xs badge--ghost, P1-P5) |
| Mutations | Local array updates | API + optimistic updates + cache invalidation |
| Sync | Mock status update | `POST /zones/:id/apply-redirects` + optimistic update |
| Refresh | Re-render from local array | Force cache skip + API refetch |
| Templates | Not used | T1-T7 from `GET /redirects/templates` (cached 24h) |
| Presets | Not used | P1-P5 from `GET /redirects/presets` (cached 24h) |
| Zone limits | Not tracked | From `zone_limits[]` in API response |

---

## 7. Временная оценка

- **Phase 1** (API + State): ~6-8 часов
- **Phase 2** (UI Integration): ~8-10 часов
- **Phase 3** (Wizards): ~6-8 часов
- **Phase 4** (Zone Limits): ~3-4 часа
- **Phase 5** (Testing): ~4-6 часов

**Итого:** ~27-36 часов разработки.

---

## 8. Приоритеты

1. **High Priority:** Phase 1 + 2 (MVP с реальным API, optimistic updates)
2. **Medium Priority:** Phase 3 (Wizards для создания редиректов)
3. **Low Priority:** Phase 4 (Zone Limits widget)

**Рекомендация:** Начать с Phase 1 (API module + State management), затем Phase 2 (UI integration с Site context). Это даст working prototype с минимальными API вызовами.
