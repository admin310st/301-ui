# TODO: Streams/TDS Page

**Epic:** Traffic Distribution System UI - Complete implementation from welcome screen to rule editor

**Status:** 📋 Planned (Layer 5-6 in roadmap)

**Priority:** After Redirects, Projects, Sites

**Target:** Полноценный UI для управления TDS правилами с онбордингом, таблицей, drawer-редактором и reorder UX

---

## Architecture Alignment

**Existing Patterns to Reuse:**
- Table layout: `domains.html`, `redirects.html` (columns, sticky header, priority-based hiding)
- Drawer pattern: `partials/connect-cloudflare-drawer.hbs`, domain inspector
- Filter chips: domains filters (`src/domains/filters-ui.ts`)
- Bulk actions: domains bulk actions bar
- Design tokens: fluid layout tokens, spacing, shadows
- Tabs component: Connect CF drawer tabs

**New Patterns to Create:**
- Context bar (sticky, project/site/domain selectors)
- Pipeline strip (visual flow: Shield → Rules → Target)
- Priority controls (up/down arrows + drag handle)
- Draft/publish banner (sticky top notification)
- Onboarding checklist card

---

## Milestone 1: Page Skeleton + Context Bar + Pipeline Strip

### 1.1. Context Bar (Sticky Top)

**Component:** `.tds-context-bar` (new)

**Elements:**
```html
<div class="tds-context-bar">
  <div class="tds-context-bar__selectors">
    <!-- Project selector -->
    <div class="dropdown" data-dropdown>
      <button class="btn-chip">
        <span class="icon" data-icon="mono/layers"></span>
        <span>My Campaign</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
    </div>

    <!-- Site selector -->
    <div class="dropdown" data-dropdown>
      <button class="btn-chip">
        <span class="icon" data-icon="mono/landing"></span>
        <span>landing.example.com</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
    </div>

    <!-- Entry domain selector -->
    <div class="dropdown" data-dropdown>
      <button class="btn-chip">
        <span class="icon" data-icon="mono/dns"></span>
        <span>offer.example.com</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
    </div>
  </div>

  <div class="tds-context-bar__status">
    <!-- Traffic Shield status -->
    <span class="badge badge--success">
      <span class="icon" data-icon="mono/shield-check"></span>
      Shield: On
    </span>

    <!-- TDS status -->
    <span class="badge badge--info">
      <span class="icon" data-icon="mono/directions-fork"></span>
      TDS: Active
    </span>
  </div>

  <div class="tds-context-bar__actions">
    <button class="btn-chip">
      <span class="icon" data-icon="mono/flask"></span>
      <span>Simulator</span>
    </button>

    <button class="btn btn--primary" disabled>
      <span class="icon" data-icon="mono/rocket"></span>
      <span>Publish</span>
    </button>

    <div class="dropdown" data-dropdown>
      <button class="btn-icon btn-icon--compact">
        <span class="icon" data-icon="mono/dots-vertical"></span>
      </button>
    </div>
  </div>
</div>
```

**CSS Requirements:**
- Sticky positioning (use existing `.utility-bar` pattern)
- Single-line height (desktop), 2-line (mobile)
- Spacing tokens: `--space-3` between groups
- Use `.btn-chip` for selectors (existing component)

**Files:**
- `static/css/site.css` - add `.tds-context-bar` styles
- `streams.html` - HTML structure

---

### 1.2. Pipeline Strip

**Component:** `.tds-pipeline` (new)

**Elements:**
```html
<div class="tds-pipeline">
  <button class="tds-pipeline__segment" data-segment="shield">
    <span class="tds-pipeline__icon">
      <span class="icon" data-icon="mono/shield-check"></span>
    </span>
    <div class="tds-pipeline__content">
      <span class="tds-pipeline__label">Traffic Shield</span>
      <span class="badge badge--sm badge--success">On</span>
    </div>
  </button>

  <span class="tds-pipeline__arrow">
    <span class="icon" data-icon="mono/arrow-right"></span>
  </span>

  <button class="tds-pipeline__segment is-active" data-segment="rules">
    <span class="tds-pipeline__icon">
      <span class="icon" data-icon="mono/directions-fork"></span>
    </span>
    <div class="tds-pipeline__content">
      <span class="tds-pipeline__label">TDS Rules</span>
      <span class="badge badge--sm badge--info">12 rules</span>
    </div>
  </button>

  <span class="tds-pipeline__arrow">
    <span class="icon" data-icon="mono/arrow-right"></span>
  </span>

  <button class="tds-pipeline__segment" data-segment="targets">
    <span class="tds-pipeline__icon">
      <span class="icon" data-icon="mono/target"></span>
    </span>
    <div class="tds-pipeline__content">
      <span class="tds-pipeline__label">Targets/Origin</span>
      <span class="badge badge--sm">8 targets</span>
    </div>
  </button>
</div>
```

**Design:**
- Horizontal layout with arrows between segments
- Each segment clickable (CTA placeholder)
- Mobile: stack vertically or horizontal scroll
- Use existing badge system

**Files:**
- `static/css/site.css` - add `.tds-pipeline` styles

---

## Milestone 2: Welcome / Getting Started

