# 301.st UI Style Guide

Design system for **301.st** (marketing front + member area).

Goals:

- clear visual language for redirect / domains / Cloudflare management;
- consistent dark & light themes based on CSS custom properties;
- strong contrast (WCAG AA baseline);
- orange CTAs reserved for **Cloudflare-level** actions.

---

## 1. Themes & tokens

We use CSS custom properties (`--token`) and a theme switch via
`<html data-theme="dark">` / `<html data-theme="light">`. There is **no Tailwind runtime**; keep styling in vanilla CSS.

### 1.1. Base palette

```css
:root {
  /* Blues (primary brand) */
  --blue-900: #003682;
  --blue-700: #0055DC;
  --blue-500: #3475C0;
  --blue-300: #408BC9;
  --blue-neon: #4DA3FF;

  /* Oranges (Cloudflare-ish family) */
  --orange-500: #F48120;
  --orange-700: #F38020;
  --orange-900: #C65000;

  /* Cloudflare CTA accent */
  --accent-cf: #C24F00;
  --accent-cf-hover: #E05A00;
  --accent-cf-soft: rgba(244, 129, 32, 0.16);

  /* Neutrals */
  --gray-950: #000000;
  --gray-900: #111111;
  --gray-800: #222222;
  --gray-700: #333333;
  --gray-600: #404242;
  --gray-500: #424242;
  --gray-400: #808080;

  --gray-50:  #F8FBFB;
  --gray-100: #F7F7F8;
  --gray-200: #F4F8FC;
  --gray-250: #EAEBEB;
  --gray-300: #E5E5E4;
  --gray-350: #CAC8C8;

  /* Semantic */
  --danger: #FF4F6E;
  --success: #18C27A;
  --warning: #FFB347;

  /* Typography */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Segoe UI", sans-serif;

  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-md: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.375rem;
  --fs-2xl: 1.75rem;

  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  /* Spacing & radii */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  --radius-xs: 0.25rem;
  --radius: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.35);
  --shadow-subtle: 0 12px 30px rgba(15, 23, 42, 0.16);

  --transition-fast: 120ms ease-out;
  --transition-md: 160ms ease-out;

  /* High-contrast text for buttons / chips on dark backgrounds */
  --btn-text-on-dark: #FFFFFF;
  --btn-text-on-bright: #111111;
}
```

### 1.2. Dark theme (default)

```css
:root[data-theme="dark"] {
  --bg: #111111;
  --bg-elevated: #181A1F;
  --bg-soft: #1F2229;

  --text-main: #E7E9EE;    /* ≈15.5:1 vs #111111 */
  --text-muted: #A0A4AF;   /* ≈7.5:1 vs #111111 */
  --text-subtle: #7A7E87;  /* for helper text only */
  --text-invert: #FFFFFF;

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-strong: rgba(255, 255, 255, 0.14);

  /* Primary uses blue-500 */
  --primary: #3475C0;
  --primary-soft: rgba(77, 163, 255, 0.1);
  --primary-hover: #4DA3FF;

  /* Cloudflare accent = shared accent-cf */
  --accent-cf-bg: var(--accent-cf);
  --accent-cf-bg-hover: var(--accent-cf-hover);

  /* Status backgrounds (solid for predictable contrast) */
  --danger-bg: #3D0915;
  --success-bg: #042C1C;
  --warning-bg: #38240A;

  --input-bg: rgba(15, 16, 22, 0.9);
  --input-border: var(--border-subtle);
  --input-border-focus: rgba(77, 163, 255, 0.8);

  --nav-bg: rgba(11, 13, 18, 0.96);
  --sidebar-bg: #101219;
}
```

### 1.3. Light theme

