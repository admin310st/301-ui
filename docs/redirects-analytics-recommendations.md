# Рекомендации по Backend API для Redirects Analytics

**Дата:** 2025-12-28
**Основано на:**
- `docs/301-wiki/API.md` (официальная спецификация)
- `docs/301-wiki/Data_Model.md` (схема БД)
- Cloudflare Redirect Rules API документация
- Cloudflare Workers API документация

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Ограничения Cloudflare API

**Команде бекенда:**

**Cloudflare Redirect Rules API НЕ ПРЕДОСТАВЛЯЕТ per-rule analytics.**

### Что доступно через CF API:

- ✅ **EdgeResponseStatus** (301/302/307/308) — факт редиректа
- ✅ **Logpush** — логи запросов (требует Enterprise план или платную подписку Logpush)
- ✅ **Workers Analytics Engine** — только если используется Worker redirect
- ❌ **НЕТ** встроенной аналитики по отдельным Redirect Rules
- ❌ **НЕТ** счётчиков кликов из коробки

**Вывод:** Для аналитики кликов необходимо использовать **Workers-based подход** или **Logpush**.

---

## 🎯 Executive Summary

**Ключевые выводы:**

1. ✅ **Analytics ≠ обязательная фича** — это опциональный режим для каждого сайта
2. ✅ **Два режима редиректа:**
   - **Simple Redirect Rule** (CF Redirect Rules) — без аналитики, бесплатно
   - **Worker Redirect** (CF Workers) — с аналитикой, требует Worker requests (лимиты по плану)
3. ✅ **Analytics toggles per-site** — включается/выключается для acceptor domain (сайта)
4. ⚠️ **CF Free plan лимиты** — 100K requests/day на Workers → нельзя включить на всех доменах
5. ✅ **Data aggregation** — клики по donor domains суммируются на acceptor domain

**Рекомендация:** Backend должен поддерживать два режима redirect + Worker-based analytics tracking.

---

## 📊 Redirect Modes Comparison

### Simple Redirect Rule vs Worker Redirect

| Aspect | Simple Redirect Rule | Worker Redirect |
|--------|----------------------|-----------------|
| **Implementation** | CF Redirect Rules API | CF Workers API |
| **Analytics** | ❌ None | ✅ Полная аналитика |
| **Free plan** | Unlimited (10 rules limit) | 100K requests/day |
| **Response time** | ~1-2ms | ~5-15ms |
| **Use case** | Простые редиректы без аналитики | Редиректы с отслеживанием кликов |
| **Cost** | Free | Free до 100K/day, потом платно |
| **Setup complexity** | Low (API call) | Medium (Worker deploy) |

**Важно:** Не все redirect rules должны использовать Workers! Только когда нужна аналитика.

---

## 🏗️ Analytics Architecture

### Data Flow

```
User visits blocked-domain.com
  ↓
If analytics_enabled=false (Simple Redirect Rule):
  → CF Redirect Rule → 301/302 → target-site.com
  → NO tracking
  → NO Worker overhead

If analytics_enabled=true (Worker Redirect):
  → Worker intercepts request
  → Worker logs click to Analytics Engine
  → Worker sends 301/302 → target-site.com
  → Analytics aggregated in D1 (batch job)
```

### Hierarchy

```
Account
  └─ Project (кампания/бренд)
       └─ Site (acceptor domain - принимающий сайт)
            └─ Domains (redirect_rules)
                 ├─ acceptor (role)  ← Analytics aggregated HERE
                 ├─ donor (role)     ← Individual clicks tracked
                 └─ disabled         ← No analytics
```

**Analytics Rules:**
- **Acceptor domain** (role='acceptor'): аналитика показывает суммарные клики от всех donor domains
- **Donor domain** (role='donor'): аналитика показывает индивидуальные клики этого домена
- **analytics_enabled** — глобальный флаг на уровне Site (acceptor domain)
- Все donor domains этого сайта используют тот же режим (Worker или Redirect Rule)

---

## 🗄️ Database Schema Recommendations

### redirect_rules Table Extension

