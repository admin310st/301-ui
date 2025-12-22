# TODO: Redirects Page Development

**Redirects = Traffic Control Plane routing rules.**

UX principle: Show the **traffic flow picture**, not just a list of redirects.

---

## 🎯 Vision

User should understand:
- What leads where
- Which conditions apply
- Which domains participate
- Status and stability
- Traffic metrics

**Target users:**
- SEO specialists (URL structure migrations)
- Webmasters (conditional routing)
- Marketers (A/B testing with weighted splits)
- Affiliates (geo/device targeting)

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

**Columns:**

| Column | Content |
|--------|---------|
| **Rule** | Rule name + micro-badge (301/302/Conditional) |
| **Source** | Domain + path (highlight wildcard/regex) |
| **Destinations** | 1 URL or list with weight indicators |
| **Conditions** | Icons: geo/device/UA/header rules |
| **Hits** | 24h / 7d / total |
| **Status** | Active / Disabled / Error |
| **Actions** | Edit (pencil-circle), Enable/Disable, More (⋯) |

**Row as "card in a line":**
```
[Rule name]  [Source /pattern/]  [Destinations →]  [Conditions icons]  [Status chip]  [⋯]
```

**Hover behavior:**
- Show full path example
- For wildcards: show match pattern
- For weighted: show % breakdown

**Weighted rules display:**
```
target1.com (70%) • target2.com (30%)
```
or small chips with weights

### 1.4. Empty State

```
Title: No redirects yet

Text: Use redirect rules to define routing across your domains.
      Create 301/302 redirects, weighted splits, or conditional flows.

CTA: [+ Add redirect]
```

---

## 📋 Этап 2: Redirect Drawer (Editor)

**Trigger:** Click Edit (pencil-circle)

**Layout:** Right full-height drawer

### Drawer Tabs:

1. **Overview**
   - Rule name
   - Type: 301/302/Conditional/Weighted
   - Status
   - Recent triggers