```css
:root[data-theme="light"] {
  --bg: #FFFFFF;
  --bg-elevated: #F7F7F8;
  --bg-soft: #F4F8FC;

  --text-main: #111111;
  --text-muted: #666A73;
  --text-subtle: #8A8F99;
  --text-invert: #FFFFFF;

  --border-subtle: rgba(15, 23, 42, 0.06);
  --border-strong: rgba(15, 23, 42, 0.16);

  /* Primary uses blue-700 */
  --primary: #0055DC;
  --primary-soft: rgba(0, 85, 220, 0.08);
  --primary-hover: #003682; /* even higher contrast */

  /* Cloudflare accent = same accent-cf to keep brand consistent */
  --accent-cf-bg: var(--accent-cf);
  --accent-cf-bg-hover: var(--accent-cf-hover);

  --danger-bg: #FDE6EA;
  --success-bg: #E0F7EE;
  --warning-bg: #FFF1D8;

  --input-bg: #FFFFFF;
  --input-border: var(--border-subtle);
  --input-border-focus: rgba(0, 85, 220, 0.8);

  --nav-bg: rgba(255, 255, 255, 0.92);
  --sidebar-bg: #FFFFFF;
}
```

### 1.4. Elevation & Shadows

We use a simple, consistent elevation system for floating UI elements.

| Token         | Usage                         | Light mode                     | Dark mode                      |
| ------------- | ----------------------------- | ------------------------------ | ------------------------------ |
| `--shadow-sm` | chips, small popups           | `0 2px 8px rgba(0,0,0,0.08)`   | `0 2px 8px rgba(0,0,0,0.35)`   |
| `--shadow-md` | dropdown menus, context menus | `0 6px 18px rgba(0,0,0,0.12)`  | `0 6px 18px rgba(0,0,0,0.45)`  |
| `--shadow-lg` | modals                        | `0 18px 45px rgba(0,0,0,0.25)` | `0 18px 45px rgba(0,0,0,0.65)` |

CSS variables:

```css
:root {
  --shadow-sm-light: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-md-light: 0 6px 18px rgba(0,0,0,0.12);
  --shadow-lg-light: 0 18px 45px rgba(0,0,0,0.25);

  --shadow-sm-dark: 0 2px 8px rgba(0,0,0,0.35);
  --shadow-md-dark: 0 6px 18px rgba(0,0,0,0.45);
  --shadow-lg-dark: 0 18px 45px rgba(0,0,0,0.65);
}
```

Theme-aware aliasing:

```css
:root {
  --shadow-sm: var(--shadow-sm-light);
  --shadow-md: var(--shadow-md-light);
  --shadow-lg: var(--shadow-lg-light);
}

:root[data-theme="dark"] {
  --shadow-sm: var(--shadow-sm-dark);
  --shadow-md: var(--shadow-md-dark);
  --shadow-lg: var(--shadow-lg-dark);
}
```

### 1.5. Theme switch

```js
const root = document.documentElement;

function setTheme(theme) {
  root.dataset.theme = theme; // "dark" | "light"
}

function toggleTheme() {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
}
```

---

## 2. Layout

### 2.1. Spacing & Rhythm

| Токен       | Значение | Использование                                                |
| ----------- | -------- | ------------------------------------------------------------ |
| `--space-1` | 4px      | микро-отступы, иконки, внутренние вспомогательные расстояния |
| `--space-2` | 8px      | стандартный `gap` в флекс-рядах                              |
| `--space-3` | 12px     | вертикальные под-отступы внутри карточек                     |
| `--space-4` | 16px     | базовый внутренний padding                                   |
| `--space-5` | 24px     | расстояние между секциями                                    |
| `--space-6` | 32px     | крупные отступы / паддинги страницы                          |

Семантические слои (завёрнуты в `layout.css`):

* `--page-gutter-desktop / mobile`
* `--section-gap`
* `--block-gap`
* `--stack-gap`
* `--inline-gap`

### 2.2. Page Shell

```css
.page-shell {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--page-gutter-desktop);
  padding-block: var(--space-6);
}

@media (max-width: 768px) {
  .page-shell {
    padding-inline: var(--page-gutter-mobile);
    padding-block: var(--space-4);
  }
}
```

* любой экран не должен иметь собственных левых/правых паддингов;
* все страницы (гайд, index, будущий кабинет) стартуют с `.page-shell`.

### 2.3. Common Patterns

**Page header**

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--inline-gap);
  margin-bottom: var(--section-gap);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

**Controls row (поиск, чипы, фильтры)**

```css
.controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--inline-gap);
  margin-bottom: var(--block-gap);
}

@media (max-width: 768px) {
  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }
}
```

