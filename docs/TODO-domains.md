# TODO: Domains Page

Roadmap for `/domains.html` enhancements. Core features are complete.

---

## Completed Summary

Done: MVP page (table with 6 columns, search, filters, mock data, inspector drawer, add domains modal, dropdown actions, IDN support with `src/utils/idn.ts`, DNS NS check with `src/utils/dns.ts`, CSS improvements). Add Domains drawer (batch zone creation via `/domains/zones/batch`, CF account selector, domain extraction parser, results view with NS grouping, error handling). Real API integration (`src/api/domains.ts`, adapter, project filter, pagination, caching, project persistence across pages). Architectural decision: drawer-first approach (all domain operations via tabbed drawer, not modals).

---

## Remaining Work

### Drawer Tabs (major feature)

Currently the inspector drawer has only an Overview section. Planned 7-tab structure:

- [ ] Add tabs navigation to drawer HTML
- [ ] Create tab switching logic (vanilla JS)
- [ ] **Overview** — Summary (expires, status, health), quick actions (sync, re-check, toggle monitoring), languages block with emoji flags
- [ ] **Routing** — Redirect rules for this domain (add/edit/delete, priorities)
- [ ] **DNS** — Zone records (A, CNAME, TXT, MX), nameservers, CF proxy status, DNSSEC
- [ ] **SSL** — Certificate details, expiry, auto-renewal, force HTTPS, TLS mode
- [ ] **Security** — Abuse status & history, blocklist checks, security presets, events log
- [ ] **Monitoring** — Uptime, response times graph, alert settings, incident history
- [ ] **Logs** — Sync history, config changes, webhook events, error logs
- [ ] Add prev/next domain navigation arrows in drawer header

### Stat-Cards in Header

- [ ] Create stat-cards component above table
- [ ] Metrics: Total, Active, Expiring soon, Expired, SSL issues, Monitoring enabled
- [ ] Make cards clickable (apply corresponding filter)
- [ ] Responsive grid (4 cols desktop, 2 tablet, 1 mobile)

### Filters Enhancement

- [ ] Quick-filter "Unused domains" (reserve status) — priority filter
- [ ] Multi-select for statuses (dropdown with checkboxes)
- [ ] Provider filter
- [ ] Save filter state in URL query params
- [ ] Restore filters on page load
- [ ] Debounce search (300ms)

### Bulk Actions Enhancement

- [ ] Improve select-all logic (respect current filters)
- [ ] Add operations: sync with registrar, sync with CF, attach to project, mark as test/retired
- [ ] Show operation results summary (success/error)
- [ ] Reset selection after operation

### Table Sorting

- [ ] Add sort icons to column headers (Domain, Status, Expires)
- [ ] Visual indication of active sort
- [ ] Save sort order in URL params
- [ ] Combine with filters and search

### Pagination

- [ ] Implement data slicing by page
- [ ] Add Previous/Next/Page number navigation
- [ ] Page size selector (25/50/100)
- [ ] Save page & page_size in URL
- [ ] Show "Showing 1-25 of 143" range
- [ ] Reset to page 1 on filter change

### i18n Coverage

- [ ] Create `domains` namespace in `en.ts` and `ru.ts`
- [ ] Add translations: page header, table headers, status labels, action buttons, drawer content, filter labels, bulk action labels, empty/loading/error states
- [ ] Apply `data-i18n` attributes to all UI elements
- [ ] Test language switching (EN/RU)

### Add Domains Drawer (minor improvements)

- [ ] Domain validation before submit (check TLD, max length)
- [ ] Progress indicator for batch creation (>10 domains)
- [ ] Persist last selected CF account in localStorage
- [ ] i18n coverage for drawer texts

---

## Future Ideas

- **Saved views** — User-saved filter presets ("Expiring domains", "My project domains")
- **Export** — CSV/JSON export of domain list
- **Bulk import** — Upload domains from CSV
- **Configuration presets** — One-click apply (Sedo Parking, CF Security, High-traffic, Development)
- **Analytics integration** — Traffic stats per domain
- **Cost tracking** — Registration/renewal costs
- **Expiry notifications** — Email/Telegram alerts
- **Auto-renewal** — Via registrar API
- **Keyboard shortcuts** — Esc close drawer, arrows navigate, Tab switch tabs, Cmd+K search
- **Dynamic sidebar status** — Setup/onboarding indicators on Overview nav item (no integrations -> warning, no domains -> warning)

---

## Known Issues

None currently.

---

**Last updated:** 2026-02-11
