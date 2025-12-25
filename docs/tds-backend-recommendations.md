# Рекомендации по Backend API для TDS

**Дата:** 2025-12-25 (обновлено)
**Основано на:**
- `docs/301-wiki/TDS.md` (официальная спецификация)
- `docs/301-wiki/Data_Model.md` (схема БД)
- `docs/mini-tds-analysis.md` (анализ прототипа mini-tds)
- `TODO-streams.md` (требования UI)

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Отказ от статических A/B тестов

**Команде бекенда:**

**НЕ РЕАЛИЗУЙТЕ `weighted_redirect` (статические A/B тесты с фиксированными весами).**

### Почему это плохо:

Классические A/B тесты с фиксированными весами (50/50, 60/40) — это **устаревший подход**, который:

- ❌ **Теряет деньги клиента**: Весь период теста показывает худший вариант в фиксированной пропорции
- ❌ **Медленная сходимость**: Нужны недели для статистической значимости
- ❌ **Ручное управление**: Аналитик должен следить, анализировать, менять веса
- ❌ **Не адаптируется**: Если условия меняются (время суток, аудитория), тест не реагирует
- ❌ **Нет конкурентного преимущества**: Все конкуренты предлагают то же самое

### ✅ Что реализовать вместо этого: Multi-Armed Bandits (MAB)

**MAB — это КЛЮЧЕВАЯ конкурентная фича 301.st.**

**Бизнес-выгода для клиента:**
- ✅ **Минимизация потерь**: Алгоритм автоматически снижает трафик на худший вариант
- ✅ **Быстрая оптимизация**: Сходимость за часы, а не недели
- ✅ **Автопилот**: Не нужен аналитик — ML сам оптимизирует
- ✅ **Real-time адаптация**: Реагирует на изменения аудитории
- ✅ **Конкурентное преимущество**: Почти никто из конкурентов не предлагает MAB

**Пример:**
- **Традиционный A/B** (50/50): Вариант A (CR 8%), Вариант B (CR 6%) → Общий CR = **7.0%**
- **MAB**: Начинается 50/50, сходится к 70/30 → Общий CR = **7.4%**
- **Результат: +5.7% к выручке** с того же трафика!

**Вывод:** MAB — это не просто "улучшение", это **маркетинговая фишка**, которая выделит 301.st среди конкурентов.

---

## 🎯 Executive Summary

**Ключевые выводы:**

1. ✅ **TDS ≠ Redirects** — это разные сущности с разными целями
2. ✅ **Два типа TDS** — SmartLink (UTM) vs SmartShield (CF metadata)
3. ✅ **Иерархия Site-based** — rules привязаны к Site, применяются ко всем доменам
4. ✅ **MAB вместо weighted_redirect** — ключевая конкурентная фича
5. ⚠️ **mini-tds не покрывает full spec** — это упрощенная версия только для SmartShield

**Рекомендация:** Backend должен реализовать **полную спецификацию** из 301-wiki + MAB для A/B тестов.

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
                      ├─ acceptor (role)  ← TDS правила применяются ЗДЕСЬ
                      ├─ donor (role)     ← Простые 301/302 → acceptor
                      └─ reserve (role)   ← Резервные домены