2. **Source**
   - Domain (select from available)
   - Path type:
     - Exact match
     - Prefix match `/path/*`
     - Regex
   - **Test URL field** (live preview: ✓ will match / ✗ won't match)

3. **Destinations**
   - Single URL or list (for weighted)
   - [Add destination] button
   - For weighted rules:
     - Weight input + on/off toggle
     - Auto-balancing/validation (must = 100%)

4. **Conditions**
   - Geography selector (countries, multi-select)
   - Device type (mobile/desktop/tablet)
   - Browser
   - Headers
   - Query params
   - Split testing toggle
   - Each section = chip with count of selected conditions

5. **Traffic Metrics**
   - Mini-charts:
     - Hits (24h/7d/30d)
     - Distribution by destination
     - Errors (if any)

6. **Advanced**
   - Priority (execution order)
   - Stop-rules execution (don't process further rules)
   - Proxy mode (future)
   - Security preset overrides

7. **Logs**
   - Live feed of recent triggers:
     - Timestamp
     - IP (masked)
     - Source domain
     - Resolved target

---

## 📋 Этап 3: Add Redirect Wizard

**Pattern:** Similar to "Add Domains" drawer

**Steps:**

### Step 1: Basic Info
- Rule name
- Rule type:
  - Simple redirect (301/302)
  - Weighted split
  - Conditional routing

### Step 2: Source
- Domain selector
- Path pattern
- Test URL preview

### Step 3: Destinations
- Single URL (for simple)
- Multiple URLs with weights (for split)
- Project/Stream target (for advanced)

### Step 4: Conditions (optional)
- Add GEO conditions
- Add device conditions
- Add browser/UA conditions

### Step 5: Review & Create
- Summary of rule
- Test URL results
- [Create rule] button

---

## 📋 Этап 4: Bulk Actions

**When multiple rules selected:**
- Enable selected
- Disable selected
- Clone
- Delete
- Export (JSON)

**UI:** Sticky panel at bottom (like in Domains)

---

## 📋 Этап 5: Mock Data Structure

### RedirectRule Interface

```typescript
interface RedirectRule {
  id: number;
  name: string;

  // Type
  type: 'simple' | 'weighted' | 'conditional' | 'regex';
  redirect_code: 301 | 302 | 307;

  // Source
  source_domain_id: number;
  source_domain: string;  // denormalized
  source_path_type: 'exact' | 'prefix' | 'regex';
  source_path: string;

  // Destinations
  destinations: Array<{
    url: string;
    weight?: number;  // for weighted
    enabled: boolean;
  }>;

  // Conditions
  conditions: {
    countries?: string[];      // ['RU', 'UA', 'KZ']
    devices?: ('mobile' | 'desktop' | 'tablet')[];
    browsers?: string[];
    headers?: Record<string, string>;
    query_params?: Record<string, string>;
  };

  // Status & Metrics
  status: 'active' | 'disabled' | 'error';
  error_message?: string;

  hits_24h: number;
  hits_7d: number;
  hits_total: number;

  // Metadata
  project_id: number;
  project_name: string;  // denormalized
  priority: number;
  stop_execution: boolean;

  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
}
```

### Mock Data Examples

**Example 1: Simple 301 redirect**
```typescript
{
  name: "Old blog → New blog",
  type: "simple",
  redirect_code: 301,
  source_domain: "example.com",
  source_path_type: "prefix",
  source_path: "/blog/*",
  destinations: [{
    url: "https://blog.example.com",
    enabled: true
  }],
  conditions: {},
  status: "active",
  hits_24h: 1234,
  hits_7d: 8567,
  hits_total: 45678
}
```

**Example 2: Weighted split (A/B test)**
```typescript
{
  name: "Landing A/B test",
  type: "weighted",
  redirect_code: 302,
  source_domain: "promo.example.com",
  source_path_type: "exact",
  source_path: "/special-offer",
  destinations: [
    { url: "https://landing-a.example.com", weight: 70, enabled: true },
    { url: "https://landing-b.example.com", weight: 30, enabled: true }
  ],
  conditions: {},
  status: "active",
  hits_24h: 567,
  hits_7d: 3456,
  hits_total: 12345
}
```

**Example 3: Conditional (GEO + device)**
```typescript
{
  name: "RU mobile → special landing",
  type: "conditional",
  redirect_code: 302,
  source_domain: "example.com",
  source_path_type: "prefix",
  source_path: "/offer/*",
  destinations: [{
    url: "https://ru-mobile.example.com",
    enabled: true
  }],
  conditions: {
    countries: ["RU", "BY", "KZ"],
    devices: ["mobile"]
  },
  status: "active",
  hits_24h: 890,
  hits_7d: 5432,
  hits_total: 23456
}
```

**Example 4: Regex-based (SEO migration)**
```typescript
{
  name: "Product URLs migration",
  type: "regex",
  redirect_code: 301,
  source_domain: "shop.example.com",
  source_path_type: "regex",
  source_path: "^/products/(\\d+)$",
  destinations: [{
    url: "https://new-shop.example.com/items/$1",
    enabled: true
  }],
  conditions: {},
  status: "active",
  hits_24h: 234,
  hits_7d: 1456,
  hits_total: 8765
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
  ├─ redirects.ts        # Main UI logic
  ├─ mock-data.ts        # Mock redirect rules (NEW structure)
  ├─ drawer.ts           # Drawer tabs logic
  └─ test-url.ts         # URL pattern testing logic
```

---

## 🚀 Next Steps

1. ✅ Create TODO-redirects.md with new vision
2. ✅ Rewrite mock-data.ts with RedirectRule structure (10 example rules)
3. ✅ Update redirects.html table (new columns: Rule, Source, Destinations, Conditions, Hits, Status, Actions)
4. ✅ Rewrite redirects.ts with routing rules rendering
5. ✅ Add condition chips rendering (CSS + display logic)
6. ✅ Add weighted destinations display
7. [ ] Create drawer structure (7 tabs)
8. [ ] Implement Test URL preview logic
9. [ ] Add "Add Redirect" wizard

---

**Last updated:** 2025-12-22

**Status:** ✅ MVP table complete, ready for drawer/wizard implementation
