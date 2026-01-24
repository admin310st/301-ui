# Cloudflare Tools — Issues Package

Ready to copy-paste into GitHub Issues.

---

## [mvp][core] Preflight engine

**Labels:** `mvp`, `core`, `api`

### Description
Автоматический preflight перед любым batch — проверка существования зон через `GET /zones?name=`.

### Scope
- `GET /zones?name={domain}` для каждого домена из входного списка
- Классификатор статусов: `will-create`, `exists`, `invalid`, `duplicate`
- Кеширование результатов в сессии
- Инвалидация кеша при редактировании списка
- UI-бейджи со счётчиками

### Acceptance Criteria
- [ ] Для N доменов показываются точные счётчики `will-create/exists/invalid/duplicate`
- [ ] "Check first" не вызывает мутаций (только GET)
- [ ] Кнопка "Start" доступна сразу после preflight
- [ ] Редактирование списка сбрасывает preflight статусы

---

## [mvp][sec] Encrypted vault + session lock

**Labels:** `mvp`, `security`

### Description
Шифрование credentials с мастер-паролем и автоблокировка.

### Scope
- Argon2id KDF (per-device salt, parameter versioning)
- AES-256-GCM encryption
- Master password обязателен при первом запуске
- "Remember for session" (default: enabled)
- Auto-lock по таймауту бездействия (1–60 min, default: 15)
- Immediate lock при выгрузке SW (MV3)
- UI: Set password, Change password, Lock now

### Acceptance Criteria
- [ ] Секреты отсутствуют в IndexedDB/Storage в незашифрованном виде
- [ ] Автолок срабатывает после таймаута
- [ ] Автолок срабатывает при выгрузке Service Worker
- [ ] После локировки любые API-вызовы блокируются до повторного ввода пароля
- [ ] "Lock now" мгновенно блокирует доступ

---

## [mvp][api] Rate limiting & backoff

**Labels:** `mvp`, `api`

### Description
Очереди с ограничением параллелизма и экспоненциальный backoff.

### Scope
- Отдельные пулы: `createZonesPool`, `deleteZonesPool`, `purgePool`, `preflightPool`
- Конфиг: `maxConcurrency` (default: 4), `maxRetries` (default: 3), `retryJitter`
- Экспоненциальный backoff: `delay = baseDelay * (2 ** attempt) + jitter`
- Чтение и соблюдение `Retry-After` header
- Логирование latency, retries, final code

### Acceptance Criteria
- [ ] Нет 429-штормов при массовых операциях
- [ ] Retries ограничены `maxRetries`
- [ ] UI показывает количество retries
- [ ] Логи содержат latency, attempt count, final status code
- [ ] `Retry-After` header соблюдается

---

## [mvp][core] Task ledger (IndexedDB) + Resume

**Labels:** `mvp`, `core`

### Description
Персистентное хранение состояния batch операций для resume после перезапуска.

### Scope
- IndexedDB schema для TaskEntry
- Checkpoints после каждого успешного шага
- Восстановление состояния при запуске
- UI: "Found incomplete batch. Resume?"
- "Retry failed only" — перезапуск только упавших

### Acceptance Criteria
- [ ] После перезапуска браузера показывается диалог Resume
- [ ] Resume продолжает с последнего checkpoint
- [ ] Нет повторов уже выполненных шагов
- [ ] "Retry failed only" перезапускает только записи со статусом `failed`
- [ ] Cancel очищает ledger для текущего batch

---

## [mvp][ux] Batch Panel controls & summary

**Labels:** `mvp`, `ux`

### Description
Контролы управления batch и summary с ETA.

### Scope
- Кнопки: Start, Check first, Pause, Resume, Cancel
- Кнопки: Retry failed only, Export failed (CSV/JSON)
- Summary: Processed/Total, Success/Failed/Skipped, ETA
- ETA на основе скользящего среднего
- Status legend с иконками

### Acceptance Criteria
- [ ] Все кнопки работают без race conditions
- [ ] Pause сохраняет checkpoint, Resume продолжает
- [ ] Cancel останавливает и сбрасывает состояние
- [ ] ETA обновляется на основе moving average
- [ ] Export failed содержит: domain, operation, error code, error message
- [ ] Status legend отображает все статусы с иконками

---

## [mvp][i18n] IDN handling

**Labels:** `mvp`, `i18n`

### Description
Корректная работа с IDN доменами.

### Scope
- Конвертация Unicode → Punycode для API
- Конвертация Punycode → Unicode для UI
- Поиск по обоим представлениям
- Тултипы: punycode ↔ unicode

### Acceptance Criteria
- [ ] Отправка в CF API всегда в ASCII-LDH (punycode)
- [ ] UI показывает Unicode версию
- [ ] Поиск "müller.de" находит `xn--mller-kva.de`
- [ ] Тултип показывает оба представления

