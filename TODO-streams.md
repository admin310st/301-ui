# TODO: Streams/TDS Page

**Epic:** Traffic Distribution System UI - Complete implementation from welcome screen to rule editor

**Status:** 📋 Planned (Layer 5-6 in roadmap)

**Priority:** After Redirects, Projects, Sites

**Target:** Полноценный UI для управления TDS правилами с онбордингом, таблицей, drawer-редактором и reorder UX

**API Reference:** [`docs/mini-tds-analysis.md`](docs/mini-tds-analysis.md) - Analysis of production TDS implementation (investblog/mini-tds)

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
    <!-- NEW: Rule Type filter -->
    <div class="dropdown filter-chip" data-dropdown>
      <button class="btn-chip btn-chip--sm">
        <span class="icon" data-icon="mono/filter"></span>
        <span>Type: All</span>
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
      <div class="dropdown__menu">
        <button class="dropdown__item" data-filter-value="all">All types</button>
        <button class="dropdown__item" data-filter-value="smartshield">
          <span class="icon" data-icon="mono/shield"></span>
          <span>SmartShield</span>
        </button>
        <button class="dropdown__item" data-filter-value="smartlink">
          <span class="icon" data-icon="mono/link"></span>
          <span>SmartLink</span>
        </button>
      </div>
    </div>

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
2. **Type** (100px) - SmartLink or SmartShield badge
3. **When** (fluid) - chips summary of conditions
4. **Then** (fluid) - target + status
5. **Enabled** (80px) - toggle switch
6. **Updated** (120px) - relative time
7. **Actions** (100px) - edit/duplicate/delete

