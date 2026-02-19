# TODO: Streams / TDS Page

**Layer 5** -- Traffic Distribution System UI
**Status:** In progress (welcome card + empty state done)
**Scope:** Frontend only -- mock data first, API integration later

**Related docs (do not duplicate here):**
- `docs/301-wiki/TDS.md` -- TDS specification (SmartLink + SmartShield)
- `docs/tds-backend-recommendations.md` -- Backend API contract (authoritative for endpoints)
- `docs/mab-algorithms.md` -- MAB algorithm details (Thompson Sampling, UCB, Epsilon-Greedy)
- `docs/mini-tds-analysis.md` -- mini-tds prototype analysis (reference only)
- `docs/ui-roadmap.md` -- Layer 5 overview, entity model, stream detail tabs

**Current state:** `streams.html` has a welcome/onboarding card with 3-step flow (Shield, Rules, Publish) and an empty state. `src/streams/main.ts` has basic welcome card toggle logic. No rules table, drawer, or API integration yet.

---

## Terminology

- **Position** (UI label) = `priority` (API/code field). Lower number executes first.
- **SmartShield** = route by CF metadata (geo, device, bots, ASN, TLS)
- **SmartLink** = route by UTM params and campaign tags
- **MAB** = Multi-Armed Bandit auto-optimizing A/B test (Pro plan feature)

---

## Phase 1: TypeScript Types + Mock Data

- [ ] Create `src/streams/types.ts` with TDS rule interfaces
  - `RuleType`: `"smartlink" | "smartshield"`
  - `SmartShieldMatch`: path, countries, devices, bots, asn, tls_version, ip_ranges
  - `SmartLinkMatch`: utm_source, utm_campaign, utm_content, utm_medium, custom_params
  - `RedirectAction`: url, status (301/302), preserveOriginalQuery, appendCountry, appendDevice
  - `MABRedirectAction`: algorithm, targets (MABTarget[]), metric, min_sample_size, exploration_period
  - `ResponseAction`: status, headers, bodyHtml, bodyText
  - `TDSRule`: id, rule_type, enabled, priority, label, match, action, metadata
- [ ] Create `src/streams/mock-data.ts` with 6-8 example rules covering:
  - SmartShield geo+device redirect
  - SmartShield MAB A/B test (with stats)
  - SmartShield advanced filters (ASN, TLS)
  - SmartLink UTM redirect
  - SmartLink MAB A/B test
  - SmartLink custom params
  - Bot catch-all with response action
- [ ] Create `src/streams/adapter.ts` -- convert API types to UI display types

## Phase 2: Context Bar + Site Selector

Primary scope is **Site** (TDS rules have FK `site_id`). Domain selector is secondary (for entry URL / simulator).

- [ ] Add `.tds-context-bar` to `streams.html` (sticky, below utility bar)
  - Project selector (dropdown, btn-chip)
  - Site selector (dropdown, btn-chip) -- **primary scope**
  - Acceptor domain selector (show only `role: acceptor` domains from selected site)
  - Shield status badge
  - TDS status badge
  - Simulator button (placeholder)
  - Publish button (disabled until draft changes exist)
- [ ] Create `src/streams/context.ts`
  - Load projects via `GET /projects`
  - Load sites via `GET /projects/:id/sites`
  - Load site domains, filter by `role: acceptor`
  - Persist selected project/site in `ui-preferences`
  - Reuse patterns from `src/redirects/site-selector.ts`
- [ ] CSS: `.tds-context-bar` in `static/css/site.css`
  - Sticky position, single-line desktop / 2-line mobile
  - Spacing: `--space-3` between groups

## Phase 3: Rules Table

Reuse `.table`, `.table-controls` patterns from domains/redirects.

### Toolbar
- [ ] Search input (`.table-search`)
- [ ] Filter chips: Type (SmartShield/SmartLink), Status (enabled/disabled), Country, Device
- [ ] Actions: "Create rule" button, overflow menu (Validate all, Import, Export, Invalidate cache)
- [ ] Reorder mode toggle button

### Table columns
| # | Column | Width | Notes |
|---|--------|-------|-------|
| 1 | Position | 80px | Number + up/down arrows + drag handle |
| 2 | Type | 100px | Badge: Shield (blue) or Link (teal) |
| 3 | When | fluid | Condition chips with "+N" overflow |
| 4 | Then | fluid | Target URL + status code badge |
| 5 | Enabled | 80px | Toggle switch |
| 6 | Updated | 120px | Relative time |
| 7 | Actions | 100px | Edit, duplicate, test, delete |

- [ ] Create `src/streams/table.ts` -- render rules from mock data
- [ ] Create `src/streams/filters.ts` -- client-side filtering
- [ ] Create `src/streams/filters-config.ts` -- filter definitions
- [ ] Create `src/streams/filters-ui.ts` -- filter chip rendering (pattern: `src/domains/filters-ui.ts`)

