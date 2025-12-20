# Сравнение формата Domain UI vs API

> **Статус:** Черновик для обсуждения
> **Дата:** 2025-12-20
> **Автор:** Frontend team

## Контекст

Текущий интерфейс `Domain` в UI (файл `src/domains/mock-data.ts`) создан для удобства отображения данных в таблице доменов. При интеграции с реальным API потребуется маппинг данных.

**Цель документа:** Описать различия между UI-форматом и документированной схемой API, чтобы бекенд-команда могла учесть требования фронтенда при разработке endpoints.

---

## Текущий UI интерфейс

```typescript
interface Domain {
  id: number;
  domain_name: string; // приведено к API-формату
  project_name: string; // UI: денормализация project.name
  project_lang?: string; // UI: денормализация site.lang_code
  status: 'active' | 'expired' | 'expiring' | 'blocked' | 'pending';
  registrar: 'cloudflare' | 'namecheap' | 'namesilo' | 'google' | 'manual';
  cf_zone_id?: string;

  // UI-специфичные поля (мониторинг):
  ssl_status: 'valid' | 'expiring' | 'invalid' | 'off';
  ssl_valid_to?: string;
  abuse_status: 'clean' | 'warning' | 'blocked';
  expires_at: string; // дата истечения регистрации домена
  monitoring_enabled: boolean;
  last_check_at?: string;
  has_errors: boolean;
}
```

---

## Схема API (из docs/301-wiki/Appendix.md)

**Базовые поля таблицы `domains`:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | number | ID домена |
| `domain_name` | string | FQDN (уникально) |
| `registrar` | string | Регистратор (namecheap, godaddy) |
| `domain_role` | `primary` \| `donor` | Роль домена |
| `target_type` | `ip` \| `cname` \| `redirect` \| `worker` | Тип маршрутизации |
| `target_value` | string | Адрес назначения |
| `status` | `new` \| `active` \| `blocked` | Статус домена |
| `ns_status` | `pending` \| `verified` \| `error` | Статус NS-записей |
| `zone_id` | string | FK → zones (обязательно) |
| `site_id` | number? | FK → sites (опционально) |
| `project_id` | number? | FK → projects (опционально) |

---

## Таблица соответствия

| UI поле | API поле | Статус | Примечание |
|---------|----------|--------|------------|
| ✅ `domain_name` | `domain_name` | **Совпадает** | Переименовано из `domain` |
| ✅ `registrar` | `registrar` | **Совпадает** | Переименовано из `provider` |
| ✅ `cf_zone_id` | `zone_id` | **Частично** | UI использует CF-специфичный ID |
| ⚠️ `status` | `status` | **Расширен** | UI добавляет `expired`, `expiring`, `pending` |
| ⚠️ `project_name` | — | **Денормализация** | UI ожидает готовое название проекта |
| ⚠️ `project_lang` | — | **Денормализация** | UI ожидает `site.lang_code` |
| ❌ — | `domain_role` | **Отсутствует** | API: `primary` / `donor` |
| ❌ — | `target_type` | **Отсутствует** | API: `ip` / `cname` / `redirect` / `worker` |
| ❌ — | `target_value` | **Отсутствует** | API: адрес назначения |
| ❌ — | `ns_status` | **Отсутствует** | API: `pending` / `verified` / `error` |
| ❌ — | `site_id` | **Отсутствует** | API: FK → sites |
| ❌ — | `project_id` | **Отсутствует** | API: FK → projects |

---

## UI-специфичные поля (мониторинг)

Эти поля **не описаны** в текущей документации API, но критически важны для UI:

| UI поле | Назначение | Предполагаемый источник |
|---------|------------|------------------------|
| `ssl_status` | Статус SSL-сертификата | Cloudflare API / мониторинг |
| `ssl_valid_to` | Дата истечения SSL | Cloudflare API |
| `abuse_status` | Статус в abuse-системах | Внешние blacklist API |
| `expires_at` | Дата истечения регистрации | Registrar API / WHOIS |
| `monitoring_enabled` | Флаг включения мониторинга | `sites.monitoring_enabled` |
| `last_check_at` | Время последней проверки | Таблица мониторинга |
| `has_errors` | Агрегированный флаг проблем | Вычисляемое поле |

**Вопросы к бекенду:**

1. Будет ли отдельная таблица для мониторинга доменов (SSL, abuse, expiry)?
2. Как часто обновляются данные мониторинга?
3. Нужно ли бекенду вычислять `has_errors` или фронтенд сделает это сам?