**Structure:**
```html
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th class="th-priority">Priority</th>
        <th class="th-type">Type</th>
        <th>When</th>
        <th>Then</th>
        <th class="th-center">Enabled</th>
        <th class="th-updated">Updated</th>
        <th class="th-actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      <!-- SmartShield rule -->
      <tr class="table-row" data-rule-id="1" data-rule-type="smartshield">
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

        <!-- Type cell -->
        <td class="td-type">
          <span class="badge badge--sm badge--primary">
            <span class="icon" data-icon="mono/shield"></span>
            <span>Shield</span>
          </span>
        </td>

        <!-- When cell (SmartShield conditions) -->
        <td class="td-when">
          <div class="condition-chips">
            <span class="badge badge--sm">
              <span class="icon" data-icon="mono/flag"></span>
              RU, BY
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

      <!-- SmartLink rule -->
      <tr class="table-row" data-rule-id="2" data-rule-type="smartlink">
        <td class="td-priority">
          <div class="priority-control">
            <button class="priority-control__btn" data-action="move-up">
              <span class="icon" data-icon="mono/chevron-up"></span>
            </button>
            <span class="priority-control__number">2</span>
            <button class="priority-control__btn" data-action="move-down">
              <span class="icon" data-icon="mono/chevron-down"></span>
            </button>
            <button class="priority-control__handle" data-drag-handle>
              <span class="icon" data-icon="mono/drag-vertical"></span>
            </button>
          </div>
        </td>

        <!-- Type cell -->
        <td class="td-type">
          <span class="badge badge--sm badge--info">
            <span class="icon" data-icon="mono/link"></span>
            <span>Link</span>
          </span>
        </td>

        <!-- When cell (SmartLink conditions) -->
        <td class="td-when">
          <div class="condition-chips">
            <span class="badge badge--sm">
              <span class="icon" data-icon="mono/tag"></span>
              utm_source=fb
            </span>
            <span class="badge badge--sm">
              <span class="icon" data-icon="mono/tag"></span>
              utm_campaign=summer
            </span>
          </div>
        </td>

        <!-- Then cell -->
        <td class="td-then">
          <div class="target-info">
            <span class="target-info__url">https://offer2.example.com/fb-summer</span>
            <span class="badge badge--sm badge--success">302</span>
          </div>
        </td>

        <td class="td-center">
          <label class="toggle">
            <input type="checkbox" checked />
            <span class="toggle__slider"></span>
          </label>
        </td>

        <td class="td-updated">
          <time datetime="2025-12-24">1 day ago</time>
        </td>

        <td class="td-actions">
          <div class="btn-group">
            <button class="btn-icon btn-icon--compact" data-action="edit">
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
- `.badge--primary` - blue badge for SmartShield type
- `.badge--info` - purple/teal badge for SmartLink type

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
  <!-- Rule Type Selector -->
  <div class="field">
    <label class="field__label">Rule Type</label>
    <div class="btn-group btn-group--full" role="group" data-rule-type-selector>
      <button type="button" class="btn btn--ghost is-active" data-rule-type="smartshield">
        <span class="icon" data-icon="mono/shield"></span>
        <span>SmartShield</span>
      </button>
      <button type="button" class="btn btn--ghost" data-rule-type="smartlink">
        <span class="icon" data-icon="mono/link"></span>
        <span>SmartLink</span>
      </button>
    </div>
    <p class="field__hint text-muted">
      <strong>SmartShield:</strong> Route by geo, device, bots (CF metadata).
      <strong>SmartLink:</strong> Route by UTM params, campaign tags.
    </p>
  </div>

  <!-- SmartShield Conditions (shown when type=smartshield) -->
  <div data-rule-type-fields="smartshield">
    <!-- Path patterns -->
    <div class="field">
      <label class="field__label">Path patterns (optional)</label>
      <div class="field__input-group">
        <input type="text" class="input" placeholder="^/casino/([^/?#]+)" />
        <button class="btn-icon" type="button" data-action="add-pattern">
          <span class="icon" data-icon="mono/plus"></span>
        </button>
      </div>
      <p class="field__hint text-muted">
        Regex patterns. Leave empty to match all paths.
      </p>
      <ul class="pattern-list">
        <li class="pattern-list__item">
          <span class="pattern-list__text">^/casino/([^/?#]+)</span>
          <button class="btn-icon btn-icon--compact" data-action="remove-pattern">
            <span class="icon" data-icon="mono/close"></span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Countries -->
    <div class="field">
      <label class="field__label">Countries (optional)</label>
      <div class="dropdown" data-dropdown>
        <button class="btn-chip" type="button">
          <span class="icon" data-icon="mono/flag"></span>
          <span>Select countries</span>
          <span class="badge badge--sm">2</span>
          <span class="icon" data-icon="mono/chevron-down"></span>
        </button>
        <div class="dropdown__menu dropdown__menu--wide">
          <label class="dropdown__item dropdown__item--checkbox">
            <input type="checkbox" value="RU" checked />
            <span class="icon" data-icon="mono/check"></span>
            <span>🇷🇺 Russia (RU)</span>
          </label>
          <label class="dropdown__item dropdown__item--checkbox">
            <input type="checkbox" value="BY" checked />
            <span class="icon" data-icon="mono/check"></span>
            <span>🇧🇾 Belarus (BY)</span>
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
      <label class="field__label">Devices (optional)</label>
      <div class="chip-group">
        <label class="chip-group__item">
          <input type="checkbox" value="mobile" checked />
          <span class="chip-group__label">
            <span class="icon" data-icon="mono/cellphone"></span>
            <span>Mobile</span>
          </span>
        </label>
        <label class="chip-group__item">
          <input type="checkbox" value="desktop" />
          <span class="chip-group__label">
            <span class="icon" data-icon="mono/monitor"></span>
            <span>Desktop</span>
          </span>
        </label>
        <label class="chip-group__item">
          <input type="checkbox" value="tablet" />
          <span class="chip-group__label">
            <span class="icon" data-icon="mono/tablet"></span>
            <span>Tablet</span>
          </span>
        </label>
      </div>
    </div>

    <!-- Bots -->
    <div class="field">
      <label class="field__label">Bots</label>
      <select class="select">
        <option value="">Any (include bots and humans)</option>
        <option value="false" selected>Exclude bots</option>
        <option value="true">Bots only</option>
      </select>
      <p class="field__hint text-muted">
        Filter by bot detection (Googlebot, YandexBot, etc.)
      </p>
    </div>

    <!-- Advanced: ASN (NEW) -->
    <details class="field__details">
      <summary class="field__details-summary">Advanced conditions</summary>
      <div class="stack-list stack-list--sm">
        <div class="field">
          <label class="field__label">ASN (optional)</label>
          <input type="text" class="input" placeholder="12389, 8359" />
          <p class="field__hint text-muted">
            AS numbers (comma-separated). Example: 12389 (MTS), 8359 (Beeline)
          </p>
        </div>

        <div class="field">
          <label class="field__label">TLS Version (optional)</label>
          <div class="chip-group">
            <label class="chip-group__item">
              <input type="checkbox" value="1.2" />
              <span class="chip-group__label">TLS 1.2</span>
            </label>
            <label class="chip-group__item">
              <input type="checkbox" value="1.3" />
              <span class="chip-group__label">TLS 1.3</span>
            </label>
          </div>
        </div>

        <div class="field">
          <label class="field__label">IP Ranges (optional)</label>
          <input type="text" class="input" placeholder="203.0.113.0/24" />
          <p class="field__hint text-muted">
            CIDR notation, comma-separated
          </p>
        </div>
      </div>
    </details>
  </div>

  <!-- SmartLink Conditions (shown when type=smartlink) -->
  <div data-rule-type-fields="smartlink" hidden>
    <div class="field">
      <label class="field__label">UTM Source</label>
      <input type="text" class="input" placeholder="facebook, fb, instagram" />
      <p class="field__hint text-muted">
        Comma-separated values. Example: facebook, fb
      </p>
    </div>

    <div class="field">
      <label class="field__label">UTM Campaign (optional)</label>
      <input type="text" class="input" placeholder="summer2025" />
    </div>

    <div class="field">
      <label class="field__label">UTM Content (optional)</label>
      <input type="text" class="input" placeholder="banner1, video2" />
    </div>

    <div class="field">
      <label class="field__label">UTM Medium (optional)</label>
      <input type="text" class="input" placeholder="cpc, social" />
    </div>

    <!-- Custom Parameters -->
    <details class="field__details">
      <summary class="field__details-summary">Custom parameters</summary>
      <div class="stack-list stack-list--sm">
        <div class="field">
          <label class="field__label">Parameter name</label>
          <div class="cluster cluster--sm">
            <input type="text" class="input" placeholder="sub1" style="flex: 1;" />
            <input type="text" class="input" placeholder="value" style="flex: 1;" />
            <button class="btn btn--ghost btn--sm" type="button">Remove</button>
          </div>
        </div>
        <button class="btn btn--ghost btn--sm" type="button">
          <span class="icon" data-icon="mono/plus"></span>
          <span>Add parameter</span>
        </button>
      </div>
    </details>
  </div>
</form>
```