---

## [mvp][compat] Firefox Sidebar support

**Labels:** `mvp`, `compat`, `firefox`

### Description
Поддержка Firefox через Sidebar API.

### Scope
- Feature detection для sidePanel vs sidebar_action
- Единый UI бандл для Chrome Side Panel / Firefox Sidebar
- Manifest additions для Firefox
- Тестирование на Firefox

### Acceptance Criteria
- [ ] Все экраны открываются и работают в Firefox
- [ ] Нет зависимости на Chrome-специфичные API
- [ ] Feature detection работает корректно
- [ ] Build создаёт оба варианта (Chrome + Firefox)

---

## [mvp][err] Error taxonomy & UI mapping

**Labels:** `mvp`, `ux`, `api`

### Description
Единая система ошибок с понятными текстами и рекомендациями.

### Scope
- Категории: Auth, Rate limit, Validation, Dependency, Network, Permission
- Маппинг кода → текст → рекомендация → UI action
- `blocked (dependency)` не предлагает retry
- `failed (retryable)` показывает кнопку Retry

### Acceptance Criteria
- [ ] Каждой ошибке соответствует понятный текст
- [ ] Каждой ошибке соответствует рекомендация
- [ ] `blocked` показывает "go to Dashboard" вместо Retry
- [ ] Rate limit показывает badge "waiting" с таймером
- [ ] Network errors показывают badge "retrying"

---

## [mvp][core] Create Zones runner (idempotent)

**Labels:** `mvp`, `core`

### Description
Idempotent создание зон с использованием preflight.

### Scope
- Использует preflight engine
- `exists` → `skipped` (без ошибки)
- `will-create` → `POST /zones` с `account.id`, `type`, `jump_start`
- Логирование zone_id на успехе

### Acceptance Criteria
- [ ] Повторный запуск не создаёт дубликаты
- [ ] `exists` автоматически становится `skipped`
- [ ] Созданные зоны логируются с zone_id
- [ ] `account.id` передаётся корректно
- [ ] `type` и `jump_start` передаются из настроек

---

## [mvp][core] Delete Zones runner

**Labels:** `mvp`, `core`

### Description
Bulk удаление зон с обработкой зависимостей.

### Scope
- Multi-select из списка существующих зон
- Confirmation dialog
- Обработка ошибок зависимостей (subscriptions, etc.)
- `blocked` статус для зон с зависимостями

### Acceptance Criteria
- [ ] Confirmation требует явного подтверждения
- [ ] Зоны с зависимостями получают статус `blocked`
- [ ] `blocked` показывает причину и ссылку на Dashboard
- [ ] Успешные удаления логируются

---

## [mvp][core] Purge Cache runner

**Labels:** `mvp`, `core`

### Description
Bulk purge cache с ограничением параллелизма.

### Scope
- Multi-select зон
- "Purge Everything" режим
- Очередь per-zone
- Ограничение параллелизма

### Acceptance Criteria
- [ ] Нет превышения rate limits
- [ ] Retries уважают `Retry-After`
- [ ] Export failed включает zone_id
- [ ] Progress показывает статус каждой зоны

---

## [docs] Privacy Policy & Security notes

**Labels:** `docs`, `security`

### Description
Документация для публикации в stores.

### Scope
- Privacy Policy текст
- Security описание
- `/privacy.html` в расширении
- GitHub Pages хостинг

### Acceptance Criteria
- [ ] Текст готов для CWS/AMO review
- [ ] В UI Settings есть ссылка на Privacy Policy
- [ ] Privacy page доступна из расширения

---

## [phase-2] API Token support

**Labels:** `phase-2`, `security`

### Description
Поддержка API Token как альтернатива Global API Key.

### Scope
- Режим API Token (минимальные скоупы)
- Автоопределение типа credentials
- Рекомендуемые permission scopes

### Acceptance Criteria
- [ ] Можно использовать API Token вместо Global Key
- [ ] UI показывает какой тип credentials используется
- [ ] Документация по созданию токена с нужными scopes

---

## [phase-2] DNS templates

**Labels:** `phase-2`, `feature`

### Description
Шаблоны DNS записей для bulk применения.

### Scope
- Схема шаблона: `records[]` с `type`, `name`, `content`, `proxied`, `ttl`, `priority`, `data`
- Переменные: `{root}`, `{www}`, `{ip}`
- Валидация по типу записи
- Предпросмотр развёртки на зонах

### Acceptance Criteria
- [ ] Валидация записей по типу
- [ ] Переменные подставляются корректно
- [ ] Preflight показывает что будет создано/изменено
- [ ] Атомарное применение на зоне
