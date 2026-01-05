# 301.st UI Style Guide

Design system for **301.st** (marketing front + member area).

**Goals:**
- Clear visual language for redirect/domains/Cloudflare management
- Consistent dark & light themes based on CSS custom properties
- Strong contrast (WCAG AA baseline)
- Orange CTAs reserved for **Cloudflare-level** actions only

---

## Quick Reference

### Core Components

| Component | Classes | Production Example | CSS Section |
|-----------|---------|-------------------|-------------|
| **Buttons** | `.btn.btn--{primary\|ghost\|danger\|cf}` | `dashboard.html` Step 1 actions | `site.css` → "Buttons (contrast-safe)" |
| **Links** | `.link`, `.link--muted` | `dashboard.html` "Manage integrations" | `site.css` → "Links (global styles)" |
| **Cards** | `.card.card--panel`, `.card--soft` | `dashboard.html` step cards | `site.css` → "Cards v2" |
| **Panels** | `.panel.panel--{info\|success\|warning\|danger}` | `dashboard.html` Step 1 info panel | `site.css` → "Panels" |
| **Badges** | `.badge.badge--{primary\|success\|neutral\|warning\|danger}` | `domains.html` status column | `site.css` → "Badges" |
| **Tabs** | `.tabs`, `.tab`, `.tab.is-active` | `projects.html` project detail view | `site.css` → "Tabs Navigation" |
| **Metric Pill** | `.metric-pill`, `.metric-pill--{success\|warning\|danger}` | Preserved (not in production) | `site.css` → "Metric Pill" |
| **Loading Indicator** | `.loading-bar[data-loading][data-type]` | `index.html` login/register | `site.css` → "Loading indicator bar" |
| **Global Notices** | `.app-alert.app-alert--{success\|error\|info}` | All pages, utility-bar overlay | `site.css` → "Global Notices" |
| **Layout** | `.cluster`, `.stack`, `.stack--{xs\|sm\|md\|lg\|xl}` | All pages | `site.css` → "Common Patterns" |

### Live Examples
See production pages: `dashboard.html`, `domains.html`, `integrations.html`, `streams.html`, `index.html`

---

## Design System Principles

### 1. Unified Control System

**Core formula**: All interactive controls use the same height calculation:
```
height = font-size × line-height + padding × 2
```

**Rules:**
- ❌ **Never** set fixed heights on buttons, inputs, chips, or search bars
- ✅ Use size modifiers: `.btn--{sm|md|lg}`, `.btn-chip--sm`
- ✅ Pills (buttons, badges): `border-radius: var(--r-pill)`
- ✅ Fields (inputs, search): `border-radius: var(--r-field)`
- ✅ Icons inside controls: `1.25em`, inline with text: `1em`

**Implementation**: See `site.css` → "Unified Control System" section

### 2. Cloudflare Orange Rule

**Orange is reserved ONLY for Cloudflare-level actions:**
- ✅ Connect Cloudflare account
- ✅ Verify CF API token
- ✅ Apply WAF/SSL rules
- ✅ Purge CF cache

**Never use orange for:**
- ❌ Generic "primary" actions
- ❌ Create/Save/Submit buttons
- ❌ Navigation or general CTAs

**Classes**: `.btn--cf`, `.badge--cf`, `.card--accent-cf`

### 3. No Framework Dependencies

- No Tailwind runtime
- Pure CSS with custom properties
- Theme switching via `<html data-theme="dark|light">`

### 4. Never Use !important

**Rule**: `!important` is banned from the codebase. Always solve specificity through proper selectors.

**Why:**
- Breaks CSS cascade and makes debugging harder
- Creates maintenance debt (forces future devs to use more !important)
- Indicates architectural problem in selector specificity

**How to fix specificity:**
- Use BEM modifiers: `.btn.btn--primary .icon` not `.btn .icon !important`
- Chain classes: `.card.card--panel .title` increases specificity
- Use attribute selectors: `button[data-status="active"]`
- Leverage element + class: `button.dropdown__trigger`

**If you think you need !important**: You don't. Refactor the cascade instead.