**New Components:**
- `.pattern-list` - list of removable items
- `.dropdown__item--checkbox` - checkbox item in dropdown
- `.btn-group--full` - full-width button group for rule type selector
- `.chip-group` - checkbox group styled as chips
- `.field__details` - collapsible details element for advanced fields

**Pattern Reference:** Existing form components, `.field`, `.btn-chip-group`

**JavaScript Logic:**
- Toggle visibility of `[data-rule-type-fields]` based on selected rule type
- SmartShield: show geo, device, bots, path, ASN, TLS, IP fields
- SmartLink: show UTM params, custom params fields

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

**Updated 2025-12-24:** Aligned with 301-wiki TDS specification (see `docs/301-wiki/TDS.md` and `docs/tds-backend-recommendations.md`)

**Key changes from mini-tds:**
- Added `rule_type: "smartlink" | "smartshield"` discriminator
- Split match conditions into SmartShieldMatch (geo/device/bots/ASN/TLS) and SmartLinkMatch (UTM params)
- Added SmartLink examples (UTM-based routing)
- Added advanced SmartShield conditions (ASN, TLS version, IP ranges)

```typescript
// src/streams/types.ts

// Rule type discriminator (from 301-wiki/TDS.md)
export type RuleType = "smartlink" | "smartshield";

export type Device = "mobile" | "desktop" | "tablet" | "any";

// SmartShield Match Conditions (route by CF metadata)
export interface SmartShieldMatch {
  path?: string | string[];      // Regex patterns: ["^/casino/([^/?#]+)"]
  countries?: string[];          // ISO codes (uppercase): ["RU", "UA", "BY"]
  devices?: Device[];            // Device types
  bots?: boolean;                // true = bots only, false = exclude bots
  // Advanced conditions:
  asn?: number[];                // AS numbers: [12389, 8359]
  tls_version?: string[];        // TLS versions: ["1.2", "1.3"]
  ip_ranges?: string[];          // CIDR notation: ["203.0.113.0/24"]
  referrer?: string | string[];  // Regex for referrer
}

// SmartLink Match Conditions (route by UTM params)
export interface SmartLinkMatch {
  utm_source?: string[];         // UTM source values: ["facebook", "fb"]
  utm_campaign?: string[];       // UTM campaign values: ["summer2025"]
  utm_content?: string[];        // UTM content values: ["banner1", "video2"]
  utm_medium?: string[];         // UTM medium values: ["cpc", "social"]
  custom_params?: Record<string, string[]>; // Custom query params: { sub1: ["value1"] }
}

// Unified match type (either SmartShield OR SmartLink)
export type MatchRule = SmartShieldMatch | SmartLinkMatch;

export interface RedirectTarget {
  url: string;                   // Absolute URL
  weight?: number;               // For A/B tests (sum must = 100)
  label?: string;                // Display name in UI
}

export interface RedirectAction {
  type: "redirect" | "weighted_redirect";
  targets: RedirectTarget[];     // Single target or multiple for A/B
  query?: Record<string, string | { fromPathGroup: number }>;
  preserveOriginalQuery?: boolean;
  appendCountry?: boolean;       // Add ?country=RU
  appendDevice?: boolean;        // Add ?device=mobile
  status?: 301 | 302;            // Default 302
}

export interface ResponseAction {
  type: "response";
  status?: number;               // HTTP status (200, 404, etc.)
  headers?: Record<string, string>;
  bodyHtml?: string;             // HTML response body
  bodyText?: string;             // Plain text body
}

export type RouteAction = RedirectAction | ResponseAction;

export interface TDSRule {
  id: string;                    // Unique rule ID
  rule_type: RuleType;           // "smartlink" | "smartshield" (discriminator)
  enabled?: boolean;             // Default true
  priority?: number;             // For UI sorting (not in mini-tds)
  label?: string;                // User-friendly name (UI only)
  match: MatchRule;              // Conditions (type depends on rule_type)
  action: RouteAction;           // Action to take
  // Metadata (read-only from API)
  metadata?: {
    etag?: string;
    updatedAt?: string;
    updatedBy?: string;
  };
}
```