### New CSS components
- [ ] `.priority-control` -- vertical layout: up arrow, number, down arrow, drag handle
- [ ] `.condition-chips` -- inline chip list with "+N" overflow badge
- [ ] `.target-info` -- URL display + status code badge
- [ ] `.toggle` -- iOS-style toggle switch (check if exists, reuse if so)

### Empty state
- [ ] "No rules yet" with CTA to create first rule (reuse `.empty-state`)
- [ ] "No rules match filters" with "Clear filters" button (already in HTML)

### Responsive
- [ ] Hide "Updated" column below 768px
- [ ] Hide "When" column below 600px (details visible in drawer)

## Phase 4: Rule Drawer (Editor)

Reuse drawer pattern from `partials/connect-cloudflare-drawer.hbs`.

### Drawer shell
- [ ] Create `partials/tds-rule-drawer.hbs`
  - Header: title, enabled toggle, priority mini-control, close button
  - Body: 3 tabs (When, Then, Advanced)
  - Footer: Cancel, Save Draft, Save & Publish
- [ ] Create `src/streams/drawer.ts` -- open/close, form state, dirty tracking

### Tab: When (Conditions)
- [ ] Catch-all toggle: "Match all traffic" checkbox (disables all condition fields)
- [ ] Rule type selector: SmartShield / SmartLink (button group)
- [ ] SmartShield fields (shown when type=smartshield):
  - Path patterns (regex, repeatable list with add/remove)
  - Countries (multi-select dropdown with checkboxes)
  - Devices (chip group: Mobile, Desktop, Tablet)
  - Bots (select: Any, Exclude bots, Bots only)
  - Advanced (collapsible details): ASN, TLS version, IP ranges
- [ ] SmartLink fields (shown when type=smartlink):
  - UTM Source, Campaign, Content, Medium (text inputs)
  - Custom parameters (repeatable key-value pairs with add/remove)

### Tab: Then (Action)
- [ ] Action type selector: Redirect / A/B Test (MAB) / Response
- [ ] Redirect fields:
  - Target URL input
  - Status code dropdown (301, 302, 307)
  - Preserve query string checkbox
  - Advanced (collapsible): append country, append device
- [ ] MAB Redirect fields (Pro plan gated):
  - Variant cards (2+ required): label + URL + read-only stats (weight, conversions, estimated value)
  - "Add variant" button
  - Algorithm dropdown: Thompson Sampling (recommended), UCB, Epsilon-Greedy
  - Target metric: CR, RPU, CTR
  - Advanced: min sample size, exploration period, epsilon (for e-greedy), confidence (for UCB)
  - Performance chart placeholder (for existing rules)
  - Reset statistics button
- [ ] Response fields:
  - Status code input
  - Body type selector: HTML / Text-JSON
  - Response body textarea
  - Custom headers (collapsible, repeatable key-value)

### Tab: Advanced
- [ ] Read-only JSON preview of rule configuration
- [ ] Validate button (`POST /api/sites/:siteId/tds/rules/validate`)
- [ ] Metadata display: ETag, last updated timestamp

### Unsaved changes guard
- [ ] Track dirty state on form input events
- [ ] Show confirmation dialog on close when dirty (reuse `.dialog` pattern)

## Phase 5: Reorder / Priority Controls

- [ ] Create `src/streams/priority.ts`
  - Move up/down logic with array swap
  - Undo toast after position change (extend `src/ui/notifications.ts`)
  - Sync position display in both table and drawer
- [ ] Reorder mode toggle:
  - Show drag handles, highlight priority column
  - Optional: add "Move to top", "Move to bottom", "Set position..." to row context menu
- [ ] Optional: drag-and-drop via SortableJS (`src/streams/drag.ts`)
  - If added, update `package.json`
  - Reorder via drag handle `[data-drag-handle]`

## Phase 6: Draft / Publish Workflow

- [ ] Create `src/streams/draft.ts`
  - Track changes: create, update, delete, reorder
  - `draftChanges[]` array with type, ruleId, timestamp
- [ ] Draft banner (`.draft-banner`):
  - Sticky below context bar
  - Shows change summary ("3 rules modified, 1 reordered")
  - Discard button, Publish button
  - Hidden when no pending changes
- [ ] Publish action: `POST /api/sites/:siteId/tds/publish` (mock for now)
- [ ] Discard action: reset to last published state

## Phase 7: API Integration

**Production API base path:** `/api/sites/:siteId/tds/...` (site-scoped)

Do NOT code against mini-tds endpoints. Use mock data until backend implements the spec.