**Existing fields:**
```sql
CREATE TABLE redirect_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  domain_id INTEGER NOT NULL,

  role TEXT NOT NULL CHECK(role IN ('acceptor', 'donor', 'reserve')),
  target_url TEXT,  -- NULL for acceptor
  redirect_code INTEGER DEFAULT 301,
  enabled BOOLEAN NOT NULL DEFAULT 1,

  cf_rule_id TEXT,  -- Cloudflare Redirect Rule ID (если Simple mode)
  cf_worker_name TEXT,  -- Cloudflare Worker name (если Worker mode)

  -- ... другие поля

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);
```

**NEW: Add analytics_enabled field:**
```sql
ALTER TABLE redirect_rules ADD COLUMN analytics_enabled BOOLEAN NOT NULL DEFAULT 0;

-- Index for queries
CREATE INDEX idx_redirect_analytics ON redirect_rules(site_id, analytics_enabled, enabled);
```

**Правило:**
- `analytics_enabled=0` → используется CF Redirect Rules API (cf_rule_id заполнен)
- `analytics_enabled=1` → используется CF Workers API (cf_worker_name заполнен)

---

### redirect_analytics Table (NEW)

**Purpose:** Хранение агрегированной аналитики по кликам

```sql
CREATE TABLE redirect_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  redirect_rule_id INTEGER NOT NULL,  -- FK to redirect_rules

  -- Aggregated metrics
  clicks_total INTEGER NOT NULL DEFAULT 0,
  clicks_24h INTEGER NOT NULL DEFAULT 0,
  clicks_7d INTEGER NOT NULL DEFAULT 0,
  clicks_30d INTEGER NOT NULL DEFAULT 0,

  -- Trend analysis
  trend TEXT CHECK(trend IN ('up', 'down', 'neutral')),

  -- Timestamps
  last_click_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (redirect_rule_id) REFERENCES redirect_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_redirect_analytics_rule ON redirect_analytics(redirect_rule_id);
CREATE INDEX idx_redirect_analytics_account ON redirect_analytics(account_id);
```

**Важно:**
- Эта таблица содержит **агрегированные данные** (обновляется batch job каждые N минут)
- **НЕ** хранит каждый клик (для этого используется CF Analytics Engine или Logpush)

---

### redirect_clicks_raw Table (Опционально)

**Purpose:** Raw click events (если НЕ используется CF Analytics Engine)

```sql
CREATE TABLE redirect_clicks_raw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  redirect_rule_id INTEGER NOT NULL,

  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,  -- ISO code from request.cf.country
  city TEXT,     -- from request.cf.city
  asn INTEGER,   -- from request.cf.asn

  -- Click metadata
  referer TEXT,
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (redirect_rule_id) REFERENCES redirect_rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_redirect_clicks_timestamp ON redirect_clicks_raw(clicked_at);
CREATE INDEX idx_redirect_clicks_rule ON redirect_clicks_raw(redirect_rule_id, clicked_at);
```

**Альтернатива:** Вместо `redirect_clicks_raw` использовать **CF Analytics Engine** → batch-импорт в D1 каждые 5-15 минут.

**Рекомендация:** Использовать CF Analytics Engine (проще + дешевле хранение).

---

## 🔌 API Endpoints

### Core Endpoints

```
GET    /api/sites/:siteId/redirects
GET    /api/sites/:siteId/redirects/:id
POST   /api/sites/:siteId/redirects
PATCH  /api/sites/:siteId/redirects/:id
DELETE /api/sites/:siteId/redirects/:id
POST   /api/sites/:siteId/redirects/toggle-analytics
GET    /api/sites/:siteId/redirects/:id/analytics
```

---

### GET /api/sites/:siteId/redirects

