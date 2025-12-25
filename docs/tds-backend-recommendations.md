# TDS Backend API Recommendations

**Date:** 2025-12-24
**Based on:**
- `docs/301-wiki/TDS.md` (official spec)
- `docs/301-wiki/Data_Model.md` (DB schema)
- `docs/mini-tds-analysis.md` (production mini-tds patterns)
- `TODO-streams.md` (UI requirements)

---

## 🎯 Executive Summary

**Ключевые findings:**

1. ✅ **TDS ≠ Redirects** — это разные сущности с разными целями
2. ✅ **Два типа TDS** — SmartLink (UTM) vs SmartShield (CF metadata)
3. ✅ **Иерархия Site-based** — rules привязаны к Site, применяются ко всем доменам
4. ⚠️ **mini-tds не покрывает full spec** — это упрощенная версия только для SmartShield
5. ⚠️ **UI нужно обновить** — добавить поддержку SmartLink, ASN, TLS

**Рекомендация:** Backend должен реализовать **полную спецификацию** из 301-wiki, а не ограничиваться mini-tds паттернами.

---

## 📊 Entities Comparison

### redirect_rules vs tds_rules

| Aspect | redirect_rules | tds_rules |
|--------|----------------|-----------|
| **Purpose** | Статичные редиректы при блокировках | Динамическое распределение трафика |
| **Complexity** | Простые 301/302 (одно правило = один redirect) | Сложная логика (match-first, условия, A/B) |
| **Match logic** | Hostname match | Geo, Device, Bots, UTM, ASN, TLS, Path, etc. |
| **Free plan** | Unlimited (через Workers) или 10 (через Redirect Rules) | 1 TDS-набор, 5-10 правил |
| **Use case** | Blocked domain → Active domain | Traffic distribution по офферам |
| **UI** | Simple redirect form | Complex rule editor (наш TODO-streams.md) |

**Важно:** Не смешивать эти сущности! В UI должны быть отдельные страницы:
- `/redirects.html` — управление redirect_rules
- `/streams.html` — управление tds_rules

---

## 🏗️ TDS Architecture (from 301-wiki)

### Hierarchy

```
Account
  └─ Project
       └─ Site
            └─ Zone
                 └─ Domains

TDS Rules привязаны к Site (site_id)
Правила применяются ко всем доменам сайта автоматически
```

**Ключевой принцип:** 1 Site = 1 Zone = N Domains

**Frontend implications:**
- UI должен показывать context bar с селектором Site (не domain!)
- При создании правила выбирается Site, а не отдельные домены
- Правило автоматически применяется ко всем доменам сайта

---

### Two TDS Types (from TDS.md)

#### 1. SmartLink (UTM/параметрический TDS)

**Purpose:** Управление трафиком по входящим ссылкам (кампании, источники, креативы)

**How it works:**
```
User clicks: https://brand.com/?utm_source=fb&utm_campaign=summer
Worker parses URL parameters:
  - utm_source=fb → redirect to offer A
  - utm_source=google → cloak
  - sub1=geo → redirect to geo-landing
```

**Match conditions:**
- `utm_source`, `utm_campaign`, `utm_content`, `utm_medium`
- Custom params: `sub1`, `sub2`, `click_id`, etc.
- **NOT dependent on CF metadata** (works purely by URL)

**Use cases:**
- A/B tests
- Traffic source separation
- DeepLinks in offers

**Example rule:**
```json
{
  "id": "rule-fb-campaign",
  "rule_type": "smartlink",
  "enabled": true,
  "match": {
    "utm_source": ["facebook", "fb"],
    "utm_campaign": ["summer2025"]
  },
  "action": {
    "type": "redirect",
    "target": "https://offer1.example.com/landing?camp=fb-summer"
  }
}
```

---

#### 2. SmartShield (CF-метаданные + правила)

**Purpose:** Автоматическая защита от модераторов, ботов, нежелательных гео

**How it works:**
```
Any request to domain passes through Worker
Worker analyzes CF metadata:
  - Geo (request.cf.country)
  - ASN (request.cf.asn)
  - User-Agent
  - TLS version
  - Client Hints

Decision:
  - If bot/moderator/forbidden geo → show white site
  - If target traffic → redirect to offer
```