### 2.1. Welcome Hero Card + Checklist

**Component:** Reuse `.card.card--panel` pattern

**Conditions to Show:**
```typescript
const showWelcome = !entryDomain || rulesCount === 0 || isReadOnly;
```

**Structure:**
```html
<section class="card card--panel card--accent card--accent-info">
  <header class="card__header">
    <h2 class="card__title">Traffic Routing (TDS)</h2>
    <p class="text-muted">
      Traffic first passes Traffic Shield for bot filtering, then TDS rules
      route visitors to different targets based on GEO, device, and other conditions.
    </p>
  </header>

  <div class="card__body stack">
    <!-- Mini pipeline (compact version) -->
    <div class="tds-pipeline tds-pipeline--compact">
      <!-- Same structure, smaller -->
    </div>

    <!-- Checklist -->
    <ol class="list--ruled">
      <li class="checklist-item">
        <span class="icon checklist-item__icon" data-icon="mono/circle"></span>
        <div class="checklist-item__content">
          <strong>Attach entry domain</strong>
          <p class="text-sm text-muted">Choose domain for TDS routing</p>
        </div>
        <button class="btn btn--sm btn--primary">Select domain</button>
      </li>

      <li class="checklist-item">
        <span class="icon checklist-item__icon" data-icon="mono/circle"></span>
        <div class="checklist-item__content">
          <strong>Configure Traffic Shield</strong>
          <p class="text-sm text-muted">Set up bot filtering and security rules</p>
        </div>
        <button class="btn btn--sm btn--ghost">Open Traffic Shield</button>
      </li>

      <!-- ... 3 more items ... -->
    </ol>
  </div>
</section>
```

**CSS Requirements:**
- `.checklist-item` - flex layout with icon, content, action
- Use existing `.list--ruled` base styles
- Spacing tokens: `--space-3` between items

**Files:**
- `streams.html` - HTML structure
- `static/css/site.css` - `.checklist-item` styles
- `src/streams/onboarding.ts` - show/hide logic

---

### 2.2. Compact Status Panel

**Component:** `.tds-status-panel` (collapsed state)

**Show when:** `rulesCount > 0 && !showFullChecklist`

```html
<div class="tds-status-panel">
  <div class="tds-pipeline tds-pipeline--mini">
    <!-- Compact pipeline -->
  </div>

  <div class="tds-status-panel__chips">
    <span class="badge badge--success">Shield: On</span>
    <span class="badge">12 rules</span>
    <span class="badge badge--warning">3 draft changes</span>
  </div>

  <button class="btn-chip btn-chip--sm" data-action="toggle-checklist">
    <span class="icon" data-icon="mono/help-circle"></span>
    <span>Show checklist</span>
  </button>
</div>
```

---

## Milestone 3: Rules Table

### 3.1. Rules Toolbar

**Component:** Reuse `.table-controls` pattern from domains/redirects

**Structure:**
```html
<div class="table-controls">
  <!-- Search -->
  <div class="table-search">
    <span class="icon" data-icon="mono/magnify"></span>
    <input type="search" placeholder="Search rules..." />
  </div>

  <!-- Filter chips -->
  <div class="filter-chips">
    <div class="dropdown filter-chip" data-dropdown>
      <button class="btn-chip btn-chip--sm">
        <span>Status: All</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
      <!-- Dropdown menu -->
    </div>

    <div class="dropdown filter-chip" data-dropdown>
      <button class="btn-chip btn-chip--sm">
        <span>Country: All</span>
        <span class="badge badge--sm">0</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
    </div>

    <div class="dropdown filter-chip" data-dropdown>
      <button class="btn-chip btn-chip--sm">
        <span>Device: All</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
    </div>
  </div>

  <!-- Actions -->
  <div class="table-actions">
    <button class="btn btn--primary">
      <span class="icon" data-icon="mono/plus"></span>
      <span>Create rule</span>
    </button>

    <div class="dropdown" data-dropdown>
      <button class="btn-icon">
        <span class="icon" data-icon="mono/dots-vertical"></span>
      </button>
      <div class="dropdown__menu dropdown__menu--right">
        <button class="dropdown__item">
          <span class="icon" data-icon="mono/check-circle"></span>
          <span>Validate all</span>
        </button>
        <button class="dropdown__item">
          <span class="icon" data-icon="mono/download"></span>
          <span>Import rules</span>
        </button>
        <button class="dropdown__item">
          <span class="icon" data-icon="mono/upload"></span>
          <span>Export rules</span>
        </button>
        <hr class="dropdown__divider" />
        <button class="dropdown__item">
          <span class="icon" data-icon="mono/refresh"></span>
          <span>Invalidate cache</span>
        </button>
      </div>
    </div>

    <button class="btn btn--ghost" data-action="toggle-reorder">
      <span class="icon" data-icon="mono/drag-vertical"></span>
      <span>Reorder</span>
    </button>
  </div>
</div>
```

**Pattern Reference:** `src/domains/filters-ui.ts`

---

### 3.2. Rules Table

**Component:** Reuse `.table` pattern with custom columns

