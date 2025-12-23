# Redirects API Specification

> **Purpose:** Define the data structure and API contracts required for the Redirects page to function according to the implemented UI logic and truth table spec.

---

## Changelog

### 2025-12-23 - UI Implementation Complete

**UI Features Implemented:**
- ✅ 3-level tree structure with grouping by Project → Target → Domain
- ✅ Tree gutter with visual markers (carets, indents, guide lines)
- ✅ Drawer refactoring matching domain inspector UX pattern
- ✅ Role-based icons in drawer header (primary vs donor)
- ✅ Custom dropdown for redirect code with color-coded border (301=green, 302=yellow)
- ✅ Enable/Disable button with dynamic icon and text
- ✅ CF-style Sync button in Sync Status section (orange Cloudflare branding)

**Icon System:**
- Projects: `mono/layers`
- Redirects: `mono/arrow-right`
- Primary domain (acceptor): `mono/arrow-right` + `text-primary` (blue)
- Donor domain (redirect source): `mono/arrow-top-right` + `text-muted` (gray)

**Role Field:**
- `role` field IS part of the API schema (stored in DB, per `docs/301-wiki/Architecture.md`)
- Values: `'acceptor'` | `'donor'` | `'reserve'`
- Primary domain (acceptor): `role='acceptor'` - receives traffic
- Donor domain: `role='donor'` - redirects to acceptor
- Reserve domain: `role='reserve'` - not attached to site (handled separately in "Add Redirects" drawer)

**Reserve Domains UI:**
- Main "Add Redirects" button opens dedicated drawer for reserve domain management
- Drawer shows domains with `role='reserve'` and `site_id=NULL`
- Separate API endpoint: `GET /api/domains/reserve` or `GET /api/redirects?role=reserve`
- Bulk assign operation: `POST /api/domains/assign` (changes role, attaches to project/site)

---

## 1. Data Model

### 1.1 Core Entity: `DomainRedirect`

```typescript
interface DomainRedirect {
  // Identity
  id: number;
  domain_id: number;
  domain: string;  // e.g., "example.com"

  // Domain Status
  domain_status: 'active' | 'parked' | 'expired';
  role: 'acceptor' | 'donor' | 'reserve';  // acceptor = primary (receives traffic), donor = redirects, reserve = not attached

  // Redirect Configuration
  target_url: string | null;  // null = no redirect configured
  has_redirect: boolean;      // explicit flag (true if target_url configured)
  redirect_code: 301 | 302;   // HTTP redirect code

  // User Control
  enabled: boolean;  // user's intent (enable/disable redirect)

  // Cloudflare Sync State
  cf_rule_id: string | null;
  cf_implementation: 'redirect_rule' | 'worker' | null;
  last_sync_at: string | null;  // ISO 8601 timestamp
  sync_status: 'never' | 'pending' | 'synced' | 'error';
  sync_error: string | null;    // error message if sync_status = 'error'

  // Hierarchy (Projects → Sites → Domains)
  site_id: number;
  site_name: string;     // e.g., "CryptoBoss (En)"
  site_flag: string;     // emoji flag for display, e.g., "🇺🇸"
  site_type: 'landing' | 'tds' | 'hybrid';
  project_id: number;
  project_name: string;  // e.g., "CryptoBoss"

  // Metadata
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}
```

---

## 2. Business Rules

### 2.1 Domain Hierarchy

```
Project
  └─ Site (primary domain + donor domains)
      ├─ Primary Domain (main domain, receives traffic)
      │   - has_redirect: false
      │   - target_url: null
      │   - Shows site type badge (Landing/TDS/Hybrid)
      │   - Cannot be deleted (it's the site itself)
      │
      └─ Donor Domains (redirect to primary or external)
          - has_redirect: true (if configured)
          - target_url: "https://primary-domain.com" or external URL
          - Can be enabled/disabled
          - Can be deleted
```

### 2.2 Primary vs Donor Domains (Role Determination)

> **Important:** Domain `role` field is stored in the database and provided by the API. Values: `'acceptor'`, `'donor'`, `'reserve'`.

**Primary Domain (Acceptor):**
- `role='acceptor'`
- Represents the site itself (main domain that receives traffic)
- `target_url` should be null (no redirect)
- Cannot be removed or disabled
- UI displays with `mono/arrow-right` icon + `text-primary` (blue)

**Donor Domains:**
- `role='donor'`
- Redirect to primary domain or external URL
- `target_url` contains destination URL (can be null if not configured yet)
- Can be enabled/disabled, bulk-selected, and deleted
- UI displays with `mono/arrow-top-right` icon + `text-muted` (gray)

