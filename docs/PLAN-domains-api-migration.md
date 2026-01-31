# Plan: Domains Page - Migration from Mock to Real API

## Executive Summary

Переход страницы `/domains.html` с mock-данных на реальный API `GET /domains`.

**Текущее состояние:** UI работает на mock-data.ts (40 доменов)
**Целевое состояние:** UI работает на реальном API с сохранением всего дизайна

---

## API vs Mock: Сравнительная таблица

### Поля, которые есть в API

| Поле | API | Mock | Комментарий |
|------|-----|------|-------------|
| `id` | ✅ | ✅ | — |
| `domain_name` | ✅ | ✅ | — |
| `project_id` | ✅ | ✅ | nullable в API |
| `project_name` | ✅ | ✅ | nullable в API |
| `role` | ✅ | ✅ | `acceptor`, `donor`, `reserve` |
| `site_id` | ✅ | ❌ | Добавить в UI |
| `site_name` | ✅ | ❌ | Добавить в UI |
| `site_status` | ✅ | ❌ | `active`, `paused`, `archived` |
| `zone_id` | ✅ | ❌ | — |
| `key_id` | ✅ | ❌ | ID интеграции CF |
| `ns` | ✅ | ❌ | Nameservers (comma-separated) |
| `ns_verified` | ✅ | ❌ | 0/1 |
| `proxied` | ✅ | ❌ | 0/1 |
| `blocked` | ✅ | ❌ | 0/1 |
| `blocked_reason` | ✅ | ❌ | `phishing`, `ad_network`, etc. |
| `ssl_status` | ✅ | ✅ | API: `valid`, `pending`, etc. |
| `expired_at` | ✅ | ✅ | ISO timestamp |
| `health.status` | ✅ | ❌ | `healthy`, `warning`, `blocked`, `unknown` |
| `health.threat_score` | ✅ | ❌ | number/null |
| `health.categories` | ✅ | ❌ | `["spam", "phishing"]` |
| `health.checked_at` | ✅ | ❌ | ISO timestamp |

### Поля, которых НЕТ в API (UI-only)

| Поле | Mock | UI Usage | Решение |
|------|------|----------|---------|
| `status` | ✅ | Status badge | **Вычислять** из `blocked`, `expired_at`, `ns_verified` |
| `registrar` | ✅ | Provider icon | **Нет в API** - использовать `key_id` → lookup |
| `abuse_status` | ✅ | Health icon | **Заменить** на `health.status` |
| `monitoring_enabled` | ✅ | Toggle | **Убрать** - нет в API |
| `last_check_at` | ✅ | Last check text | **Заменить** на `health.checked_at` |
| `has_errors` | ✅ | Row styling | **Вычислять** из `blocked`, `health.status` |
| `project_lang` | ✅ | Lang badge | **Убрать** - нет в API |
| `ssl_valid_to` | ✅ | SSL expiry | **Убрать** - только `ssl_status` в API |

---

## План миграции по PR

### PR 1: Type Fixes & Adapter Layer (safe, no UI changes)

**Цель:** Подготовить типы и адаптер без изменения UI

**Файлы:**
- `src/api/types.ts` - исправить `health.status` enum
- `src/domains/adapter.ts` - NEW: конвертер APIDomain → Domain

**Изменения в types.ts:**
```typescript
// BEFORE
health?: {
  status: 'unknown' | 'clean' | 'suspicious' | 'malicious' | null;
  // ...
}

// AFTER (match API spec)
health?: {
  status: 'healthy' | 'warning' | 'blocked' | 'unknown' | null;
  threat_score: number | null;
  categories: string[] | null;
  checked_at: string | null;
}
```