### 5. Repository Ecology Rule

When design system updates are introduced, **ALL** UI components and demo pages must be refactored to follow new rules. No page is allowed to use outdated paddings, heights, or markup.

---

## Components

### Buttons

**Classes:**
- `.btn.btn--primary` - primary actions (Save, Create, Continue)
- `.btn.btn--ghost` - secondary/neutral actions (Cancel, Filters)
- `.btn.btn--danger` - destructive actions (Delete, Remove)
- `.btn.btn--cf` - Cloudflare actions ONLY
- `.btn.btn--social` - OAuth login buttons

**Size modifiers:**
- `.btn--sm` - compact buttons
- `.btn--md` - default (same height as chips)
- `.btn--lg` - hero/landing layouts only

**Production examples:**
- Primary: `dashboard.html` "Connect account", `streams.html` "Create Rule"
- Ghost: `domains.html` filter dropdowns
- Danger: Confirmation dialogs
- CF Orange: `integrations.html` "Connect Cloudflare"

**CSS**: `site.css` → "Buttons (contrast-safe)"

#### Chips & Tabs

**Classes:**
- `.btn-chip` - filters, tabs, status indicators
- `.btn-chip--dropdown` - filter chips with chevron
- `.btn-chip--sm` - compact inline chips
- `.btn-chip--cf` - Cloudflare provider chip

**Production**: `domains.html` table filters, `index.html` auth tabs

**CSS**: `site.css` → "Table chips / action chips"

### Links

**Classes:**
- `.link` - standard blue link, underline on hover
- `.link--sm` - small font size
- `.link--muted` - gray, becomes blue on hover

**Usage:**
```html
<a href="/integrations.html" class="link">Manage integrations</a>
```

**Production**: `dashboard.html` panel links, `index.html` auth forms

**Note**: Base `<a>` tags have `color: inherit` - always add `.link` class for styled links.

**CSS**: `site.css` → "Links (global styles)"

### Cards

**Variants:**
- `.card.card--panel` - standard content cards with header/body/footer
- `.card.card--soft` - subtle background, no border
- `.card.card--compact` - reduced padding
- `.card.card--accent-cf` - Cloudflare orange accent border

**Structure:**
```html
<article class="card card--panel">
  <header class="card__header">...</header>
  <div class="card__body">...</div>
  <footer class="card__footer">...</footer>
</article>
```

**Production**:
- Panel cards: `dashboard.html` step cards, `streams.html` onboarding
- Soft cards: `dashboard.html` step flow indicator
- Empty states: `domains.html`, `redirects.html`

**CSS**: `site.css` → "Cards v2"

### Panels

**Purpose**: Contextual info/alert boxes inside cards or page content.

**Variants:**
- `.panel` - default (neutral)
- `.panel--info` - informational (blue tint)
- `.panel--success` - positive feedback (green tint)
- `.panel--warning` - caution (orange tint)
- `.panel--danger` - errors/critical (red tint)

**Production**:
- Info: `dashboard.html` Step 1 security note, `streams.html` Smart Shield warning
- Success: `dashboard.html` Step 1 completed state

**CSS**: `site.css` → "Panels"

### Badges

**Semantic variants:**
- `.badge--primary` (blue) - Enabled (not yet active/synced)
- `.badge--info` (blue) - Informational, emphasizes connection to info panels
- `.badge--success` (green) - Active/working
- `.badge--neutral` (gray) - Disabled/No redirect
- `.badge--warning` (orange) - Pending/In progress
- `.badge--danger` (red) - Error/Failed

**Special:**
- `.badge--circle` - perfectly round, for numeric indicators
- `.badge--cf` - Cloudflare orange
- `.badge--brand` - brand blue for "Beta"/"Welcome"

**Production**:
- Status: `domains.html` domain status column
- Steps: `dashboard.html`, `streams.html` step numbers
- Sidebar: navigation indicators

**CSS**: `site.css` → "Badges"

### Metric Pill

**Purpose**: Compact inline progress/usage indicator with colored fill bar.

