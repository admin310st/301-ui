# TODO: Redirects Page

Simple domain-level 301/302 redirects. **Not** Streams/TDS (complex conditional routing).

---

## Completed Summary

Done: Full table with site/project hierarchy (acceptor/donor/reserve rows). API layer with safeCall migration. Project/Site selectors (API-driven). Filters (Configured, Sync, Enabled). Drawer with template selector (T1/T5/T6/T7, dynamic fields, auto-set 302 for T7). Pre-fill target URL with acceptor domain. Bulk actions (enable/disable/delete/sync selected). Site-level actions (T3/T4 canonical, clear redirects). Cloudflare sync with error handling. Adapter removal (UI uses `ExtendedRedirectDomain` directly). Mock data removed; types extracted to `src/redirects/types.ts`.

**Workaround in place:** `dedupDomains()` in `state.ts` merges duplicate `domain_id` entries when domain has T1 + T3/T4 redirects. See [#164](https://github.com/admin310st/301-ui/issues/164) — remove once backend fixes this.

---

## Remaining Work

### i18n Pass (R4)

- [ ] Add translation keys to `en.ts` / `ru.ts` under `redirects.*` namespace
- [ ] Apply `data-i18n` attributes to `redirects.html`
- [ ] Translate: page headers, table columns, buttons, drawer content, bulk actions, sync status messages, empty states

---

## Future Enhancements

- Test URL preview (input URL, show which pattern matches and where it routes)
- Weight auto-balancing (auto-calculate remaining %, warn if total != 100%)
- Live feed in Logs tab (recent redirect events with IP/source/target)
- Metrics display (24h/7d hit counts per redirect)

---

## File Structure

```
redirects.html
src/redirects/
  redirects.ts        # Main UI (table, actions, bulk ops)
  state.ts            # Multi-site state management (dedup)
  drawer.ts           # Redirect drawer (template selector, config, sync)
  helpers.ts          # Computed values (getTargetUrl) from API types
  site-selector.ts    # Project + Site selectors (API-driven)
  filters-config.ts   # Filter definitions (configured, sync, enabled)
  filters-ui.ts       # Filter chips rendering
  sync-status.ts      # Sync indicator + Sync All logic
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/redirects/templates` | GET | Templates T1-T7 |
| `/redirects/presets` | GET | Presets P1-P5 |
| `/sites/:siteId/redirects` | GET | Site domains with redirects |
| `/domains/:domainId/redirects` | POST | Create redirect (template_id, params) |
| `/redirects/:id` | PATCH | Update redirect |
| `/redirects/:id` | DELETE | Delete redirect |
| `/zones/:id/apply-redirects` | POST | Sync to Cloudflare |

---

## Known Issues

- [#164](https://github.com/admin310st/301-ui/issues/164) — API duplicate `domain_id` for T1 + T3/T4 (frontend workaround active)
- [#165](https://github.com/admin310st/301-ui/issues/165) — Post-probe type gaps (zone_id types, missing fields)

---

**Last updated:** 2026-02-11

**Status:** Core complete. Pending: i18n pass.