**Match conditions:**
- `countries` (ISO codes)
- `devices` (mobile/desktop/tablet)
- `bots` (boolean: include/exclude)
- `asn` (AS numbers) — **NOT in mini-tds**
- `tls_version` — **NOT in mini-tds**
- `path` (regex patterns)
- `ip_ranges` (CIDR)

**Use cases:**
- Soft-blocks
- Ban protection
- Geo-targeting by default

**Example rule:**
```json
{
  "id": "rule-ru-mobile-shield",
  "rule_type": "smartshield",
  "enabled": true,
  "match": {
    "countries": ["RU", "BY"],
    "devices": ["mobile"],
    "bots": false,
    "asn": [12389, 8359]  // MTS, Beeline
  },
  "action": {
    "type": "redirect",
    "target": "https://offer1.example.com/ru-mobile"
  }
}
```

---

### Match Logic: First Match Wins

**From TDS.md:**
> Правила обрабатываются сверху вниз, первое совпавшее — выполняется.

**Example:**
```
Rule 1: Geo = RU, Device = Mobile → Redirect to landing A
Rule 2: Geo = RU → Soft-block (302 to white site)
Rule 3: Geo = US, utm_source = fb → Redirect to landing B
Rule 4: Any → Redirect to universal landing
```

If request from RU mobile → **Rule 1 wins**, others ignored.

**Frontend implications:**
- Priority field должен быть editable
- Up/Down arrows для reordering
- Visual indicator: "First match wins"

---

## 🗄️ Database Schema Recommendations

### tds_rules Table

**Required fields:**

```sql
CREATE TABLE tds_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,  -- Multi-tenant isolation
  site_id INTEGER NOT NULL,     -- FK to sites

  rule_type TEXT NOT NULL CHECK(rule_type IN ('smartlink', 'smartshield')),
  priority INTEGER NOT NULL DEFAULT 0,  -- Lower = higher priority
  enabled BOOLEAN NOT NULL DEFAULT 1,
  label TEXT,  -- User-friendly name

  -- Match conditions (JSON)
  match_json TEXT NOT NULL,  -- Flexible structure for both types

  -- Action (JSON)
  action_json TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_tds_rules_site ON tds_rules(site_id, enabled, priority);
CREATE INDEX idx_tds_rules_account ON tds_rules(account_id);
```

**Why JSON for match/action:**
- SmartLink and SmartShield have different match conditions
- Future extensibility (new conditions without schema changes)
- Easy to sync to KV snapshot

---

### match_json Structure

**SmartLink example:**
```json
{
  "utm_source": ["facebook", "fb", "instagram"],
  "utm_campaign": ["summer2025"],
  "utm_content": "banner1",
  "custom_params": {
    "sub1": "geo",
    "click_id": "*"  // wildcard
  }
}
```

**SmartShield example:**
```json
{
  "path": ["^/casino/([^/?#]+)", "^/slots/"],
  "countries": ["RU", "UA", "BY"],
  "devices": ["mobile"],
  "bots": false,
  "asn": [12389, 8359],
  "tls_version": ["1.2", "1.3"],
  "ip_ranges": ["203.0.113.0/24"]
}
```

**Validation rules:**
1. At least ONE condition must be present
2. `path` must be valid regex
3. `countries` must be ISO 3166-1 alpha-2
4. `devices` must be in ['mobile', 'desktop', 'tablet', 'any']
5. `bots` must be boolean
6. `asn` must be valid AS numbers
7. `tls_version` must be in ['1.0', '1.1', '1.2', '1.3']

---

### action_json Structure

**Simple redirect:**
```json
{
  "type": "redirect",
  "target": "https://offer1.example.com/landing",
  "status": 302,
  "query": {
    "bonus": { "fromPathGroup": 1 },
    "src": "tds-mobile"
  },
  "preserveOriginalQuery": true,
  "appendCountry": true,
  "appendDevice": true
}
```

**Weighted redirect (A/B test):**
```json
{
  "type": "weighted_redirect",
  "targets": [
    { "url": "https://offer1.example.com", "weight": 60, "label": "Offer A" },
    { "url": "https://offer2.example.com", "weight": 40, "label": "Offer B" }
  ],
  "status": 302
}
```