**Reserve Domains:**
- `role='reserve'`
- Not attached to any site (`site_id=NULL`)
- Do NOT appear in main Redirects table
- Managed via dedicated "Add Redirects" drawer

### 2.3 Reserve Domains Management

**UI Pattern:**
- Main "Add Redirects" button (top-right of page) opens special drawer
- Drawer shows ONLY reserve domains (`role='reserve'`, `site_id=NULL`)
- Bulk operations: assign to projects/sites, configure redirects, delete
- Use case: Managing 100+ unstructured domains before organizing into project hierarchy

**Why Separate?**
- Keeps main Redirects table clean (only shows active project structure)
- Prevents clutter from large domain portfolios
- Enables efficient bulk operations on unassigned domains
- Clear separation: structured (main table) vs. unstructured (reserve drawer)

---

## 3. Status Logic (Truth Table)

### 3.1 Combined Status Display

UI shows single badge based on `enabled` + `sync_status` + `has_redirect`:

| has_redirect | enabled | sync_status | Badge    | Tooltip                          |
|--------------|---------|-------------|----------|----------------------------------|
| false        | false   | *           | Disabled | Disabled by user                 |
| false        | true    | *           | Enabled  | Enabled by user. No redirect configured |
| true         | false   | *           | Disabled | Disabled by user                 |
| true         | true    | synced      | Active   | Synced on {date/time}           |
| true         | true    | pending     | Pending  | Sync in progress                |
| true         | true    | error       | Error    | Sync failed. Click to view details |
| true         | true    | never       | New      | Not synced yet                  |

### 3.2 Sync Status Transitions

```
never → pending → synced
  ↓        ↓
  └──────→ error → (retry) → pending → synced
```

- `never`: Redirect enabled but never synced to Cloudflare
- `pending`: Sync operation in progress
- `synced`: Successfully applied to Cloudflare
- `error`: Last sync failed (show `sync_error` message)

---

## 4. API Endpoints

### 4.1 GET `/api/redirects`

**Purpose:** Fetch all domain redirects grouped by projects and sites

**Response:**
```json
{
  "redirects": [
    {
      "id": 1,
      "domain_id": 101,
      "domain": "cryptoboss.pics",
      "domain_status": "active",
      "role": "acceptor",
      "target_url": null,
      "has_redirect": false,
      "redirect_code": 301,
      "enabled": true,
      "cf_rule_id": null,
      "cf_implementation": null,
      "last_sync_at": null,
      "sync_status": "never",
      "sync_error": null,
      "site_id": 1,
      "site_name": "CryptoBoss (En)",
      "site_flag": "🇺🇸",
      "site_type": "landing",
      "project_id": 17,
      "project_name": "CryptoBoss",
      "created_at": "2025-01-08T10:00:00Z",
      "updated_at": "2025-01-08T10:00:00Z"
    },
    {
      "id": 2,
      "domain_id": 102,
      "domain": "cryptoboss.online",
      "domain_status": "active",
      "role": "donor",
      "target_url": "https://cryptoboss.pics",
      "has_redirect": true,
      "redirect_code": 301,
      "enabled": true,
      "cf_rule_id": "rule_abc123",
      "cf_implementation": "redirect_rule",
      "last_sync_at": "2025-01-13T18:15:27Z",
      "sync_status": "synced",
      "sync_error": null,
      "site_id": 1,
      "site_name": "CryptoBoss (En)",
      "site_flag": "🇺🇸",
      "site_type": "landing",
      "project_id": 17,
      "project_name": "CryptoBoss",
      "created_at": "2025-01-10T12:00:00Z",
      "updated_at": "2025-01-13T18:15:27Z"
    }
  ],
  "meta": {
    "total": 42,
    "projects_count": 5,
    "sites_count": 12
  }
}
```

**Notes:**
- Returns ONLY domains attached to projects/sites (`role='acceptor'` or `role='donor'`)
- Excludes reserve domains (`role='reserve'`, `site_id=NULL`)
- Frontend groups by `project_id` → `site_id`

**Reserve Domains:**
- Separate endpoint needed: `GET /api/domains/reserve` (returns domains with `role='reserve'`)
- Or filter parameter: `GET /api/redirects?role=reserve`
- Used by "Add Redirects" drawer to show unassigned domain portfolio

---

### 4.2 PUT `/api/redirects/:id`

**Purpose:** Update redirect configuration

**Request:**
```json
{
  "target_url": "https://example.com",
  "redirect_code": 301,
  "enabled": true
}
```