**Columns:**
1. **Priority** (80px) - number + up/down + drag handle
2. **When** (fluid) - chips summary of conditions
3. **Then** (fluid) - target + status
4. **Enabled** (80px) - toggle switch
5. **Updated** (120px) - relative time
6. **Actions** (100px) - edit/duplicate/delete

**Structure:**
```html
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th class="th-priority">Priority</th>
        <th>When</th>
        <th>Then</th>
        <th class="th-center">Enabled</th>
        <th class="th-updated">Updated</th>
        <th class="th-actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table-row" data-rule-id="1">
        <!-- Priority cell -->
        <td class="td-priority">
          <div class="priority-control">
            <button class="priority-control__btn" data-action="move-up" title="Move up">
              <span class="icon" data-icon="mono/chevron-up"></span>
            </button>
            <span class="priority-control__number">1</span>
            <button class="priority-control__btn" data-action="move-down" title="Move down">
              <span class="icon" data-icon="mono/chevron-down"></span>
            </button>
            <button class="priority-control__handle" data-drag-handle title="Drag to reorder">
              <span class="icon" data-icon="mono/drag-vertical"></span>
            </button>
          </div>
        </td>

        <!-- When cell -->
        <td class="td-when">
          <div class="condition-chips">
            <span class="badge badge--sm">
              <span class="icon" data-icon="mono/flag"></span>
              US, CA, GB +3
            </span>
            <span class="badge badge--sm">
              <span class="icon" data-icon="mono/devices"></span>
              Mobile
            </span>
            <span class="badge badge--sm">
              <span class="icon" data-icon="mono/link"></span>
              /offer/*
            </span>
          </div>
        </td>

        <!-- Then cell -->
        <td class="td-then">
          <div class="target-info">
            <span class="target-info__url">https://offer1.example.com</span>
            <span class="badge badge--sm badge--success">301</span>
          </div>
        </td>

        <!-- Enabled cell -->
        <td class="td-center">
          <label class="toggle">
            <input type="checkbox" checked />
            <span class="toggle__slider"></span>
          </label>
        </td>

        <!-- Updated cell -->
        <td class="td-updated">
          <time datetime="2025-12-24">2 hours ago</time>
        </td>

        <!-- Actions cell -->
        <td class="td-actions">
          <div class="btn-group">
            <button class="btn-icon btn-icon--compact" data-action="edit" title="Edit rule">
              <span class="icon" data-icon="mono/pencil"></span>
            </button>
            <div class="dropdown" data-dropdown>
              <button class="btn-icon btn-icon--compact">
                <span class="icon" data-icon="mono/dots-vertical"></span>
              </button>
              <div class="dropdown__menu dropdown__menu--right">
                <button class="dropdown__item">
                  <span class="icon" data-icon="mono/content-copy"></span>
                  <span>Duplicate</span>
                </button>
                <button class="dropdown__item">
                  <span class="icon" data-icon="mono/flask"></span>
                  <span>Test in simulator</span>
                </button>
                <hr class="dropdown__divider" />
                <button class="dropdown__item text-danger">
                  <span class="icon" data-icon="mono/delete"></span>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**New Components:**
- `.priority-control` - vertical layout with up/down/number/drag
- `.condition-chips` - chips container with "+N" overflow
- `.target-info` - URL + status badge
- `.toggle` - iOS-style toggle switch (reuse if exists)

**CSS Requirements:**
- Sticky header
- Uniform row height
- Compact chip display with "+N" overflow
- Priority column always visible (high priority in responsive)

**Files:**
- `streams.html`
- `src/streams/table.ts`
- `static/css/site.css` - `.priority-control`, `.condition-chips`, `.target-info`

---

### 3.3. Empty State

**Show when:** `rulesCount === 0`

```html
<div class="empty-state">
  <span class="empty-state__icon">
    <span class="icon icon--lg" data-icon="mono/directions-fork"></span>
  </span>
  <h3 class="empty-state__title">No rules yet</h3>
  <p class="empty-state__description">
    Create your first TDS rule to start routing traffic based on conditions.
  </p>
  <button class="btn btn--primary">
    <span class="icon" data-icon="mono/plus"></span>
    <span>Create your first rule</span>
  </button>