**Stack list**

```css
.stack-list {
  display: flex;
  flex-direction: column;
  gap: var(--block-gap);
}
```

### 2.4. Scrollable Tables

```css
.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.table-scroll > table {
  min-width: 600px;
}
```

Использовать для таблиц, которые шире мобильного экрана. Не уменьшать шрифты и не ломать сетку.

### 2.5. Dashboard Shell

```css
.layout-shell {
  min-height: 100vh;
  background: var(--bg);
}

@media (min-width: 1024px) {
  .layout-shell {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .layout-sidebar {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border-subtle);
    padding: var(--space-5) var(--space-4);
  }

  .layout-main {
    max-width: 1200px;
    margin-inline: auto;
    padding-inline: var(--page-gutter-desktop);
    padding-block: var(--space-6);
  }
}

@media (max-width: 1023px) {
  .layout-shell {
    display: block;
  }

  .layout-sidebar {
    display: none;
  }

  .layout-main {
    padding-inline: var(--page-gutter-mobile);
    padding-block: var(--space-4);
  }
}
```

```html
<div class="layout-shell">
  <aside class="layout-sidebar">…</aside>
  <main class="layout-main">
    <header class="page-header">…</header>
    <section class="controls-row">…</section>
    <section class="stack-list">…</section>
  </main>
</div>
```

### 2.6. Breakpoints

* `sm` — 640px
* `md` — 768px
* `lg` — 1024px
* `xl` — 1280px

### 2.7. Container

```css
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
```

### 2.8. Auth layout

```css
.auth-shell {
  padding: var(--space-6) 0;
}

.auth-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  align-items: start;
}
```

On mobile (`max-width: 640px`) stack header controls and auth actions vertically.

---

## 3. Typography

Base:

```css
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text-main);
  font-family: var(--font-sans);
  font-size: 16px;
}
```

Headings and helpers:

```css
.h1 { font-size: var(--fs-2xl); font-weight: var(--fw-semibold); letter-spacing: -0.02em; }
.h2 { font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
.text-muted { color: var(--text-muted); font-size: var(--fs-sm); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-subtle); font-weight: var(--fw-semibold); font-size: 0.85rem; }
```

Use `.h1` for page titles in the member area and auth hero, `.h2` for section titles. Prefer `.stack-*` utilities instead of ad-hoc margins.

---

## 4. Components

### 4.1. Buttons (contrast-safe)

**Rules:**

* Blue (`.btn-primary`) — default primary actions (Save, Create, Continue).
* **Orange (`.btn-cf`) — Cloudflare-level actions only** (connect account, apply WAF rules, update SSL mode, purge cache, bulk CF rules).
* `.btn-secondary` — neutral secondary actions (Cancel, Details, Filters).
* `.btn-ghost` — quiet actions in toolbars/tertiary areas.
* `.btn-danger` — destructive actions (delete domain, remove rule).

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: var(--radius);
  border: 1px solid transparent;
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  background: transparent;
  color: var(--text-main);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.btn:disabled { opacity: 0.55; cursor: default; pointer-events: none; }

.btn-primary { background: var(--primary); color: var(--btn-text-on-dark); box-shadow: 0 0 0 1px rgba(0,0,0,0.3); }
.btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }

.btn-cf { background: var(--accent-cf-bg); color: var(--btn-text-on-dark); box-shadow: 0 0 0 1px rgba(0,0,0,0.3); }
.btn-cf:hover { background: var(--accent-cf-bg-hover); transform: translateY(-1px); }

.btn-secondary { border-color: var(--border-strong); background: transparent; color: var(--text-main); }
.btn-secondary:hover { background: var(--primary-soft); }

.btn-ghost { border-color: transparent; background: transparent; color: var(--text-main); }
.btn-ghost:hover { color: var(--primary); background: var(--primary-soft); border-color: color-mix(in srgb, var(--primary) 25%, transparent); }

.btn-danger { background: var(--danger); color: var(--btn-text-on-dark); }
.btn-danger:hover { filter: brightness(1.05); }