```

**TDS Rules привязаны к Site (site_id)**
**Правила применяются ТОЛЬКО к доменам с ролью `acceptor`**

**Ключевой принцип:** 1 Site = 1 Zone = N Domains (с разными ролями)

**Роли доменов:**
- **acceptor** - принимающий домен, на котором работает TDS Worker
  - Пример: `offer.example.com`, `promo.example.com`
  - На эти домены идет трафик из рекламы
  - TDS анализирует запросы и роутит по правилам

- **donor** - донорский домен (заблокированный/старый)
  - Пример: `old-domain.com`, `blocked-site.com`
  - Делает простой 301/302 redirect на acceptor
  - TDS правила НЕ применяются (это обычный redirect_rule)

- **reserve** - резервный домен
  - Готов стать acceptor при необходимости
  - TDS правила НЕ применяются (пока не активирован)

**Frontend implications:**
- UI показывает context bar с селектором Site (не domain!)
- При создании правила выбирается Site
- Правило автоматически применяется ко всем **acceptor** доменам сайта
- В UI показываем список acceptor доменов: "Правила применяются к: offer.example.com, promo.example.com"

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
  "url": "https://offer1.example.com/landing",
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

**MAB redirect (автооптимизирующийся A/B тест):**
```json
{
  "type": "mab_redirect",
  "algorithm": "thompson_sampling",
  "metric": "conversion_rate",
  "targets": [
    {
      "url": "https://offer1.example.com",
      "label": "Offer A",
      "stats": {
        "impressions": 1850,
        "conversions": 142,
        "revenue": 14200,
        "current_weight": 58.3,
        "estimated_value": 0.0768
      }
    },
    {
      "url": "https://offer2.example.com",
      "label": "Offer B",
      "stats": {
        "impressions": 1320,
        "conversions": 89,
        "revenue": 8900,
        "current_weight": 41.7,
        "estimated_value": 0.0674
      }
    }
  ],
  "min_sample_size": 100,
  "exploration_period": 3600,
  "confidence_level": 0.95,
  "status": 302,
  "preserveOriginalQuery": true
}
```

**⚠️ ВАЖНО:** `stats` — это read-only поля, обновляемые бекендом. Фронтенд только читает их для отображения в UI.

**Custom response (для ботов):**
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

**Правила валидации:**
1. `type` must be in **['redirect', 'mab_redirect', 'response']** ← НЕТ weighted_redirect!
2. Для `mab_redirect`:
   - `algorithm` in ['thompson_sampling', 'ucb', 'epsilon_greedy']
   - `metric` in ['conversion_rate', 'revenue_per_user', 'click_through_rate']
   - `targets` должно быть минимум 2 варианта
   - `min_sample_size` >= 10
   - `exploration_period` >= 0 (в секундах)
3. Для `response`: должен быть `bodyHtml` ИЛИ `bodyText`
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
      "label": "RU Mobile Casino → MAB A/B Test",
      "match": {
        "path": ["^/casino/([^/?#]+)"],
        "countries": ["RU", "BY"],
        "devices": ["mobile"],
        "bots": false
      },
      "action": {
        "type": "mab_redirect",
        "algorithm": "thompson_sampling",
        "metric": "conversion_rate",
        "targets": [
          {
            "url": "https://offer1.example.com",
            "label": "Offer A",
            "stats": {
              "impressions": 1850,
              "conversions": 142,
              "revenue": 14200,
              "current_weight": 58.3,
              "estimated_value": 0.0768
            }
          },
          {
            "url": "https://offer2.example.com",
            "label": "Offer B",
            "stats": {
              "impressions": 1320,
              "conversions": 89,
              "revenue": 8900,
              "current_weight": 41.7,
              "estimated_value": 0.0674
            }
          }
        ],
        "min_sample_size": 100,
        "exploration_period": 3600,
        "status": 302
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
    "url": "https://offer1.example.com/fb-summer",
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
    "countries": ["INVALID"],  // Неверный ISO код
    "devices": ["smartphone"]  // Неверный тип устройства
  },
  "action": {
    "type": "mab_redirect",
    "algorithm": "invalid_algo",  // Неверный алгоритм
    "metric": "conversion_rate",
    "targets": [
      { "url": "https://offer1.com", "label": "Offer A" }  // Только 1 вариант (нужно минимум 2)
    ],
    "min_sample_size": 5  // Меньше минимума (10)
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
      "field": "action.algorithm",
      "message": "Invalid algorithm: invalid_algo. Must be one of: thompson_sampling, ucb, epsilon_greedy."
    },
    {
      "field": "action.targets",
      "message": "MAB requires at least 2 variants. Current count: 1."
    },
    {
      "field": "action.min_sample_size",
      "message": "min_sample_size must be >= 10. Current value: 5."
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
| **A/B testing** | ❌ None | ✅ **MAB** (Multi-Armed Bandits) | ⚠️ КЛЮЧЕВАЯ фича! |
| **Match logic** | First match wins | First match wins | ✅ Same |
| **Match conditions** | path, countries, devices, bots | Same + UTM, ASN, TLS | ⚠️ Mini-tds subset |
| **Action types** | redirect, response | **redirect, mab_redirect, response** | ⚠️ НЕТ weighted_redirect! |
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

✅ **Реализовать все три типа:**

1. **redirect** — простой редирект на единственную цель
   - Поле `url` (строка)
   - Статус 301/302
   - Опции: preserveOriginalQuery, appendCountry, appendDevice

2. **mab_redirect** — автооптимизирующийся A/B тест (Multi-Armed Bandits)
   - **ОБЯЗАТЕЛЬНЫЕ поля:**
     - `algorithm`: 'thompson_sampling' | 'ucb' | 'epsilon_greedy'
     - `metric`: 'conversion_rate' | 'revenue_per_user' | 'click_through_rate'
     - `targets`: массив из 2+ вариантов (каждый с `url` и `label`)
   - **Опциональные поля:**
     - `min_sample_size` (default: 100)
     - `exploration_period` (default: 3600 сек = 1 час)
     - `confidence_level` (default: 0.95, только для UCB)
     - `epsilon` (default: 0.1, только для epsilon-greedy)
   - **Read-only поля (обновляет бекенд):**
     - `targets[].stats.impressions`
     - `targets[].stats.conversions`
     - `targets[].stats.revenue`
     - `targets[].stats.current_weight` (динамический вес в %)
     - `targets[].stats.estimated_value` (оценка алгоритма)

3. **response** — кастомный HTML/текст ответ (для ботов)
   - `bodyHtml` ИЛИ `bodyText`
   - `status` (200, 403, 404, и т.д.)
   - `headers` (опционально)

**❌ НЕ РЕАЛИЗУЙТЕ `weighted_redirect`** — это устаревший подход!

**Валидация для mab_redirect:**
- Минимум 2 варианта в `targets`
- `algorithm` должен быть из списка
- `metric` должен быть из списка
- `min_sample_size` >= 10
- `exploration_period` >= 0

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
- 1 TDS rule set (все правила принадлежат одному сайту)
- Max 5-10 правил на сайт
- SmartLink + SmartShield оба доступны
- Базовые действия (redirect, response)
- ❌ **БЕЗ MAB** (только простые редиректы)

✅ **Paid plan:**
- Множественные TDS rule sets (можно создать несколько сайтов)
- Max 50+ правил на сайт
- ✅ **MAB redirect** (автооптимизирующиеся A/B тесты) — **КЛЮЧЕВАЯ фича платного плана!**
- Продвинутые условия (ASN, TLS, IP ranges)
- Приоритетная поддержка

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

  // MAB validation
  if (rule.action.type === 'mab_redirect') {
    if (!rule.action.targets || rule.action.targets.length < 2) {
      errors.push("MAB requires at least 2 variants");
    }
    if (!['thompson_sampling', 'ucb', 'epsilon_greedy'].includes(rule.action.algorithm)) {
      errors.push(`Invalid algorithm: ${rule.action.algorithm}`);
    }
    if (!['conversion_rate', 'revenue_per_user', 'click_through_rate'].includes(rule.action.metric)) {
      errors.push(`Invalid metric: ${rule.action.metric}`);
    }
    if (rule.action.min_sample_size && rule.action.min_sample_size < 10) {
      errors.push("min_sample_size must be >= 10");
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

### Phase 3: MAB + Advanced Features

**Scope:**
- ✅ **mab_redirect action** (Multi-Armed Bandits) — **КЛЮЧЕВАЯ ФИЧА!**
  - Thompson Sampling algorithm
  - UCB algorithm
  - Epsilon-Greedy algorithm
  - Stats tracking (impressions, conversions, revenue)
  - Dynamic weight calculation
- ✅ ASN, TLS, IP ranges matching (SmartShield advanced)
- ✅ Reorder endpoint (batch priority updates)
- ✅ Audit log integration
- ✅ Free vs Paid plan limits (MAB только в Paid)
- ✅ Postback URL для получения метрик конверсий

**Timeline:** 7-10 дней (MAB требует реализации алгоритмов)

---

## 📚 References

- **Official spec:** `docs/301-wiki/TDS.md`
- **Data model:** `docs/301-wiki/Data_Model.md`
- **Mini-tds analysis:** `docs/mini-tds-analysis.md`
- **UI requirements:** `TODO-streams.md`
- **Redirects (別物):** `docs/301-wiki/Redirects.md`

---

## ✅ Summary Checklist для Backend-команды

### Базовая инфраструктура
- [ ] Реализовать таблицу `tds_rules` с FK `site_id`
- [ ] Добавить `rule_type` ENUM('smartlink', 'smartshield')
- [ ] Использовать JSON колонки для `match_json` и `action_json`
- [ ] Реализовать все API endpoints (CRUD + validate + reorder)
- [ ] Добавить ETag-based optimistic locking (If-Match headers)
- [ ] Писать в audit_log на все изменения

### Match условия
- [ ] SmartLink: поддержка UTM params (source, campaign, content, medium)
- [ ] SmartShield: geo, device, bots, path (regex)
- [ ] SmartShield Advanced: ASN, TLS version, IP ranges (CIDR)

### Action types
- [ ] **redirect** — простой редирект (`url: string`)
- [ ] **mab_redirect** — Multi-Armed Bandits (КЛЮЧЕВАЯ ФИЧА!)
  - [ ] Thompson Sampling algorithm
  - [ ] UCB algorithm
  - [ ] Epsilon-Greedy algorithm
  - [ ] Stats tracking (impressions, conversions, revenue)
  - [ ] Dynamic weight calculation
  - [ ] Postback URL для метрик конверсий
- [ ] **response** — кастомный HTML/текст ответ
- [ ] ❌ **НЕ РЕАЛИЗУЙТЕ weighted_redirect** (устарело!)

### Хранение и синхронизация
- [ ] KV snapshot sync при каждом изменении
- [ ] Только enabled правила в KV, отсортированные по priority
- [ ] Edge-worker читает KV snapshot (read-only)

### Валидация
- [ ] Server-side валидация с детальными error messages
- [ ] Client-side валидация (примеры в документе)
- [ ] Endpoint `/validate` для проверки перед сохранением

### Ограничения тарифов
- [ ] Free plan: redirect + response только (БЕЗ MAB)
- [ ] Paid plan: все фичи включая MAB
- [ ] Enforcement лимитов по количеству правил

### Тестирование
- [ ] Протестировать с Edge-worker (чтение KV snapshot)
- [ ] Нагрузочное тестирование MAB алгоритмов
- [ ] E2E тесты с UI (TODO-streams.md)

---

**Дата обновления:** 2025-12-25
**Критическое изменение:** Отказ от weighted_redirect в пользу MAB
**Следующий шаг:** Backend review, обсуждение API design + MAB алгоритмов
