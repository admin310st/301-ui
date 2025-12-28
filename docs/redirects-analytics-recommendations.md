# Рекомендации по Backend API для Redirects Analytics

**Дата:** 2025-12-28
**Основано на:**
- `docs/301-wiki/API.md` (официальная спецификация)
- `docs/301-wiki/Data_Model.md` (схема БД)
- Cloudflare GraphQL Analytics API документация
- Cloudflare httpRequestsAdaptiveGroups dataset

---

## ✅ Правильная архитектура: Cloudflare GraphQL Analytics API

**Команде бекенда:**

**Cloudflare предоставляет аналитику redirect rules через GraphQL Analytics API.**

### Что доступно через CF GraphQL Analytics API:

- ✅ **httpRequestsAdaptiveGroups** dataset — доступен на Free плане (essential dataset)
- ✅ **3xx redirect hits** (301/302/307/308) — счётчики редиректов
- ✅ **Breakdown по:**
  - `clientRequestHTTPHost` (hostname) — какой домен получил запрос
  - `clientCountryName` (country) — из какой страны пришёл трафик
  - `clientASN` (AS number) — провайдер пользователя
  - `clientDeviceType` (device) — mobile/desktop/tablet
  - `edgeResponseStatus` (response code) — 301, 302, 307, 308
- ✅ **Временные графики** (time series) — динамика кликов
- ✅ **Redirect rate** (доля 3xx запросов от общего трафика)

**Ограничения Free плана:**
- Глубина истории: **до 3 дней** (vs 30 дней на Paid/Enterprise)
- Количество запросов API: **~1000 запросов/день**
- Некоторые advanced dimensions могут быть недоступны

**Вывод:** Для простых редиректов НЕ НУЖНЫ Workers! CF уже предоставляет аналитику через GraphQL API.

---

## 🎯 Executive Summary

**Ключевые выводы:**

1. ✅ **Analytics available for all redirect rules** — данные доступны для всех Redirect Rules на Free плане
2. ✅ **No Workers needed** — аналитика идёт через CF GraphQL Analytics API (не требует Workers)
3. ✅ **Simple implementation** — Backend просто запрашивает GraphQL API каждые 5-15 минут
4. ⚠️ **Free plan лимиты** — 3 дня истории, ~1000 API calls/day
5. ✅ **Data aggregation** — клики по donor domains можно агрегировать на acceptor domain

**Рекомендация:** Backend должен использовать GraphQL Analytics API + batch aggregation в D1.

---

## 📊 Architecture: GraphQL Analytics API → D1 Aggregation

### Data Flow

```
CF Edge handles 301/302 redirects
  ↓
CF logs 3xx responses to httpRequestsAdaptiveGroups dataset
  ↓
Backend batch job (every 5-15 min):
  - Query CF GraphQL Analytics API
  - Aggregate clicks by domain/hostname
  - Calculate trend (compare 7d current vs 7d previous)
  - Store in D1 table: redirect_analytics
  ↓
Frontend API endpoint:
  - GET /api/sites/:siteId/redirects
  - Returns aggregated analytics from D1
```

**No Workers, no complex tracking — just GraphQL queries!**

---

## 🔌 Cloudflare GraphQL Analytics API

### GraphQL Query Example

```graphql
query RedirectAnalytics($zoneTag: String!, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequestsAdaptiveGroups(
        filter: $filter
        limit: 10000
        orderBy: [datetimeMinute_DESC]
      ) {
        dimensions {
          datetimeMinute
          clientRequestHTTPHost
          edgeResponseStatus
          clientCountryName
          clientDeviceType
        }
        sum {
          requests
        }
      }
    }
  }
}
```

### Filter для 3xx редиректов

```json
{
  "zoneTag": "abc123zone",
  "filter": {
    "AND": [
      {
        "edgeResponseStatus_geq": 300,
        "edgeResponseStatus_lt": 400
      },
      {
        "clientRequestHTTPHost_in": ["cryptoboss.pics", "cryptoboss.online", "verylongdomainname20.com"]
      },
      {
        "datetime_geq": "2025-12-21T00:00:00Z",
        "datetime_lt": "2025-12-28T23:59:59Z"
      }
    ]
  }
}
```

### Response Example

```json
{
  "data": {
    "viewer": {
      "zones": [
        {
          "httpRequestsAdaptiveGroups": [
            {
              "dimensions": {
                "datetimeMinute": "2025-12-28T14:23:00Z",
                "clientRequestHTTPHost": "cryptoboss.online",
                "edgeResponseStatus": 301,
                "clientCountryName": "Russia",
                "clientDeviceType": "mobile"
              },
              "sum": {
                "requests": 42
              }
            },
            {
              "dimensions": {
                "datetimeMinute": "2025-12-28T14:22:00Z",
                "clientRequestHTTPHost": "cryptoboss.pics",
                "edgeResponseStatus": 301,
                "clientCountryName": "Ukraine",
                "clientDeviceType": "desktop"
              },
              "sum": {
                "requests": 18
              }
            }
          ]
        }
      ]
    }
  }
}
```

