# 301.st UI Style Guide

Design system for **301.st** (marketing front + member area).

Goals:

- clear visual language for redirect / domains / Cloudflare management;
- consistent dark & light themes;
- strong contrast (WCAG AA / Google Material baseline);
- orange CTAs reserved for **Cloudflare-level** actions.

---

## 1. Themes & tokens

We use CSS custom properties (`--token`) and a theme switch via  
`<html data-theme="dark">` / `<html data-theme="light">`.

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

  /*
    Cloudflare CTA accent.

    Chosen to keep CF vibe but pass WCAG AA with WHITE text:
    - #C24F00 on #FFFFFF ≈ 4.76:1
    - #C24F00 on #000000 ≈ 4.41:1
  */
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
````

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

  /*
    Primary uses blue-500:
    - #3475C0 with white text ≈ 4.72:1 (AA for normal text).
  */
  --primary: #3475C0;
  --primary-soft: rgba(77, 163, 255, 0.1);
  --primary-hover: #4DA3FF;

  /*
    Cloudflare accent = shared accent-cf.
    White text passes AA.
  */
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

  /*
    Primary uses blue-700:
    - #0055DC with white text ≈ 6.30:1 (AA).
  */
  --primary: #0055DC;
  --primary-soft: rgba(0, 85, 220, 0.08);
  --primary-hover: #003682; /* even higher contrast */

  /*
    Cloudflare accent = same accent-cf to keep brand consistent.
  */
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

### 2.1. Breakpoints (Tailwind-compatible)

* `sm` — 640px
* `md` — 768px
* `lg` — 1024px
* `xl` — 1280px
* `2xl` — 1536px

### 2.2. Container

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-5);
}
```

### 2.3. Member area layout

```css
.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
}
```

Sidebar: left, fixed width.
Content: right, scrollable, padding `var(--space-5)`.

On mobile (`max-width: 960px`), sidebar can be hidden or replaced with a drawer.

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

Headings:

```css
.h1 {
  font-size: var(--fs-2xl);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.02em;
}

.h2 {
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
}

.text-muted {
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
```

Use `.h1` for page titles in the member area and marketing hero, `.h2` for section titles.

---

## 4. Components

### 4.1. Buttons (contrast-safe)

**Contrast targets:**

* Normal-size labels (~14–16px): aim for ≥ 4.5:1.
* We use **white text on blues and CF orange**, tuned for AA.

**Rules:**

* Blue (`.btn-primary`) — default primary actions (Save, Create, Continue).
* **Orange (`.btn-cf`) — Cloudflare-level actions only**
  (connect account, apply WAF rules, update SSL mode, purge cache, bulk CF rules).
* `.btn-secondary` — neutral secondary actions (Cancel, Details, Filters).
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

.btn:disabled {
  opacity: 0.55;
  cursor: default;
  pointer-events: none;
}

/* Primary (blue) — white text AA-OK on both themes */
.btn-primary {
  background: var(--primary);
  color: var(--btn-text-on-dark);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
}
.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

/* Cloudflare actions (orange) — white text AA-OK */
.btn-cf {
  background: var(--accent-cf-bg);
  color: var(--btn-text-on-dark);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
}
.btn-cf:hover {
  background: var(--accent-cf-bg-hover);
  transform: translateY(-1px);
}

/* Secondary */
.btn-secondary {
  border-color: var(--border-strong);
  background: transparent;
  color: var(--text-main);
}
.btn-secondary:hover {
  background: var(--primary-soft);
}

/* Danger */
.btn-danger {
  background: var(--danger);
  color: var(--btn-text-on-dark);
}
.btn-danger:hover {
  filter: brightness(1.05);
}

/* Sizes */
.btn-sm { padding: 0.35rem 0.7rem; font-size: var(--fs-xs); }
.btn-lg { padding: 0.75rem 1.3rem; font-size: var(--fs-md); }
```

**Cloudflare usage examples:**

```html
<button class="btn btn-cf">Connect Cloudflare account</button>
<button class="btn btn-cf btn-sm">Apply Cloudflare security rules</button>
<button class="btn btn-primary">Save settings</button>
```

---

### 4.2. Form controls

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  color: var(--text-muted);
}

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
.textarea::placeholder {
  color: var(--text-subtle);
}

.input:focus,
.select:focus,
.textarea:focus {
  border-color: var(--input-border-focus);
  box-shadow: 0 0 0 1px rgba(77, 163, 255, 0.6);
}