**Response:**
```json
{
  "redirects": [
    {
      "id": 1,
      "site_id": 123,
      "domain": "cryptoboss.pics",
      "role": "acceptor",
      "target_url": null,
      "redirect_code": 301,
      "enabled": true,
      "analytics_enabled": true,
      "cf_worker_name": "redirect-cryptoboss-pics",
      "cf_rule_id": null,
      "analytics": {
        "clicks_total": 12847,
        "clicks_24h": 142,
        "clicks_7d": 2370,
        "clicks_30d": 8234,
        "trend": "up",
        "last_click_at": "2025-12-28T14:32:15Z"
      },
      "created_at": "2025-01-08T10:00:00Z",
      "updated_at": "2025-01-08T10:00:00Z"
    },
    {
      "id": 3,
      "site_id": 123,
      "domain": "cryptoboss.online",
      "role": "donor",
      "target_url": "https://cryptoboss.pics",
      "redirect_code": 301,
      "enabled": true,
      "analytics_enabled": true,
      "cf_worker_name": "redirect-cryptoboss-online",
      "cf_rule_id": null,
      "analytics": {
        "clicks_total": 5423,
        "clicks_24h": 89,
        "clicks_7d": 1847,
        "clicks_30d": 3821,
        "trend": "up",
        "last_click_at": "2025-12-28T14:18:45Z"
      },
      "created_at": "2025-01-10T12:00:00Z",
      "updated_at": "2025-01-13T18:15:27Z"
    },
    {
      "id": 4,
      "site_id": 123,
      "domain": "verylongdomainname20.com",
      "role": "donor",
      "target_url": "https://cryptoboss.pics",
      "redirect_code": 301,
      "enabled": false,
      "analytics_enabled": false,
      "cf_worker_name": null,
      "cf_rule_id": "abc123def456",
      "analytics": null,
      "created_at": "2025-01-05T14:00:00Z",
      "updated_at": "2025-01-05T14:00:00Z"
    }
  ]
}
```

**Правила:**
- Если `analytics_enabled=false` → поле `analytics` равно `null`
- Если `analytics_enabled=true` но данных ещё нет → поле `analytics` равно `null` (Worker collecting)
- Если `analytics_enabled=true` и есть данные → поле `analytics` заполнено

---

### POST /api/sites/:siteId/redirects/toggle-analytics

**Purpose:** Включить/выключить аналитику для всего сайта (acceptor + все donor domains)

**Request:**
```json
{
  "analytics_enabled": true
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Analytics enabled for site cryptoboss.pics. Deploying Workers for 3 domains...",
  "affected_domains": [
    "cryptoboss.pics",
    "cryptoboss.online",
    "verylongdomainname20.com"
  ],
  "cf_workers_deployed": [
    "redirect-cryptoboss-pics",
    "redirect-cryptoboss-online",
    "redirect-verylongdomainname20"
  ]
}
```

**Backend Logic:**

**When enabling analytics (`analytics_enabled: true`):**
1. Найти acceptor domain для site_id
2. Найти все donor domains с `target_url = acceptor_domain`
3. Для каждого домена:
   - Удалить CF Redirect Rule (если есть `cf_rule_id`)
   - Создать CF Worker redirect
   - Worker должен:
     - Логировать клик в CF Analytics Engine
     - Отправлять 301/302 redirect
   - Сохранить `cf_worker_name`
   - Установить `analytics_enabled=1`

**When disabling analytics (`analytics_enabled: false`):**
1. Найти все domains для site_id
2. Для каждого домена:
   - Удалить CF Worker (если есть `cf_worker_name`)
   - Создать CF Redirect Rule
   - Сохранить `cf_rule_id`
   - Установить `analytics_enabled=0`

**CF API calls:**
```javascript
// Enable analytics - Create Worker
await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`, {
  method: 'PUT',
  body: workerScript, // См. Worker Script Template ниже
});