---

## 🗄️ Database Schema

### redirect_analytics Table

**Purpose:** Хранение агрегированной аналитики по кликам (обновляется batch job)

```sql
CREATE TABLE redirect_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  redirect_rule_id INTEGER NOT NULL,  -- FK to redirect_rules

  -- Aggregated metrics (from CF GraphQL Analytics API)
  clicks_total INTEGER NOT NULL DEFAULT 0,     -- All-time clicks (limited by CF data retention)
  clicks_24h INTEGER NOT NULL DEFAULT 0,        -- Last 24 hours
  clicks_7d INTEGER NOT NULL DEFAULT 0,         -- Last 7 days
  clicks_30d INTEGER NOT NULL DEFAULT 0,        -- Last 30 days (0 on Free plan if >3 days)

  -- Trend analysis (calculated by comparing current 7d vs previous 7d)
  trend TEXT CHECK(trend IN ('up', 'down', 'neutral')),

  -- Timestamps
  last_click_at TIMESTAMP,                      -- Most recent click from CF logs
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (redirect_rule_id) REFERENCES redirect_rules(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_redirect_analytics_rule ON redirect_analytics(redirect_rule_id);
CREATE INDEX idx_redirect_analytics_account ON redirect_analytics(account_id);
```

**Важно:**
- Эта таблица содержит **агрегированные данные** (обновляется batch job каждые 5-15 минут)
- **НЕ** хранит каждый клик (это хранится в CF Edge logs)
- `clicks_30d` будет 0 на Free плане, если данные старше 3 дней

---