**Structure:**
```html
<span class="metric-pill">
  <span class="metric-pill__track">
    <span class="metric-pill__fill" style="--metric-fill: 0.75"></span>
  </span>
</span>
```

**Variants:**
- `.metric-pill` (default) - blue/primary color
- `.metric-pill--success` - green fill
- `.metric-pill--warning` - orange fill
- `.metric-pill--danger` - red fill

**Dynamic fill**: Set `--metric-fill` CSS variable (0 to 1):
```html
<span style="--metric-fill: 0.5">  <!-- 50% filled -->
<span style="--metric-fill: 0.85"> <!-- 85% filled -->
```

**Use cases:**
- API rate limit indicators (75% of quota used)
- Storage usage meters
- Task completion progress
- Domain health scores

**Production**: Not yet implemented

**CSS**: `site.css` → "Metric Pill"

### Forms

**Controls:**
- `.input` - text inputs
- `.checkbox` - checkboxes
- `.radio` - radio buttons

**Dropdowns/Selects:**
- ❌ **NEVER use native `<select>` elements** - not styleable, inconsistent across browsers
- ✅ **Use custom dropdown component** (`.btn-chip--dropdown` + `.dropdown__menu`)
- Pattern: See `edit-site-drawer.hbs` status selector or `manage-site-domains-drawer.hbs`
- Hidden `<input type="hidden">` stores form value

**Production**: `index.html` login/register forms

**CSS**: `site.css` → "Form controls"

### Tables

**Comprehensive table system** with:
- Responsive design
- Row actions dropdown
- Smart dropdown positioning (auto-flip)
- Bulk selection
- Status indicators

**Production**: `domains.html`, `redirects.html`

**CSS**: `tables.css` (entire file)

**Key features**:
- Auto-flip dropdowns when near bottom edge
- Sticky headers on scroll
- Provider icons (Cloudflare, GoDaddy, etc.)
- Domain health indicators

### Dropdowns

**Base classes:**
- `.dropdown` - Container wrapper
- `.dropdown__trigger` - Button that opens menu
- `.dropdown__menu` - Menu panel (hidden by default)
- `.dropdown__item` - Individual menu items

**Menu width modifiers:**
- `.dropdown__menu--fit-trigger` - Menu width matches trigger button (mobile filters)
- `.dropdown__menu--auto` - Width by widest content, min 100% of trigger (plan selector)

**Smart positioning (auto-flip):**
- Dropdown menu automatically flips up/down based on available viewport space
- Prevents menu clipping at top/bottom edges
- Uses `adjustDropdownPosition()` from `@ui/dropdown`
- Applied automatically when using `initDropdowns()`

**Z-index behavior:**
- Menu overlays other elements with `z-index: 100`
- Prevents clipping by table containers
- Works correctly with `overflow: hidden` parents

**Production examples:**
- Auto width: `account.html` plan selector
- Fit trigger: `domains.html` filter dropdowns
- Smart positioning: `redirects.html`, `domains.html` row actions (auto-flip near viewport edge)

**CSS**: `tables.css` → Dropdown section

**Initialization**:
- **Required**: Call `initDropdowns(container)` after rendering dynamic content
- Example: `initDropdowns(tbody as HTMLElement)` after table render
- Enables toggle/close behavior + auto-flip positioning

### Loading Indicator & Global Notices

**Purpose**: Unified visual feedback system combining loading states and notifications.

**Architecture**:
- **Loading Bar** - 1px shimmer animation in `.utility-bar` border
- **Global Notice** - Alert message in `.app-alert` with coordinated border flash
- **Coordination** - Shimmer transitions to notice color, then fixes as border

**Visual Flow**:

```
1. Loading Phase
   └─ Shimmer animation (blue/orange)

2. Completion with Notice
   ├─ Shimmer "flushes" to notice color (1.5s)
   ├─ Border holds solid color (600ms)
   └─ Notice slides down with message

3. No Notice
   └─ Shimmer fades out (200ms)
```

**CSS Implementation**:

