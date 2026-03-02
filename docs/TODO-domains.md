# TODO: Domains Page

Roadmap for `/domains.html` enhancements. Core features are complete.

---

## Completed Summary

- **Table:** 6 columns (domain, status, health, expires, project, actions), search, filters (status, health, provider), bulk select
- **Inspector drawer:** 3 vertical sections (Overview, DNS config with live NS check via Google DNS, Routing with redirect info). No tab UI yet
- **Add Domains drawer:** Batch zone creation via `/domains/zones/batch`, CF account selector, domain extraction parser with IDN/punycode support, debounced input, results view with NS grouping and error handling
- **API:** `src/api/domains.ts` with adapter, project filter, caching, project persistence across pages
- **Pagination:** Fully working — 25/page, prev/next buttons, "Showing X-Y of Z", reset on filter change
- **Bulk actions:** Change role ✅, Block ✅, Delete subdomains ✅, Assign to site (stub), Move to project (dialog only)
- **Utils:** IDN support (`src/utils/idn.ts`), DNS NS check (`src/utils/dns.ts`), domain regex parser
- **i18n:** Dialogs covered (`domains.dialogs.moveToProject.*`), main page hardcoded

---

## Remaining Work

### Drawer Tabs (major feature)

Inspector drawer currently has 3 vertical sections (Overview, DNS, Routing) without tab navigation. Convert to tabbed UI and add missing tabs:

- [ ] Add tabs navigation to drawer HTML (reuse `data-tab` pattern from other pages)
- [ ] Create tab switching logic (vanilla JS)
- [ ] **Overview** (exists) — Enhance: quick actions (sync, re-check), languages block with emoji flags
- [ ] **Routing** (exists) — Enhance: add/edit/delete redirect rules, priorities
- [ ] **DNS** (exists) — Enhance: zone records (A, CNAME, TXT, MX), CF proxy status, DNSSEC
- [ ] **SSL** (new) — Certificate details, expiry, auto-renewal, force HTTPS, TLS mode
- [ ] **Security** (new) — Abuse status & history, blocklist checks, security presets, events log
- [ ] **Monitoring** (new) — Uptime, response times graph, alert settings, incident history
- [ ] **Logs** (new) — Sync history, config changes, webhook events, error logs
- [ ] Add prev/next domain navigation arrows in drawer header

### Stat-Cards in Header

- [ ] Create stat-cards component above table
- [ ] Metrics: Total, Active, Expiring soon, Expired, SSL issues, Monitoring enabled
- [ ] Make cards clickable (apply corresponding filter)
- [ ] Responsive grid (4 cols desktop, 2 tablet, 1 mobile)

### Filters Enhancement

- [ ] Quick-filter "Unused domains" (reserve status) — priority filter
- [ ] Debounce table search (300ms) — add-domains drawer has debounce, table search does not
- [ ] Save filter/sort/page state in URL query params
- [ ] Restore filters on page load from URL

### Bulk Actions Enhancement

Working: Change Role, Block, Delete Subdomains.

- [ ] Assign to Site — stub exists, needs implementation
- [ ] Move to Project — dialog HTML exists (`data-dialog="move-to-project"`), needs handler
- [ ] Add operations: sync with registrar, sync with CF, mark as test/retired
- [ ] Show operation results summary (success/error count)

### Table Sorting

- [ ] Add sort icons to column headers (Domain, Status, Expires)
- [ ] Visual indication of active sort
- [ ] Save sort order in URL params
- [ ] Combine with filters and search

### Pagination (mostly done)

Implemented: data slicing (PAGE_SIZE=25), prev/next buttons, "Showing X-Y of Z", reset on filter change.

- [ ] Page size selector (25/50/100)
- [ ] Save page & page_size in URL

### i18n Coverage

`domains.*` namespace exists in `en.ts`/`ru.ts`. Dialogs use `data-i18n`. Main page is hardcoded.

- [ ] Apply `data-i18n` to: page header, table headers, status labels, action buttons, inspector drawer, filter labels, bulk action labels, empty/loading/error states
- [ ] Add missing keys to `en.ts` and `ru.ts` for TS-rendered strings (dropdown actions, inspector content)
- [ ] Test language switching (EN/RU)

### Add Domains Drawer (minor improvements)

Domain parser with regex + IDN/punycode works. Debounced input parsing works. i18n keys for drawer exist in `domains.add.drawer.*`.

- [ ] Progress indicator for batch creation (>10 domains) — currently shows results only after completion
- [ ] Persist last selected CF account in localStorage
- [ ] Per-domain validation before submit (check TLD, max length, detect subdomains earlier)

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

**Last updated:** 2026-03-02