**Новый adapter.ts:**
```typescript
import type { APIDomain } from '@api/types';
import type { Domain } from './mock-data';

export function adaptAPIDomainToUI(api: APIDomain): Domain {
  return {
    id: api.id,
    domain_name: api.domain_name,
    project_id: api.project_id ?? 0,
    project_name: api.project_name ?? 'Unassigned',
    status: calculateStatus(api),
    role: api.role,
    registrar: 'cloudflare', // TODO: lookup from key_id
    cf_zone_id: api.cf_zone_id,
    ssl_status: mapSSLStatus(api.ssl_status),
    abuse_status: mapHealthToAbuse(api.health),
    expires_at: api.expired_at ?? 'N/A',
    monitoring_enabled: false, // Not in API
    has_errors: api.blocked === 1 || api.health?.status === 'blocked',
  };
}

function calculateStatus(api: APIDomain): Domain['status'] {
  if (api.blocked) return 'blocked';
  if (api.expired_at && new Date(api.expired_at) < new Date()) return 'expired';
  if (api.expired_at && isExpiringSoon(api.expired_at, 30)) return 'expiring';
  if (!api.ns_verified) return 'pending';
  return 'active';
}

function mapHealthToAbuse(health?: APIDomain['health']): Domain['abuse_status'] {
  if (!health) return 'clean';
  if (health.status === 'blocked') return 'blocked';
  if (health.status === 'warning') return 'warning';
  return 'clean';
}
```

**Тесты:** Unit tests для adapter functions

---

### PR 2: API Client Completion

**Цель:** Добавить недостающие функции в API клиент

**Файл:** `src/api/domains.ts`

**Добавить:**
```typescript
// Get single domain details
export async function getDomainDetail(domainId: number): Promise<APIDomain> {
  const response = await apiFetch<{ ok: boolean; domain: APIDomain }>(
    `/domains/${domainId}`,
    { method: 'GET' }
  );
  return response.domain;
}

// Get domain health (for drawer Security tab)
export async function getDomainHealth(domainId: number): Promise<DomainHealth> {
  const response = await apiFetch<{ ok: boolean; health: DomainHealth }>(
    `/domains/${domainId}/health`,
    { method: 'GET' }
  );
  return response.health;
}

// Update domain (generic)
export async function updateDomain(
  domainId: number,
  data: { blocked?: boolean; blocked_reason?: string }
): Promise<void> {
  await apiFetch(`/domains/${domainId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  invalidateCache('domains');
  invalidateCache(`domain:${domainId}`);
}

// Delete domain (subdomain only)
export async function deleteDomain(domainId: number): Promise<{ dns_deleted: boolean }> {
  const response = await apiFetch<{ ok: boolean; dns_deleted: boolean }>(
    `/domains/${domainId}`,
    { method: 'DELETE' }
  );
  invalidateCache('domains');
  return response;
}
```

---

### PR 3: Remove UI-Only Features & Align Health

**Цель:** Убрать фичи без API, внедрить Health

**Файлы:**
- `src/domains/domains.ts`
- `src/domains/mock-data.ts` (keep for reference, mark deprecated)

**Убрать из UI:**
1. `monitoring_enabled` toggle — нет в API
2. `project_lang` badge — нет в API
3. `ssl_valid_to` детали — только `ssl_status` в API
4. Fake dropdown actions (recheck-abuse, sync-registrar, toggle-monitoring, apply-security-preset, view-analytics)

**Заменить на Health (как в projects.ts):**

Использовать реализацию из `src/ui/projects.ts:247-266`:
```typescript
// Health icons (compact colored icons)
// SSL: valid = green, pending = gray, error = red
const sslIcon = domain.ssl_status === 'valid'
  ? '<span class="icon text-ok" data-icon="mono/lock" title="SSL valid"></span>'
  : '<span class="icon text-muted" data-icon="mono/lock" title="SSL pending"></span>';

// NS: verified = green, not verified = gray
const nsIcon = domain.ns_verified
  ? '<span class="icon text-ok" data-icon="mono/dns" title="NS configured"></span>'
  : '<span class="icon text-muted" data-icon="mono/dns" title="NS not configured"></span>';

// Health status from API
const healthStatus = domain.health?.status;
const healthIcon = healthStatus === 'healthy'
  ? '<span class="icon text-ok" data-icon="mono/security" title="Healthy"></span>'
  : healthStatus === 'warning'
  ? '<span class="icon text-warning" data-icon="mono/security" title="Warning"></span>'
  : healthStatus === 'blocked'
  ? '<span class="icon text-danger" data-icon="mono/security" title="Blocked"></span>'
  : '<span class="icon text-muted" data-icon="mono/security" title="Unknown"></span>';
```

**Health column вместо abuse_status:**
```html
<td class="health-icons">
  ${sslIcon}
  ${nsIcon}
  ${healthIcon}
</td>
```

---

### PR 4: Data Loading Migration (main cutover)

**Цель:** Переключить загрузку данных с mock на API

**Файлы:**
- `src/domains/domains.ts`

**Изменения в initDomainsPage():**
```typescript
// BEFORE
setTimeout(() => {
  loadDomains(mockDomains);
}, 500);