**Response:**
```json
{
  "redirect": {
    "id": 2,
    "domain": "cryptoboss.online",
    "target_url": "https://example.com",
    "redirect_code": 301,
    "enabled": true,
    "sync_status": "pending",
    "updated_at": "2025-01-23T14:30:00Z"
  }
}
```

**Side Effects:**
- Sets `has_redirect = true` if `target_url` provided
- Sets `sync_status = 'pending'`
- Triggers async Cloudflare sync job

---

### 4.3 POST `/api/redirects/:id/enable`

**Purpose:** Enable redirect

**Response:**
```json
{
  "redirect": {
    "id": 2,
    "enabled": true,
    "sync_status": "pending"
  }
}
```

---

### 4.4 POST `/api/redirects/:id/disable`

**Purpose:** Disable redirect

**Response:**
```json
{
  "redirect": {
    "id": 2,
    "enabled": false,
    "sync_status": "pending"
  }
}
```

**Note:** Disabling should trigger Cloudflare rule removal (or disable)

---

### 4.5 POST `/api/redirects/:id/sync`

**Purpose:** Manually trigger sync to Cloudflare

**Response:**
```json
{
  "redirect": {
    "id": 2,
    "sync_status": "pending",
    "last_sync_at": null
  },
  "job_id": "sync_job_xyz789"
}
```

**Use Cases:**
- Retry after error
- Force immediate sync for new redirects

---

### 4.6 DELETE `/api/redirects/:id`

**Purpose:** Delete redirect (donor domains only)

**Request:** None

**Response:**
```json
{
  "success": true,
  "deleted_id": 2
}
```

**Constraints:**
- Cannot delete primary domains (return 400 error)
- Should remove Cloudflare rule if exists

---

### 4.7 POST `/api/redirects/bulk` (Future)

**Purpose:** Bulk operations (enable/disable/delete/sync)

**Request:**
```json
{
  "action": "enable" | "disable" | "delete" | "sync",
  "redirect_ids": [2, 5, 8, 12]
}
```

**Response:**
```json
{
  "success": true,
  "affected": 4,
  "results": [
    { "id": 2, "status": "pending" },
    { "id": 5, "status": "pending" },
    { "id": 8, "status": "error", "error": "Domain expired" },
    { "id": 12, "status": "pending" }
  ]
}
```

---

### 4.8 POST `/api/domains/assign` (Reserve Domains Management)

**Purpose:** Assign reserve domains to project/site (changes `role='reserve'` → `'acceptor'` or `'donor'`)

**Request:**
```json
{
  "domain_ids": [101, 102, 103],
  "project_id": 17,
  "site_id": 1,
  "role": "donor",
  "target_url": "https://cryptoboss.pics",
  "redirect_code": 301,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "assigned": 3,
  "results": [
    { "id": 101, "domain": "newdomain1.com", "role": "donor", "site_id": 1 },
    { "id": 102, "domain": "newdomain2.com", "role": "donor", "site_id": 1 },
    { "id": 103, "domain": "newdomain3.com", "role": "donor", "site_id": 1 }
  ]
}
```

**Use Case:**
- Bulk assign reserve domains from "Add Redirects" drawer to projects/sites
- Automatically updates `role`, `site_id`, `project_id`
- Optionally configures redirect settings

---

## 5. Filtering & Grouping

### 5.1 Frontend Grouping Logic

UI groups redirects by:
1. **Project** (`project_id`, `project_name`)
2. **Site** (`site_id`, `site_name`, `site_flag`)
3. **Domain** (individual rows)

Example visual structure:
```
📁 CryptoBoss  [9 domains ✓]
  ├─ 🇺🇸 CryptoBoss (En) [Landing]
  │   ├─ cryptoboss.pics (primary) → [Landing]
  │   ├─ cryptoboss.online → cryptoboss.pics [301]
  │   └─ cryptoboss.click → No redirect
  └─ 🇷🇺 CryptoBoss (Ru) [Landing]
      └─ ...
```

### 5.2 Filter Parameters

**Client-Side Filters:**
- Project (multi-select)
- Site Type (landing/tds/hybrid)
- Status (Active/Disabled/Pending/Error/New)
- Domain Status (active/parked/expired)

**No server-side filtering needed** - UI fetches all data and filters locally.

---

## 6. Sync Status Updates (WebSocket/Polling)

### 6.1 Real-Time Updates (Recommended)

**WebSocket Topic:** `redirects.sync`

**Event Format:**
```json
{
  "event": "sync_completed",
  "redirect_id": 2,
  "sync_status": "synced",
  "last_sync_at": "2025-01-23T14:35:00Z",
  "cf_rule_id": "rule_abc123"
}
```