```css
/* Loading bar with shimmer */
.loading-bar {
  position: absolute;
  bottom: 0;
  height: var(--indicator-thickness); /* 1px */
  background: var(--brand); /* Blue */
  z-index: var(--z-indicator);
}

.loading-bar[data-loading='true']::before {
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Shimmer flush state (final cycle) */
.loading-bar[data-loading='flushing']::before {
  animation: shimmer 1.5s ease-in-out 1; /* Once, not infinite */
}

/* Color variants */
.loading-bar[data-type='brand'] { background: var(--brand); }
.loading-bar[data-type='cf'] { background: var(--accent-cf); }
.loading-bar[data-type='success'] { background: var(--success); }
.loading-bar[data-type='error'] { background: var(--danger); }
.loading-bar[data-type='info'] { background: var(--info); }

/* Border flash on utility-bar */
.utility-bar[data-border-flash='success'] {
  border-bottom-color: var(--success);
}
.utility-bar[data-border-flash='error'] {
  border-bottom-color: var(--danger);
}
.utility-bar[data-border-flash='info'] {
  border-bottom-color: var(--info);
}
```

**Timing Specifications**:

| Phase | Duration | Animation |
|-------|----------|-----------|
| Loading shimmer | Infinite | 1.5s ease-in-out |
| Shimmer flush | 1.5s | 1 cycle (not infinite) |
| Border flash | 600ms | Solid color hold |
| Notice delay | 2200ms | Total wait (1500 + 600 + 100) |
| Notice slide | 300ms | translateY(0) |

**Color Usage**:

| Type | Color | Use Case |
|------|-------|----------|
| `brand` | Blue (`--brand`) | Auth operations (login, register, logout) |
| `cf` | Orange (`--accent-cf`) | Cloudflare API operations |
| `success` | Green (`--success`) | Success notices |
| `error` | Red (`--danger`) | Error notices |
| `info` | Blue (`--info`) | Info notices |

**Design Tokens**:

```css
:root {
  --indicator-thickness: 1px;
  --z-indicator: 2;        /* Loading bar layer */
  --z-global-notice: 100;  /* Notice overlay layer */

  /* Colors */
  --brand: #3475C0;        /* Blue for auth */
  --accent-cf: #C24F00;    /* Orange for CF */
  --success: #18C27A;      /* Green */
  --danger: #FF4F6E;       /* Red */
  --info: #3B82F6;         /* Info blue */
}
```

**Accessibility**:
- Loading bar has `aria-hidden="true"` (visual only)
- Global notice has `role="status"` or `role="alert"` for errors
- `aria-live="polite"` for screen reader announcements
- Color not sole indicator (shimmer animation + text message)

**Production Examples**:
- `index.html` - Login/register forms
- `integrations.html` - Cloudflare connect drawer

**API Reference**:
- Technical implementation: `CLAUDE.md` → "Loading Indicator & Global Notices"
- TypeScript API: `src/ui/loading-indicator.ts`
- Coordination logic: `src/ui/globalNotice.ts`

---

## Layout

### Dashboard Shell

**Structure**: Sidebar + content area with responsive collapse

**Behavior**:
- Desktop (>1024px): Full sidebar (280px)
- Mobile (<1024px): Collapsed sidebar (72px) + overlay toggle

**Production**: All dashboard pages (`dashboard.html`, `domains.html`, `integrations.html`, etc.)

**CSS**: `site.css` → "Dashboard Layout System"

### Stack & Cluster Utilities

**Vertical spacing (Stack):**
- `.stack` - default vertical spacing
- `.stack--xs`, `.stack--sm`, `.stack--md`, `.stack--lg`, `.stack--xl` - size variants

**Horizontal spacing (Cluster):**
- `.cluster` - flexbox with gap, wraps items
- Aligns items horizontally with consistent spacing

**Production**: Used throughout all pages for layout

**CSS**: `site.css` → "Common Patterns"

### Page Header

**Standard pattern:**
```html
<header class="page-header">
  <div class="stack-sm">
    <h1 class="h3">Page Title</h1>
    <p class="text-lead">Descriptive subtitle</p>
  </div>
</header>
```