.btn-sm { padding: 0.35rem 0.7rem; font-size: var(--fs-xs); }
.btn-lg { padding: 0.75rem 1.3rem; font-size: var(--fs-md); }
```

#### Tabs & chips

Chip buttons (`.btn-chip`) sit inside a `.btn-chip-group` container for tab navigation and segmented controls.

#### Chip primary / secondary

`btn-chip--primary` and `btn-chip--secondary` reuse the same color tokens as regular buttons:

- `btn-chip--primary` → `btn--primary` (bg, hover bg, text color)
- `btn-chip--secondary` → `btn--secondary` (border, text, hover bg)

Text and icon colors inside chips do not change on hover:
only the background and/or border colors follow the button states.
Icons are rendered via `<span class="icon" data-icon="mono/...">` and use `currentColor`.

#### Chip buttons with icons

Use `.btn-chip` with inner `.icon` elements from the sprite:

```html
<button class="btn-chip is-active">
  <span class="icon" data-icon="mono/search"></span>
  <span>Search</span>
</button>
```

Icon rules inside chips:

* icon element: `<span class="icon" data-icon="mono/...">`
* size: 16×16 px
* color: inherits `currentColor` from `.btn-chip`
* spacing between icon and text: 8px (0.5rem)

#### Filter / dropdown chips

Use `.btn-chip--dropdown` for filter controls in tables.

```html
<button class="btn-chip btn-chip--dropdown">
  <span class="icon" data-icon="mono/filter"></span>
  <span class="btn-chip__label">Status: Active</span>
  <span class="btn-chip__chevron">
    <span class="icon" data-icon="mono/chevron-down"></span>
  </span>
</button>
```

- Left icon: `mono/filter`
- Right icon: `mono/chevron-down` (swap to `mono/chevron-up` on `.is-open`).
- Icons inherit `currentColor`; the chevron can be muted with `var(--muted)`.
- Active/open state is indicated by `.is-open` modifier (swaps the chevron and outlines the chip).
- Demo-only open state may show a `.table-filter__menu` absolutely positioned under the chip so the toolbar layout doesn't shift.

#### Icon usage inside chips

- Mono icons are always used via `<span class="icon" data-icon="mono/...">`.
- Brand icons via `<span class="icon icon-brand" data-icon="brand/...">`.
- Do not hardcode SVGs or custom `<i>` tags in components.

### 4.2. Form controls

```css
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field-label { font-size: var(--fs-xs); font-weight: var(--fw-medium); color: var(--text-muted); }

.input,
.select,
.textarea {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: var(--radius);
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-main);
  font-size: var(--fs-sm);
  font-family: var(--font-sans);
  outline: none;
  transition:
    border-color var(--transition-md),
    box-shadow var(--transition-md),
    background-color var(--transition-md);
}

.input::placeholder,
.textarea::placeholder { color: var(--text-subtle); }

.input:focus,
.select:focus,
.textarea:focus { border-color: var(--input-border-focus); box-shadow: 0 0 0 1px rgba(77, 163, 255, 0.6); }

.field-error { color: var(--danger); font-size: var(--fs-xs); }
```

Password toggles: wrap input + toggle button in `.password-field` (flex row) with `data-password-field` hook.

### 4.3. Cards / panels

Used in dashboard stats, domain groups, Cloudflare status blocks.

```css
.card,
.panel { background: var(--bg-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); padding: var(--space-4); box-shadow: var(--shadow-subtle); }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.card-title { font-size: var(--fs-md); font-weight: var(--fw-semibold); }
.card-subtitle { font-size: var(--fs-sm); color: var(--text-muted); }
.card-footer { margin-top: var(--space-4); display: flex; justify-content: flex-end; gap: var(--space-2); }
.card-section { padding: var(--space-4) 0 0; border-top: 1px solid var(--border-subtle); margin-top: var(--space-4); }
.card-section:first-child { border-top: none; margin-top: 0; padding-top: 0; }
.card--emphasis { border-color: color-mix(in srgb, var(--primary) 35%, transparent); background: color-mix(in srgb, var(--bg-elevated) 70%, var(--primary-soft)); }
```

### 4.4. Tables

Primary use: domains list, Cloudflare zones, rulesets, logs.

```css
.table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.table thead { background: var(--bg-soft); }
.table th,
.table td { padding: 0.6rem 0.75rem; text-align: left; }
.table th { font-weight: var(--fw-medium); color: var(--text-muted); border-bottom: 1px solid var(--border-strong); }
.table tbody tr { border-bottom: 1px solid var(--border-subtle); }
.table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }

.table-wrapper { overflow-x: auto; width: 100%; }
.table--domains { min-width: 720px; }
.table__th-actions, .table__cell-actions { width: 1%; white-space: nowrap; text-align: right; }
.btn-chip-group.table-controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.table-filter { position: relative; }
.btn-chip__icon, .btn-chip__chevron { display: inline-flex; align-items: center; justify-content: center; }
.btn-chip__label { white-space: nowrap; }
.btn-chip--dropdown { display: inline-flex; align-items: center; gap: 0.35rem; padding-inline: 0.75rem; border-color: var(--border-subtle); background: var(--bg-elevated); color: var(--text-main); }
.btn-chip--input { display: inline-flex; align-items: center; gap: 0.5rem; padding-inline: 0.75rem; background: var(--bg-elevated); border-color: var(--border-subtle); color: var(--text-main); }
.btn-chip--input:focus-within { border-color: var(--input-border-focus); box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 40%, transparent); }
.btn-chip--primary { background: var(--primary); border-color: color-mix(in srgb, var(--primary) 45%, transparent); color: var(--btn-text-on-dark); }
.btn-chip--primary:hover { background: var(--primary-hover); }
.table-search { flex: 1 1 16rem; min-width: 0; display: inline-flex; align-items: center; gap: 0.5rem; padding-inline: 0.75rem; color: var(--text); }
.table-search__input { flex: 1 1 auto; background: transparent; border: none; color: var(--text); font: inherit; width: 100%; outline: none; }
.table-search__input::placeholder { color: var(--muted); }
.table-search__clear { display: none; background: transparent; border: none; padding: 0; align-items: center; justify-content: center; }
.table-search__clear .icon { color: var(--muted); }
.table-search--active .table-search__clear { display: inline-flex; }
.dropdown { position: relative; display: inline-block; }
.dropdown__menu { position: absolute; top: calc(100% + 0.35rem); right: 0; min-width: 220px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--r); padding: var(--space-2) 0; display: none; box-shadow: var(--shadow-soft); }
.dropdown--open .dropdown__menu { display: block; }
.table-filter__menu { position: absolute; top: calc(100% + 0.25rem); left: 0; z-index: 20; min-width: 11rem; padding: 0.25rem 0; border-radius: var(--r-lg); background: var(--panel); border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: var(--shadow-md); }
.dropdown__item { display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3); background: transparent; border: none; color: var(--text); font-size: var(--fs-sm); text-align: left; }
.dropdown__item--danger { color: var(--danger); }
.link-button { display: inline-flex; gap: var(--space-2); align-items: center; background: transparent; border: none; color: var(--primary); font-size: var(--fs-sm); }
.link-button--sm { font-size: var(--fs-xs); }
```

#### Dropdown elevation

Dropdown menus use `--shadow-md` elevation:

```html
<div class="btn-chip btn-chip--dropdown is-open">
  <span class="icon" data-icon="mono/filter"></span>
  <span>Status: Active</span>
  <span class="icon" data-icon="mono/chevron-up"></span>
</div>

<div class="table-filter__menu">
  ...