</div>
```

**Pattern Reference:** Existing `.empty-state` component

---

## Milestone 4: Rule Drawer (Editor)

### 4.1. Drawer Shell

**Component:** Reuse drawer pattern from `partials/connect-cloudflare-drawer.hbs`

**Structure:**
```html
<aside class="drawer" data-drawer="rule-editor" hidden>
  <div class="drawer__overlay" data-drawer-close></div>
  <div class="drawer__panel drawer__panel--wide">
    <!-- Header -->
    <header class="drawer__header">
      <div class="drawer__title">
        <span class="icon" data-icon="mono/directions-fork"></span>
        <h2 class="h4">Edit Rule: Mobile US Traffic</h2>
      </div>

      <div class="drawer__header-controls">
        <!-- Enabled toggle -->
        <label class="toggle" title="Enable/disable rule">
          <input type="checkbox" checked />
          <span class="toggle__slider"></span>
        </label>

        <!-- Priority mini-control -->
        <div class="priority-mini">
          <button class="btn-icon btn-icon--compact" data-action="priority-up">
            <span class="icon" data-icon="mono/chevron-up"></span>
          </button>
          <span class="priority-mini__number">3</span>
          <button class="btn-icon btn-icon--compact" data-action="priority-down">
            <span class="icon" data-icon="mono/chevron-down"></span>
          </button>
        </div>

        <button class="btn-close" type="button" data-drawer-close>
          <span class="icon" data-icon="mono/close"></span>
        </button>
      </div>
    </header>

    <!-- Body with tabs -->
    <div class="drawer__body">
      <div class="tabs">
        <!-- Tabs navigation -->
        <div class="tabs__nav" role="tablist">
          <button class="tabs__trigger is-active" data-tab-trigger="when">
            <span class="icon" data-icon="mono/filter"></span>
            <span>When</span>
          </button>
          <button class="tabs__trigger" data-tab-trigger="then">
            <span class="icon" data-icon="mono/arrow-right"></span>
            <span>Then</span>
          </button>
          <button class="tabs__trigger" data-tab-trigger="advanced">
            <span class="icon" data-icon="mono/code"></span>
            <span>Advanced</span>
          </button>
        </div>

        <!-- Tab panels -->
        <div class="tabs__panels">
          <!-- When panel -->
          <div class="tabs__panel is-active" data-tab-panel="when">
            <!-- Conditions form - see 4.2 -->
          </div>

          <!-- Then panel -->
          <div class="tabs__panel" data-tab-panel="then">
            <!-- Action form - see 4.3 -->
          </div>

          <!-- Advanced panel -->
          <div class="tabs__panel" data-tab-panel="advanced">
            <!-- JSON preview - see 4.4 -->
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="drawer__footer">
      <button class="btn btn--ghost" type="button" data-drawer-close>Cancel</button>
      <button class="btn btn--ghost" type="button" data-action="save-draft">Save draft</button>
      <button class="btn btn--primary" type="button" data-action="save-publish" disabled>
        <span class="icon" data-icon="mono/rocket"></span>
        <span>Save & publish</span>
      </button>
    </footer>
  </div>