**Custom response (for bots):**
```json
{
  "type": "response",
  "status": 200,
  "headers": {
    "Content-Type": "text/html; charset=utf-8"
  },
  "bodyHtml": "<!doctype html><title>OK</title><h1>Site is fine</h1>"
}
```

**Validation rules:**
1. `type` must be in ['redirect', 'weighted_redirect', 'response']
2. If `weighted_redirect`, weights must sum to 100
3. If `response`, must have `bodyHtml` OR `bodyText`
4. `status` must be valid HTTP code (301, 302, 307, 308, 200, 403, 404, etc.)

---

## 🔌 API Endpoints

### Core Endpoints

```
GET    /api/sites/:siteId/tds/rules
GET    /api/sites/:siteId/tds/rules/:id
POST   /api/sites/:siteId/tds/rules
PATCH  /api/sites/:siteId/tds/rules/:id
DELETE /api/sites/:siteId/tds/rules/:id
POST   /api/sites/:siteId/tds/rules/validate
POST   /api/sites/:siteId/tds/rules/reorder
```

---

### GET /api/sites/:siteId/tds/rules

**Response:**
```json
{
  "rules": [
    {
      "id": 1,
      "site_id": 123,
      "rule_type": "smartshield",
      "priority": 1,
      "enabled": true,
      "label": "RU Mobile Casino → A/B Test",
      "match": {
        "path": ["^/casino/([^/?#]+)"],
        "countries": ["RU", "BY"],
        "devices": ["mobile"],
        "bots": false
      },
      "action": {
        "type": "weighted_redirect",
        "targets": [
          { "url": "https://offer1.example.com", "weight": 60, "label": "Offer A" },
          { "url": "https://offer2.example.com", "weight": 40, "label": "Offer B" }
        ]
      },
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "etag": "sha256:abc123def456",
  "version": "1.0.0"
}
```

---

### POST /api/sites/:siteId/tds/rules

**Request:**
```json
{
  "rule_type": "smartlink",
  "priority": 10,
  "enabled": true,
  "label": "Facebook Summer Campaign",
  "match": {
    "utm_source": ["facebook"],
    "utm_campaign": ["summer2025"]
  },
  "action": {
    "type": "redirect",
    "target": "https://offer1.example.com/fb-summer",
    "status": 302
  }
}
```

**Response:**
```json
{
  "ok": true,
  "rule": { /* full rule object */ },
  "etag": "sha256:new_hash"
}
```

**Validation (server-side):**
1. Check `site_id` exists and belongs to account
2. Validate `match` structure (at least 1 condition)
3. Validate `action` structure (type-specific)
4. Check priority conflicts (if needed)
5. Validate regex patterns in `match.path`

---

### PATCH /api/sites/:siteId/tds/rules/:id

**Request:**
```json
{
  "enabled": false,
  "label": "Facebook Summer Campaign (Paused)"
}
```

**Response:**
```json
{
  "ok": true,
  "rule": { /* updated rule object */ },
  "etag": "sha256:new_hash"
}
```

**Note:** Partial updates supported. Only provided fields are updated.

---

### POST /api/sites/:siteId/tds/rules/reorder

**Request:**
```json
{
  "rule_ids": [5, 1, 3, 2, 4]  // New order (by priority)
}
```

**Response:**
```json
{
  "ok": true,
  "rules": [ /* updated rules with new priorities */ ],
  "etag": "sha256:new_hash"
}
```

**Implementation:**
```sql
-- Update priorities in batch
UPDATE tds_rules SET priority = 1 WHERE id = 5;
UPDATE tds_rules SET priority = 2 WHERE id = 1;
UPDATE tds_rules SET priority = 3 WHERE id = 3;
-- etc.
```

---

### POST /api/sites/:siteId/tds/rules/validate

**Request:**
```json
{
  "rule_type": "smartshield",
  "match": {
    "countries": ["INVALID"],  // Bad ISO code
    "devices": ["smartphone"]  // Invalid device type
  },
  "action": {
    "type": "weighted_redirect",
    "targets": [
      { "url": "https://offer1.com", "weight": 70 }  // Sum != 100
    ]
  }
}
```