**Example Mock Data:**

```typescript
// src/streams/mock-data.ts
export const MOCK_TDS_RULES: TDSRule[] = [
  // SmartShield rules (route by CF metadata: geo, device, bots)
  {
    id: "rule-ru-mobile-casino",
    rule_type: "smartshield",
    enabled: true,
    priority: 1,
    label: "RU Mobile Casino → A/B Test",
    match: {
      path: ["^/casino/([^/?#]+)"],
      countries: ["RU", "BY"],
      devices: ["mobile"],
      bots: false,
    },
    action: {
      type: "weighted_redirect",
      targets: [
        { url: "https://offer1.example.com/landing", weight: 60, label: "Offer A (60%)" },
        { url: "https://offer2.example.com/promo", weight: 40, label: "Offer B (40%)" },
      ],
      query: {
        bonus: { fromPathGroup: 1 },  // From regex capture group
        src: "tds-mobile",
      },
      appendCountry: true,
      appendDevice: true,
      status: 302,
    },
    metadata: {
      etag: "abc123def456",
      updatedAt: "2025-12-24T12:00:00Z",
      updatedBy: "admin@ip-1.2.3.4",
    },
  },
  {
    id: "rule-ua-desktop-slots",
    rule_type: "smartshield",
    enabled: true,
    priority: 2,
    label: "UA Desktop Slots → Direct",
    match: {
      path: ["^/slots/"],
      countries: ["UA"],
      devices: ["desktop"],
      bots: false,
    },
    action: {
      type: "redirect",
      targets: [
        { url: "https://mainsite.example.com/slots-ua", label: "Main Site" },
      ],
      preserveOriginalQuery: true,
      status: 301,
    },
  },
  {
    id: "rule-us-advanced",
    rule_type: "smartshield",
    enabled: true,
    priority: 3,
    label: "US Traffic (Advanced Filters)",
    match: {
      countries: ["US"],
      devices: ["desktop"],
      asn: [7922, 20057],  // Comcast, AT&T
      tls_version: ["1.3"],
      bots: false,
    },
    action: {
      type: "redirect",
      targets: [
        { url: "https://premium-offer.example.com", label: "Premium Offer" },
      ],
      status: 302,
    },
  },

  // SmartLink rules (route by UTM params)
  {
    id: "rule-fb-summer-campaign",
    rule_type: "smartlink",
    enabled: true,
    priority: 4,
    label: "Facebook Summer Campaign",
    match: {
      utm_source: ["facebook", "fb"],
      utm_campaign: ["summer2025"],
    },
    action: {
      type: "redirect",
      targets: [
        { url: "https://offer2.example.com/fb-summer", label: "FB Landing" },
      ],
      preserveOriginalQuery: true,
      status: 302,
    },
    metadata: {
      updatedAt: "2025-12-23T10:00:00Z",
    },
  },
  {
    id: "rule-google-ads-ab",
    rule_type: "smartlink",
    enabled: true,
    priority: 5,
    label: "Google Ads A/B Test",
    match: {
      utm_source: ["google", "adwords"],
      utm_medium: ["cpc"],
      utm_content: ["banner1", "banner2"],
    },
    action: {
      type: "weighted_redirect",
      targets: [
        { url: "https://landing-a.example.com", weight: 50, label: "Landing A" },
        { url: "https://landing-b.example.com", weight: 50, label: "Landing B" },
      ],
      status: 302,
    },
  },
  {
    id: "rule-email-campaign",
    rule_type: "smartlink",
    enabled: true,
    priority: 6,
    label: "Email Newsletter Campaign",
    match: {
      utm_source: ["newsletter"],
      utm_medium: ["email"],
      custom_params: {
        subscriber_id: ["*"],  // Any value present
      },
    },
    action: {
      type: "redirect",
      targets: [
        { url: "https://exclusive.example.com/subscribers", label: "Subscriber Offer" },
      ],
      preserveOriginalQuery: true,
      status: 302,
    },
  },

  // Fallback/catch-all SmartShield rule
  {
    id: "rule-bots-landing",
    rule_type: "smartshield",
    enabled: true,
    priority: 99,
    label: "Bots → Safe Landing Page",
    match: {
      bots: true,
    },
    action: {
      type: "response",
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
      bodyHtml: "<!doctype html><html><head><title>Welcome</title></head><body><h1>Site is fine</h1></body></html>",
    },
  },
  // ... add 2-3 more rules for realistic table if needed
];
```

