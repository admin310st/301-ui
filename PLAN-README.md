# Implementation Plans Overview

Этот документ описывает все планы по реализации Redirects feature.

---

## 📋 Available Plans

### 1. PLAN-redirects-FINAL.md ⭐ **ACTIVE**

**Статус:** Ready for Implementation
**Дата:** 2026-01-18

**Подход:** Обновлённый план на основе проверки реального кода backend.

**Ключевые факты (подтверждено в коде):**
- ✅ `domain_role` **УЖЕ реализован** в backend
- ✅ `domains[]` с вложенной структурой `redirect: {...} | null`
- ✅ LEFT JOIN — возвращаются ВСЕ домены сайта
- ✅ `zone_limits[]` включены в response
- ✅ `total_domains`, `total_redirects` — новые поля

**TypeScript структура:**
```typescript
interface SiteDomain {
  domain_id: number;
  domain_name: string;
  domain_role: 'acceptor' | 'donor' | 'reserve';
  zone_id: number | null;
  zone_name: string | null;
  redirect: RedirectRule | null;  // null = домен без редиректа
}
```

**Implementation Phases:**
1. PR-A: API Layer (4-6h)
2. PR-B: State Management (4-6h)
3. PR-C: UI Integration (6-8h)
4. PR-D: Bulk Actions (3-4h)
5. PR-E: Drawer (4-6h)

**Estimated:** 22-30 hours

---

### 2. PLAN-redirects-with-role.md (Deprecated)

**Статус:** Superseded by FINAL

Оригинальный план с требованиями к backend. Backend requirements выполнены, план заменён на FINAL.

---

### 3. PLAN-redirects-site-context.md (Deprecated)

**Статус:** Superseded by FINAL

Альтернативный план без role от backend. Не актуален — role есть в API.

---

### 4. PLAN-redirects-implementation.md (Reference)

**Статус:** Reference Document

Общий план UI реализации: templates, presets, sync, analytics. Используется как reference для Phase 3-5.

---

### 5. ANALYSIS-redirects-migration.md (Reference)

**Статус:** Research Document

Детальный анализ mock → API migration. Используется как reference.

---

## 🚀 Quick Start

```bash
# 1. Прочитать финальный план
cat PLAN-redirects-FINAL.md

# 2. Начать с API Layer
# Создать src/api/redirects.ts

# 3. Затем State Management
# Создать src/redirects/state.ts

# 4. UI Integration
# Обновить src/redirects/redirects.ts
```

---

## 📊 Backend API Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| `domain_role` in response | ✅ Ready | `d.role as domain_role` in SQL |
| All domains returned | ✅ Ready | LEFT JOIN on redirect_rules |
| `zone_limits[]` | ✅ Ready | Included in response |
| Templates endpoint | ✅ Ready | GET /redirects/templates |
| Presets endpoint | ✅ Ready | GET /redirects/presets |
| CRUD endpoints | ✅ Ready | POST/PATCH/DELETE working |
| Apply sync | ✅ Ready | POST /zones/:id/apply-redirects |

**Backend is 100% ready. Frontend can start immediately.**

---

## 🎯 Current Focus

**Use PLAN-redirects-FINAL.md** — это единственный актуальный план.

Все остальные планы — либо deprecated, либо reference documents.

---

## 📞 Contact

Questions: @admin310st
Backend repo: https://github.com/admin310st/301
