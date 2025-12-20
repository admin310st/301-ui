# Сравнение реального API доменов vs UI

> **Дата:** 2025-12-20
> **Статус:** Актуальное состояние бекенда
> **Источники:**
> - Код бекенда: https://github.com/admin310st/301/blob/main/src/api/domains/domains.ts
> - SQL схема: https://github.com/admin310st/301/blob/main/schema/301.sql

---

## Реальная структура бекенда (DomainRecord)

```typescript
interface DomainRecord {
  // Идентификаторы
  id: number;
  account_id: number;
  site_id: number | null;
  zone_id: number;
  key_id: number | null;
  parent_id: number | null;

  // Основные поля
  domain_name: string;               // UNIQUE
  role: 'acceptor' | 'donor' | 'reserve';  // default: 'reserve'

  // Технические параметры
  ns: string | null;
  ns_verified: boolean;
  proxied: boolean;

  // Статус и блокировки
  blocked: boolean;
  blocked_reason: string | null;  // 'unavailable' | 'ad_network' | 'hosting_registrar' | 'government' | 'manual'
  ssl_status: string | null;       // 'none' | 'valid' | 'expired' | 'error' (default: 'none')

  // Даты
  expired_at: string | null;
  created_at: string;
  updated_at: string;

  // Денормализованные данные (JOIN)
  site_name: string | null;
  site_status: string | null;
  project_id: number | null;
  project_name: string | null;
}
```

---

## UI интерфейс (src/domains/mock-data.ts)

```typescript
interface Domain {
  id: number;
  domain_name: string;
  project_name: string;
  project_lang?: string;
  status: 'active' | 'expired' | 'expiring' | 'blocked' | 'pending';
  registrar: 'cloudflare' | 'namecheap' | 'namesilo' | 'google' | 'manual';
  cf_zone_id?: string;

  // Мониторинг
  ssl_status: 'valid' | 'expiring' | 'invalid' | 'off';
  ssl_valid_to?: string;
  abuse_status: 'clean' | 'warning' | 'blocked';
  expires_at: string;
  monitoring_enabled: boolean;
  last_check_at?: string;
  has_errors: boolean;
}
```

---

## Структура базы данных (SQL Schema)

### Таблица `domains`

