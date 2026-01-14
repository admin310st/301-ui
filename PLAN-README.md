# Implementation Plans Overview

Этот документ описывает все планы по реализации Redirects feature.

---

## 📋 Available Plans

### 1. PLAN-redirects-with-role.md ⭐ **RECOMMENDED**

**Статус:** Active, Ready for Implementation

**Подход:** Redirects page работает в контексте выбранного Site. Backend добавляет `domain_role` для минимизации изменений в UI.

**Ключевые особенности:**
- ✅ Минимальные изменения в UI (только mock → API)
- ✅ Backend добавляет `domain_role: "acceptor" | "donor" | "reserve"`
- ✅ Группировка/badges/bulk actions работают как сейчас
- ✅ Правильное использование cache/inflight/abort
- ✅ Optimistic updates после мутаций

**Backend Requirements:**
- 🚨 **Критично:** `domain_role` в `GET /sites/:siteId/redirects`
- 🎯 **Опционально:** `domain_status`, `cf_implementation`

**Timeline:** ~21-30 часов (3-4 недели с учетом backend)

**PR Structure:**
- PR-A: API Layer + Cache (4-6h)
- PR-B: State Management (4-6h)
- PR-C: Page Wiring (6-8h)
- PR-D: Bulk Actions (3-4h)
- PR-E: Drawer (4-6h)

---

### 2. PLAN-redirects-site-context.md

**Статус:** Alternative, Deprecated

**Подход:** Redirects page в контексте Site, но БЕЗ role от backend.

**Отличия от recommended:**
- ❌ Нет `domain_role` от backend
- ❌ Frontend вычисляет role (сложнее, менее надежно)
- ❌ Убрана отдельная колонка Template (добавлен badge в Domain cell)

**Рекомендация:** Использовать PLAN-redirects-with-role.md вместо этого.

---

### 3. ANALYSIS-redirects-migration.md

**Статус:** Research Document

**Подход:** Детальный анализ существующей mock реализации vs новый API.

**Содержание:**
- Что уже есть в UI (на моках)
- Что предоставляет новый API
- Gaps analysis
- Migration strategy (4 фазы)

**Use Case:** Reference document для понимания scope изменений.

---

## 🚀 Quick Start

### Для начала работы:

1. **Прочитать:** `PLAN-redirects-with-role.md` (раздел "BACKEND REQUIREMENTS")
2. **Согласовать с backend team:** Добавление `domain_role`
3. **Начать PR-A:** API Layer (можно работать с mock пока backend не готов)
4. **Параллельно PR-B:** State Management
5. **После A+B готовы:** PR-C/D/E в любом порядке

---

## 📊 Comparison Table

| Aspect | with-role (⭐) | site-context | migration |
|--------|---------------|--------------|-----------|
| Backend changes | `domain_role` (minimal) | None | Analysis only |
| UI changes | Minimal (mock → API) | Minimal + compute role | 4 phases |
| Template display | Badge in Domain cell | Badge in Domain cell | Separate column (deprecated) |
| Maintenance | Easy | Medium | N/A |
| Risk | Low (if backend ready) | Medium (frontend logic) | N/A |

---

## 🎯 Recommendation

**Use PLAN-redirects-with-role.md** - это самый быстрый и надежный путь к реализации при минимальных изменениях в UI.

**Критическая зависимость:** Backend добавляет `domain_role` в `GET /sites/:siteId/redirects`.

**Альтернатива:** Если backend не может добавить role - см. раздел 17 в PLAN-redirects-with-role.md для вычисления role на фронте.

---

## 📞 Contact

Вопросы по планам: @admin310st
Backend requirements: См. раздел "BACKEND REQUIREMENTS" в PLAN-redirects-with-role.md
