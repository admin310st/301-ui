# mini-tds API Analysis & UI Alignment

**Источник:** `W:\Projects\mini-tds-worker` (investblog/mini-tds)
**Цель:** Выявить паттерны для разработки API бэкенда и выровнять UI (TODO-streams.md) с реальными данными
**Дата анализа:** 2025-12-24

---

## 🎯 Executive Summary

**mini-tds** — это production-ready Cloudflare Worker для geo/device-based redirects с admin UI. Проект демонстрирует проверенные паттерны для TDS API:

1. ✅ **Простая схема данных** — массив `RouteRule[]` с match/action структурой
2. ✅ **REST API** — стандартные CRUD endpoints с ETag-based updates
3. ✅ **Audit trail** — все изменения логируются с actor, timestamps, diffs
4. ✅ **Bootstrap pattern** — config/routes.json как source of truth
5. ✅ **Validation** — server-side валидация перед сохранением
6. ✅ **Admin UI** — single-page app с textarea для JSON (простейший MVP)

**Ключевой вывод:** Наш TODO-streams.md уже следует правильным паттернам, но нужно скорректировать mock data структуру под реальный API формат.

---

## 📊 Data Schema

### RouteRule (основная сущность)

```typescript
interface RouteRule {
  id: string;                    // Уникальный ID правила
  enabled?: boolean;             // По умолчанию true
  match: MatchRule;              // Условия срабатывания
  action: RouteAction;           // Действие (redirect или response)
}
```

### MatchRule (условия)

```typescript
interface MatchRule {
  path?: string | string[];      // Regex паттерны для pathname
  countries?: string[];          // ISO коды (uppercase): ["RU", "UA"]
  devices?: Device[];            // ["mobile", "desktop", "tablet", "any"]
  bots?: boolean;                // true = только боты, false = исключить ботов
}

type Device = "mobile" | "desktop" | "tablet" | "any";
```

### RouteAction (два типа)

#### 1. Redirect Action (основной use case)

```typescript
interface RedirectAction {
  type: "redirect";
  target: string;                           // Абсолютный URL
  status?: number;                          // 301, 302 (по умолчанию 302)
  query?: Record<string, QueryValue>;       // Параметры из regex capture groups
  preserveOriginalQuery?: boolean;          // Копировать query string
  extraQuery?: Record<string, string>;      // Статичные параметры
  appendCountry?: boolean;                  // Добавить ?country=RU
  appendDevice?: boolean;                   // Добавить ?device=mobile
}

type QueryValue = string | number | boolean | {
  fromPathGroup?: number;  // Взять из capture group regex
  literal?: string;        // Статичное значение
}
```

**Пример:**
```json
{
  "type": "redirect",
  "target": "https://example.com/offer",
  "query": {
    "bonus": { "fromPathGroup": 1 },
    "campaign": { "literal": "spring" }
  },
  "appendCountry": true,
  "appendDevice": true,
  "status": 302
}
```

#### 2. Response Action (для custom pages)

```typescript
interface ResponseAction {
  type: "response";
  status?: number;                    // HTTP status (200, 404, etc.)
  headers?: Record<string, string>;   // Custom headers
  bodyHtml?: string;                  // HTML body
  bodyText?: string;                  // Plain text body
}
```

**Пример (bot landing page):**
```json
{
  "type": "response",
  "status": 200,
  "headers": { "Content-Type": "text/html; charset=utf-8" },
  "bodyHtml": "<!doctype html><title>OK</title><h1>Site is fine</h1>"
}
```

---

## 🔌 API Endpoints

### Routes Management

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/api/routes` | Получить все правила + ETag | — | `{ routes: RouteRule[], version: string, etag: string }` |
| PUT | `/api/routes` | Заменить все правила | `{ routes: RouteRule[] }` + `If-Match: <etag>` | `{ ok: true, etag: string }` |
| PATCH | `/api/routes/:id` | Обновить одно правило | `{ patch: Partial<RouteRule> }` | `{ ok: true, etag: string }` |
| DELETE | `/api/routes/:id` | Удалить правило | — | `{ ok: true, etag: string }` |
| POST | `/api/routes/validate` | Валидация без сохранения | `{ routes: RouteRule[] }` | `{ ok: true }` или `{ error: string }` |

### Flags & Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flags` | Получить feature flags |
| PUT | `/api/flags` | Обновить flags |