</div>
```

#### Table controls as chips

Table controls in the `Tables` section always reuse `.btn-chip` variants:

- search → `btn-chip btn-chip--input` + `search` / `close` icons
- filters → `btn-chip btn-chip--dropdown` + `filter` + `chevron-down`
- primary action → `btn-chip btn-chip--primary` + `plus`

Filter menus stay visually attached to their trigger chip without changing the toolbar layout thanks to `.table-filter__menu { position: absolute; }` in the demo.

Allowed icons:

- Search prefix: `search`
- Clear search: `close`
- Filter prefix: `filter`
- Dropdown indicator: `chevron-down` / `chevron-up`
- Add domain: `plus`

#### 4.4.1. Domains table reference

* Responsive rule: keep `.table--domains` at `min-width: 720px` and wrap in `.table-wrapper` for horizontal scroll on mobile (no card collapse).
* Actions live inside a dropdown menu; provider column shows only `cloudflare`, `namecheap`, `namesilo` brand icons.
* Status/expiry stays in one column, SSL mode and Zone ID surface through the dropdown actions only.

Example toolbar + table markup:

```html
  <div class="btn-chip-group table-controls">
    <div class="btn-chip btn-chip--input table-search" data-table-search>
      <span class="icon" data-icon="mono/search"></span>
      <input type="search" class="table-search__input" placeholder="Search by domain, project or account..." />
      <button class="table-search__clear" type="button" aria-label="Clear search">
        <span class="icon" data-icon="mono/close"></span>
      </button>
    </div>

  <div class="table-filter">
    <button class="btn-chip btn-chip--dropdown is-open" type="button">
      <span class="icon" data-icon="mono/filter"></span>
      <span class="btn-chip__label">Status: Active</span>
      <span class="btn-chip__chevron"><span class="icon" data-icon="mono/chevron-up"></span></span>
    </button>
    <div class="table-filter__menu">
      <button class="dropdown__item" type="button">All statuses</button>
      <button class="dropdown__item" type="button">Active only</button>
      <button class="dropdown__item" type="button">Paused</button>
      <button class="dropdown__item" type="button">DNS error</button>
    </div>
  </div>

  <button class="btn-chip btn-chip--dropdown" type="button">
    <span class="icon" data-icon="mono/filter"></span>
    <span class="btn-chip__label">Provider</span>
    <span class="btn-chip__chevron"><span class="icon" data-icon="mono/chevron-down"></span></span>
  </button>

  <button class="btn-chip btn-chip--primary" type="button">
    <span class="icon" data-icon="mono/plus"></span>
    <span>Add domain</span>
  </button>
</div>

<div class="table-wrapper">
  <table class="table table--domains">
    <thead>
      <tr>
        <th>Domain</th><th>Project</th><th>Status / Expiry</th><th>Provider</th><th class="table__th-actions"></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="domain-cell">
            <span class="domain-cell__name">example.com</span>
            <div class="domain-cell__meta">
              <span class="icon icon-brand" data-icon="brand/cloudflare"></span>
              <span class="text-muted">main-account</span>
              <span class="badge badge--pill">TDS</span>
            </div>
          </div>
        </td>
        <td><button class="link-button link-button--sm"><span class="icon" data-icon="mono/project"></span>Main project</button></td>
        <td><span class="badge badge--success">Active</span><div class="text-muted text-xs">Exp: 2026-03-21</div></td>
        <td><span class="provider-label"><span class="icon icon-brand" data-icon="brand/cloudflare"></span>Cloudflare</span></td>
        <td class="table__cell-actions">
          <div class="dropdown" data-dropdown>
            <button class="btn-icon btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" aria-expanded="false">
              <span class="icon" data-icon="mono/dots-vertical"></span>
            </button>
            <div class="dropdown__menu dropdown__menu--align-right" role="menu">
              <button class="dropdown__item"><span class="icon" data-icon="mono/eye"></span><span>View details</span></button>
              <button class="dropdown__item"><span class="icon" data-icon="mono/logs"></span><span>Open logs</span></button>
              <button class="dropdown__item"><span class="icon" data-icon="mono/sync"></span><span>Sync with provider</span></button>
              <button class="dropdown__item"><span class="icon" data-icon="mono/copy"></span><span>Copy Zone ID</span></button>
              <button class="dropdown__item"><span class="icon" data-icon="mono/pencil-circle"></span><span>Edit domain</span></button>
              <button class="dropdown__item dropdown__item--danger"><span class="icon" data-icon="mono/delete"></span><span>Delete</span></button>
            </div>
          </div>
        </td>
      </tr>
      <!-- other rows -->
    </tbody>
  </table>