// Disable analytics - Create Redirect Rule
await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, {
  method: 'PUT',
  body: JSON.stringify({
    rules: [
      {
        expression: `http.host eq "${domain}"`,
        action: 'redirect',
        action_parameters: {
          from_value: { status_code: 301, target_url: targetUrl }
        }
      }
    ]
  })
});
```

---

### GET /api/sites/:siteId/redirects/:id/analytics

**Purpose:** Получить детальную аналитику по отдельному redirect rule

**Response:**
```json
{
  "redirect_id": 1,
  "domain": "cryptoboss.pics",
  "analytics_enabled": true,
  "metrics": {
    "clicks_total": 12847,
    "clicks_24h": 142,
    "clicks_7d": 2370,
    "clicks_30d": 8234,
    "trend": "up",
    "last_click_at": "2025-12-28T14:32:15Z"
  },
  "chart_data": {
    "labels": ["2025-12-21", "2025-12-22", "2025-12-23", "2025-12-24", "2025-12-25", "2025-12-26", "2025-12-27", "2025-12-28"],
    "clicks": [312, 298, 341, 329, 354, 387, 349, 142]
  },
  "top_countries": [
    { "country": "RU", "clicks": 1523, "percentage": 64.3 },
    { "country": "UA", "clicks": 482, "percentage": 20.3 },
    { "country": "BY", "clicks": 365, "percentage": 15.4 }
  ],
  "top_devices": [
    { "device": "mobile", "clicks": 1847, "percentage": 77.9 },
    { "device": "desktop", "clicks": 423, "percentage": 17.8 },
    { "device": "tablet", "clicks": 100, "percentage": 4.3 }
  ]
}
```

**Data Source:**
- **Basic metrics** (`clicks_*`, `trend`) — из таблицы `redirect_analytics`
- **Chart data** — агрегация из CF Analytics Engine или `redirect_clicks_raw`
- **Top countries/devices** — агрегация из CF Analytics Engine

---

## 💾 Cloudflare Worker Script Template

### Worker Code (TypeScript)

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const domain = url.hostname;

    // Получаем redirect config из KV (или hardcode в Worker)
    const redirectConfig = await env.KV_REDIRECTS.get(`redirect:${domain}`, 'json');

    if (!redirectConfig) {
      return new Response('Redirect not configured', { status: 404 });
    }

    const { target_url, redirect_code, analytics_enabled, redirect_rule_id } = redirectConfig;

    // Если аналитика включена — логируем клик
    if (analytics_enabled && env.ANALYTICS_ENGINE) {
      const clickEvent = {
        indexes: [`redirect_rule_id:${redirect_rule_id}`],
        doubles: [1], // count=1
        blobs: [
          request.cf?.country || 'UNKNOWN',
          request.cf?.city || '',
          request.headers.get('user-agent') || '',
          request.headers.get('referer') || ''
        ]
      };

      env.ANALYTICS_ENGINE.writeDataPoint(clickEvent);
    }

    // Отправляем редирект
    return Response.redirect(target_url, redirect_code);
  }
};
```

**ENV Bindings:**
```toml
# wrangler.toml
name = "redirect-cryptoboss-pics"
main = "src/worker.ts"
compatibility_date = "2025-01-15"

[[analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"

[[kv_namespaces]]
binding = "KV_REDIRECTS"
id = "your-kv-namespace-id"
```

---

## 📊 Analytics Aggregation (Batch Job)

### Background Job: Aggregate Clicks

**Run frequency:** Каждые 5-15 минут (cron schedule)

**Job logic:**
```sql
-- Query CF Analytics Engine data (last 30 days)
-- Группируем по redirect_rule_id

WITH click_stats AS (
  SELECT
    redirect_rule_id,
    COUNT(*) AS total_clicks,
    COUNT(CASE WHEN clicked_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS clicks_24h,
    COUNT(CASE WHEN clicked_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS clicks_7d,
    COUNT(CASE WHEN clicked_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS clicks_30d,
    MAX(clicked_at) AS last_click_at
  FROM redirect_clicks_raw
  WHERE clicked_at >= NOW() - INTERVAL '30 days'
  GROUP BY redirect_rule_id
),
trend_calc AS (
  SELECT
    redirect_rule_id,
    clicks_7d,
    -- Сравниваем с предыдущими 7 днями
    LAG(clicks_7d) OVER (PARTITION BY redirect_rule_id ORDER BY updated_at) AS prev_clicks_7d,
    CASE
      WHEN clicks_7d > prev_clicks_7d * 1.1 THEN 'up'
      WHEN clicks_7d < prev_clicks_7d * 0.9 THEN 'down'
      ELSE 'neutral'
    END AS trend
  FROM click_stats
)
-- Обновляем таблицу redirect_analytics
INSERT INTO redirect_analytics (redirect_rule_id, clicks_total, clicks_24h, clicks_7d, clicks_30d, trend, last_click_at, updated_at)
SELECT
  cs.redirect_rule_id,
  cs.total_clicks,
  cs.clicks_24h,
  cs.clicks_7d,
  cs.clicks_30d,
  tc.trend,
  cs.last_click_at,
  NOW()
FROM click_stats cs
JOIN trend_calc tc ON cs.redirect_rule_id = tc.redirect_rule_id
ON CONFLICT (redirect_rule_id)
DO UPDATE SET
  clicks_total = EXCLUDED.clicks_total,
  clicks_24h = EXCLUDED.clicks_24h,
  clicks_7d = EXCLUDED.clicks_7d,
  clicks_30d = EXCLUDED.clicks_30d,
  trend = EXCLUDED.trend,
  last_click_at = EXCLUDED.last_click_at,
  updated_at = NOW();
```