</aside>
```

**Pattern Reference:** `partials/connect-cloudflare-drawer.hbs`, `src/ui/tabs.ts`

---

### 4.2. Drawer Tab: When (Conditions)

**Form Structure:**
```html
<form class="stack-list" data-form="rule-conditions">
  <!-- Path patterns -->
  <div class="field">
    <label class="field__label">Path patterns</label>
    <div class="field__input-group">
      <input type="text" class="input" placeholder="/offer/*" />
      <button class="btn-icon" type="button" data-action="add-pattern">
        <span class="icon" data-icon="mono/plus"></span>
      </button>
    </div>
    <p class="field__hint text-muted">
      Use wildcards: /path/* or exact paths. Leave empty to match all.
    </p>
    <!-- Pattern list -->
    <ul class="pattern-list">
      <li class="pattern-list__item">
        <span class="pattern-list__text">/offer/*</span>
        <button class="btn-icon btn-icon--compact" data-action="remove-pattern">
          <span class="icon" data-icon="mono/close"></span>
        </button>
      </li>
    </ul>
  </div>

  <!-- Countries -->
  <div class="field">
    <label class="field__label">Countries</label>
    <div class="dropdown" data-dropdown>
      <button class="btn-chip" type="button">
        <span class="icon" data-icon="mono/flag"></span>
        <span>Select countries</span>
        <span class="badge badge--sm">3</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
      <div class="dropdown__menu dropdown__menu--wide">
        <!-- Multi-select checkboxes -->
        <label class="dropdown__item dropdown__item--checkbox">
          <input type="checkbox" checked />
          <span class="icon" data-icon="mono/check"></span>
          <span>United States (US)</span>
        </label>
        <!-- ... more countries ... -->
      </div>
    </div>
    <p class="field__hint text-muted">
      Leave empty to match all countries.
    </p>
  </div>

  <!-- Devices -->
  <div class="field">
    <label class="field__label">Devices</label>
    <div class="btn-chip-group" role="group">
      <button class="btn-chip is-active" type="button" data-device="all">All</button>
      <button class="btn-chip" type="button" data-device="desktop">Desktop</button>
      <button class="btn-chip" type="button" data-device="mobile">Mobile</button>
      <button class="btn-chip" type="button" data-device="tablet">Tablet</button>
    </div>
  </div>

  <!-- Bots condition -->
  <div class="field">
    <label class="field__label">Bots</label>
    <select class="select">
      <option value="any">Any (bots and humans)</option>
      <option value="bots-only">Bots only</option>
      <option value="exclude-bots">Exclude bots</option>
    </select>
    <p class="field__hint text-muted">
      Requires Traffic Shield to be enabled for bot detection.
    </p>
  </div>
</form>
```

**New Components:**
- `.pattern-list` - list of removable items
- `.dropdown__item--checkbox` - checkbox item in dropdown

**Pattern Reference:** Existing form components, `.field`, `.btn-chip-group`

---

### 4.3. Drawer Tab: Then (Action)

**Form Structure:**
```html
<form class="stack-list" data-form="rule-action">
  <!-- Action type switch -->
  <div class="field">
    <label class="field__label">Action type</label>
    <div class="btn-chip-group" role="group">
      <button class="btn-chip is-active" type="button" data-action-type="redirect">
        <span class="icon" data-icon="mono/arrow-right"></span>
        <span>Redirect</span>
      </button>
      <button class="btn-chip" type="button" data-action-type="response">
        <span class="icon" data-icon="mono/code"></span>
        <span>Response</span>
      </button>
    </div>
  </div>

  <!-- Redirect fields (show when type=redirect) -->
  <div class="action-fields" data-action-fields="redirect">
    <div class="field">
      <label class="field__label">Target URL</label>
      <input type="url" class="input" placeholder="https://offer1.example.com" required />
      <p class="field__hint text-muted">
        Must be a valid URL starting with http:// or https://
      </p>
    </div>

    <div class="field">
      <label class="field__label">Status code</label>
      <div class="dropdown" data-dropdown>
        <button class="btn-chip" type="button">
          <span class="badge badge--success">301</span>
          <span>Permanent Redirect</span>
          <span class="icon" data-icon="mono/chevron-down"></span>
        </button>
        <div class="dropdown__menu">
          <button class="dropdown__item">
            <span class="badge badge--success">301</span>
            <span>Permanent Redirect</span>
          </button>
          <button class="dropdown__item">
            <span class="badge badge--info">302</span>
            <span>Temporary Redirect</span>
          </button>
          <button class="dropdown__item">
            <span class="badge badge--info">307</span>
            <span>Temporary Redirect (keep method)</span>
          </button>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="checkbox">
        <input type="checkbox" checked />
        <span class="checkbox__label">Preserve query string</span>
      </label>
      <p class="field__hint text-muted">
        Append original query parameters to target URL.
      </p>
    </div>

    <!-- Advanced options (collapsible) -->
    <details class="panel">
      <summary class="panel__summary">
        <span class="icon" data-icon="mono/chevron-down"></span>
        <span>Advanced redirect options</span>
      </summary>
      <div class="panel__body stack">
        <div class="field">
          <label class="checkbox">
            <input type="checkbox" />
            <span class="checkbox__label">Preserve path</span>
          </label>
        </div>
        <div class="field">
          <label class="field__label">Custom headers</label>
          <textarea class="textarea" rows="3" placeholder="X-Custom-Header: value"></textarea>
        </div>
      </div>
    </details>
  </div>

  <!-- Response fields (show when type=response) -->
  <div class="action-fields" data-action-fields="response" hidden>
    <div class="field">
      <label class="field__label">Status code</label>
      <input type="number" class="input" value="200" min="200" max="599" />
    </div>

    <div class="field">
      <label class="field__label">Response body</label>
      <textarea class="textarea" rows="8" placeholder="HTML content or JSON response"></textarea>
      <p class="field__hint text-muted">
        Supports HTML, JSON, or plain text.
      </p>
    </div>
  </div>
</form>
```

**Pattern Reference:** Existing form components, `<details>` for collapsible sections

---

### 4.4. Drawer Tab: Advanced (JSON Preview)

**Structure:**
```html
<div class="stack-list" data-tab-panel="advanced">
  <!-- JSON preview -->
  <div class="field">
    <label class="field__label">Rule configuration (JSON)</label>
    <pre class="code-block"><code class="language-json">{
  "priority": 3,
  "enabled": true,
  "conditions": {
    "path": ["/offer/*"],
    "countries": ["US", "CA", "GB"],
    "device": "mobile",
    "bots": "any"
  },
  "action": {
    "type": "redirect",
    "url": "https://offer1.example.com",
    "status": 301,
    "preserveQuery": true
  },
  "metadata": {
    "etag": "abc123",
    "updatedAt": "2025-12-24T12:00:00Z"
  }
}</code></pre>
  </div>

  <!-- Validate button -->
  <div class="field">
    <button class="btn btn--ghost">
      <span class="icon" data-icon="mono/check-circle"></span>
      <span>Validate configuration</span>
    </button>
  </div>

  <!-- Metadata (optional) -->
  <div class="panel panel--info">
    <div class="stack stack--xs">
      <div class="cluster">
        <span class="text-muted">ETag:</span>
        <code class="text-sm">abc123def456</code>
      </div>
      <div class="cluster">
        <span class="text-muted">Last updated:</span>
        <time datetime="2025-12-24">Dec 24, 2025 at 12:00 PM</time>
      </div>
    </div>
  </div>
</div>
```

**New Component:**
- `.code-block` - monospace code display with syntax highlighting (optional)

**CSS Requirements:**
- Monospace font
- Horizontal scroll for long lines
- Max height with vertical scroll

---

### 4.5. Unsaved Changes Guard

**Component:** Reuse existing dialog pattern

```html
<dialog class="dialog" data-dialog="unsaved-changes">
  <div class="dialog__content">
    <header class="dialog__header">
      <h3 class="dialog__title">Unsaved changes</h3>
    </header>
    <div class="dialog__body">
      <p>You have unsaved changes. Are you sure you want to close?</p>
    </div>
    <footer class="dialog__footer">
      <button class="btn btn--ghost" data-action="keep-editing">Keep editing</button>
      <button class="btn btn--danger" data-action="discard">Discard changes</button>
    </footer>
  </div>
</dialog>
```

**Logic:**
```typescript
// src/streams/drawer.ts
let isDirty = false;

form.addEventListener('input', () => {
  isDirty = true;
  updatePublishButton();
});

drawerCloseBtn.addEventListener('click', (e) => {
  if (isDirty) {
    e.preventDefault();
    showUnsavedChangesDialog();
  }
});
```

**Pattern Reference:** Existing dialog component, delete confirmation dialogs

---

## Milestone 5: Reorder UX (Priority Controls)

### 5.1. Priority Column Controls + Undo Toast

**Component:** `.priority-control` (already defined in 3.2)

**Behavior:**
```typescript
// src/streams/priority.ts
function handleMoveUp(ruleId: string) {
  const currentIndex = rules.findIndex(r => r.id === ruleId);
  if (currentIndex === 0) return; // Already at top

  // Swap positions
  const temp = rules[currentIndex];
  rules[currentIndex] = rules[currentIndex - 1];
  rules[currentIndex - 1] = temp;

  // Re-render table
  renderTable();

  // Show undo toast
  showUndoToast(`Moved rule from position ${currentIndex + 1} to ${currentIndex}`, () => {
    // Undo: swap back
    const temp = rules[currentIndex];
    rules[currentIndex] = rules[currentIndex - 1];
    rules[currentIndex - 1] = temp;
    renderTable();
  });
}
```

**Toast Component:**
```html
<div class="toast toast--success" data-toast="priority-change">
  <div class="toast__content">
    <span class="icon" data-icon="mono/check-circle"></span>
    <span>Moved rule from position 3 to 2</span>
  </div>
  <button class="btn-chip btn-chip--sm" data-action="undo">
    <span class="icon" data-icon="mono/undo"></span>
    <span>Undo</span>
  </button>
  <button class="btn-icon btn-icon--compact" data-action="dismiss">
    <span class="icon" data-icon="mono/close"></span>
  </button>
</div>
```

**Files:**
- `src/streams/priority.ts`
- `src/ui/notifications.ts` (extend for undo toast)

---

### 5.2. Drag Handle (Optional Enhancement)

**Component:** Already included in `.priority-control` (see 3.2)

**Library:** Consider using SortableJS or implement custom drag logic

**Behavior:**
```typescript
// src/streams/drag.ts
import Sortable from 'sortablejs';

const tbody = document.querySelector('tbody');
Sortable.create(tbody, {
  handle: '[data-drag-handle]',
  animation: 150,
  onEnd: (evt) => {
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;

    // Update rules array
    const [movedRule] = rules.splice(oldIndex, 1);
    rules.splice(newIndex, 0, movedRule);

    // Show toast
    showUndoToast(`Moved rule from position ${oldIndex + 1} to ${newIndex + 1}`, undoCallback);
  }
});
```

**Note:** If adding SortableJS, update package.json

---

### 5.3. Reorder Mode Toggle

**Component:** Button in toolbar (already defined in 3.1)

**Reorder mode UI changes:**
```css
/* When data-reorder-mode="true" */
[data-reorder-mode="true"] .priority-control {
  background: var(--bg-interactive);
  border: 2px solid var(--brand);
}

