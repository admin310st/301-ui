# TODO: Streams / TDS

**Layer 5** — Traffic Distribution System UI
**Status:** Core complete. Site-scoped rules shipped via client-side filtering.
**Backend blocker:** `admin310st/301#21` — `GET /tds/rules/:id` returns 500 (blocks Edit Rule drawer)

**Related docs:**
- `docs/301-wiki/TDS.md` — TDS specification (SmartLink + SmartShield)
- `docs/mab-algorithms.md` — MAB algorithm details (Thompson Sampling, UCB, Epsilon-Greedy)

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
- `tds_domain_bindings` is an internal CF Worker sync mechanism, not a user-facing concept.

### Two UI entry points

1. **`streams.html`** — Global TDS management page (account-wide, with site selector)
2. **Projects → Streams tab** — Site-context view (rules for a specific site)

---

## Completed

### Phase 1: Types + API Client
- `src/api/types.ts` — TDS types (TdsRule, TdsDomainBinding, TdsPreset, etc.)
- `src/api/tds.ts` — Full API client with cache, in-flight guards
- `tsconfig.json` / `vite.config.ts` — `@streams` path alias

### Phase 2: State + Rules Table + Page
- `src/streams/state.ts` — State singleton + pub/sub
- `src/streams/table.ts` — Rules table rendering
- `src/streams/tds-page.ts` — Page controller (4 visibility states)
- `src/streams/helpers.ts` — Display helpers (badges, condition summaries)
- `src/streams/filters-config.ts` + `filters-ui.ts` — Filter system
- `streams.html` — Full table layout with welcome card, search, filters, empty/error states

### Phase 3: Create Rule Drawer
- `partials/tds-rule-drawer.hbs` — Drawer partial
- `src/streams/drawer.ts` — Create (preset + manual) and edit modes
- `src/streams/preset-renderer.ts` — Preset selector + dynamic param fields
- Custom dropdowns per StyleGuide (no native `<select>`)

### Phase 4: Edit + Domain Bindings
- Edit mode in drawer (loads rule + domains, pre-fills form)
- `src/streams/domain-binding.ts` — Domain picker, bind/unbind
- Delete confirmation dialog

### Phase 5: i18n
- ~180 English keys in `en.ts`, English placeholders in `ru.ts`
- `data-i18n` attributes on all static HTML text
- All TS files use `t()` / `tWithVars()`

### Phase 6: Site-scoped Rules
- Single-select site selector (flat list of all sites)
- `site_id` passed on rule creation from site context
- Client-side filtering by site
- Projects → Streams tab with per-site TDS status
- TDS entry point in redirects site dropdown

### Phase 7: Polish
- Browser extension hint for geo targeting (Chrome + Firefox links)
- Collapsible UTM/path/referrer sections
- Rich preset tooltips, inline type + status chips
- Action URL stacked below label with truncation

---

## Backlog

### Priority Reorder
- [ ] `src/streams/priority.ts` — up/down controls
- [ ] Debounced `PATCH /tds/rules/reorder`
- [ ] CSS `.priority-control` in tables.css

### Sites Page Integration
- [ ] Add TDS rules count column/badge to sites table
- [ ] Click count → navigate to streams.html filtered by site
- [ ] Show TDS status in site row (active rules / no rules)

### Site Domains Drawer Integration
- [ ] Show "N TDS rules" badge next to acceptor domain in site-domains drawer

### Polish
- [ ] Russian translations in `ru.ts`
- [ ] Accessibility audit (aria-labels, keyboard navigation)
- [ ] Mobile responsive testing
- [ ] `/uix` style guide compliance check

---

## File Structure

```
streams.html                          # Global TDS page
partials/tds-rule-drawer.hbs          # Drawer partial
src/streams/
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

**Last updated:** 2026-03-07
