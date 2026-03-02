# TODO: Streams / TDS

**Layer 5** — Traffic Distribution System UI
**Status:** Core implemented (types, API, table, drawer, domain bindings, i18n)
**Blocker:** `admin310st/301#22` — TDS rules need `site_id` FK (backend migration required)

**Related docs:**
- `docs/301-wiki/TDS.md` — TDS specification (SmartLink + SmartShield)
- `docs/mab-algorithms.md` — MAB algorithm details (Thompson Sampling, UCB, Epsilon-Greedy)

---

## ⛔ Blocker: Site-scoped rules (`admin310st/301#22`)

The current API model is **rule-centric**: rules are account-scoped, domains are manually bound via `tds_domain_bindings`. This inverts the natural hierarchy and breaks UX:

- User thinks "configure TDS for my site" but must create a rule in a vacuum, then manually find and bind domains
- Domain picker shows ALL account domains with no role indication (acceptor/donor/reserve)
- Projects → Streams tab reconstructs site-scoping via fragile `domain_name` string matching

**Required change:** Add `site_id` FK to `tds_rules` — rules belong to a site, acceptor domain is implicit. Same model as Redirects (`GET /sites/:id/redirects`).

**Until #22 is resolved**, the following are blocked:
- Projects → Streams tab (proper implementation)
- Auto-bind on rule creation from site context
- Domain picker improvements (grouping by site, role badges)
- Site filter on streams.html

See issue for full API change proposal and migration path.

---

## Architecture: TDS = Site-scoped

**TDS rules belong to a site.** The site's acceptor domain is the traffic entry point where the Cloudflare Worker runs TDS logic.

```
Project
  └─ Site (site_id on rule)
       └─ acceptor domain (main traffic entry point)
            └─ CF Worker route (brand.com/*)
                 └─ TDS Rules (site_id FK → site)
```

- **Site = TDS endpoint.** Configuring TDS for a site = configuring rules for its acceptor domain.
- Donor/reserve domains redirect TO the acceptor — they don't need their own TDS.
- A site without an acceptor domain cannot have TDS rules.
- `tds_domain_bindings` becomes an **internal CF Worker sync mechanism**, not a user-facing concept.

### Two UI entry points

1. **`streams.html`** — Global TDS management page (account-wide, with site filter)
2. **Projects → Streams tab** — Site-context view (rules for a specific site)

---

## Completed

### Phase 1: Types + API Client ✅
- `src/api/types.ts` — TDS types (TdsRule, TdsDomainBinding, TdsPreset, etc.)
- `src/api/tds.ts` — Full API client with cache, in-flight guards
- `tsconfig.json` / `vite.config.ts` — `@streams` path alias

### Phase 2: State + Rules Table + Page ✅
- `src/streams/state.ts` — State singleton + pub/sub
- `src/streams/table.ts` — Rules table rendering
- `src/streams/tds-page.ts` — Page controller (4 visibility states)
- `src/streams/helpers.ts` — Display helpers (badges, condition summaries)
- `src/streams/filters-config.ts` + `filters-ui.ts` — Filter system
- `streams.html` — Full table layout with welcome card, search, filters, empty/error states
- Entry point moved to `src/main.ts` (after auth ready)

### Phase 3: Create Rule Drawer ✅
- `partials/tds-rule-drawer.hbs` — Drawer partial
- `src/streams/drawer.ts` — Create (preset + manual) and edit modes
- `src/streams/preset-renderer.ts` — Preset selector + dynamic param fields
- Custom dropdowns per StyleGuide (no native `<select>`)

### Phase 4: Edit + Domain Bindings ✅
- Edit mode in drawer (loads rule + domains, pre-fills form)
- `src/streams/domain-binding.ts` — Domain picker, bind/unbind
- Delete confirmation dialog

### Phase 5: i18n ✅
- ~180 English keys in `en.ts`, English placeholders in `ru.ts`
- `data-i18n` attributes on all static HTML text
- All TS files use `t()` / `tWithVars()`

---

## Next: Projects → Streams Tab ⛔ blocked by `301#22`

**Goal:** Site-scoped TDS management inside the project detail view.

**Blocked until backend adds `site_id` to `tds_rules`.** Current domain-binding workaround is too fragile for production.

### Flow (after #22)

```
Projects Detail → Streams Tab
  ├─ List of project's sites with TDS status
  │   Site name | acceptor domain | rules count | status badge
  │
  ├─ Click site → show TDS rules for that site (GET /tds/rules?site_id=X)
  │
  └─ Create rule → site_id pre-filled from context
```

### Tasks (after #22)

- [ ] Update `src/api/tds.ts` — pass `site_id` on create, add `?site_id=` filter param
- [ ] Update `src/api/types.ts` — add `site_id` to `TdsRule`
- [ ] Render site list with TDS info in Streams tab (`src/ui/projects.ts`)
- [ ] "Configure TDS" action per site → open TDS drawer with `site_id` context
- [ ] Remove manual domain picker from drawer (binding is implicit)
- [ ] Empty state per site: "No TDS rules configured for this site"
- [ ] i18n keys for Projects → Streams tab

---

## Backlog

### Post-#22: Streams Page — Site Filter
- [ ] Add "Site" filter chip on streams.html (`?site_id=` query param)
- [ ] Deep-link from Projects → Streams tab to `/streams.html?site=X`

### Post-#22: Sites Page Integration
- [ ] Add TDS rules count column/badge to sites table
- [ ] Click count → navigate to streams.html filtered by site
- [ ] Show TDS status in site row (active rules / no rules)

### Post-#22: Site Domains Drawer Integration
- [ ] Show "N TDS rules" badge next to acceptor domain in site-domains drawer

### Priority Reorder
- [ ] `src/streams/priority.ts` — up/down controls
- [ ] Debounced `PATCH /tds/rules/reorder`
- [ ] CSS `.priority-control` in tables.css

### Polish
- [ ] Russian translations in `ru.ts`
- [ ] Accessibility audit (aria-labels, keyboard navigation)
- [ ] Mobile responsive testing
- [ ] `/uix` style guide compliance check

---

## File Structure (Current)

```
streams.html                          # Global TDS page
partials/tds-rule-drawer.hbs          # Drawer partial
src/streams/
  main.ts                             # Entry point (delegates to main.ts)
  tds-page.ts                         # Page controller
  state.ts                            # State management (pub/sub)
  table.ts                            # Table rendering
  drawer.ts                           # Create/edit drawer
  preset-renderer.ts                  # Preset UI
  domain-binding.ts                   # Domain picker + binding
  helpers.ts                          # Display helpers
  filters-config.ts                   # Filter definitions
  filters-ui.ts                       # Filter chip rendering
src/api/tds.ts                        # API client
```

---

**Last updated:** 2026-03-02
