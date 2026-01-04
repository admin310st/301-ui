# Добавить поле `acceptor_domain` в ответ `GET /projects/:id`

## Проблема

Сейчас для отображения страницы Project Detail с корректным столбцом "Domain" в таблице Sites приходится делать **два API запроса**:

1. `GET /projects/:id` → возвращает `{project, sites, integrations}`, но в `sites` **НЕТ** поля `acceptor_domain`
2. `GET /projects/:id/sites` → возвращает `{ok, project, total, sites}` с полем `acceptor_domain` в каждом site

Это создает лишнюю нагрузку и усложняет код фронтенда.

## Текущая реализация (фронтенд)

```typescript
// Загружаем основные данные проекта
const data = await getProject(projectId);
const { project, integrations } = data;

// Приходится делать второй запрос для получения acceptor_domain
let sites = data.sites; // sites БЕЗ acceptor_domain
try {
  sites = await getProjectSites(projectId); // sites С acceptor_domain
} catch (error) {
  // Fallback на sites без acceptor_domain
}
```

## Предложение

Добавить поле `acceptor_domain` в объекты `sites` в ответе `GET /projects/:id`.

### Было (GET /projects/:id)
```json
{
  "ok": true,
  "project": { ... },
  "sites": [
    {
      "id": 1,
      "site_name": "Best Profit - Main",
      "site_tag": "bp-main",
      "status": "active",
      "domains_count": 3,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-04T12:00:00Z"
      // ❌ acceptor_domain отсутствует
    }
  ],
  "integrations": [ ... ]
}
```

### Стало (GET /projects/:id)
```json
{
  "ok": true,
  "project": { ... },
  "sites": [
    {
      "id": 1,
      "site_name": "Best Profit - Main",
      "site_tag": "bp-main",
      "status": "active",
      "domains_count": 3,
      "acceptor_domain": "pinup2.ru",  // ✅ добавить это поле
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-04T12:00:00Z"
    }
  ],
  "integrations": [ ... ]
}
```

## Техническое описание

Поле `acceptor_domain` должно содержать:
- **`null`** или **не присутствовать** — если у site нет доменов с `role = 'acceptor'`
- **`"domain.com"`** (строка) — имя домена с `role = 'acceptor'`, если такой домен есть

Это поле уже корректно возвращается в `GET /projects/:id/sites`, нужно просто добавить его в `GET /projects/:id`.

## Выгоды

1. ✅ Один запрос вместо двух при загрузке страницы проекта
2. ✅ Упрощение кода фронтенда (убрать fallback логику)
3. ✅ Меньше нагрузка на API
4. ✅ Быстрее отрисовка UI

## Связанные endpoint'ы

- `GET /projects/:id` — нужно добавить `acceptor_domain` ✅
- `GET /projects/:id/sites` — уже возвращает `acceptor_domain` корректно ✅

---

**Frontend workaround:** Временно делаем два запроса, но после добавления поля в `GET /projects/:id` уберем второй запрос.