</div>
```

Icon budget for this block: `mono/search`, `mono/close`, `mono/filter`, `mono/chevron-down`, `mono/plus`, `mono/dots-vertical`, `mono/eye`, `mono/logs`, `mono/sync`, `mono/copy`, `mono/pencil-circle`, `mono/delete`, `mono/check-status`; providers: `brand/cloudflare`, `brand/namecheap`, `brand/namesilo`.

### Dropdown action icons (domains table)

| Action             | Icon |
|--------------------|------|
| View details       | eye  |
| Open logs          | logs |
| Sync with provider | sync |
| Copy Zone ID       | copy |
| Edit domain        | pencil-circle |
| Delete             | delete |

Only this set is allowed for dropdown actions across all tables.

### Table controls · Icon mapping

- Search prefix: search  
- Clear search: close  
- Filter chip prefix: filter  
- Chip dropdown arrow: chevron-down  
- Primary action ("Add domain"): plus  

### Provider icons (domains table)

- Cloudflare → icon-cloudflare (brand)
- Namecheap → icon-namecheap (brand)
- NameSilo → icon-namesilo (brand)
- Manual DNS → icon-dns (mono)

### 4.5. Navigation shell

Header (`.site-header`) uses a blurred background with a thin border. Primary nav links are inline, theme switch is a ghost button, language selector uses `.btn-chip-group`.

```css
.site-header { border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--bg) 80%, var(--bg-elevated)); }
.header-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; }
.brand { display: inline-flex; align-items: center; gap: 0.6rem; font-size: 1.25rem; font-weight: var(--fw-semibold); text-decoration: none; color: var(--text-main); }
.nav-links { display: flex; align-items: center; gap: 1rem; font-size: 0.95rem; }
.nav-links a { color: var(--text-main); text-decoration: none; padding: 0.35rem 0.75rem; border-radius: var(--radius); border: 1px solid transparent; transition: color var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast); }
.nav-links a:hover { color: var(--primary); border-color: var(--border-subtle); background: var(--bg-soft); }
.btn-chip-group { display: inline-flex; padding: 2px; border-radius: 999px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); gap: 2px; }
.btn-chip { border-radius: 999px; border: 1px solid transparent; background: transparent; color: var(--text-subtle); font-size: 0.9rem; padding: 0.3rem 0.9rem; cursor: pointer; transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast); }
.btn-chip:hover { color: var(--text-main); background: var(--bg-soft); border-color: var(--border-subtle); }
.btn-chip.is-active { color: var(--btn-text-on-dark); background: var(--primary); border-color: var(--primary); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28); }
```

---

## 5. Auth experience

* Tabs (`.auth-tabs`) reuse the chip group; keep the active item fully filled.
* Forms live inside `.auth-card` with `gap: var(--space-4)`.
* Social buttons use `.auth-social-btn` with brand-specific skins for Google/GitHub.
* `.app-alert` is the global status banner. Align with `.page-shell` gutters via `.app-alert__inner`, keep `padding-block: var(--space-3)` and `margin-bottom: var(--block-gap)`; color via modifiers `.app-alert--success | .app-alert--error | .app-alert--info`.

---

## 6. Cloudflare-specific UI rules

* **Orange buttons (`.btn-cf`) are reserved for Cloudflare actions only.**
  * Good: `Connect Cloudflare account`, `Sync zones`, `Apply Cloudflare security rules`, `Purge Cloudflare cache`, `Update SSL mode`.
  * Bad: generic `Save`, `Next`, `Create project` → use blue (`.btn-primary`) instead.
* Cloudflare states should use `.badge-cf` or `.badge-success` depending on context.
* Screens that are “Cloudflare-heavy” (WAF, cache presets) may use subtle orange highlights, but avoid full orange backgrounds — keep the minimal SaaS feel and contrast predictable.

---

## 7. Accessibility notes

* Main text colors (`--text-main`, `--text-muted`) and button labels (`.btn-primary`, `.btn-cf`) are tuned to meet **WCAG AA** contrast targets on their backgrounds.
* Avoid changing `--primary`, `--accent-cf`, and `--text-main` without re-checking contrast (e.g. via any WCAG contrast tool).
* Use `.text-muted` for secondary information, not for critical content.
* For long paragraphs on colored backgrounds, prefer solid backgrounds from `--bg`, `--bg-elevated`, `--bg-soft` rather than semi-transparent overlays.
