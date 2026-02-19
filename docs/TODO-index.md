# 301-ui TODO Index

Central task index for the 301-ui project. See `CLAUDE.md` for architecture and conventions.

---

## Current Focus (2026-02-11)

**Priority:** Streams/TDS (Layer 5)

**Next tasks:**
1. **Streams/TDS page** — Layer 5 (see `TODO-streams.md`)
2. **i18n pass** for Redirects and Domains (0 `data-i18n` attributes)

---

## Roadmap

```
Layer 0: Auth pages, UI Style Guide                    DONE
Layer 1: Integrations (Cloudflare, Namecheap)          DONE
Layer 2: Domains (real API, filters, bulk actions)     DONE
Layer 3: Projects, Sites (CRUD, tabs navigation)       DONE
Layer 4: Redirects (full API, Cloudflare sync)         DONE
Layer 5: Streams/TDS                                   NEXT
Layer 6: UX enhancements, advanced bulk actions        PLANNED
Layer 7: Admin tools (System, Jobs, Market)            PLANNED
```

---

## Detailed TODO Files

### 1. Domains (`TODO-domains.md`)

**Status:** Core complete (real API, 2025-01-31)

Done: Table (6 cols), search & filters, inspector drawer, add domains drawer (batch API), dropdown actions, IDN support, DNS NS check, bulk actions, project filter, pagination stub.

**Remaining:**
- [ ] Drawer tabs (Overview, Routing, DNS, SSL, Security, Monitoring, Logs)
- [ ] Stat-cards in header
- [ ] Pagination (working implementation; stub ready)
- [ ] Table sorting by columns
- [ ] i18n coverage
- [ ] Add domains drawer: domain validation, progress indicator, persist last CF account

### 2. Redirects (`TODO-redirects.md`)

**Status:** Feature-complete (2026-02-11)

Done: Full table with hierarchy, API layer, project/site selectors, filters, drawer with template selector (T1/T5/T6/T7), bulk actions, site-level actions, CF sync, safeCall migration, adapter removal.

**Remaining:**
- [ ] i18n (0 `data-i18n` attributes)

### 3. Projects

**Status:** DONE (Layer 3). Table, CRUD, detail tabs, integrations attach/detach, i18n.

### 4. Sites

**Status:** DONE (Layer 3). Global list + project detail, CRUD, domain management, i18n.

### 5. Streams/TDS

**Status:** Documented (`TODO-streams.md`, aligned with mini-tds)

**Components planned:**
- Context bar (project/site/domain selectors)
- Pipeline strip (Traffic Shield -> TDS Rules -> Target/Origin)
- Rules table with priority controls
- Drawer-based rule editor (conditions, targets, weights)
- Draft/publish workflow with sticky banner
- Onboarding checklist card

**Milestones (6 stages):**
1. Page skeleton + context bar + pipeline strip
2. Welcome screen + onboarding checklist
3. Rules table + add rule drawer (MVP)
4. Rule editor logic (conditions, targets, weights)
5. Priority controls (reorder UX)
6. Draft/publish workflow + filters

**API alignment:** Data structure matches mini-tds (RouteRule format), Match/Action pattern, weighted_redirect support, ETag-based updates.

Details in `TODO-streams.md`.

---

## Phase 3: Advanced Features (in progress)

- Streams/TDS page (next)
- [ ] Drawer tabs for Domains (7 tabs)
- [ ] Advanced bulk actions
- [ ] Analytics integration

---

## Performance & Optimization

### Current State

- Bundle: 181.56 KB -> 50.06 KB gzipped (OK for now)
- Bundle analyzer: `npm run build:analyze` -> `build/bundle-stats.html`

### Optimization Thresholds

| Metric | Trigger | Action |
|--------|---------|--------|
| Bundle >300KB | Code splitting | Entry Points Pattern (MPA) or manualChunks |
| Table >500 rows | Virtualization | Virtual scrolling |
| FCP >2s | Lazy loading | Code splitting + lazy imports |
| LCP >2.5s | Image optimization | Preload + prefetch |

### Code Splitting (when needed)

Recommended: **Entry Points Pattern** for this MPA project — separate entry points per page group (`main-auth.ts`, `main-dashboard.ts`, `main-domains.ts`, etc.) so each page loads only required code. See `CLAUDE.md` for full architecture.

---

## Known Blockers

### Backend API Gaps

**Redirects:**
- [#164](https://github.com/admin310st/301-ui/issues/164) — API returns duplicate `domain_id` when domain has T1 + T3/T4 redirects (frontend `dedupDomains()` workaround in `state.ts`)
- [#165](https://github.com/admin310st/301-ui/issues/165) — Post-probe type gaps (zone_id types, missing fields)

**Domains:**
- `registrar` field missing from SQL schema
- Monitoring fields (`abuse_status`, `last_check_at`) missing

---

## Documentation & Conventions

| Resource | Location |
|----------|----------|
| Project instructions | `CLAUDE.md` |
| UI Style Guide | `docs/StyleGuide.md` |
| i18n guidelines | `.claude/i18n-conventions.md` |
| UI roadmap | `docs/ui-roadmap.md` |
| API specs | `docs/301-wiki/` |
| UI reviewer agent | `.claude/agents/ui-code-reviewer.md` (`/uix`) |
| Icon preview | `/icons-preview.html` |

---

## Workflow: New Page Checklist

1. Check this index for priorities
2. Create `TODO-{feature}.md` if needed
3. Follow patterns: dashboard layout, sidebar partial, table + drawer, mock data first
4. Run `/uix` before committing CSS/HTML changes
5. Update this index with progress

---

**Last updated:** 2026-02-11

**Next action:** Streams/TDS page implementation (Layer 5)
