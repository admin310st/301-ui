# TODO: Redirects Page Development

**Redirects = Simple domain-level 301/302 redirects**

**NOT to be confused with Streams/TDS** (complex conditional routing rules on Workers)

UX principle: Simple domain management with clear redirect status.

---

## 🎯 Scope

**Redirects (this page):**
- Simple 301/302 redirects on domains
- Domain → Target URL mapping
- Used for blocked domains, migrations
- Implemented via Cloudflare Redirect Rules (≤10 per zone) or Workers
- No conditions, no splits - just domain redirects

**Streams/TDS (separate future page):**
- Complex conditional routing (geo, UA, device)
- Weighted splits, A/B testing
- SmartLink (UTM), SmartShield (CF metadata)
- Match-first rules processing

**Target users:**
- Webmasters managing domain redirects
- SEO specialists handling migrations
- Users dealing with blocked domains

---

## 📋 Этап 1: MVP / Page Structure

### 1.1. Page Header

```
Redirects
Manage routing rules across your domains and destinations.

[+ Add redirect] (primary button)
```

### 1.2. Search & Filters

**Quick Search** searches by:
- Rule name
- Source domain
- URL pattern
- Project
- Redirect type (301/302/JS/API)
- Destination domain
- Rule ID

**Filter chips:**
- **Status:** Active, Disabled, Error
- **Rule type:** 301/302, Split/Weighted, Conditional, Regex-based
- **Source domain:** (domain selector)
- **Project:** (project selector)
- **Destination type:** URL, Domain, Random pool, Stream/Project target

### 1.3. Main Table Structure

**Grouping:** By Site/Project (collapsible groups)

**Columns:**

| Column | Content |
|--------|---------|
| **Source Domain** | Domain that redirects (e.g., old-domain.com) |
| **Redirect Type** | "No redirect" or icon + target URL |
| **Status Code** | 301 (permanent) or 302 (temporary) badge |
| **Last Sync** | When last synced with Cloudflare |
| **Actions** | Checkbox + Edit/Delete buttons |

**Simple table layout:**
```
☐ old-domain.com → [icon] active-domain.com [301] [2025-01-13 18:15]
☐ spam-domain.net → No redirect                    [—]
```

**Bulk Actions:**
- Select multiple domains via checkboxes
- Mass operations: Enable/Disable/Delete redirects
- "Select Mass Action" dropdown + Apply button

### 1.4. Empty State

```
Title: No redirects configured

Text: Set up simple 301/302 redirects for your domains.
      Useful for blocked domains, migrations, or consolidation.

CTA: [+ Add redirect]
```

---

## 📋 Этап 2: Redirect Form (Simple Editor)

**Trigger:** Click Edit (pencil-circle)

**Layout:** Right full-height drawer

### Simple Form Fields:

**Basic redirect setup:**

1. **Source Domain**
   - Domain name in drawer header
   - Copy/open buttons for quick actions

