# UI Roadmap — 301.st Dashboard

## Layer Status

| Layer | Scope | Status |
|-------|-------|--------|
| 0 | Auth, Style Guide, layout, i18n, partials, sidebar | Done |
| 1 | Integrations (CF, NC, key CRUD) | Done |
| 2 | Domains (table, filters, bulk, inspector, add drawer) | Done |
| 3 | Projects + Sites (CRUD, detail tabs, domain attach) | Done |
| 4 | Redirects (T1-T7, CF sync, bulk ops, filters) | Done |
| 5 | Streams / TDS (rules, presets, site-scoped, bindings) | Done |
| **6** | **UX polish, i18n coverage, inspector tabs** | **Active** |
| 7 | Admin (health, jobs, logs, marketplace) | Planned |

## Layer 6 — Active

- [x] Domain inspector tabs (3 sections → tab UI)
- [ ] Inspector: add SSL, Security, Monitoring, Logs tabs (needs backend)
- [x] i18n for Domains and Redirects
- [ ] Advanced bulk actions (assign to site, move to project)
- [ ] Inline editing in tables
- [ ] ~20 inline style violations (cosmetic)

## Layer 7 — Planned

- **System/Health** — API/Worker status, D1/KV state, cron results
- **Jobs/Queue** — domain sync, zone sync, redirect updates, retry/cancel
- **Logs/Webhooks** — incoming webhooks, processing status
- **Marketplace** — integration presets, CPA networks, pre-configured flows

## Open Blockers

| Issue | Description |
|-------|-------------|
| [301#21](https://github.com/admin310st/301/issues/21) | 500 on `GET /tds/rules/:id` (blocks Edit Rule drawer) |
| [#164](https://github.com/admin310st/301-ui/issues/164) | API duplicates `domain_id` for T1+T3/T4 |
| [#165](https://github.com/admin310st/301-ui/issues/165) | Post-probe type gaps (zone_id, missing fields) |