---

## API Integration (Future - Out of Scope)

**Reference:** `docs/mini-tds-analysis.md` - Complete API specification based on production mini-tds

When connecting to real API:

**Core Endpoints (mini-tds compatible):**
```
GET    /api/tds/rules                # Get all rules + ETag
                                      Response: { rules: TDSRule[], version: string, etag: string }

PUT    /api/tds/rules                # Replace all rules (requires If-Match header)
                                      Request: { rules: TDSRule[] }
                                      Headers: If-Match: <etag>
                                      Response: { ok: true, etag: string }

PATCH  /api/tds/rules/:id            # Update single rule
                                      Request: { patch: Partial<TDSRule> }
                                      Response: { ok: true, etag: string }

DELETE /api/tds/rules/:id            # Delete rule
                                      Response: { ok: true, etag: string }

POST   /api/tds/rules/validate       # Validate without saving
                                      Request: { routes: TDSRule[] }
                                      Response: { ok: true } | { error: string }
```

**Extended Endpoints (301-ui specific):**
```
GET    /api/tds/audit?limit=20      # Audit log (last N changes)
                                      Response: AuditEntry[]

POST   /api/tds/cache/invalidate    # Invalidate worker cache
                                      Response: { ok: true }

GET    /api/tds/export              # Export full bundle
                                      Response: { rules, flags, metadata, etag }

POST   /api/tds/import              # Import bundle
                                      Request: { routes, flags }
```

**Authentication:**
```typescript
// All API requests require Bearer token
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

**ETag-based Updates (Optimistic Locking):**
```typescript
// When updating rules, include If-Match header to prevent lost updates
const response = await fetch('/api/tds/rules', {
  method: 'PUT',
  headers: {
    'If-Match': currentEtag,  // From GET /api/tds/rules response
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ rules: updatedRules }),
});

// If ETag mismatch: 412 Precondition Failed
// User must reload and retry
```

**Event Delegation:**
When implementing API calls, apply event delegation pattern from performance roadmap.

**Validation Strategy:**
- Client-side: Validate before opening save button
- Server-side: Validate via `POST /api/tds/rules/validate` before PUT
- Show validation errors in drawer form (field-level + summary)

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
