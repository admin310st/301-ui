# UI Roadmap — 301.st Dashboard

## Entity Model

The platform has a layered entity hierarchy:

```
Integrations (CF accounts, registrars) → source of resources
  └─ Domains → belong to integrations, used by projects/sites/streams
       └─ Projects → logical workspaces grouping domains, sites, streams
            ├─ Sites → landing pages / whitepages (target for redirects or TDS)
            ├─ Streams (TDS) → traffic distribution logic (conditions → branches)
            └─ Redirect Rules → simple 301/302/307 forwarding rules
```

Key concepts:
- Domains belong to integrations (CF + registrar), not to projects. Projects only **reference** domains.
- A domain attached to a site can also serve as a TDS entry point (cloaking: whitepage as fallback, offers as other branches).
- Redirects and Streams are parallel systems — a domain can use either or both.
- CF internals (Workers, Routes, KV, zones) are hidden from the user.

## Layer Status

| Layer | Scope | Status |
|-------|-------|--------|
| 0 | Auth, UI Style Guide, layout, i18n, partials, sidebar | Done |
| 1 | Integrations (CF bootstrap, NC init, key CRUD) | Done |
| 2 | Domains (table, filters, bulk actions, inspector, add drawer) | Done |
| 3 | Projects (CRUD, detail tabs) + Sites (CRUD, domain attach/detach) | Done |
| 4 | Redirects (templates T1-T7, CF sync, bulk ops, filters) | Done |
| **5** | **Streams / TDS (traffic distribution)** | **Next** |
| 6 | UX polish (inline edit, saved views, analytics summary) | Planned |
| 7 | Admin (system health, jobs, logs, marketplace) | Planned |

## Layer 5 — Streams / TDS

This is the next major feature. Streams implement traffic distribution logic (similar to Keitaro streams).

### Stream entity

A stream belongs to a project and:
- Takes traffic from one or more **entry domains**
- Applies conditions: GEO, device (mobile/desktop), referrer (search/social/direct/custom), and future: OS, browser, bot flags
- Distributes to **branches**: sites, external URLs, with weights (%)
- Has a **fallback** target (often the whitepage site when cloaking)

### Streams page (`/streams.html`)

Table columns: Name, Type (simple/split/cloaking), Input domains (#), Output targets (#), Status (enabled/disabled), Last change.

Actions: Create stream, Open, Enable/Disable, Delete.

### Stream detail view (tabs)

- **Overview** — entry domains, logic summary, targets, which domains overlay sites (cloaking)
- **Domains** — which domains feed this stream, with site attachment info
- **Logic (TDS editor)** — conditions and branches editor
- **Logs** — activity/errors (future)

### UI components needed

- **GEO targeting**: `flag-icons` library (SVG-based, 200+ countries, square variant `fis`). Multi-select dropdown with typeahead, country chips with flags, region grouping (Europe, Asia, Americas...).
- **Branch editor**: condition rows + target selectors + weight inputs
- **Fallback config**: site picker or URL input

### Data page (`/streams.html`) — placeholder exists

Currently shows "Coming soon..." message. Implementation will follow the same patterns as Redirects: project/site selectors, table with expandable rows, drawer for create/edit.

## Remaining Work on Completed Layers

### Domains (Layer 2)
- [ ] Inspector drawer tabs (Overview done; Routing & Redirects, DNS, SSL, Security, Monitoring, Logs)
- [ ] Stat-cards in header
- [ ] Pagination (stub ready)
- [ ] i18n coverage

### Redirects (Layer 4)
- [ ] Add Redirect wizard (stub exists in drawer.ts)
- [ ] i18n pass (0 data-i18n attributes currently)

### Cross-cutting
- [ ] Confirmation dialog HTML for clear-site-redirects in `redirects.html`
- [ ] ~20 inline style violations (cosmetic, not functional)

## Layer 6 — UX Polish

- Modals for creating/editing Streams, Sites, Redirects
- Bulk domain actions (attach/detach, sync, status change)
- Inline editing in tables
- Advanced filters, saved views
- Summary analytics (per stream/domain)

## Layer 7 — Admin

For owner/ops users:
- **System/Health** — API/Worker status, D1/KV state, cron results
- **Jobs/Queue** — domain sync, zone sync, redirect updates, retry/cancel
- **Logs/Webhooks** — incoming webhooks (HostTracker, CF Events), processing status
- **Marketplace** — integration presets, CPA networks, pre-configured flows

Built on the same UI components (tables, cards, forms, drawers, dialogs).

## Performance Thresholds

Optimization applied incrementally as the app grows:

| Trigger | Action |
|---------|--------|
| Bundle > 300KB | Code splitting with `manualChunks` |
| Table > 500 rows | Virtual scrolling |
| FCP > 2s | Lazy loading modals/drawers |
| LCP > 2.5s | Preload, image optimization |

See `docs/TODO-index.md` for detailed performance plan.

## Open Issues (Blockers)

| Issue | Description | Repo |
|-------|-------------|------|
| [#7](https://github.com/admin310st/301/issues/7) | Detach domain from site removes from project entirely | backend |
| [#9](https://github.com/admin310st/301/issues/9) | Cannot add second CF account | backend |
| [#10](https://github.com/admin310st/301/issues/10) | Redirects API should return all site domains (incl. without redirects) | backend |
| [#14](https://github.com/admin310st/301/issues/14) | 500 on apply-redirects with disabled redirect | backend |
| [#162](https://github.com/admin310st/301-ui/issues/162) | VirusTotal domain monitoring | frontend |
| [#164](https://github.com/admin310st/301-ui/issues/164) | API duplicates domain_id for T1+T3/T4 | backend |
| [#165](https://github.com/admin310st/301-ui/issues/165) | Post-probe type gaps (zone_id, missing fields) | frontend |