### Endpoints to integrate

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sites/:siteId/tds/rules` | List all rules for site |
| GET | `/api/sites/:siteId/tds/rules/:id` | Get single rule |
| POST | `/api/sites/:siteId/tds/rules` | Create rule |
| PATCH | `/api/sites/:siteId/tds/rules/:id` | Update rule |
| DELETE | `/api/sites/:siteId/tds/rules/:id` | Delete rule |
| POST | `/api/sites/:siteId/tds/rules/validate` | Validate rules |
| POST | `/api/sites/:siteId/tds/rules/reorder` | Batch reorder |
| POST | `/api/sites/:siteId/tds/publish` | Publish draft to KV |

### Integration tasks
- [ ] Create `src/api/tds.ts` with typed API functions
- [ ] All calls use `safeCall()` with appropriate `lockKey` / `abortKey`
- [ ] ETag-based optimistic locking (`If-Match` header on PUT/PATCH)
- [ ] Cache invalidation after mutations
- [ ] Replace mock data with real API responses
- [ ] Error handling: 409 conflict (ETag mismatch), 412 precondition failed

## Phase 8: Polish + i18n

- [ ] Add i18n keys to `src/i18n/locales/en.ts` and `ru.ts`:
  - `streams.title`, `streams.subtitle`
  - `streams.empty.*` (title, description, cta)
  - `streams.table.columns.*` (position, type, when, then, enabled, updated, actions)
  - `streams.drawer.*` (tabs, fields, buttons)
  - `streams.draft.*` (banner text, discard, publish)
  - `streams.welcome.*` (checklist items)
- [ ] Apply `data-i18n` attributes to all visible text in `streams.html`
- [ ] Accessibility audit:
  - `role="tablist"` / `role="tab"` / `role="tabpanel"` on drawer tabs
  - `aria-label` on icon-only buttons
  - `aria-expanded` on dropdowns
  - `aria-live="polite"` on toast and draft banner
  - Keyboard: Tab, Arrow keys for tabs, Enter/Space, Escape
- [ ] Mobile responsive testing (context bar, table, drawer)
- [ ] Run `/uix` style guide compliance check

---

## File Structure

```
streams.html                          # Page (exists, has welcome card)
partials/tds-rule-drawer.hbs          # Drawer partial (new)
src/streams/
  main.ts                             # Entry point (exists, basic)
  types.ts                            # TDS rule interfaces (new)
  mock-data.ts                        # Mock rules (new)
  adapter.ts                          # API-to-UI conversion (new)
  context.ts                          # Context bar selectors (new)
  table.ts                            # Table rendering (new)
  drawer.ts                           # Drawer management (new)
  priority.ts                         # Reorder controls (new)
  drag.ts                             # Drag-and-drop (new, optional)
  draft.ts                            # Draft tracking (new)
  filters.ts                          # Filter logic (new)
  filters-config.ts                   # Filter definitions (new)
  filters-ui.ts                       # Filter chip rendering (new)
src/api/tds.ts                        # API client (new, Phase 7)
static/css/site.css                   # New component styles (append)
```

## New CSS Components Summary

| Component | Purpose | File |
|-----------|---------|------|
| `.tds-context-bar` | Sticky site/project selectors + status | `site.css` |
| `.priority-control` | Up/down/drag controls in table | `site.css` |
| `.condition-chips` | Inline chips with "+N" overflow | `site.css` |
| `.target-info` | URL + status code display | `site.css` |
| `.draft-banner` | Sticky unpublished changes notification | `site.css` |
| `.mab-stats` | Read-only MAB variant statistics grid | `site.css` |
| `.code-block` | Monospace JSON display | `site.css` |

Reuse existing: `.table`, `.drawer`, `.tabs`, `.btn`, `.btn-chip`, `.badge`, `.dropdown`, `.field`, `.input`, `.select`, `.textarea`, `.panel`, `.card`, `.empty-state`, `.dialog`, `.toggle`, `.toast`.

---

## Open Questions

1. Should the context bar link to actual Shield settings or a placeholder?
2. How detailed should the Simulator UI be in Phase 1? (Full form vs. simple button)
3. Import/Export format: JSON only or also YAML?
4. Should publish show a confirmation dialog?
5. Should drafts persist across sessions via localStorage?

---

## Estimate

| Phase | Scope | Days |
|-------|-------|------|
| 1 | Types + mock data | 0.5 |
| 2 | Context bar + site selector | 1 |
| 3 | Rules table + filters | 1.5 |
| 4 | Rule drawer (editor) | 2.5 |
| 5 | Reorder / priority | 1 |
| 6 | Draft / publish | 0.5 |
| 7 | API integration | 1.5 |
| 8 | i18n + a11y + polish | 1 |
| **Total** | | **~9.5 days** |