**Альтернатива (если используется CF Analytics Engine):**
```javascript
// Query CF Analytics Engine via API
const query = `
  SELECT
    index1 AS redirect_rule_id,
    SUM(double1) AS total_clicks,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '24' HOUR THEN double1 ELSE 0 END) AS clicks_24h,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7' DAY THEN double1 ELSE 0 END) AS clicks_7d,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30' DAY THEN double1 ELSE 0 END) AS clicks_30d,
    MAX(timestamp) AS last_click_at
  FROM analytics_engine_dataset
  WHERE timestamp >= NOW() - INTERVAL '30' DAY
  GROUP BY redirect_rule_id
`;

const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query })
});

const results = await response.json();

// Обновить таблицу redirect_analytics
for (const row of results.data) {
  await db.execute(`
    INSERT INTO redirect_analytics (redirect_rule_id, clicks_total, clicks_24h, clicks_7d, clicks_30d, last_click_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON CONFLICT (redirect_rule_id)
    DO UPDATE SET
      clicks_total = EXCLUDED.clicks_total,
      clicks_24h = EXCLUDED.clicks_24h,
      clicks_7d = EXCLUDED.clicks_7d,
      clicks_30d = EXCLUDED.clicks_30d,
      last_click_at = EXCLUDED.last_click_at,
      updated_at = NOW()
  `, [row.redirect_rule_id, row.total_clicks, row.clicks_24h, row.clicks_7d, row.clicks_30d, row.last_click_at]);
}
```

---

## 🔒 Free vs Paid Plan Limits

### Cloudflare Workers Limits

| Plan | Workers Requests | Redirect Rules | Cost |
|------|------------------|----------------|------|
| **Free** | 100,000/day | 10 rules | $0 |
| **Workers Paid** | 10M/month | Unlimited | $5/month + $0.50 per 1M requests |
| **Enterprise** | Unlimited | Unlimited | Custom pricing |

**Recommendation for 301.st:**
- **Free plan users**: Можно включить аналитику только для 1-2 сайтов с небольшим трафиком
- **Paid plan users**: Можно включить аналитику для всех сайтов
- **Enforcement**: Backend должен проверять лимиты и блокировать включение аналитики при превышении

---

### API Enforcement

**Before enabling analytics:**
```sql
-- Подсчитать текущее количество domains с analytics_enabled
SELECT COUNT(*) AS analytics_enabled_count
FROM redirect_rules
WHERE account_id = ? AND analytics_enabled = 1;

-- Проверить лимит по плану
IF analytics_enabled_count >= plan_limit THEN
  RETURN {
    ok: false,
    error: 'analytics_limit_exceeded',
    message: 'You have reached the maximum number of domains with analytics enabled for your plan. Upgrade to enable analytics for more domains.',
    current_count: analytics_enabled_count,
    plan_limit: plan_limit
  };
END IF;
```

**Plan limits:**
```json
{
  "free": {
    "max_analytics_domains": 2,
    "max_monthly_requests": 100000
  },
  "starter": {
    "max_analytics_domains": 10,
    "max_monthly_requests": 1000000
  },
  "pro": {
    "max_analytics_domains": 50,
    "max_monthly_requests": 10000000
  }
}
```

---

## 📋 Recommendations for Backend

### 1. Database Schema

✅ **Implement:**
- `analytics_enabled` boolean column in `redirect_rules`
- `redirect_analytics` table for aggregated metrics
- `cf_worker_name` column in `redirect_rules` (хранит имя Worker, если analytics enabled)
- Batch aggregation job (каждые 5-15 минут)

❌ **Don't:**
- Don't store raw clicks in D1 (используйте CF Analytics Engine)
- Don't query CF Analytics Engine в real-time из API (используйте кеш в `redirect_analytics`)

---

### 2. API Endpoints

✅ **Implement:**
- `POST /api/sites/:siteId/redirects/toggle-analytics` — включить/выключить для всего сайта
- `GET /api/sites/:siteId/redirects/:id/analytics` — детальная аналитика
- Include `analytics` field in main `GET /api/sites/:siteId/redirects` response

❌ **Don't:**
- Don't allow per-redirect analytics toggle (только per-site!)
- Don't expose raw click events через API (только агрегированные данные)

---

### 3. Cloudflare Workers Deployment

✅ **Implement:**
- Автоматическое создание Worker при `analytics_enabled=true`
- Worker script injection с правильными bindings (Analytics Engine, KV)
- Удаление Worker при `analytics_enabled=false`
- Fallback на CF Redirect Rules если Worker deployment failed

❌ **Don't:**
- Don't hardcode Worker scripts (используйте templates)
- Don't forget to cleanup Workers при удалении redirect rule

---

### 4. Analytics Data Collection

✅ **Implement:**
- CF Analytics Engine для хранения raw events
- Batch aggregation job (cron каждые 5-15 минут)
- Trend calculation: сравнивать `clicks_7d` текущие vs предыдущие 7 дней
- Top countries/devices aggregation (для детального view)

❌ **Don't:**
- Don't query CF Analytics Engine on every API request (используйте кеш)
- Don't store PII (IP addresses) — GDPR compliance

---

## 🚀 Implementation Phases

### Phase 1: Basic Analytics Toggle (MVP)

**Scope:**
- ✅ Add `analytics_enabled` column to `redirect_rules`
- ✅ Add `redirect_analytics` table
- ✅ API endpoint: `POST /api/sites/:siteId/redirects/toggle-analytics`
- ✅ Worker template creation
- ✅ CF Workers deployment (create/delete)
- ✅ Basic metrics aggregation (clicks_7d)

**Timeline:** 3-4 дня

---

### Phase 2: Analytics Dashboard

**Scope:**
- ✅ API endpoint: `GET /api/sites/:siteId/redirects/:id/analytics`
- ✅ Chart data (last 7/30 days)
- ✅ Top countries/devices breakdown
- ✅ Trend calculation (up/down/neutral)
- ✅ Batch aggregation job (cron)

**Timeline:** 3-4 дня

---

### Phase 3: Advanced Features

**Scope:**
- ✅ Plan limits enforcement
- ✅ Usage warnings (approaching limit)
- ✅ Analytics export (CSV/JSON)
- ✅ Real-time click stream (WebSocket, опционально)

**Timeline:** 2-3 дня

---

## ✅ Summary Checklist для Backend-команды

### Базовая инфраструктура
- [ ] Добавить `analytics_enabled BOOLEAN DEFAULT 0` в `redirect_rules`
- [ ] Добавить `cf_worker_name TEXT` в `redirect_rules`
- [ ] Создать таблицу `redirect_analytics` для агрегации
- [ ] Реализовать API endpoint `POST /api/sites/:siteId/redirects/toggle-analytics`
- [ ] Реализовать API endpoint `GET /api/sites/:siteId/redirects/:id/analytics`

### Cloudflare Workers
- [ ] Создать Worker template с Analytics Engine binding
- [ ] Реализовать Worker deployment via CF API
- [ ] Реализовать Worker cleanup при disable analytics
- [ ] Настроить KV namespace для redirect configs

### Analytics Collection
- [ ] Настроить CF Analytics Engine dataset
- [ ] Реализовать batch aggregation job (cron каждые 5-15 минут)
- [ ] Реализовать trend calculation (up/down/neutral)
- [ ] Реализовать top countries/devices aggregation

### Plan Limits
- [ ] Проверять `max_analytics_domains` перед enable
- [ ] Отслеживать usage (monthly requests)
- [ ] Показывать warnings при приближении к лимиту

### Тестирование
- [ ] Протестировать Worker deployment
- [ ] Протестировать Analytics Engine data collection
- [ ] Протестировать batch aggregation
- [ ] E2E тест: enable analytics → клики → dashboard показывает данные

---

**Дата обновления:** 2025-12-28
**Критическое замечание:** CF Redirect Rules API не предоставляет аналитику — используйте Workers
**Следующий шаг:** Backend review, обсуждение CF Workers architecture