**Response (errors):**
```json
{
  "ok": false,
  "errors": [
    {
      "field": "match.countries[0]",
      "message": "Invalid ISO code: INVALID. Must be 2-letter alpha-2 code."
    },
    {
      "field": "match.devices[0]",
      "message": "Invalid device type: smartphone. Must be one of: mobile, desktop, tablet, any."
    },
    {
      "field": "action.targets",
      "message": "Weights must sum to 100. Current sum: 70."
    }
  ]
}
```

**Response (valid):**
```json
{
  "ok": true
}
```

---

## 💾 KV Snapshot Structure

### KV Namespace: KV_TDS

**Key format:** `tds:site:{site_id}`

**Value (JSON):**
```json
{
  "site_id": "abc123",
  "etag": "sha256:def456",
  "updated_at": "2025-01-15T10:00:00Z",
  "rules": [
    {
      "id": 1,
      "rule_type": "smartshield",
      "priority": 1,
      "enabled": true,
      "match": { /* ... */ },
      "action": { /* ... */ }
    },
    {
      "id": 2,
      "rule_type": "smartlink",
      "priority": 2,
      "enabled": true,
      "match": { /* ... */ },
      "action": { /* ... */ }
    }
  ]
}
```

**Update flow:**
1. User updates rule via API
2. API-worker updates D1 table `tds_rules`
3. API-worker queries all enabled rules for site (sorted by priority)
4. API-worker generates JSON snapshot
5. API-worker puts snapshot to KV: `KV_TDS.put('tds:site:123', snapshot)`
6. API-worker writes to audit_log
7. Edge-worker reads updated snapshot on next request

---

## 🆚 Comparison: mini-tds vs 301-wiki

| Feature | mini-tds | 301-wiki (official) | Status |
|---------|----------|---------------------|--------|
| **TDS Types** | Single type | SmartLink + SmartShield | ❌ Mini-tds incomplete |
| **UTM support** | ❌ None | ✅ SmartLink | ❌ Missing in mini-tds |
| **ASN matching** | ❌ None | ✅ SmartShield | ❌ Missing in mini-tds |
| **TLS version** | ❌ None | ✅ SmartShield | ❌ Missing in mini-tds |
| **Hierarchy** | Flat rules array | Site → Zone → Domains | ❌ Mini-tds doesn't have Site concept |
| **A/B testing** | ❌ None | ✅ Paid plan (multiple sets) or weighted_redirect | ⚠️ Different approaches |
| **Match logic** | First match wins | First match wins | ✅ Same |
| **Match conditions** | path, countries, devices, bots | Same + UTM, ASN, TLS | ⚠️ Mini-tds subset |
| **Action types** | redirect, response | redirect, weighted_redirect, response | ⚠️ Mini-tds subset |
| **Storage** | KV only | D1 + KV snapshot | ⚠️ Different |
| **Validation** | Server-side | Server-side | ✅ Same |

**Conclusion:** mini-tds is a **simplified prototype** for SmartShield only. Full implementation must support both types.

---

## 📋 Recommendations for Backend

### 1. Database Schema

✅ **Implement:**
- `tds_rules` table with `site_id` FK
- `rule_type` ENUM('smartlink', 'smartshield')
- `match_json` and `action_json` columns (flexible structure)
- `priority` field for ordering
- Indexes on `(site_id, enabled, priority)`

❌ **Don't:**
- Don't use separate tables for SmartLink/SmartShield (use `rule_type` discriminator)
- Don't hardcode match/action structure (use JSON for flexibility)

---

### 2. API Endpoints

✅ **Implement:**
- RESTful CRUD for rules under `/api/sites/:siteId/tds/rules`
- Validation endpoint with detailed error messages
- Reorder endpoint for batch priority updates
- ETag-based optimistic locking (If-Match headers)

❌ **Don't:**
- Don't expose rules at `/api/domains/:domainId/tds/rules` (wrong hierarchy!)
- Don't allow direct KV writes from Edge-worker (read-only)

---

### 3. Match Conditions Support

✅ **SmartShield must support:**
- `path` (regex patterns)
- `countries` (ISO codes)
- `devices` (mobile/desktop/tablet/any)
- `bots` (boolean)
- `asn` (AS numbers) — **NEW**
- `tls_version` (1.0/1.1/1.2/1.3) — **NEW**
- `ip_ranges` (CIDR notation) — **NEW**