2. **Target URL**
   - Input field: Full URL (https://target-domain.com)
   - Auto-save on blur or Enter key
   - Pre-filled with acceptor domain for new redirects

3. **Redirect Code** (dropdown)
   - 301 (Permanent) - default
   - 302 (Temporary)
   - Auto-save on change

4. **Enable/Disable** (toggle)
   - Toggle button: Enabled / Disabled
   - Auto-save on click

5. **Sync Status** (info card)
   - Shows sync status (Synced/Not synced/Failed)
   - Shows last sync timestamp
   - Shows error message if sync failed

6. **Footer Actions**
   - [Sync to Cloudflare] button (CF orange, primary action)
   - [Close] button (ghost)

**UX principle:** All changes auto-save immediately. Sync button in footer for deploying to Cloudflare.

**No conditions, no weights, no complex rules** - just simple domain → URL mapping.

---

## 📋 Этап 3: Add Redirect Modal

**Trigger:** Click "Add redirect" button

**Layout:** Center modal (not drawer)

**Fields:** Same as edit form above

**Flow:**
1. User clicks "Add redirect"
2. Modal opens with empty form
3. User selects source domain, enters target URL, chooses 301/302
4. Clicks [Create redirect]
5. API call → Cloudflare Redirect Rules or Worker update
6. Modal closes, table refreshes with new redirect

---

## 📋 Этап 4: Bulk Actions

**When multiple domains selected:**
- Enable redirects
- Disable redirects
- Delete redirects
- Export list (CSV/JSON)

**UI:** Sticky panel at bottom (like in Domains page)

---

## 📋 Этап 5: Mock Data Structure (Simplified)

### DomainRedirect Interface

```typescript
interface DomainRedirect {
  id: number;

  // Source
  domain_id: number;
  domain: string;  // e.g., "old-domain.com"

  // Target
  target_url: string | null;  // null = no redirect

  // Redirect Type
  redirect_code: 301 | 302;  // 301 = permanent, 302 = temporary

  // Status
  enabled: boolean;

  // Cloudflare Sync
  cf_rule_id: string | null;  // Cloudflare Redirect Rule ID
  last_sync_at: string | null;
  sync_status: 'synced' | 'pending' | 'error';
  sync_error: string | null;

  // Grouping
  site_id: number;
  site_name: string;  // e.g., "CryptoBoss (En)"
  project_id: number;
  project_name: string;

  // Metadata
  created_at: string;
  updated_at: string;
}
```

### Mock Data Examples

**Example 1: Domain with 301 redirect**
```typescript
{
  id: 1,
  domain_id: 101,
  domain: "cryptoboss.icu",
  target_url: "https://finbosse.ru",
  redirect_code: 301,
  enabled: true,
  cf_rule_id: "abc123",
  last_sync_at: "2025-01-13T18:15:27Z",
  sync_status: "synced",
  sync_error: null,
  site_id: 1,
  site_name: "CryptoBoss (Ru)",
  project_id: 17,
  project_name: "CryptoBoss",
  created_at: "2025-01-10T10:00:00Z",
  updated_at: "2025-01-13T18:15:27Z"
}
```

**Example 2: Domain without redirect**
```typescript
{
  id: 2,
  domain_id: 102,
  domain: "finbosse.ru",
  target_url: null,  // No redirect
  redirect_code: 301,
  enabled: false,
  cf_rule_id: null,
  last_sync_at: null,
  sync_status: "synced",
  sync_error: null,
  site_id: 1,
  site_name: "CryptoBoss (Ru)",
  project_id: 17,
  project_name: "CryptoBoss",
  created_at: "2025-01-08T12:00:00Z",
  updated_at: "2025-01-08T12:00:00Z"
}
```

**Example 3: Pending sync**
```typescript
{
  id: 3,
  domain_id: 103,
  domain: "cryptopot.ru",
  target_url: "https://finbosse.ru",
  redirect_code: 302,
  enabled: true,
  cf_rule_id: null,
  last_sync_at: null,
  sync_status: "pending",
  sync_error: null,
  site_id: 1,
  site_name: "CryptoBoss (Ru)",
  project_id: 17,
  project_name: "CryptoBoss",
  created_at: "2025-01-13T19:00:00Z",
  updated_at: "2025-01-13T19:00:00Z"
}
```

---

## 📋 Этап 6: Visual Components

### 6.1. Rule Type Badges

```typescript
const typeIcons = {
  simple: '<span class="icon" data-icon="mono/directions"></span>',
  weighted: '<span class="icon" data-icon="mono/shuffle"></span>',
  conditional: '<span class="icon" data-icon="mono/filter"></span>',
  regex: '<span class="icon" data-icon="mono/code"></span>',
};

const typeBadges = {
  simple: '<span class="badge badge--sm badge--neutral">301</span>',
  weighted: '<span class="badge badge--sm badge--primary">Split</span>',
  conditional: '<span class="badge badge--sm badge--warning">Conditional</span>',
  regex: '<span class="badge badge--sm badge--info">Regex</span>',
};
```

### 6.2. Condition Icons

```html
<!-- GEO condition -->
<span class="condition-chip" title="3 countries">
  <span class="icon" data-icon="mono/globe"></span>
  <span>3</span>
</span>

<!-- Device condition -->
<span class="condition-chip" title="Mobile only">
  <span class="icon" data-icon="mono/phone"></span>
</span>

<!-- Browser condition -->
<span class="condition-chip" title="Chrome, Firefox">
  <span class="icon" data-icon="mono/browser"></span>
  <span>2</span>
</span>
```

### 6.3. Destination Display

**Single:**
```html
<div class="destination-cell">
  <span class="icon" data-icon="mono/arrow-right"></span>
  <span>landing.example.com</span>
</div>
```

**Weighted:**
```html
<div class="destination-cell destination-cell--weighted">
  <div class="destination-item">
    <span>landing-a.com</span>
    <span class="badge badge--sm badge--neutral">70%</span>
  </div>
  <div class="destination-item">
    <span>landing-b.com</span>
    <span class="badge badge--sm badge--neutral">30%</span>
  </div>
</div>
```

### 6.4. Metrics Display

```html
<div class="metrics-cell">
  <div class="metric">
    <span class="metric-value">1.2K</span>
    <span class="metric-label">24h</span>
  </div>
  <div class="metric">
    <span class="metric-value">8.5K</span>
    <span class="metric-label">7d</span>
  </div>
</div>
```

---

## 📋 Этап 7: UX Improvements

### 7.1. Test URL Preview (in Source tab)

```html
<div class="test-url-field">
  <label>Test URL</label>
  <input type="text" class="input" placeholder="https://example.com/blog/post-123" />

  <div class="test-result test-result--match">
    <span class="icon text-ok" data-icon="mono/check-circle"></span>
    <span>✓ Matches pattern</span>
    <div class="test-result__details">
      Pattern: /blog/*
      Destination: https://blog.example.com
    </div>
  </div>
</div>
```

### 7.2. Weight Auto-balancing

When editing weighted destinations:
- Auto-calculate remaining %
- Show warning if total ≠ 100%
- Suggest "Auto-balance" button

### 7.3. Live Feed in Logs Tab

```html
<div class="log-feed">
  <div class="log-entry">
    <span class="log-time">2 min ago</span>
    <span class="log-ip">123.45.***.***</span>
    <span class="log-source">example.com/offer/special</span>
    <span class="icon" data-icon="mono/arrow-right"></span>
    <span class="log-target">landing-a.com</span>
  </div>
</div>
```

---

## 🎯 Key UX Principles

1. **Routing flow cards, not just list** - each row tells a story
2. **Visual hierarchy** - most important info first
3. **Only drawer, no modals** - consistent pattern
4. **Test URL field** - mandatory for Source tab
5. **Destinations & Conditions** - separate manageable sections
6. **Metrics & Logs** - transparency and trust
7. **Hover = more details** - don't clutter the table
8. **Chips for conditions** - visual, compact, scannable

---

## 📁 File Structure

```
redirects.html
src/redirects/
  ├─ redirects.ts        # Main UI logic (table, actions, bulk ops)
  ├─ state.ts            # Reactive state management (multi-site, dedup)
  ├─ drawer.ts           # Redirect drawer (template selector, config, sync)
  ├─ helpers.ts          # Computed values (getTargetUrl) from API types
  ├─ site-selector.ts    # Project + Site selectors (API-driven)
  ├─ filters-config.ts   # Filter definitions (configured, sync, enabled)
  ├─ filters-ui.ts       # Filter chips rendering
  └─ sync-status.ts      # Sync indicator + Sync All logic
```

---

## 🚀 Next Steps

1. ✅ Create TODO-redirects.md with new vision
2. ✅ Rewrite mock-data.ts with RedirectRule structure (10 example rules)
3. ✅ Update redirects.html table (new columns: Rule, Source, Destinations, Conditions, Hits, Status, Actions)
4. ✅ Rewrite redirects.ts with routing rules rendering
5. ✅ Add condition chips rendering (CSS + display logic)
6. ✅ Add weighted destinations display
7. ✅ Create drawer with auto-save (toggle, dropdown, target URL on blur)
8. ✅ Move Sync button to drawer footer
9. [x] Bulk actions (sticky panel at bottom)
   - [x] Add redirect to main domain (T1 → acceptor URL, auto-detect)
   - [x] Enable selected redirects
   - [x] Disable selected redirects
   - [x] Delete selected redirects
   - [x] Sync selected to Cloudflare
10. [x] Site-level actions (kebab menu on acceptor row)
   - [x] Clear donor redirects — deletes all donor redirects (renamed for clarity)
   - [x] Clear primary redirect — removes redirect from acceptor
   - [x] Manage domains
11. [x] Sync indicator (metric_pill) fixes
   - [x] Filter only pending/error zones (was syncing ALL zones)
   - [x] Idempotent event listeners (was duplicating on every state change)
   - [x] Re-entry guard (prevent double-click sync)
12. [x] Canonical redirects in acceptor drawer
   - [x] T3/T4 moved from site dropdown to acceptor drawer
   - [x] Acceptor drawer shows redirect info + sync status when has_redirect
   - [x] Acceptor drawer shows T3/T4 action buttons when no redirect
   - [x] Delete canonical redirect from drawer
   - [x] Table badge: T3/T4 shows sync-colored label, not "Alert" danger
   - [x] Table row: canonical redirect doesn't show red arrow/target
12b. [x] **WORKAROUND** Canonical redirect dedup (frontend)
   - API returns same `domain_id` twice when domain has T1 + T3/T4 redirects
   - Frontend `dedupDomains()` in state.ts merges duplicates: T1 as `redirect`, T3/T4 as `canonical_redirect`
   - Enables single table row, canonical badge on donors, two-state drawer card
   - **Backend Issue:** API should merge redirects per domain_id server-side
   - **See:** GitHub Issue #164 — remove `dedupDomains()` once backend fixes this
   - Files changed: state.ts, types.ts, adapter.ts, redirects.ts, drawer.ts, sync-status.ts
13. [x] Drawer: template selector for advanced redirects (T1, T5, T6, T7)
    - Interactive dropdown for new redirects, read-only badge for existing
    - Dynamic fields per template, auto-set 302 for T7
    - Rich dropdown CSS pattern (`.dropdown__item--rich`)
14. [ ] Add "Add Redirect" wizard/modal (for new domains)
    - Stub exists: openBulkAddDrawer() in drawer.ts
15. [ ] Test URL preview logic
16. [ ] i18n for redirects page (0 data-i18n attributes currently)
    - Page headers, table columns, buttons, drawer content — all hardcoded English

---

## 📋 Post-Testing Revision (when all features are tested)

**Trigger:** After manual testing confirms all actions work end-to-end with real API.

### ~~R1. safeCall migration~~ ✅ Done (2026-02-11)
- All redirects API calls wrapped with `safeCall()` + `lockKey`
- Covers: redirects.ts, drawer.ts, sync-status.ts

### ~~R2. Remove mock data fallback~~ ✅ Done
- Deleted `mock-data.ts` (903 lines of mock data + dead helper functions)
- Extracted type definitions to `src/redirects/types.ts` (68 lines)
- Updated all imports: adapter.ts, drawer.ts, redirects.ts, sync-status.ts
- Removed `loadRedirects()` mock loader; retry now uses `refreshRedirects()` (real API)

### ~~R3. Remove adapter.ts~~ ✅ Done (2026-02-11)
- Removed adapter.ts and legacy DomainRedirect type
- All UI code uses `ExtendedRedirectDomain` directly
- Rendering functions work with API types natively

### R4. i18n pass
- Add translation keys to en.ts / ru.ts under `redirects.*` namespace
- Apply `data-i18n` attributes to redirects.html
- Translate drawer content, bulk actions, sync status messages

---

---

**Last updated:** 2026-02-11

**Status:** ✅ Core complete. Template selector (T1/T5/T6/T7), safeCall migration, adapter removal — all done. Pending: add wizard, i18n pass.
