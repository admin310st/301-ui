# 301-ui TODO Index

Central task index for the 301-ui project. See `CLAUDE.md` for architecture and conventions.

---

## Current Focus (2026-03-02)

**Priority:** Streams/TDS integration with Projects (Layer 5)
**Blocker:** `admin310st/301#22` — TDS rules need `site_id` FK before Projects integration can proceed

**Next tasks:**
1. **⛔ Projects → Streams tab** — blocked by 301#22 (backend must add `site_id` to `tds_rules`)
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

**Status:** Core implemented (2026-02-25). Types, API client, table, drawer, domain bindings, i18n — all done.
**Blocker:** `admin310st/301#22` — current API model is rule-centric (rules → domain bindings). Needs `site_id` FK on `tds_rules` to match Redirects pattern. Until resolved, Projects integration is blocked.

**Completed:**
- Types + API client (`src/api/tds.ts`)
- Rules table with search, filters, 4 visibility states
- Create/edit drawer (preset + manual modes)
- Domain binding UI (picker, bind/unbind) — will be replaced after #22
- i18n (~180 English keys, all TS files use `t()`)

**Blocked:** Projects → Streams tab, auto-bind, domain picker improvements — all waiting on #22.

**Backlog (unblocked):** Priority reorder, Russian translations, a11y audit.

Details in `TODO-streams.md`.

---

## Phase 3: Advanced Features (in progress)

- Streams/TDS page (next)
- [ ] **Dashboard redesign** — current page is an onboarding wizard built before the Style Guide. Rebuild as a real dashboard: keep wizard for new users, then show overview stats, recent activity, health summaries. Must follow `docs/StyleGuide.md` patterns and table/card layout conventions used across other pages.
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

**TDS/Streams:**
- [admin310st/301#22](https://github.com/admin310st/301/issues/22) — TDS rules need `site_id` FK (blocks Projects → Streams tab, auto-bind, domain picker rework)

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

**Last updated:** 2026-03-02

**Next action:** Waiting on `admin310st/301#22` for TDS site-scoping. Meanwhile: i18n pass, dashboard polish.