.field-error {
  color: var(--danger);
  font-size: var(--fs-xs);
}
```

---

### 4.3. Cards

Used in the dashboard for stats, domain groups, Cloudflare status blocks, etc.

```css
.card {
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  padding: var(--space-4);
  box-shadow: var(--shadow-subtle);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.card-title {
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
}

.card-subtitle {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.card-footer {
  margin-top: var(--space-4);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
```

---

### 4.4. Tables

Primary use: domains list, Cloudflare zones, rulesets, logs.

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

.table thead {
  background: var(--bg-soft);
}

.table th,
.table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
}

.table th {
  font-weight: var(--fw-medium);
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-strong);
}

.table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
}

.table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}
```

---

### 4.5. Badges (statuses)

Badge text colours are chosen to keep at least a ~3:1 contrast against their backgrounds; use for short labels, not for long body text.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  border: 1px solid transparent;
}

/* Neutral / muted status (expired, inactive) */
.badge-muted {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-subtle);
  border-color: rgba(148, 163, 184, 0.35);
}

/* Success (active domain, healthy config) */
.badge-success {
  background: var(--success-bg);
  color: var(--success);
  border-color: rgba(24, 194, 122, 0.7);
}

/* Danger (errors) */
.badge-danger {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(255, 79, 110, 0.7);
}

/* Cloudflare-related status */
.badge-cf {
  background: var(--accent-cf-soft);
  color: var(--accent-cf);
  border-color: rgba(194, 79, 0, 0.7);
}
```

Usage:

* `.badge-success` — active domain / valid config.
* `.badge-muted` — expired / inactive.
* `.badge-cf` — Cloudflare-related status: “WAF + Cache”, “Rulesets applied”, etc.

---

### 4.6. Alerts

```css
.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  border: 1px solid transparent;
  font-size: var(--fs-sm);
}

.alert-title {
  font-weight: var(--fw-medium);
  margin-bottom: 0.1rem;
}

.alert-info {
  background: var(--primary-soft);
  border-color: rgba(77, 163, 255, 0.6);
  color: var(--text-main);
}

.alert-success {
  background: var(--success-bg);
  border-color: rgba(24, 194, 122, 0.7);
  color: var(--text-main);
}

.alert-danger {
  background: var(--danger-bg);
  border-color: rgba(255, 79, 110, 0.8);
  color: var(--text-main);
}
```

---

### 4.7. Navigation

Top bar:

```css
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem var(--space-5);
  background: var(--nav-bg);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border-subtle);
}
```

Sidebar:

```css
.sidebar {
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-subtle);
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  text-decoration: none;
  transition: background-color var(--transition-fast),
              color var(--transition-fast);
}

.sidebar-link:hover {
  background: var(--primary-soft);
  color: var(--text-main);
}

.sidebar-link[data-active="true"] {
  background: var(--primary-soft);
  color: var(--primary-hover);
}
```

---

## 5. Cloudflare-specific UI rules

* **Orange buttons (`.btn-cf`) are reserved for Cloudflare actions only.**

  * Good: `Connect Cloudflare account`, `Sync zones`, `Apply Cloudflare security rules`, `Purge Cloudflare cache`, `Update SSL mode`.
  * Bad: generic `Save`, `Next`, `Create project` → use blue (`.btn-primary`) instead.
* Cloudflare states should use `.badge-cf` or `.badge-success` depending on context.
* Screens that are “Cloudflare-heavy” (WAF, cache presets) may use subtle orange highlights, but avoid full orange backgrounds — keep the minimal SaaS feel and contrast predictable.

---

## 6. Tailwind integration (optional)

Example `tailwind.config.js` snippet:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--bg-elevated)",
        primary: "var(--primary)",
        accent: "var(--accent-cf)",
        text: {
          main: "var(--text-main)",
          muted: "var(--text-muted)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
    },
  },
};
```

---

## 7. Accessibility notes

* Main text colors (`--text-main`, `--text-muted`) and button labels (`.btn-primary`, `.btn-cf`) are tuned to meet **WCAG AA** contrast targets on their backgrounds.
* Avoid changing `--primary`, `--accent-cf`, and `--text-main` without re-checking contrast (e.g. via any WCAG contrast tool).
* Use `.text-muted` for secondary information, not for critical content.
* For long paragraphs on colored backgrounds, prefer solid backgrounds from `--bg`, `--bg-elevated`, `--bg-soft` rather than semi-transparent overlays.

