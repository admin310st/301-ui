# TODO: Streams / TDS

**Layer 5** — Traffic Distribution System UI
**Status:** Core implemented (types, API, table, drawer, domain bindings, i18n)

**Related docs:**
- `docs/301-wiki/TDS.md` — TDS specification (SmartLink + SmartShield)
- `docs/mab-algorithms.md` — MAB algorithm details (Thompson Sampling, UCB, Epsilon-Greedy)

---

## Architecture: TDS = Site-scoped

**TDS rules are conceptually site-scoped.** The site's acceptor domain is the traffic entry point where the Cloudflare Worker runs TDS logic.

```
Project
  └─ Site
       └─ acceptor domain (main traffic entry point)
            └─ CF Worker route (brand.com/*)
                 └─ TDS Rules (config for this hostname)
```

- **Site = TDS endpoint.** Configuring TDS for a site = configuring rules for its acceptor domain.
- Donor/reserve domains redirect TO the acceptor — they don't need their own TDS.
- The API binds rules to `domain_id`, but the UI should present this as "TDS for site X".
- A site without an acceptor domain cannot have TDS rules.

### Two UI entry points

1. **`streams.html`** — Global TDS management page (account-wide view of all rules)
2. **Projects → Streams tab** — Site-context view (rules for a specific site's acceptor domain)

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

## Next: Projects → Streams Tab

**Goal:** Site-scoped TDS management inside the project detail view.

The Projects page already has a Streams tab (placeholder: "coming soon"). This needs to become a working interface.

### Flow

```
Projects Detail → Streams Tab
  ├─ List of project's sites with TDS status
  │   Site name | acceptor domain | rules count | status badge
  │
  ├─ Click site → expand/navigate to TDS rules for that site
  │   (rules filtered by bindings to site's acceptor domain)
  │
  └─ Create rule → auto-binds to selected site's acceptor domain
```

### Tasks

- [ ] Render site list with TDS info in Streams tab (`src/ui/projects.ts`)
- [ ] Load TDS rules for project's sites (cross-reference rules ↔ site domains)
- [ ] "Configure TDS" action per site → open TDS drawer or navigate to filtered streams page
- [ ] Auto-bind: when creating rule from site context, pre-select site's acceptor domain
- [ ] Empty state per site: "No TDS rules configured for this site"
- [ ] i18n keys for Projects → Streams tab

---

## Backlog

### Domain Picker Improvements
- [ ] Group domains by site in the domain picker
- [ ] "Bind to site" shortcut (selects all site's domains)
- [ ] Show domain role (acceptor/donor/reserve) as badge in picker
- [ ] Filter picker by site when opened from site context

### Sites Page Integration
- [ ] Add TDS rules count column/badge to sites table
- [ ] Click count → navigate to streams.html filtered by site
- [ ] Show TDS status in site row (active rules / no rules)

### Site Domains Drawer Integration
- [ ] Show "N TDS rules" badge next to each domain in site-domains drawer
- [ ] Or a TDS section in drawer footer

### Streams Page — Site Filter
- [ ] Add "Site" filter chip on streams.html
- [ ] Filter rules by domain bindings matching selected site's domains

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

**Last updated:** 2026-02-25