---

## Денормализация для UI

Для отображения таблицы доменов фронтенду нужны **готовые данные** без дополнительных запросов:

### Текущий подход (mock):
```json
{
  "domain_name": "casino-ru.com",
  "project_name": "Casino Q1 2025",
  "project_lang": "RU"
}
```

### Ожидаемый формат от API:

**Вариант 1: Денормализация на бекенде**
```json
GET /api/domains?account_id=123

{
  "domains": [
    {
      "id": 1,
      "domain_name": "casino-ru.com",
      "project_name": "Casino Q1 2025",  // ← готовое значение
      "project_lang": "RU",               // ← готовое значение
      "registrar": "namecheap",
      "status": "active",
      ...
    }
  ]
}
```

**Вариант 2: Вложенные объекты**
```json
GET /api/domains?account_id=123&include=project,site

{
  "domains": [
    {
      "id": 1,
      "domain_name": "casino-ru.com",
      "registrar": "namecheap",
      "status": "active",
      "project": {
        "id": 10,
        "name": "Casino Q1 2025"
      },
      "site": {
        "id": 20,
        "lang_code": "RU"
      },
      ...
    }
  ]
}
```

**Рекомендация:** Вариант 1 (денормализация) проще для фронтенда и быстрее рендерится.

---

## Расхождения в статусах

### API (docs/301-wiki/Appendix.md):
- `new` — новый домен
- `active` — активный
- `blocked` — заблокирован

### UI (src/domains/mock-data.ts):
- `active` — активный
- `expired` — истёк срок регистрации
- `expiring` — скоро истекает (< 30 дней)
- `blocked` — заблокирован
- `pending` — ожидает верификации

**Вопрос:** Нужно ли бекенду вычислять `expired` и `expiring` на основе `expires_at`?
**Предложение:** Либо бекенд возвращает вычисленный статус, либо фронтенд делает это сам на основе `expires_at`.

---

## Предложения для API endpoints

### 1. GET /api/domains

**Запрос:**
```http
GET /api/domains?account_id=123&include=project,site,monitoring
```

**Ответ:**
```json
{
  "domains": [
    {
      "id": 1,
      "domain_name": "casino-ru.com",
      "registrar": "namecheap",
      "domain_role": "primary",
      "target_type": "ip",
      "target_value": "1.2.3.4",
      "status": "active",
      "ns_status": "verified",

      // Денормализация для UI:
      "project_name": "Casino Q1 2025",
      "project_lang": "RU",

      // Мониторинг (если include=monitoring):
      "ssl_status": "valid",
      "ssl_valid_to": "2025-06-15",
      "abuse_status": "clean",
      "expires_at": "2026-01-20",
      "monitoring_enabled": true,
      "last_check_at": "2025-12-18T10:00:00Z",
      "has_errors": false,

      // Связи (если нужны для редактирования):
      "zone_id": "abc123",
      "site_id": 20,
      "project_id": 10
    }
  ],
  "total": 38,
  "page": 1,
  "per_page": 25
}
```

### 2. GET /api/domains/:id/monitoring

Для получения детальной информации о мониторинге конкретного домена:

```json
{
  "domain_id": 1,
  "ssl": {
    "status": "valid",
    "issuer": "Let's Encrypt",
    "valid_from": "2024-12-15",
    "valid_to": "2025-06-15",
    "days_remaining": 177
  },
  "abuse": {
    "status": "clean",
    "blacklists_checked": ["Spamhaus", "SURBL", "Google Safe Browsing"],
    "last_check": "2025-12-18T10:00:00Z"
  },
  "expiry": {
    "expires_at": "2026-01-20",
    "days_remaining": 396,
    "registrar": "namecheap",
    "auto_renew": true
  },
  "health_checks": [
    {
      "timestamp": "2025-12-18T10:00:00Z",
      "http_status": 200,
      "response_time_ms": 150,
      "errors": []
    }
  ]
}
```

---

## Следующие шаги

1. **Бекенд-команда:** Рассмотреть предложенный формат endpoint `/api/domains`
2. **Обсудить:** Какие поля мониторинга будут доступны в MVP
3. **Согласовать:** Формат денормализации (готовые поля vs вложенные объекты)
4. **Определить:** Нужна ли отдельная таблица для мониторинга или данные хранятся в JSON-полях

---

## Контакты

Вопросы по UI-формату: @frontend-team
Документация API: `docs/301-wiki/Appendix.md`
Актуальный UI-интерфейс: `src/domains/mock-data.ts`