**Production**: `dashboard.html`, `streams.html`, `integrations.html`

---

## Typography

**Headings:**
- `.h1` - page titles (auth pages, landing)
- `.h2` - section titles
- `.h3` - page titles (member area)
- `.h4` - card headers
- `.h5`, `.h6` - subsections

**Helpers:**
- `.text-lead` - larger body text for subtitles
- `.text-body` - standard body text
- `.text-sm` - small text
- `.text-muted` - muted/secondary text
- `.text-xs` - extra small (timestamps, meta)

**Production**: Used throughout all pages

**CSS**: `site.css` → base typography

---

## Theme & Tokens

### Color System

**Semantic tokens** (both themes):
- `--primary` - blue for actions, links
- `--success` - green for positive states
- `--danger` - red for errors, destructive actions
- `--warning` - orange for alerts
- `--info` - blue for informational
- `--accent-cf` - Cloudflare orange (CTAs only)

**Text:**
- `--text-main` - primary text
- `--text-muted` - secondary/helper text

**Backgrounds:**
- `--bg` - page background
- `--bg-soft` - subtle elevated surface
- `--bg-elevated` - cards, panels, dropdowns
- `--panel` - header/footer background

**Borders:**
- `--border` - standard borders
- `--border-subtle` - subtle dividers

**Full palette**: See `theme.css` → ":root" section

### Spacing Scale

**System**: `var(--space-{1,2,3,4,5,6})`
- `--space-1`: 0.25rem (4px)
- `--space-2`: 0.5rem (8px)
- `--space-3`: 0.75rem (12px)
- `--space-4`: 1rem (16px)
- `--space-5`: 1.5rem (24px)
- `--space-6`: 3rem (48px)

**Layout gaps:**
- `--inline-gap`: 0.5rem (horizontal)
- `--stack-gap`: 0.75rem (vertical)

**Reference**: `theme.css` → spacing tokens

### Border Radius

**System:**
- `--r-sm`: 4px - small elements
- `--r-md`: 6px - cards, panels
- `--r-lg`: 8px - large surfaces
- `--r-pill`: 999px - buttons, badges (fully rounded)
- `--r-field`: 6px - inputs, search bars (subtle)

**Control-specific:**
- `--control-radius`: `var(--r-pill)` for buttons/chips

### Elevation & Shadows

**Levels:**
- `--shadow-sm` - subtle lift (cards)
- `--shadow-md` - moderate (dropdowns)
- `--shadow-lg` - prominent (modals)

**Reference**: `theme.css` → elevation section

---

## Best Practices

### Icon Usage

**Sizing:**
- Inside controls (buttons, chips): `1.25em`
- Inline with text: `1em`
- Never use fixed `px` sizes

**Colors:**
- Use `currentColor` for automatic theme compatibility
- Icons inherit text color from parent

**Implementation:**
```html
<span class="icon" data-icon="mono/home"></span>
```

**Available icons**: See `static/icons-preview.html`

#### Icon Ring (Promotional Icons)

Larger, visually prominent icons for promotional cards and feature highlights.

**Specifications:**
- Container: 3rem (48px) × 3rem, `border-radius: var(--r-pill)` (circular)
- Icon inside: 1.5em (scales with font-size)
- Border: 1px solid with subtle background

**Variants:** `.icon-ring--brand` (blue) | `.icon-ring--cf` (orange) | `.icon-ring--success` (green)

**Pattern:** Use with `.cluster--promo` for proper mobile layout (vertical stack + center on < 768px)

**See:** `dashboard.html` (Step 2), `streams.html` (SmartLink, A/B Testing cards)

### Responsive Design

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1023px
- Desktop: ≥ 1024px

**Dashboard collapse**: 1024px

**Reference**: `site.css` → "Breakpoints"

### Accessibility

**Focus states:**
- All interactive elements must have `:focus-visible` styles
- No `outline: none` without replacement

**ARIA:**
- Use `aria-label` for icon-only buttons
- Use `aria-pressed` for toggles
- Use `role="status"` for live regions

