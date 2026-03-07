# 301-ui TODO Index

Central task index for the 301-ui project. See `CLAUDE.md` for architecture and conventions.

---

## Current Focus (2026-03-07)

**Priority:** UX polish (#167), i18n coverage, domain inspector tabs
**Backend blocker:** `admin310st/301#21` — `GET /tds/rules/:id` returns 500 (blocks Edit Rule drawer)

**Next tasks:**
1. **i18n pass** for Domains (0 `data-i18n` attributes). Redirects: done (tooltips remain)
2. **Domain inspector tabs** — convert 3 sections into tab UI (SSL, Security, Monitoring, Logs)
3. **#167 remaining items** — Redirects drawer polish, table ergonomics

---

## Roadmap

```
Layer 0: Auth pages, UI Style Guide                    DONE
Layer 1: Integrations (Cloudflare, Namecheap)          DONE
Layer 2: Domains (real API, filters, bulk actions)     DONE
Layer 3: Projects, Sites (CRUD, tabs navigation)       DONE
Layer 4: Redirects (full API, Cloudflare sync)         DONE
Layer 5: Streams/TDS (core + site-scoped)              DONE
Layer 6: UX enhancements, advanced bulk actions        IN PROGRESS
Layer 7: Admin tools (System, Jobs, Market)            PLANNED
```

---

## Detailed TODO Files

### 1. Domains (`TODO-domains.md`)

**Status:** Core complete (real API). Table, search, filters, inspector drawer (3 sections: Overview, DNS, Routing with live redirect data and zone limits), add domains drawer (batch API, domain parser), dropdown actions, IDN support, DNS NS check, bulk actions (change role, block, delete), project filter, pagination (25/page, prev/next).

**Remaining:**
- [ ] Drawer tabs (convert current 3 sections into tab UI; add SSL, Security, Monitoring, Logs)
- [ ] Stat-cards in header
- [ ] Table sorting by columns
- [x] i18n coverage — ~100 keys (EN/RU), HTML data-i18n, t() in 3 TS files (domains.ts, bulk-actions.ts, add-domains-drawer.ts)
- [ ] Add domains drawer: progress indicator for large batches, persist last CF account
- [ ] Bulk actions: assign to site (stub), move to project (dialog exists, no handler)
- [ ] Search debounce, filter/sort URL persistence

### 2. Redirects (`TODO-redirects.md`)

**Status:** Feature-complete (2026-02-11)

Done: Full table with hierarchy, API layer, project/site selectors, filters, drawer with template selector (T1/T5/T6/T7), bulk actions, site-level actions, CF sync, safeCall migration, adapter removal. Canonical redirect color differentiation. Red target for custom (non-acceptor) redirects.

**Remaining:**
- [x] i18n — ~130 keys (EN/RU), HTML data-i18n, t() in 4 TS files. Remaining: template labels in drawer, tooltips/aria-labels
- [ ] i18n — tooltips, aria-labels (~50 lower-priority strings)

### 3. Projects

**Status:** DONE (Layer 3). Table, CRUD, detail tabs (including Streams tab), integrations attach/detach, i18n.

### 4. Sites

**Status:** DONE (Layer 3). Global list + project detail, CRUD, domain management, i18n.

### 5. Streams/TDS

**Status:** Core complete (2026-02-25). Types, API client, table, drawer, domain bindings, i18n — all done. Site-scoped TDS implemented (site selector + client-side filter). Projects → Streams tab shipped. Browser extension hint for geo targeting.

**Backend blocker:** `admin310st/301#21` — `GET /tds/rules/:id` returns 500, blocks Edit Rule drawer.

**Completed:**
- Types + API client (`src/api/tds.ts`)
- Rules table with search, filters, 4 visibility states
- Create/edit drawer (preset + manual modes)
- Site-scoped rules (single-select site selector, `site_id` in create)
- Projects → Streams tab (site-scoped TDS status)
- Domain binding UI (picker, bind/unbind)
- Browser extension hint (Chrome + Firefox links)
- i18n (~180 English keys, all TS files use `t()`)

**Backlog:** Priority reorder, Russian translations, a11y audit.

Details in `TODO-streams.md`.

### 6. Dashboard

**Status:** DONE (2026-02-28). Dual-mode: onboarding wizard for new users + overview stats for established accounts. Interactive step-flow with next-step hints. Live Domain Health and Expiring Soon cards.

### 7. UX Foundation (#167)

**Status:** Partially shipped (2026-03-07).

**Done:**
- [x] Unified dialog contract — single `[data-confirm]` replaces 13 hardcoded selectors
- [x] Dialog Escape/focus management (auto-focus confirm, restore trigger focus)
- [x] Drawer manager migration — 7 drawers use `drawerManager.open/close/onClose`
- [x] Escape key priority: dialogs take precedence over drawers

**Remaining:** See [#167](https://github.com/admin310st/301-ui/issues/167) for full list.

---

## Performance & Optimization

### Current State

- Bundle: ~50 KB gzipped (well under thresholds)
- Bundle analyzer: `npm run build:analyze` → `build/bundle-stats.html`

### Optimization Thresholds

| Metric | Trigger | Action |
|--------|---------|--------|
| Bundle >300KB | Code splitting | Entry Points Pattern (MPA) or manualChunks |
| Table >500 rows | Virtualization | Virtual scrolling |
| FCP >2s | Lazy loading | Code splitting + lazy imports |
| LCP >2.5s | Image optimization | Preload + prefetch |

### Code Splitting (when needed)

Recommended: **Entry Points Pattern** for this MPA project — separate entry points per page group. Already split: `main.ts` (dashboard/auth) + `main-public.ts` (content pages).

---

## Known Blockers

### Backend API Gaps

**TDS/Streams:**
- [admin310st/301#21](https://github.com/admin310st/301/issues/21) — `GET /tds/rules/:id` returns 500 (blocks Edit Rule drawer)

**Redirects:**
- [#164](https://github.com/admin310st/301-ui/issues/164) — API returns duplicate `domain_id` when domain has T1 + T3/T4 redirects (frontend `dedupDomains()` workaround in `state.ts`)
- [#165](https://github.com/admin310st/301-ui/issues/165) — Post-probe type gaps (zone_id types, missing fields)

**Domains:**
- `registrar` field missing from SQL schema
- Monitoring fields (`abuse_status`, `last_check_at`) missing
- [#162](https://github.com/admin310st/301-ui/issues/162) — VirusTotal domain monitoring

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

**Last updated:** 2026-03-07

**Next action:** i18n pass for Domains. Domain inspector tabs. #167 remaining items (P2).