## 🔌 API Endpoints

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
      "analytics": {
        "clicks_total": 12847,
        "clicks_24h": 142,
        "clicks_7d": 2370,
        "clicks_30d": 0,  // Free plan: limited to 3 days
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
      "analytics": {
        "clicks_total": 5423,
        "clicks_24h": 89,
        "clicks_7d": 1847,
        "clicks_30d": 0,
        "trend": "up",
        "last_click_at": "2025-12-28T14:19:03Z"
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
      "enabled": false,  // Disabled redirect
      "analytics": null,  // No analytics when disabled
      "created_at": "2025-01-05T14:00:00Z",
      "updated_at": "2025-01-05T14:00:00Z"
    }
  ]
}
```

**Правила:**
- Если `enabled=false` → поле `analytics` равно `null` (no tracking when disabled)
- Если `enabled=true` но данных нет (новый redirect) → поле `analytics` равно `null`
- Если `enabled=true` и есть данные → поле `analytics` заполнено

---

### GET /api/sites/:siteId/redirects/:id/analytics

**Purpose:** Детальная аналитика по отдельному redirect rule

**Response:**
```json
{
  "redirect_id": 1,
  "domain": "cryptoboss.pics",
  "metrics": {
    "clicks_total": 12847,
    "clicks_24h": 142,
    "clicks_7d": 2370,
    "clicks_30d": 0,
    "trend": "up",
    "last_click_at": "2025-12-28T14:32:15Z"
  },
  "chart_data": {
    "labels": ["2025-12-26", "2025-12-27", "2025-12-28"],
    "clicks": [387, 349, 142]
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
- **Chart data** — агрегация из CF GraphQL Analytics API (group by day)
- **Top countries/devices** — агрегация из CF GraphQL Analytics API (group by dimension)

---

## 📊 Analytics Aggregation (Batch Job)

### Background Job: Aggregate Clicks from CF GraphQL API

**Run frequency:** Каждые 5-15 минут (cron schedule)

**Job logic:**

```javascript
// 1. Get all zones with enabled redirect rules
const zones = await db.query(`
  SELECT DISTINCT z.cf_zone_id, z.id AS zone_id
  FROM zones z
  JOIN domains d ON d.zone_id = z.id
  JOIN redirect_rules rr ON rr.domain_id = d.id
  WHERE rr.enabled = 1
`);

for (const zone of zones) {
  // 2. Query CF GraphQL Analytics API for last 7 days
  const graphqlQuery = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zone.cf_zone_id}" }) {
          httpRequestsAdaptiveGroups(
            filter: {
              AND: [
                { edgeResponseStatus_geq: 300, edgeResponseStatus_lt: 400 },
                { datetime_geq: "${sevenDaysAgo}", datetime_lt: "${now}" }
              ]
            }
            limit: 10000
            orderBy: [datetimeMinute_DESC]
          ) {
            dimensions {
              datetimeMinute
              clientRequestHTTPHost
              edgeResponseStatus
              clientCountryName
              clientDeviceType
            }
            sum {
              requests
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: graphqlQuery })
  });

  const data = await response.json();
  const groups = data.data.viewer.zones[0].httpRequestsAdaptiveGroups;

  // 3. Aggregate by hostname (domain)
  const byHostname = {};
  for (const group of groups) {
    const hostname = group.dimensions.clientRequestHTTPHost;
    const requests = group.sum.requests;
    const timestamp = new Date(group.dimensions.datetimeMinute);

    if (!byHostname[hostname]) {
      byHostname[hostname] = {
        clicks_total: 0,
        clicks_24h: 0,
        clicks_7d: 0,
        last_click_at: null
      };
    }

    byHostname[hostname].clicks_total += requests;
    byHostname[hostname].clicks_7d += requests;

    // Count last 24h
    if (timestamp >= twentyFourHoursAgo) {
      byHostname[hostname].clicks_24h += requests;
    }

    // Track last click
    if (!byHostname[hostname].last_click_at || timestamp > byHostname[hostname].last_click_at) {
      byHostname[hostname].last_click_at = timestamp;
    }
  }

  // 4. Calculate trend (compare current 7d vs previous 7d)
  // Query previous 7 days from CF GraphQL API
  const prevGraphqlQuery = `... same query but datetime_geq: "${fourteenDaysAgo}", datetime_lt: "${sevenDaysAgo}" ...`;
  const prevResponse = await fetch(...);
  const prevData = await prevResponse.json();
  const prevGroups = prevData.data.viewer.zones[0].httpRequestsAdaptiveGroups;

  const prevByHostname = {};
  for (const group of prevGroups) {
    const hostname = group.dimensions.clientRequestHTTPHost;
    const requests = group.sum.requests;
    if (!prevByHostname[hostname]) prevByHostname[hostname] = 0;
    prevByHostname[hostname] += requests;
  }

  // 5. Save to D1 table: redirect_analytics
  for (const [hostname, metrics] of Object.entries(byHostname)) {
    // Find redirect_rule_id by hostname
    const rule = await db.query(`
      SELECT rr.id
      FROM redirect_rules rr
      JOIN domains d ON d.id = rr.domain_id
      WHERE d.domain = ? AND rr.enabled = 1
    `, [hostname]);

    if (!rule) continue;

    const prevClicks = prevByHostname[hostname] || 0;
    const currentClicks = metrics.clicks_7d;
    let trend = 'neutral';
    if (currentClicks > prevClicks * 1.1) trend = 'up';
    else if (currentClicks < prevClicks * 0.9) trend = 'down';

    // Upsert analytics
    await db.execute(`
      INSERT INTO redirect_analytics (
        redirect_rule_id, clicks_total, clicks_24h, clicks_7d, clicks_30d, trend, last_click_at, updated_at
      )
      VALUES (?, ?, ?, ?, 0, ?, ?, NOW())
      ON CONFLICT (redirect_rule_id)
      DO UPDATE SET
        clicks_total = EXCLUDED.clicks_total,
        clicks_24h = EXCLUDED.clicks_24h,
        clicks_7d = EXCLUDED.clicks_7d,
        trend = EXCLUDED.trend,
        last_click_at = EXCLUDED.last_click_at,
        updated_at = NOW()
    `, [
      rule.id,
      metrics.clicks_total,
      metrics.clicks_24h,
      metrics.clicks_7d,
      trend,
      metrics.last_click_at
    ]);
  }
}
```

---

## 🔒 Free vs Paid Plan Limits

### Cloudflare GraphQL Analytics Limits

| Plan | Data Retention | API Calls/Day | Cost |
|------|----------------|---------------|------|
| **Free** | 3 days | ~1000/day | $0 |
| **Pro** | 30 days | ~10000/day | $20/month |
| **Business** | 90 days | ~100000/day | $200/month |
| **Enterprise** | 1 year+ | Unlimited | Custom pricing |

**Recommendation for 301.st:**
- **Free plan users**: 3 days history, достаточно для MVP (показывать clicks_7d как clicks_3d)
- **Paid plan users**: 30 days history, полная аналитика
- **No enforcement needed** — CF сам блокирует запросы при превышении лимитов

---

## 📋 Recommendations for Backend

### 1. Database Schema

✅ **Implement:**
- `redirect_analytics` table for aggregated metrics
- Batch aggregation job (каждые 5-15 минут)
- Trend calculation: сравнивать `clicks_7d` текущие vs предыдущие 7 дней

❌ **Don't:**
- Don't store raw clicks in D1 (CF хранит в Edge logs)
- Don't query CF GraphQL API в real-time из API endpoint (используйте кеш в `redirect_analytics`)

---

### 2. API Endpoints

✅ **Implement:**
- `GET /api/sites/:siteId/redirects` — include `analytics` field (из D1 cache)
- `GET /api/sites/:siteId/redirects/:id/analytics` — детальная аналитика
- Batch job endpoint для ручного обновления (admin only)

❌ **Don't:**
- Don't expose raw GraphQL queries через frontend API
- Don't allow per-redirect analytics toggle (аналитика доступна всегда)

---

### 3. Cloudflare GraphQL Analytics

✅ **Implement:**
- Query CF GraphQL Analytics API каждые 5-15 минут
- Filter: `edgeResponseStatus_geq: 300, edgeResponseStatus_lt: 400` (3xx redirects)
- Group by: `clientRequestHTTPHost` (hostname) для per-domain analytics
- Calculate trend: compare current 7d vs previous 7d
- Handle CF API rate limits (retry with exponential backoff)

❌ **Don't:**
- Don't query CF API on every frontend request (используйте D1 cache)
- Don't store PII (IP addresses) — GDPR compliance

---

### 4. Feature Detection (Free vs Paid Plan)

✅ **Implement:**
```javascript
// Detect available data retention based on plan
const dataRetention = {
  'free': 3,      // days
  'pro': 30,      // days
  'business': 90, // days
  'enterprise': 365 // days
};

// Query only available data range
const startDate = new Date();
startDate.setDate(startDate.getDate() - dataRetention[plan]);

// Update UI labels accordingly
if (plan === 'free') {
  // Show "Last 3 days" instead of "Last 7 days"
  // Set clicks_7d to aggregate only 3 days of data
}
```

---

## 🚀 Implementation Phases

### Phase 1: Basic Analytics (MVP)

**Scope:**
- ✅ Create `redirect_analytics` table
- ✅ Batch job: query CF GraphQL Analytics API every 15 minutes
- ✅ Aggregate clicks by hostname (domain)
- ✅ Calculate basic metrics: `clicks_24h`, `clicks_7d` (or clicks_3d on Free)
- ✅ API endpoint: `GET /api/sites/:siteId/redirects` returns `analytics` field
- ✅ Frontend displays clicks count

**Timeline:** 2-3 дня

---

### Phase 2: Trend Analysis

**Scope:**
- ✅ Query previous 7 days from CF GraphQL API
- ✅ Calculate trend: compare current vs previous period
- ✅ Update `redirect_analytics.trend` field
- ✅ Frontend displays trend icons (up/down/neutral)

**Timeline:** 1-2 дня

---

### Phase 3: Advanced Analytics

**Scope:**
- ✅ API endpoint: `GET /api/sites/:siteId/redirects/:id/analytics`
- ✅ Chart data (daily breakdown)
- ✅ Top countries (group by `clientCountryName`)
- ✅ Top devices (group by `clientDeviceType`)
- ✅ Frontend analytics dashboard

**Timeline:** 3-4 дня

---

## ✅ Summary Checklist для Backend-команды

### Базовая инфраструктура
- [ ] Создать таблицу `redirect_analytics`
- [ ] Настроить доступ к CF GraphQL Analytics API (API token)
- [ ] Реализовать batch job (cron каждые 5-15 минут)
- [ ] Реализовать API endpoint `GET /api/sites/:siteId/redirects` с полем `analytics`

### Cloudflare GraphQL Analytics
- [ ] Query CF GraphQL Analytics API для 3xx redirects
- [ ] Filter: `edgeResponseStatus_geq: 300, edgeResponseStatus_lt: 400`
- [ ] Group by: `clientRequestHTTPHost` (hostname)
- [ ] Aggregate: `sum { requests }` (click count)
- [ ] Handle CF API rate limits (retry logic)

### Analytics Aggregation
- [ ] Агрегировать клики по hostname/domain
- [ ] Рассчитывать `clicks_24h`, `clicks_7d` (или clicks_3d на Free)
- [ ] Рассчитывать trend (current 7d vs previous 7d)
- [ ] Сохранять в D1 таблицу `redirect_analytics`

### Plan-specific Features
- [ ] Определять data retention по плану (Free: 3 дня, Pro: 30 дней)
- [ ] Корректно обрабатывать clicks_30d (0 на Free плане)
- [ ] Feature detection для UI (показывать "Last 3 days" на Free)

### Тестирование
- [ ] Протестировать batch job с реальными данными CF
- [ ] Протестировать trend calculation
- [ ] Протестировать API endpoint с mock и production data
- [ ] E2E тест: создать redirect → получить клики → показать в UI

---

**Дата обновления:** 2025-12-28
**Критическое замечание:** Аналитика доступна через CF GraphQL Analytics API, Workers НЕ НУЖНЫ
**Следующий шаг:** Backend review, обсуждение CF GraphQL Analytics integration