✅ **SmartLink must support:**
- `utm_source`, `utm_campaign`, `utm_content`, `utm_medium`
- Custom params: `sub1`, `sub2`, `click_id`, etc.
- Wildcards in values

---

### 4. Action Types Support

✅ **Implement all three:**
1. **redirect** — simple redirect to single target
2. **weighted_redirect** — A/B test with multiple targets + weights
3. **response** — custom HTML/text response (for bots)

**Validation:**
- Weights must sum to 100
- At least 1 target required
- Response must have body

---

### 5. KV Snapshot Sync

✅ **When to sync:**
- After CREATE rule
- After UPDATE rule (enabled, match, action, priority)
- After DELETE rule
- After REORDER rules

✅ **What to include:**
- Only enabled rules
- Sorted by priority (ASC)
- Full rule objects (id, match, action)
- Metadata (etag, updated_at)

❌ **Don't:**
- Don't sync disabled rules to KV
- Don't sync full audit history (only current state)

---

### 6. Free vs Paid Plan Limits

✅ **Free plan:**
- 1 TDS rule set (all rules belong to single site)
- Max 5-10 rules per site
- SmartLink + SmartShield both available
- Basic actions (redirect, response)

✅ **Paid plan:**
- Multiple TDS rule sets (can create multiple sites)
- Max 50+ rules per site
- weighted_redirect (A/B tests)
- Advanced conditions (ASN, TLS, IP ranges)

**Enforcement:**
```sql
-- Check rule count before insert
SELECT COUNT(*) FROM tds_rules
WHERE site_id = ? AND enabled = 1;

-- If count >= limit for plan → reject
```

---

## 🎨 UI Alignment

### Context Bar (from TODO-streams.md)

✅ **Implement selectors:**
- Project selector (dropdown)
- Site selector (dropdown, filtered by project)
- Domain display (read-only, shows all domains of site)

**API calls:**
```
GET /api/projects?accountId=123
GET /api/projects/:projectId/sites
GET /api/sites/:siteId/domains
GET /api/sites/:siteId/tds/rules
```

---

### Rule Types Toggle

✅ **Add to UI:**
```html
<div class="btn-group" role="group">
  <button class="btn btn--ghost is-active" data-rule-type="smartshield">
    <span class="icon" data-icon="mono/shield"></span>
    <span>SmartShield</span>
  </button>
  <button class="btn btn--ghost" data-rule-type="smartlink">
    <span class="icon" data-icon="mono/link"></span>
    <span>SmartLink</span>
  </button>
</div>
```

**Behavior:**
- Switching type changes available match conditions in drawer
- SmartShield → show: countries, devices, bots, asn, tls
- SmartLink → show: utm_source, utm_campaign, custom params

---

### Match Conditions Form

**SmartShield tab:**
```html
<div data-rule-type-tab="smartshield">
  <div class="field">
    <label>Path (regex)</label>
    <input type="text" placeholder="^/casino/([^/?#]+)" />
  </div>
  <div class="field">
    <label>Countries</label>
    <select multiple>
      <option value="RU">🇷🇺 Russia</option>
      <option value="UA">🇺🇦 Ukraine</option>
      <option value="BY">🇧🇾 Belarus</option>
    </select>
  </div>
  <div class="field">
    <label>Devices</label>
    <div class="chip-group">
      <label><input type="checkbox" value="mobile" /> Mobile</label>
      <label><input type="checkbox" value="desktop" /> Desktop</label>
      <label><input type="checkbox" value="tablet" /> Tablet</label>
    </div>
  </div>
  <div class="field">
    <label>Bots</label>
    <select>
      <option value="">Any</option>
      <option value="true">Bots only</option>
      <option value="false">Exclude bots</option>
    </select>
  </div>
  <!-- NEW fields -->
  <div class="field">
    <label>ASN (optional)</label>
    <input type="text" placeholder="12389, 8359" />
    <p class="field__hint">AS numbers (comma-separated)</p>
  </div>
  <div class="field">
    <label>TLS Version (optional)</label>
    <select multiple>
      <option value="1.2">TLS 1.2</option>
      <option value="1.3">TLS 1.3</option>
    </select>
  </div>
</div>
```