// AFTER
async function loadDomainsFromAPI() {
  try {
    const response = await safeCall(
      () => getDomains(),
      { lockKey: 'domains', retryOn401: true }
    );

    // Flatten groups → flat array
    const allDomains = response.groups.flatMap(group => group.domains);

    // Adapt to UI format
    const uiDomains = allDomains.map(adaptAPIDomainToUI);

    loadDomains(uiDomains);
  } catch (error: any) {
    showEmptyState('error', error.message);
  }
}

loadDomainsFromAPI();
```

**Добавить:**
- Error state UI
- Retry button
- Loading shimmer

---

### PR 5: Registrar/Provider Display

**Цель:** Решить проблему отображения провайдера

**Проблема:** API не возвращает `registrar`, только `key_id`

**Решение (временное):**

Показывать прочерк "—" с `title="key_id: ${keyId}"` пока не будет интеграция провайдеров.

```typescript
// adapter.ts
function getRegistrarDisplay(keyId: number | null): { icon: string | null; title: string } {
  if (!keyId) {
    return { icon: null, title: 'Manual' };
  }
  // TODO: После интеграции провайдеров - lookup через integrations API
  return { icon: null, title: `Integration #${keyId}` };
}

// В рендере таблицы
const providerCell = keyId
  ? `<span class="text-muted" title="Integration #${keyId}">—</span>`
  : `<span class="text-muted">—</span>`;
```

**TODO (после интеграции провайдеров):**
- Загружать integrations при инициализации страницы
- Маппить `key_id` → `provider` (cloudflare, namecheap, etc.)
- Показывать иконку провайдера как сейчас в mock

---

### PR 6: Filters & Sorting Alignment

**Цель:** Выровнять фильтры и сортировку с API

**Текущие mock фильтры:**
- Project (dropdown)
- Status (chip group)
- Role (chip group)
- Search (text)

**API поддерживает:**
- `project_id` ✅
- `role` ✅
- `blocked` ✅ (но не full status)
- `site_id` ✅
- `zone_id` ✅

**Изменения:**
1. Status filter → client-side (API не поддерживает full status filter)
2. Add Site filter (optional)
3. Search остаётся client-side

---

### PR 7: Actions Implementation

**Цель:** Подключить действия к реальному API

**Текущие dropdown actions в UI vs API:**

| UI Action | API Endpoint | Статус |
|-----------|--------------|--------|
| `inspect` (drawer) | GET /domains/:id | ✅ Реализовать |
| `copy-domain` | — | ✅ Client-side |
| `delete-domain` | DELETE /domains/:id | ✅ Только subdomains! |
| `recheck-health` | GET /domains/:id/health | ⚠️ Read-only, нет trigger |
| `recheck-abuse` | — | ❌ **Убрать** - нет в API |
| `sync-registrar` | — | ❌ **Убрать** - нет в API |
| `toggle-monitoring` | — | ❌ **Убрать** - нет в API |
| `apply-security-preset` | — | ❌ **Убрать** - нет в API |
| `view-analytics` | — | ❌ **Убрать** - отдельная система |

**Добавить новые actions (есть в API):**

| Action | API Endpoint | UI |
|--------|--------------|-----|
| Block domain | PATCH /domains/:id `{blocked: true}` | Dropdown item |
| Unblock domain | PATCH /domains/:id `{blocked: false}` | Dropdown item |
| Change role | PATCH /domains/:id `{role: ...}` | Dropdown submenu |
| Detach from site | PATCH /domains/:id `{site_id: null}` | Dropdown item |
| Detach from project | PATCH /domains/:id `{project_id: null, site_id: null}` | Dropdown item |

**Обновлённый dropdown:**
```html
<div class="dropdown__menu" role="menu">
  <!-- Health (read-only view) -->
  <button class="dropdown__item" data-action="view-health">
    <span class="icon" data-icon="mono/security"></span>
    View health details
  </button>

  <hr class="dropdown__divider" />

  <!-- Role management -->
  <button class="dropdown__item" data-action="change-role" data-role="acceptor">
    Set as Acceptor
  </button>
  <button class="dropdown__item" data-action="change-role" data-role="donor">
    Set as Donor
  </button>
  <button class="dropdown__item" data-action="change-role" data-role="reserve">
    Set as Reserve
  </button>

  <hr class="dropdown__divider" />

  <!-- Blocking -->
  <button class="dropdown__item" data-action="block-domain">
    <span class="icon" data-icon="mono/ban"></span>
    Block domain
  </button>

  <hr class="dropdown__divider" />

  <!-- Danger zone -->
  <button class="dropdown__item dropdown__item--danger" data-action="delete-domain">
    <span class="icon" data-icon="mono/delete"></span>
    Delete domain
  </button>