**Contrast:**
- All text must meet WCAG AA (4.5:1 for body, 3:1 for large)
- Test in both dark and light themes

### i18n

**All visible text must have translation keys:**
- Use `data-i18n="key.path"` attributes
- Translation files: `src/i18n/locales/{en,ru}.ts`

---

## CSS Architecture

### File Organization

- `theme.css` - CSS variables, color palette, tokens
- `layout.css` - Grid, spacing, page shell
- `site.css` - All components (buttons, cards, forms, etc.)
- `tables.css` - Table-specific styles

### CSS Section Markers

All major component sections in `site.css` are marked with comments:

```css
/* ============================================
   Component Name
   ============================================ */
```

**Reference these markers** instead of line numbers when documenting components.

### Naming Conventions

**BEM modifiers:**
- `.component.component--variant` (modern, preferred)
- `.component-variant` (legacy, being phased out)

**Examples:**
- ✅ `.btn.btn--primary`
- ❌ `.btn-primary` (deprecated)

---

## Common Patterns

### Step Flow Indicators

**Used in**: `dashboard.html`, `streams.html`

```html
<div class="card card--soft">
  <div class="step-flow">
    <div class="step-pill">
      <span class="step-number">1</span>
      <span class="step-text">Step name</span>
    </div>
    <span class="step-separator">→</span>
    ...
  </div>
</div>
```

### Empty States

**Pattern**: Card with centered icon + message + action

**Production**: `domains.html`, `redirects.html`, `streams.html`

```html
<div class="empty-state">
  <span class="icon icon--xxl" data-icon="mono/inbox"></span>
  <h2>No items yet</h2>
  <p>Description text</p>
  <button class="btn btn--primary">Create first item</button>
</div>
```

### Confirmation Dialogs

**Types:**
- Standard dialogs: `<dialog>` element
- Drawers: Side panel for detailed forms

**Production**: Used for delete confirmations, bulk actions

**CSS**: `site.css` → "Confirmation Dialogs"

---

## Cloudflare-Specific Rules

### When to Use CF Orange

**Button variants**: `.btn--cf`, `.btn-chip--cf`
**Card accents**: `.card--accent-cf`
**Badge**: `.badge--cf`

**Valid use cases:**
1. Connect Cloudflare account
2. Add/verify CF API token
3. Apply CF-specific settings (WAF, SSL, Cache)
4. Sync with CF API
5. Purge CF cache

**Invalid use cases:**
- Generic primary actions
- Domain management (use primary blue)
- Navigation
- General CTAs

### CF Step Numbering

Step 1 on dashboard uses CF orange badge: `.badge--cf`

Other steps use neutral: `.badge--neutral`

---

## Maintenance

### When Adding New Components

1. **Add to production page** (dashboard, domains, etc.)
2. **Document in this guide** with:
   - Classes and variants
   - Production example reference
   - CSS section marker
3. **Test in both themes** (dark + light)
4. **Verify responsive** behavior

### When Updating Existing Components

1. **Update all instances** across all pages
2. **Update StyleGuide** if structure changes
3. **Never leave orphaned variants** in CSS

### Design System Updates

When introducing breaking changes (new control formula, spacing changes, etc.):
- Update ALL pages to use new system
- No page should use old patterns
- Document migration in commit message

---

## Reference Links

**Production Pages (Live Examples):**
- `index.html` - Auth pages (login, register, reset)
- `dashboard.html` - Onboarding with step cards
- `integrations.html` - Cloudflare connection wizard
- `domains.html` - Table with filters, actions, health
- `redirects.html` - Table with redirect rules
- `streams.html` - TDS rules onboarding
- `account.html` - User profile

**CSS Files:**
- `static/css/theme.css` - Tokens and variables
- `static/css/layout.css` - Grid and spacing
- `static/css/site.css` - All components
- `static/css/tables.css` - Table system

**Icon System:**
- Source: `static/img/icons-src/`
- Preview: `static/icons-preview.html`
- Build: `npm run build:icons`

---

**Last updated**: 2025-12-26
**Version**: 2.0 (condensed reference format)