**SmartLink tab:**
```html
<div data-rule-type-tab="smartlink">
  <div class="field">
    <label>UTM Source</label>
    <input type="text" placeholder="facebook, fb, instagram" />
  </div>
  <div class="field">
    <label>UTM Campaign</label>
    <input type="text" placeholder="summer2025" />
  </div>
  <div class="field">
    <label>UTM Content (optional)</label>
    <input type="text" placeholder="banner1" />
  </div>
  <div class="field">
    <label>Custom Parameters</label>
    <div data-repeatable-fields>
      <div class="cluster">
        <input type="text" placeholder="sub1" />
        <input type="text" placeholder="value" />
        <button class="btn btn--ghost btn--sm">Remove</button>
      </div>
    </div>
    <button class="btn btn--ghost btn--sm">Add parameter</button>
  </div>
</div>
```

---

### Validation Messages

**Client-side (before submit):**
```typescript
function validateRule(rule: TDSRule): string[] {
  const errors: string[] = [];

  // At least one condition
  const hasConditions = Object.keys(rule.match).length > 0;
  if (!hasConditions) {
    errors.push("At least one match condition is required");
  }

  // Regex validation
  if (rule.match.path) {
    rule.match.path.forEach((pattern, i) => {
      try {
        new RegExp(pattern);
      } catch {
        errors.push(`Invalid regex in path[${i}]: ${pattern}`);
      }
    });
  }

  // Weights validation
  if (rule.action.type === 'weighted_redirect') {
    const sum = rule.action.targets.reduce((s, t) => s + (t.weight || 0), 0);
    if (sum !== 100) {
      errors.push(`Weights must sum to 100 (current: ${sum})`);
    }
  }

  return errors;
}
```

**Server-side (API response):**
```json
{
  "ok": false,
  "errors": [
    {
      "field": "match.countries[0]",
      "code": "invalid_iso_code",
      "message": "Invalid ISO code: INVALID. Must be 2-letter alpha-2."
    }
  ]
}
```

---

## 🚀 Implementation Phases

### Phase 1: MVP (SmartShield only)

**Scope:**
- ✅ `tds_rules` table with basic fields
- ✅ API endpoints: GET, POST, PATCH, DELETE
- ✅ Match: path, countries, devices, bots (same as mini-tds)
- ✅ Action: redirect, response
- ✅ KV snapshot sync
- ✅ Validation

**Timeline:** 5-7 days

---

### Phase 2: SmartLink Support

**Scope:**
- ✅ Add `rule_type` discriminator
- ✅ Extend match_json for UTM params
- ✅ UI: Rule type toggle
- ✅ UI: SmartLink match form
- ✅ Validation for UTM params

**Timeline:** 3-4 days

---

### Phase 3: Advanced Features

**Scope:**
- ✅ weighted_redirect action
- ✅ ASN, TLS, IP ranges matching
- ✅ Reorder endpoint
- ✅ Audit log integration
- ✅ Free vs Paid plan limits

**Timeline:** 4-5 days

---

## 📚 References

- **Official spec:** `docs/301-wiki/TDS.md`
- **Data model:** `docs/301-wiki/Data_Model.md`
- **Mini-tds analysis:** `docs/mini-tds-analysis.md`
- **UI requirements:** `TODO-streams.md`
- **Redirects (別物):** `docs/301-wiki/Redirects.md`

---

## ✅ Summary Checklist for Backend

- [ ] Implement `tds_rules` table with `site_id` FK
- [ ] Add `rule_type` ENUM('smartlink', 'smartshield')
- [ ] Use JSON columns for `match_json` and `action_json`
- [ ] Implement all API endpoints (CRUD + validate + reorder)
- [ ] Support SmartLink match conditions (UTM params)
- [ ] Support SmartShield match conditions (geo, device, bots, ASN, TLS)
- [ ] Support all action types (redirect, weighted_redirect, response)
- [ ] Implement KV snapshot sync on every change
- [ ] Add server-side validation with detailed error messages
- [ ] Enforce Free/Paid plan limits
- [ ] Add ETag-based optimistic locking
- [ ] Write to audit_log on all changes
- [ ] Test with Edge-worker (read KV snapshot)

---

**Last updated:** 2025-12-24
**Next step:** Backend review and API design discussion