[data-reorder-mode="true"] .priority-control__handle {
  display: flex; /* Show drag handle */
}

[data-reorder-mode="true"] .table-row:hover {
  cursor: move;
}
```

**Additional Controls in Reorder Mode:**
```html
<!-- Row context menu in reorder mode -->
<div class="dropdown" data-dropdown>
  <button class="btn-icon btn-icon--compact">
    <span class="icon" data-icon="mono/dots-vertical"></span>
  </button>
  <div class="dropdown__menu">
    <button class="dropdown__item">
      <span class="icon" data-icon="mono/arrow-up"></span>
      <span>Move to top</span>
    </button>
    <button class="dropdown__item">
      <span class="icon" data-icon="mono/arrow-down"></span>
      <span>Move to bottom</span>
    </button>
    <hr class="dropdown__divider" />
    <button class="dropdown__item">
      <span class="icon" data-icon="mono/number"></span>
      <span>Set position...</span>
    </button>
  </div>
</div>
```

---

### 5.4. Priority Control in Drawer

**Component:** `.priority-mini` (already defined in 4.1 drawer header)

**Behavior:**
```typescript
// Sync with table priority
function updateDrawerPriority(ruleId: string) {
  const rule = rules.find(r => r.id === ruleId);
  const priorityDisplay = document.querySelector('.priority-mini__number');
  priorityDisplay.textContent = rules.indexOf(rule) + 1;
}