### Audit & Cache

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit?limit=N` | История изменений (max 100) |
| POST | `/api/cache/invalidate` | Сбросить in-memory cache |
| GET | `/api/export` | Экспорт полного bundle (routes + flags + metadata) |
| POST | `/api/import` | Импорт bundle |

---

## 🔐 Authentication & Authorization

```typescript
// Authorization header
Authorization: Bearer <ADMIN_TOKEN>

// Или query parameter (для admin UI)
/admin?token=<ADMIN_TOKEN>

// IP whitelist check (опционально)
flags.allowedAdminIps: string[]  // Empty array = disabled
```

**Actor tracking:**
```typescript
actor = `admin@ip-${cf-connecting-ip || x-forwarded-for}`
```

---

## 📝 Validation Rules

### RouteRule Validation (server-side)

1. **ID required**: `id` должен быть непустой строкой
2. **Unique IDs**: все `id` должны быть уникальными в массиве
3. **Match required**: хотя бы одно условие в `match` (path, countries, devices, bots)
4. **Path regex valid**: если `match.path` указан, должен быть валидным JS regex
5. **Action type**: `action.type` должен быть `"redirect"` или `"response"`
6. **Redirect target**: если `type: "redirect"`, `target` обязателен и должен быть URL
7. **Response body**: если `type: "response"`, должен быть `bodyHtml` или `bodyText`

**Пример валидации (из mini-tds):**
```typescript
function validateRoutesPayload(routes: unknown): void {
  if (!Array.isArray(routes)) throw new Error("routes must be an array");

  const ids = new Set<string>();
  routes.forEach((rule, i) => {
    if (!rule.id) throw new Error(`Rule #${i}: id is required`);
    if (ids.has(rule.id)) throw new Error(`Duplicate id: ${rule.id}`);
    ids.add(rule.id);

    if (!rule.match) throw new Error(`Rule ${rule.id}: match is required`);
    if (!rule.action) throw new Error(`Rule ${rule.id}: action is required`);

    // Validate action type
    if (!["redirect", "response"].includes(rule.action.type)) {
      throw new Error(`Rule ${rule.id}: invalid action type`);
    }

    // ... more validation
  });
}
```

---

## 📦 Config Storage (KV Namespaces)

### CONFIG Namespace

| Key | Value | Description |
|-----|-------|-------------|
| `CONFIG/routes` | `RouteRule[]` | Активные правила |
| `CONFIG/flags` | `FlagsConfig` | Feature flags |
| `CONFIG/metadata` | `MetadataRecord` | Версия, timestamp, actor |

### AUDIT Namespace

| Key | Value | Description |
|-----|-------|-------------|
| `AUDIT/<ts>-<uuid>` | `AuditEntry` | Append-only log |

**AuditEntry structure:**
```typescript
interface AuditEntry {
  ts: string;           // ISO timestamp
  actor: string;        // "admin@ip-1.2.3.4"
  action: string;       // "routes.update", "config.bootstrap"
  prevHash?: string;    // sha256 hash до изменения
  newHash?: string;     // sha256 hash после
  diffBytes?: number;   // Разница в байтах (может быть отрицательной)
  note?: string;        // Комментарий
  error?: string;       // Ошибка (если была)
}
```

---

## 🎨 Admin UI Patterns (from mini-tds)

### UI Structure

```
/admin
├─ Header (title + metadata display)
├─ Status bar (success/error messages)
├─ Action buttons (Reload, Validate, Publish, Invalidate cache)
├─ Routes editor (textarea with JSON)
├─ Flags editor (textarea with JSON)
└─ Audit log (read-only list)
```

### Key Features

1. **JSON textarea** — самый простой MVP (как в mini-tds)
   - Пользователь редактирует JSON напрямую
   - Validate перед публикацией
   - Syntax highlighting не обязателен на MVP

2. **ETag display** — показывать текущий ETag в header
   - Используется для optimistic locking
   - `If-Match` header при PUT запросах

3. **Audit log** — последние 20 записей
   - Timestamp, actor, action
   - Diff bytes (+ green, - red, ± neutral)
   - Error/note messages

4. **Read-only mode** — если KV не подключен
   - Buttons disabled
   - Banner: "KV bindings not configured"
   - Можно читать, но не менять

---

## 🆚 Comparison: mini-tds vs TODO-streams.md

### Что совпадает ✅

| Aspect | mini-tds | TODO-streams.md | Status |
|--------|----------|-----------------|--------|
| Match conditions | `path`, `countries`, `devices`, `bots` | GEO, Device, Referrer, UTM | ✅ Похожие концепции |
| Action types | `redirect`, `response` | Forward to offer | ✅ Redirect = основной use case |
| Priority | Порядок в массиве (first match wins) | `priority` поле + up/down arrows | ✅ Оба варианта валидны |
| Enabled toggle | `enabled: boolean` | Toggle в таблице | ✅ Одинаково |
| Admin UI | Single-page app | Drawer-based editor | ✅ Оба подхода рабочие |

### Различия ⚠️

| Aspect | mini-tds | TODO-streams.md | Рекомендация |
|--------|----------|-----------------|--------------|
| **Data structure** | Плоский массив `RouteRule[]` | Вложенная структура (conditions, targets, weights) | **Адаптировать под mini-tds** |
| **Weights** | Отсутствуют | `weight: number` для A/B тестов | **Добавить в API как extension** |
| **Fallback** | Если нет match → origin | `fallback_target_id` | **Можно добавить как последнее правило** |
| **Draft/Publish** | Нет (сразу в production) | Draft banner + publish workflow | **Nice to have, но не в MVP** |
| **Visual pipeline** | Нет | Context bar + pipeline strip | **UI layer only, не влияет на API** |

---

## 🎯 Recommendations for 301-ui

### 1. Update Mock Data Structure

**Текущая структура (TODO-streams.md):**
```typescript
interface TDSRule {
  id: number;
  name: string;
  conditions: {
    geo?: string[];
    device?: string[];
    referrer?: string;
    utm_source?: string;
  };
  targets: Target[];
  weights: number[];
  enabled: boolean;
  priority: number;
}
```

**Рекомендуемая структура (aligned with mini-tds):**
```typescript
interface TDSRule {
  id: string;                    // String ID (как в mini-tds)
  enabled: boolean;
  priority?: number;             // Опционально, для UI sorting
  match: {
    path?: string | string[];    // Regex паттерны
    countries?: string[];        // ISO codes
    devices?: ("mobile" | "desktop" | "tablet" | "any")[];
    bots?: boolean;
    // Extensions:
    referrer?: string | string[];  // Regex для referrer
    utm_source?: string[];         // Whitelist UTM sources
    utm_campaign?: string[];
  };
  action: {
    type: "redirect" | "weighted_redirect";  // weighted = extension
    targets: Array<{
      url: string;
      weight?: number;           // Для A/B тестов (сумма = 100)
      label?: string;            // Display name в UI
    }>;
    query?: Record<string, string | { fromPathGroup: number }>;
    preserveOriginalQuery?: boolean;
    appendCountry?: boolean;
    appendDevice?: boolean;
    status?: 301 | 302;
  };
}
```

### 2. API Endpoints для 301-ui

**Базовые (совместимые с mini-tds):**
```
GET    /api/tds/rules          → { rules: TDSRule[], etag: string }
PUT    /api/tds/rules          → { ok: true, etag: string }
PATCH  /api/tds/rules/:id      → { ok: true, etag: string }
DELETE /api/tds/rules/:id      → { ok: true, etag: string }
POST   /api/tds/rules/validate → { ok: true } | { error: string }
```

**Extensions (для advanced features):**
```
GET    /api/tds/audit?limit=20 → AuditEntry[]
POST   /api/tds/reorder        → { ruleIds: string[] } // Batch priority update
GET    /api/tds/stats          → Stats по правилам (hits, conversions)
```

### 3. UI Components Mapping

| TODO-streams.md Component | Implementation | Mini-tds Pattern |
|---------------------------|----------------|------------------|
| **Context bar** | Project/Site/Domain selectors | UI layer only (filter rules by context) |
| **Pipeline strip** | Visual: Shield → Rules → Target | UI layer only (visualization) |
| **Rules table** | Table with columns: Name, Conditions, Targets, Status | Similar to mini-tds `/admin` list |
| **Add/Edit drawer** | Form with tabs: Match, Action, Advanced | Alternative to textarea JSON editor |
| **Priority controls** | Up/Down arrows | Better UX than manual array ordering |
| **Draft/publish** | Staging workflow | Not in mini-tds (publish immediately) |

**Recommendation:**
- **MVP**: Start with mini-tds approach (JSON textarea) → faster to market
- **V2**: Replace textarea with drawer form → better UX
- **V3**: Add draft/publish workflow → enterprise feature

### 4. Validation Strategy

**Client-side (UI):**
```typescript
// Before opening "Add rule" drawer
function validateNewRule(rule: Partial<TDSRule>): string[] {
  const errors: string[] = [];

  if (!rule.id) errors.push("Rule ID is required");
  if (!rule.match || Object.keys(rule.match).length === 0) {
    errors.push("At least one match condition required");
  }
  if (!rule.action?.targets || rule.action.targets.length === 0) {
    errors.push("At least one target required");
  }

  // Validate weights sum to 100
  if (rule.action?.type === "weighted_redirect") {
    const sum = rule.action.targets.reduce((s, t) => s + (t.weight || 0), 0);
    if (sum !== 100) errors.push(`Weights must sum to 100 (current: ${sum})`);
  }

  return errors;
}
```

**Server-side (API):**
- Используйте те же правила, что в mini-tds
- Добавьте проверку weights (если тип `weighted_redirect`)
- Валидируйте regex patterns для `match.path` и `match.referrer`

### 5. Mock Data Example (aligned)

**src/streams/mock-data.ts:**
```typescript
export const MOCK_TDS_RULES: TDSRule[] = [
  {
    id: "rule-ru-mobile-casino",
    enabled: true,
    priority: 1,
    match: {
      path: ["^/casino/([^/?#]+)"],
      countries: ["RU", "BY"],
      devices: ["mobile"],
      bots: false,
    },
    action: {
      type: "weighted_redirect",
      targets: [
        { url: "https://offer1.example.com/landing", weight: 60, label: "Offer A" },
        { url: "https://offer2.example.com/promo", weight: 40, label: "Offer B" },
      ],
      query: {
        bonus: { fromPathGroup: 1 },
        src: "tds-mobile",
      },
      appendCountry: true,
      appendDevice: true,
      status: 302,
    },
  },
  {
    id: "rule-desktop-fallback",
    enabled: true,
    priority: 99,
    match: {
      devices: ["desktop"],
      bots: false,
    },
    action: {
      type: "redirect",
      targets: [
        { url: "https://mainsite.example.com/welcome", label: "Main Site" },
      ],
      preserveOriginalQuery: true,
      status: 302,
    },
  },
];
```

---

## 📋 Action Items for TODO-streams.md

### Updates Required

1. **Update mock data structure** (Milestone 1)
   - Change `TDSRule` interface to match mini-tds `RouteRule`
   - Keep `priority` field for UI sorting (not in mini-tds, but useful)
   - Add `action.type: "weighted_redirect"` для A/B тестов
   - Replace nested conditions with `match` object

2. **Update drawer form specs** (Milestone 3-4)
   - Match tab: path (regex), countries (multiselect), devices (chips), bots (toggle)
   - Action tab: targets list (URL + weight + label), query builder
   - Advanced tab: preserveOriginalQuery, appendCountry, appendDevice, status

3. **Add validation section** (Milestone 4)
   - Client-side: validateNewRule(), validateWeights()
   - Server-side: reference mini-tds validation patterns

4. **Update API integration notes** (all milestones)
   - Reference `/api/tds/rules` endpoints
   - ETag-based updates with `If-Match`
   - Audit log integration

### Keep As-Is

1. ✅ **Context bar** — UI layer, не влияет на API
2. ✅ **Pipeline strip** — visualization only
3. ✅ **Priority controls** — better UX than array ordering
4. ✅ **Table layout** — standard pattern
5. ✅ **Draft/publish** — откладываем на V3 (не в MVP)

---

## 🚀 Implementation Priority

### Phase 1: MVP (align with mini-tds)

1. Update `src/streams/types.ts` → новая `TDSRule` структура
2. Update `src/streams/mock-data.ts` → 10-15 примеров правил
3. Implement table → columns: Name, Match (summary), Targets (summary), Status
4. Implement drawer → JSON textarea editor (как в mini-tds)
5. Add validation → `POST /api/tds/rules/validate` перед save

**Timeline:** 2-3 days
**Outcome:** Working TDS UI с mini-tds compatible data

### Phase 2: Enhanced UX

1. Replace JSON textarea → form tabs (Match, Action, Advanced)
2. Add priority controls → up/down arrows
3. Add filters → by status, by device, by country
4. Implement audit log → show last 20 changes

**Timeline:** 3-4 days
**Outcome:** Production-ready UI

### Phase 3: Advanced Features

1. Draft/publish workflow
2. Stats integration (hits per rule)
3. Bulk enable/disable
4. Export/import bundles

**Timeline:** 2-3 days
**Outcome:** Enterprise features

---

## 📚 References

- **mini-tds repo:** `W:\Projects\mini-tds-worker`
- **mini-tds README:** Полный API reference
- **routes-guide.md:** Примеры scenarios
- **worker.ts:** TypeScript types и validation logic

---

**Last updated:** 2025-12-24
**Next step:** Update TODO-streams.md с новой структурой данных