```sql
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,      -- Tenant owner
  site_id INTEGER,                   -- Associated site reference
  zone_id INTEGER,                   -- Cloudflare zone reference
  key_id INTEGER,                    -- Integration key reference
  parent_id INTEGER,                 -- Hierarchical domain parent
  domain_name TEXT NOT NULL UNIQUE,  -- FQDN
  role TEXT DEFAULT 'reserve',       -- acceptor|donor|reserve
  ns TEXT,                           -- Nameserver records
  ns_verified INTEGER DEFAULT 0,     -- Delegation confirmation flag (boolean)
  proxied INTEGER DEFAULT 1,         -- Cloudflare proxying toggle (boolean)
  blocked INTEGER DEFAULT 0,         -- Block status flag (boolean)
  blocked_reason TEXT,               -- unavailable|ad_network|hosting_registrar|government|manual
  ssl_status TEXT DEFAULT 'none',    -- none|valid|expired|error
  expired_at TIMESTAMP,              -- Registration expiration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Важно:**
- ❌ Поле `registrar` **отсутствует** в схеме БД
- ✅ `blocked_reason` имеет фиксированные значения (enum)
- ✅ `ssl_status` имеет фиксированные значения (enum)
- ✅ `domain_name` имеет UNIQUE constraint

### Связанные таблицы

- **`accounts`** - Tenant containers с plan tiers (free/pro/buss)
- **`sites`** - Traffic reception units (содержат `lang_code` для `project_lang`)
- **`projects`** - Логические группировки для кампаний
- **`zones`** - Cloudflare DNS zone metadata
- **`account_keys`** - Зашифрованные credentials провайдеров
- **`redirect_rules`** - Логика редиректов доменов
- **`tds_rules`** - Traffic Distribution System конфигурации

---

## Детальное сравнение

### ✅ Совпадает (готово к использованию)

| UI поле | API поле | Примечание |
|---------|----------|------------|
| `id` | `id` | 1:1 |
| `domain_name` | `domain_name` | 1:1 |
| `project_name` | `project_name` | ✅ Уже денормализовано! |
| `cf_zone_id` | `zone_id` | Маппинг: `zone_id → cf_zone_id` |

### ⚠️ Частично совпадает (требуется маппинг)

| UI поле | API поле | Маппинг |
|---------|----------|---------|
| `status` | `blocked` + `expired_at` | Вычислить:<br>• `blocked: true` → "blocked"<br>• `expired_at < now` → "expired"<br>• `expired_at < now+30d` → "expiring"<br>• иначе → "active" |
| `ssl_status` | `ssl_status` | Маппинг значений:<br>• `'none'` → "off"<br>• `'valid'` → "valid"<br>• `'expired'` → "expiring"<br>• `'error'` → "invalid"<br>• `null` → "off" |
| `expires_at` | `expired_at` | Переименование |

### ❌ Отсутствует на бекенде (критично!)

| UI поле | Статус | Решение |
|---------|--------|---------|
| **`registrar`** | ❌ НЕТ | **КРИТИЧНО!** Добавить поле `registrar` в таблицу domains |
| `project_lang` | ❌ НЕТ | Нужен JOIN с `sites.lang_code` |
| `ssl_valid_to` | ❌ НЕТ | Парсить из `ssl_status` или отдельное поле |
| `abuse_status` | ❌ НЕТ | Новое поле или отдельная таблица мониторинга |
| `monitoring_enabled` | ❌ НЕТ | Брать из `sites.monitoring_enabled` |
| `last_check_at` | ❌ НЕТ | Таблица мониторинга или новое поле |
| `has_errors` | ❌ НЕТ | Вычислять на фронте или бекенде |

### 🆕 Есть на бекенде, но не используется в UI

| API поле | Описание | Возможное использование |
|----------|----------|------------------------|
| `role` | acceptor/donor/reserve | Добавить в inspector drawer |
| `ns` | NS-записи домена | Показывать в техническом разделе |
| `ns_verified` | Статус верификации NS | Индикатор в Health колонке |
| `proxied` | Проксируется через CF | Иконка в техническом разделе |
| `parent_id` | ID родительского домена | Для иерархии поддоменов |
| `site_name` | Название сайта | Альтернатива project_name |
| `site_status` | Статус сайта | Дополнительная информация |
| `blocked_reason` | Причина блокировки | Показывать при blocked=true<br>Значения: unavailable, ad_network, hosting_registrar, government, manual |

---

## Расхождения в терминологии

| Документация | Бекенд (реально) | UI |
|--------------|------------------|-----|
| `domain_role: primary/donor` | `role: acceptor/donor/reserve` | не используется |
| `status: new/active/blocked` | `blocked: boolean` | `status: active/expired/expiring/blocked/pending` |
| `registrar` | **отсутствует** | `registrar: cloudflare/namecheap/...` |

---

## Предложения по доработке бекенда

### Критичные (блокируют интеграцию)

1. **Добавить поле `registrar`**
   ```sql
   ALTER TABLE domains ADD COLUMN registrar VARCHAR(50);
   -- Значения: 'cloudflare', 'namecheap', 'namesilo', 'google', 'manual'
   ```

2. **Добавить `site.lang_code` в денормализацию**
   ```typescript
   // В DomainRecord добавить:
   site_lang?: string | null;
   ```

### Желательные (улучшат UX)

3. **Структурировать `ssl_status`**
   - Либо хранить JSON: `{ status: 'valid', valid_to: '2025-12-31' }`
   - Либо отдельные поля: `ssl_status`, `ssl_valid_to`

4. **Добавить поля мониторинга**
   ```typescript
   abuse_status?: 'clean' | 'warning' | 'blocked';
   monitoring_enabled?: boolean;  // или брать из sites
   last_check_at?: string;
   ```

5. **Вычисляемое поле `has_errors`**
   ```typescript
   // На бекенде вычислять:
   has_errors: boolean =
     blocked ||
     (expired_at && new Date(expired_at) < new Date()) ||
     ssl_status === 'error' ||    // В БД: 'error', в UI: 'invalid'
     ssl_status === 'expired' ||
     abuse_status === 'blocked'   // Если будет добавлено
   ```

---

## Endpoint для UI

**Предложение:** Создать отдельный endpoint для UI с полной денормализацией

```typescript
GET /api/domains/ui?account_id={id}