// Up/down buttons
document.querySelector('[data-action="priority-up"]').addEventListener('click', () => {
  const currentRule = getCurrentRule();
  handleMoveUp(currentRule.id);
  updateDrawerPriority(currentRule.id);
});
```

---

## Milestone 6: Draft/Publish Banner

### 6.1. Unpublished Changes Banner

**Component:** `.draft-banner` (sticky top, below context bar)

**Structure:**
```html
<div class="draft-banner" data-draft-banner hidden>
  <div class="draft-banner__content">
    <span class="icon" data-icon="mono/alert-circle"></span>
    <div class="draft-banner__text">
      <strong>You have unpublished changes</strong>
      <span class="text-muted">3 rules modified, 1 reordered</span>
    </div>
  </div>
  <div class="draft-banner__actions">
    <button class="btn btn--ghost btn--sm" data-action="discard-draft">
      <span class="icon" data-icon="mono/close"></span>
      <span>Discard</span>
    </button>
    <button class="btn btn--primary btn--sm" data-action="publish-draft">
      <span class="icon" data-icon="mono/rocket"></span>
      <span>Publish changes</span>
    </button>
  </div>
</div>
```

**CSS:**
```css
.draft-banner {
  position: sticky;
  top: var(--header-height); /* After context bar */
  z-index: var(--z-sticky);
  background: var(--bg-warning-subtle);
  border-bottom: 1px solid var(--border-warning);
  padding: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.draft-banner[hidden] {
  display: none;
}
```

**Show Logic:**
```typescript
// src/streams/draft.ts
let draftChanges = [];

function trackChange(type: 'create' | 'update' | 'delete' | 'reorder', ruleId: string) {
  draftChanges.push({ type, ruleId, timestamp: Date.now() });
  updateDraftBanner();
}

function updateDraftBanner() {
  const banner = document.querySelector('[data-draft-banner]');

  if (draftChanges.length > 0) {
    banner.removeAttribute('hidden');

    // Update summary text
    const summary = summarizeChanges(draftChanges);
    banner.querySelector('.draft-banner__text span').textContent = summary;
  } else {
    banner.setAttribute('hidden', '');
  }
}
```

---

## Technical Requirements Summary

### Design System Compliance

**Components to Reuse:**
- ✅ `.table` - base table styles
- ✅ `.drawer` - drawer pattern
- ✅ `.tabs` - tabs component
- ✅ `.btn`, `.btn-chip`, `.btn-icon` - buttons
- ✅ `.badge` - status badges
- ✅ `.dropdown` - filter dropdowns
- ✅ `.field`, `.input`, `.select`, `.textarea` - form controls
- ✅ `.panel` - info panels
- ✅ `.card` - welcome card
- ✅ `.empty-state` - no rules state
- ✅ `.dialog` - confirmation dialogs
- ✅ `.toast` - notifications

**New Components to Create:**
- `.tds-context-bar` - sticky selectors and status
- `.tds-pipeline` - visual flow diagram
- `.priority-control` - up/down/drag controls
- `.condition-chips` - chips with overflow
- `.target-info` - URL + status display
- `.checklist-item` - onboarding checklist
- `.draft-banner` - sticky changes notification
- `.code-block` - JSON display (optional)

**Design Tokens:**
- Use fluid layout tokens for responsive sizing
- Use spacing tokens (--space-*) for consistent gaps
- Use shadow tokens (--shadow-*) for elevation
- Use color tokens (--bg-*, --border-*, --text-*)

### Responsive Strategy

**Breakpoints:**
- Desktop (>1024px): Full table, side drawer
- Tablet (768-1024px): Adaptive columns, compact drawer
- Mobile (<768px): Priority columns only, full-screen drawer

**Priority-based Column Hiding:**
```css
@container (max-width: 768px) {
  .td-updated { display: none; } /* Priority 4 */
}

@container (max-width: 600px) {
  .td-when { display: none; } /* Priority 3 - show in drawer */
}
```

### Accessibility

**ARIA Requirements:**
- `role="tablist"` on tabs navigation
- `role="tab"` on tab triggers
- `role="tabpanel"` on tab panels
- `aria-label` on icon-only buttons
- `aria-expanded` on dropdowns
- `aria-pressed` on toggle buttons
- `aria-live="polite"` on toast notifications

**Keyboard Navigation:**
- Tab through interactive elements
- Arrow keys for tabs navigation
- Enter/Space to activate buttons
- Escape to close drawer/dropdowns

### File Structure

**New Files:**
```
streams.html                       # Main page
src/streams/
  ├── table.ts                     # Table rendering
  ├── filters.ts                   # Filter logic
  ├── drawer.ts                    # Drawer management
  ├── priority.ts                  # Priority controls
  ├── drag.ts                      # Drag & drop (optional)
  ├── draft.ts                     # Draft tracking
  ├── onboarding.ts                # Welcome checklist
  └── mock-data.ts                 # Mock rules for UI development
```

**CSS Updates:**
```
static/css/site.css                # Add new component styles
```

**i18n:**
```typescript
// src/i18n/locales/en.ts
streams: {
  title: 'TDS Rules',
  welcome: {
    title: 'Traffic Routing (TDS)',
    subtitle: 'Traffic first passes Traffic Shield...',
    // ... checklist items
  },
  table: {
    priority: 'Priority',
    when: 'When',
    then: 'Then',
    // ... column headers
  },
  drawer: {
    newRule: 'New rule',
    editRule: 'Edit rule',
    // ... drawer labels
  },
  // ... more namespaces
}
```

---

## Implementation Order (Recommended)

**Phase 1: Foundation (1-2 days)**
1. ✅ Create `streams.html` skeleton
2. ✅ Implement context bar (sticky)
3. ✅ Implement pipeline strip
4. ✅ Add welcome card with checklist
5. ✅ Create mock data structure

**Phase 2: Table (1-2 days)**
6. ✅ Implement toolbar with filters
7. ✅ Implement rules table with columns
8. ✅ Add priority column with up/down controls
9. ✅ Add empty state
10. ✅ Implement basic row interactions

**Phase 3: Drawer (2-3 days)**
11. ✅ Create drawer shell with tabs
12. ✅ Implement "When" tab (conditions form)
13. ✅ Implement "Then" tab (action form)
14. ✅ Implement "Advanced" tab (JSON preview)
15. ✅ Add unsaved changes guard

**Phase 4: Reorder (1 day)**
16. ✅ Implement up/down logic with undo toast
17. ✅ Add drag handle (optional)
18. ✅ Implement reorder mode toggle

**Phase 5: Polish (1 day)**
19. ✅ Implement draft banner
20. ✅ Add all interactions (edit/duplicate/delete)
21. ✅ Mobile responsive testing
22. ✅ Accessibility audit

**Total Estimate:** 6-9 days for complete UI implementation (mock data)

---

## Mock Data Structure

```typescript
// src/streams/mock-data.ts
export interface TDSRule {
  id: string;
  priority: number;
  enabled: boolean;
  label?: string; // Optional user-friendly name

  // Conditions
  conditions: {
    paths?: string[]; // ["/offer/*", "/promo/*"]
    countries?: string[]; // ["US", "CA", "GB"]
    device?: 'all' | 'desktop' | 'mobile' | 'tablet';
    bots?: 'any' | 'bots-only' | 'exclude-bots';
  };

  // Action
  action: {
    type: 'redirect' | 'response';
    // Redirect fields
    url?: string;
    status?: 301 | 302 | 307 | 308;
    preserveQuery?: boolean;
    preservePath?: boolean;
    headers?: Record<string, string>;
    // Response fields
    responseStatus?: number;
    responseBody?: string;
  };

  // Metadata
  metadata: {
    etag: string;
    updatedAt: string;
    updatedBy?: string;
  };
}

export const MOCK_RULES: TDSRule[] = [
  {
    id: 'rule-1',
    priority: 1,
    enabled: true,
    label: 'Mobile US Traffic',
    conditions: {
      paths: ['/offer/*'],
      countries: ['US'],
      device: 'mobile',
      bots: 'exclude-bots',
    },
    action: {
      type: 'redirect',
      url: 'https://offer1.example.com',
      status: 301,
      preserveQuery: true,
    },
    metadata: {
      etag: 'abc123',
      updatedAt: '2025-12-24T12:00:00Z',
    },
  },
  // ... more rules
];
```

---

## API Integration (Future - Out of Scope)

When connecting to real API:

**Endpoints:**
```
GET    /api/tds/rules?siteId={id}           # List rules
POST   /api/tds/rules                        # Create rule
GET    /api/tds/rules/:id                    # Get rule
PATCH  /api/tds/rules/:id                    # Update rule
DELETE /api/tds/rules/:id                    # Delete rule
PATCH  /api/tds/rules/reorder                # Reorder rules
POST   /api/tds/rules/validate               # Validate rule
POST   /api/tds/publish                      # Publish draft changes
POST   /api/tds/simulate                     # Test rule
```

**Event Delegation:**
When implementing API calls, apply event delegation pattern from performance roadmap.

---

## Questions / Clarifications Needed

1. **Traffic Shield Integration:** Should context bar link to actual Shield settings or placeholder?
2. **Simulator:** Detailed UI for simulator or just button CTA?
3. **Import/Export:** File format? JSON? YAML? Custom?
4. **Publish Flow:** Should publish be instant or show confirmation dialog?
5. **Draft Persistence:** Should drafts persist across sessions (localStorage)?

---

## Success Criteria

**Milestone 1-2 (Foundation):**
- ✅ Context bar sticky and responsive
- ✅ Pipeline strip clear and clickable
- ✅ Welcome checklist visible for new users
- ✅ Compact status panel for existing users

**Milestone 3 (Table):**
- ✅ Table displays rules clearly
- ✅ Filters work (UI only, mock data)
- ✅ Empty state shows when no rules
- ✅ Mobile: priority columns visible

**Milestone 4 (Drawer):**
- ✅ Drawer opens/closes smoothly
- ✅ All form fields functional
- ✅ Tabs navigation works
- ✅ Unsaved changes guard prevents data loss

**Milestone 5 (Reorder):**
- ✅ Up/down buttons work with undo
- ✅ Drag handle functional (optional)
- ✅ Reorder mode visually distinct
- ✅ Priority changes reflected immediately

**Milestone 6 (Draft):**
- ✅ Banner shows when changes exist
- ✅ Discard/Publish buttons present
- ✅ Banner dismisses after publish (placeholder)

**Overall:**
- ✅ No design system violations
- ✅ Responsive on mobile/tablet/desktop
- ✅ Keyboard accessible
- ✅ Zero console errors
- ✅ Ready for API integration
