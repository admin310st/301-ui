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

### 1.4. Theme switch

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

### 2.1. Breakpoints

* `sm` — 640px
* `md` — 768px
* `lg` — 1024px
* `xl` — 1280px

### 2.2. Container

```css
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
```

### 2.3. Auth layout

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
```

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
* `.global-notice` is the top sticky status banner. Use `data-type="success" | "error" | "info"` to color it.

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