</div>
```

**Важно:** DELETE работает только для subdomains (3+ level). Root domains удаляются через zones.

---

### PR 8: Bulk Actions

**Цель:** Подключить bulk actions к API

**Bulk actions:**
- Select all / Select none
- Block selected
- Unblock selected
- Delete selected (subdomains only)
- Change role

**Реализация:**
```typescript
async function bulkBlockDomains(domainIds: number[]) {
  await Promise.all(
    domainIds.map(id => updateDomain(id, { blocked: true }))
  );
  invalidateCache('domains');
  await loadDomainsFromAPI();
}
```

---

### PR 9: Domain Detail Drawer (optional)

**Цель:** Добавить drawer с деталями домена

**Содержимое:**
- Overview tab (domain info, site, project)
- Security tab (health, threats, blocked_reason)
- DNS tab (ns, ns_verified, proxied)

**API calls:**
- `getDomainDetail(id)` для Overview
- `getDomainHealth(id)` для Security

---

## Порядок выполнения

```
PR 1 (Types) ────────────────────────────────┐
                                              │
PR 2 (API Client) ───────────────────────────┼──→ PR 4 (Data Loading)
                                              │         │
PR 3 (Remove UI-only) ───────────────────────┘         │
                                                        │
                                                        ▼
                                               PR 5 (Provider)
                                                        │
                                                        ▼
                                               PR 6 (Filters)
                                                        │
                                                        ▼
                                               PR 7 (Actions)
                                                        │
                                                        ▼
                                               PR 8 (Bulk Actions)
                                                        │
                                                        ▼
                                               PR 9 (Drawer) [optional]
```

---

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| API возвращает другую структуру | Низкая | Adapter изолирует изменения |
| Нет поля registrar | Высокая | PR 5 решает через lookup |
| Большое количество доменов (>1000) | Средняя | Pagination через API |
| Health данные не загружены | Низкая | Fallback на 'unknown' |

---

## Definition of Done

- [ ] Таблица загружает данные из реального API
- [ ] Все статусы отображаются корректно
- [ ] Фильтры работают (project, role, status)
- [ ] Поиск работает
- [ ] Пагинация работает
- [ ] Actions выполняют реальные API вызовы
- [ ] Bulk actions работают
- [ ] Error states показываются при ошибках
- [ ] Loading states при загрузке
- [ ] Mock data удалён или помечен deprecated

---

## Estimated Effort

| PR | Complexity | Estimate |
|----|------------|----------|
| PR 1 | Low | 1-2h |
| PR 2 | Low | 1-2h |
| PR 3 | Medium | 2-3h |
| PR 4 | High | 3-4h |
| PR 5 | Medium | 2-3h |
| PR 6 | Low | 1-2h |
| PR 7 | Medium | 2-3h |
| PR 8 | Medium | 2-3h |
| PR 9 | High | 4-6h |
| **Total** | — | **~20-28h** |

---

## Open Questions

1. ~~**Registrar field:**~~ ✅ Решено: временно показываем "—" с title=key_id, ждём интеграцию провайдеров
2. ~~**Monitoring feature:**~~ ✅ Решено: заменяем на Health (SSL + NS + health.status icons)
3. **Pagination:** API поддерживает? Нужен ли offset/limit? → **Запросить фичу у backend**
4. ~~**Bulk delete:**~~ ✅ Решено: последовательно (опасная операция)

## Backend Feature Requests

| Feature | Priority | Description |
|---------|----------|-------------|
| Pagination | High | `GET /domains?offset=0&limit=50` для больших списков |
| Trigger health check | Medium | `POST /domains/:id/health/check` для ручного recheck |
| Registrar in response | Low | Добавить `registrar` или `provider` в domain object |

---

*Created: 2026-01-31*
*Author: Claude Code*