Response:
{
  "domains": [
    {
      // Базовые поля
      "id": 1,
      "domain_name": "example.com",
      "role": "acceptor",

      // Денормализация
      "project_id": 10,
      "project_name": "Casino Q1 2025",
      "site_id": 20,
      "site_name": "Casino RU",
      "site_lang": "ru",  // ← НОВОЕ

      // Статус (вычисленный)
      "status": "active",  // ← ВЫЧИСЛЯЕТСЯ
      "blocked": false,
      "blocked_reason": null,

      // Регистратор
      "registrar": "namecheap",  // ← КРИТИЧНО: ДОБАВИТЬ

      // Технические параметры
      "zone_id": 100,
      "ns_verified": true,
      "proxied": true,

      // SSL
      "ssl_status": "valid",            // Значения: none|valid|expired|error
      "ssl_valid_to": "2025-12-31",     // ← ДОБАВИТЬ или парсить

      // Мониторинг
      "abuse_status": "clean",        // ← ДОБАВИТЬ
      "monitoring_enabled": true,     // ← из sites
      "last_check_at": "2025-12-20T10:00:00Z",  // ← ДОБАВИТЬ

      // Даты
      "expires_at": "2026-01-20",
      "created_at": "2024-01-15T12:00:00Z",
      "updated_at": "2025-12-18T15:30:00Z",

      // Агрегированные флаги
      "has_errors": false  // ← ВЫЧИСЛЯЕТСЯ
    }
  ],
  "total": 38
}
```

---

## План интеграции

### Этап 1: Минимальная интеграция (сейчас возможно)

✅ Использовать существующие поля:
- `id`, `domain_name`, `project_name`, `zone_id`
- `blocked` → `status`
- `expired_at` → `expires_at`
- `ssl_status` (как есть)

❌ Заглушки для отсутствующих:
- `registrar` → hardcode "manual"
- `project_lang` → null
- `abuse_status` → "clean"
- `monitoring_enabled` → false

### Этап 2: Полная интеграция (после доработки бекенда)

После добавления:
- `registrar` в таблицу domains
- `site_lang` в денормализацию
- `ssl_valid_to` (отдельное поле или парсинг)
- Полей мониторинга

---

## Действия

### Для бекенд-команды:

1. ❗ **Критично:** Добавить поле `registrar` в таблицу domains
2. Добавить `site.lang_code` в JOIN для денормализации
3. Рассмотреть структурирование `ssl_status`
4. Обсудить подход к мониторингу (отдельная таблица vs JSON поля)

### Для фронтенд-команды:

1. Создать адаптер для маппинга `DomainRecord → Domain`
2. Реализовать вычисление `status` на основе `blocked` + `expired_at`
3. Добавить fallback для отсутствующих полей
4. Подготовить UI к отображению новых полей (`role`, `ns_verified`, `proxied`)

---

## Вопросы для обсуждения

1. Когда планируется добавить поле `registrar`?
2. Как будет организован мониторинг (отдельная таблица или JSON)?
3. Нужен ли отдельный endpoint `/domains/ui` с полной денормализацией?
4. Как часто обновляются данные мониторинга (SSL, abuse)?
5. Будет ли фронтенд вычислять `has_errors` или это задача бекенда?