**Event Types:**
- `sync_started` → `sync_status = 'pending'`
- `sync_completed` → `sync_status = 'synced'`
- `sync_failed` → `sync_status = 'error'`

### 6.2 Polling Fallback

If WebSocket unavailable:
- Poll `GET /api/redirects/:id` every 3-5 seconds while `sync_status = 'pending'`
- Stop polling when status changes to `synced` or `error`

---

## 7. Error Handling

### 7.1 Sync Errors

When `sync_status = 'error'`, provide detailed `sync_error` message:

**Examples:**
```json
{
  "sync_error": "Cloudflare API rate limit exceeded. Retry in 60 seconds."
}
```

```json
{
  "sync_error": "Domain DNS not pointing to Cloudflare. Update nameservers first."
}
```

```json
{
  "sync_error": "Invalid target URL format."
}
```

### 7.2 UI Display

- Show error badge in Status column
- Tooltip: "Sync failed. Click to view details"
- Clicking opens drawer with full `sync_error` message
- Provide "Retry sync" action

---

## 8. Special Cases

### 8.1 Primary Domain with No Redirect

```json
{
  "domain": "cryptoboss.pics",
  "target_url": null,
  "has_redirect": false,
  "enabled": true,
  "sync_status": "never"
}
```

**UI Display:**
- Domain column: `cryptoboss.pics` with blue arrow icon
- Target column: `[Landing]` badge (no duplicate domain name)
- Status: N/A (primary domains don't sync)
- Actions: Edit only (no enable/disable/delete)

### 8.2 Donor Domain with No Redirect

```json
{
  "domain": "cryptoboss.click",
  "target_url": null,
  "has_redirect": false,
  "enabled": false,
  "sync_status": "never"
}
```

**UI Display:**
- Target column: "No redirect" + "+ Add" quick action on hover
- Status: "Disabled"
- Actions: Edit, Enable, Delete

### 8.3 External Redirect (not to primary domain)

```json
{
  "domain": "old-brand.com",
  "target_url": "https://newbrand.com",
  "has_redirect": true,
  "redirect_code": 301
}
```

**Valid use case:** Redirecting to external domain (e.g., rebranding)

---

## 9. Validation Rules

### 9.1 Backend Validation

**Required:**
- `redirect_code` must be 301 or 302
- `target_url` must be valid HTTP(S) URL if provided
- `sync_status` must be one of: `never`, `pending`, `synced`, `error`
- Primary domains: `target_url` must be null

**Business Logic:**
- Cannot delete primary domain
- Cannot disable primary domain (return 400)
- `has_redirect` should auto-update based on `target_url` presence

### 9.2 Frontend Validation

**Before Submit:**
- Target URL must start with `http://` or `https://`
- Target URL cannot be same as source domain (circular redirect)
- Redirect code must be 301 or 302

---

## 10. Migration Notes

### 10.1 Existing Data

If migrating from old schema without `has_redirect` field:

```sql
UPDATE domain_redirects
SET has_redirect = (target_url IS NOT NULL);
```

### 10.2 Default Values

For new records:
- `enabled` → default `true`
- `sync_status` → default `'never'`
- `has_redirect` → calculated from `target_url`
- `redirect_code` → default `301`

---

## 11. Performance Considerations

### 11.1 Response Size

Expected data volume:
- 100-500 redirects per user (typical)
- 1000+ redirects (power users)

**Recommendation:**
- Return all data in single request (no pagination needed)
- Gzip compression required
- Client-side filtering/grouping

### 11.2 Sync Queue

Cloudflare sync should be async:
1. API call updates DB → `sync_status = 'pending'`
2. Returns response immediately
3. Background job syncs to Cloudflare
4. Updates `sync_status` and `last_sync_at` on completion
5. Notifies frontend via WebSocket

---

## 12. Summary Checklist

**Backend Must Provide:**
- ✅ All fields from `DomainRedirect` interface
- ✅ Correct `has_redirect` boolean (auto-calculated or explicit)
- ✅ Proper `sync_status` state management
- ✅ Hierarchical data (project → site → domain)
- ✅ Only return domains attached to projects/sites
- ✅ Real-time sync status updates (WebSocket preferred)
- ✅ Async Cloudflare sync with proper error handling

**Frontend Provides:**
- ✅ Grouping by project → site
- ✅ Client-side filtering
- ✅ Truth table status logic
- ✅ Bulk selection and actions
- ✅ Drawer for edit/add redirects
- ✅ Real-time status updates via WebSocket

---

**Document Version:** 1.1
**Last Updated:** 2025-12-23
**Author:** Frontend Team
**Status:** UI Implementation Complete → Ready for Backend Implementation
