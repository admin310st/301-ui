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

  /* Unified control system radii */
  --r-pill: 999px;        /* For buttons, chips, toggles */
  --r-field: 0.75rem;     /* For inputs, textareas */

  --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.35);
  --shadow-subtle: 0 12px 30px rgba(15, 23, 42, 0.16);

  --transition-fast: 120ms ease-out;
  --transition-md: 160ms ease-out;

  /* High-contrast text for buttons / chips on dark backgrounds */
  --btn-text-on-dark: #FFFFFF;
  --btn-text-on-bright: #111111;
}
```

#### Border Radius Guidelines

Use consistent border-radius tokens across all components:

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 0.25rem | Small badges, tiny UI elements |
| `--radius` | 0.5rem | Dropdown menus, tooltips, modals |
| `--radius-lg` | 0.75rem | **Cards, panels, large containers** |
| `--radius-xl` | 1rem | Hero sections, featured blocks |
| `--r-pill` | 999px | **Buttons, chips, toggles** (unified control system) |
| `--r-field` | 0.75rem | **Inputs, textareas** (unified control system) |

**Key Rules:**
- All `.card--panel` elements → `border-radius: var(--radius-lg)`
- All `.btn`, `.btn-chip` → `border-radius: var(--r-pill)`
- All `.input`, `.textarea` → `border-radius: var(--r-field)`
- Dropdowns and menus → `border-radius: var(--radius)`

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

### 1.4. Unified Control System

All interactive UI elements share the same sizing recipe:

* Buttons (primary, ghost, danger, social)
* Chips (filter, provider, table chips)
* Table search bar
* Auth tabs
* Input fields used in forms

**Height formula**

Height = `font-size × line-height + padding × 2`
→ **No fixed pixel heights in the system.**

**Mobile rules**

* Icons inside controls are `1.25em` (scale with font size, no px icons).
* Variants never change padding or height; responsive tweaks adjust only layout/wrapping, not control dimensions.

**Rule**

Changing the design system requires updating:

1. Global tokens
2. Component recipes
3. **Every demo page**
4. **Every real page that uses these components**

Old markup or legacy paddings are *not allowed* once change is applied.

### 1.5. Elevation & Shadows

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

* **Assets from root**: все примеры в гайде используют абсолютные пути (`/img/...`). Любые относительные или с префиксом `/static/` — ошибка сборки/верстки.

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

Header content must use the same page container: wrap header rows with `.page-shell` (and `.page-header` for the top row). Background may be full-bleed, inner content aligns to the page grid.

### 2.2. Page Shell

**Все страницы используют `.page-shell` как базовый контейнер**, но с разными правилами padding в зависимости от типа страницы.

#### Public Pages (index.html, about.html, etc.)

Стандартный `.page-shell` с padding для читаемости:

```css
.page-shell {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--page-gutter-desktop);  /* var(--space-5) = 1.5rem */
  padding-block: var(--space-6);
}

@media (max-width: 768px) {
  .page-shell {
    padding-inline: var(--page-gutter-mobile);  /* var(--space-4) = 1rem */
    padding-block: var(--space-4);
  }
}
```

#### Dashboard Pages (dashboard.html, domains.html, wizard.html, etc.)

Dashboard использует `.page-shell.dashboard-shell` **БЕЗ padding на desktop** — sidebar и grid обеспечивают визуальное разделение, таблицы и контент разворачиваются на полную ширину.

**Централизовано в `layout.css`:**

```css
/* Desktop: remove padding to let content expand fully */
@media (min-width: 1024px) {
  .page-shell.dashboard-shell {
    padding-inline: 0;
    padding-block: 0;
  }
}
```

**Tablet (768px-1023px):** добавляется умеренный padding в `site.css`:

```css
@media (min-width: 768px) and (max-width: 1023px) {
  .page-shell.dashboard-shell {
    padding-inline: var(--space-4);  /* 1rem для комфорта */
  }
}
```

**Mobile (<768px):** padding убран — контент управляет собственными отступами.

#### Ключевые правила

* **Любой экран не должен иметь собственных левых/правых padding** — используйте `.page-shell`
* **Public pages:** padding обеспечивает читаемость и центрирование
* **Dashboard pages:** padding убран на desktop (≥1024px), grid и sidebar управляют spacing
* **Header content** использует тот же контейнер: wrap header rows with `.page-shell`

### 2.3. Common Patterns

**Header stack.** Primary header (brand, nav, language/theme). Utility bar (user context, secondary actions). Utility bar may be hidden for anonymous users.

**Utility-bar: visibility rules.**

* Before login show only **Help** on the right side.
* After login show **Notifications**, **User chip**, **Log out**.
* Use `data-onlogin` / `data-onlogout` attributes to control visibility; bind them to your auth state.
* Notification button is a **plain icon only** (no popovers/counters in the demo).
* Mono icons in the header must rely on `currentColor` to support dark/light themes.

Пример разметки:

```html
<div class="utility-right">
  <!-- Всегда доступно (до/после логина) -->
  <a class="btn btn--ghost" href="#help" data-i18n="nav.help">Help</a>

  <!-- Только после логина -->
  <button class="btn-icon btn-icon--compact" type="button" aria-label="Notifications" data-onlogin>
    <span class="icon" data-icon="mono/bell"></span>
  </button>

  <button class="btn-chip btn-chip--input" type="button" data-onlogin aria-label="User">
    <span class="btn-chip__icon" data-icon="mono/user"></span>
    <span class="btn-chip__label" data-user-name>Guest</span>
  </button>

  <button class="btn btn--ghost" data-onlogin data-action="logout" data-i18n="auth.logout">Log out</button>
</div>
```

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

Table Search Bar и дефолтные фильтры располагаются в панели controls-row **над таблицей**. Внутри заголовков таблицы остаются только компактные чипы для сортировок и локальных действий — поисковый инпут в `<th>` не допускается.

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

Dashboard layout uses a responsive grid system with collapsible sidebar navigation.

**Desktop (≥1024px):** Two-column grid with sticky sidebar
**Mobile (≤1023px):** Single column with drawer overlay sidebar

```html
<main class="page-shell dashboard-shell">
  {{> sidebar}}
  <section class="dashboard-content">
    <header class="page-header">…</header>
    <!-- Page content -->
  </section>
</main>
```

#### Desktop Layout

```css
.dashboard-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;  /* 280px default */
  grid-template-areas: "sidebar content";
  gap: var(--dashboard-gap);  /* 1.5rem default */
  min-height: calc(100dvh - var(--header-height) - var(--footer-height));
}

.sidebar {
  grid-area: sidebar;
  position: sticky;
  top: var(--header-height);
  height: calc(100dvh - var(--header-height));
  background: var(--panel);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dashboard-content {
  grid-area: content;
  min-width: 0;  /* Prevent grid blowout */
  width: 100%;
}

/* Collapsed state */
body.sidebar-collapsed .dashboard-shell {
  grid-template-columns: var(--sidebar-width-collapsed) 1fr;  /* 64px */
}
```

#### Mobile Layout

On mobile (≤1023px), sidebar becomes an overlay drawer:

```css
@media (max-width: 1023px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
    grid-template-areas: "content";
    gap: 0;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: var(--sidebar-width);
    z-index: var(--z-sidebar);
    transform: translateX(-100%);  /* Hidden by default */
    transition: transform 300ms ease-in-out;
  }

  /* Open state triggered by burger button */
  body.sidebar-open .sidebar {
    transform: translateX(0);
  }

  /* Dark overlay when sidebar is open */
  body.sidebar-open::before {
    content: '';
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--z-sidebar-overlay);
  }

  /* Add horizontal padding to content on mobile */
  .dashboard-content {
    padding-inline: var(--space-3);  /* 12px */
  }
}
```

**Key CSS Variables:**

- `--sidebar-width: 280px` (default desktop)
- `--sidebar-width-collapsed: 64px` (collapsed state)
- `--dashboard-gap: 1.5rem` (space between sidebar and content)
- `--z-sidebar: 1000` (sidebar z-index)
- `--z-sidebar-overlay: 999` (backdrop overlay)

**Responsive Breakpoints:**

- **1280px+**: Full layout, `--sidebar-width: 280px`
- **1024-1279px**: Compact, `--sidebar-width: 240px`, `--dashboard-gap: 1rem`
- **≤1023px**: Mobile drawer mode

#### Notes

- **Layout centralized in `layout.css`**: `.page-shell.dashboard-shell` has NO padding on desktop (≥1024px) — see section 2.2 "Dashboard Pages" for full breakpoint details
- **Desktop (≥1024px)**: No padding — sidebar + grid gap provide visual separation, tables expand fully
- **Tablet (768-1023px)**: `padding-inline: var(--space-4)` — comfortable spacing
- **Mobile (<768px)**: No padding — `.dashboard-content` adds `padding-inline: var(--space-3)` to prevent edge sticking
- **Sidebar partial**: `{{> sidebar}}` (defined in `partials/sidebar.hbs`)
- **Burger menu**: `.burger-button` only visible on dashboard pages at mobile breakpoint

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
.eyebrow { /* Deprecated: use .badge in breadcrumbs instead */ }
```

Use `.h1` for page titles in the member area and auth hero, `.h2` for section titles. Prefer `.stack-*` utilities instead of ad-hoc margins.

**Page status indicators:** Use `.badge` in breadcrumbs instead of `.eyebrow` in page header. Available variants:
- `badge--success` for Production
- `badge--brand` for Beta/Preview
- `badge--neutral` for Demo/Staging
- `badge--danger` for Deprecated/Warning

**Domain & redirect status badges:** Use semantic colors for operational states:
- `badge--primary` (blue) — **Enabled** (domain/redirect is enabled but not yet active/synced)
- `badge--success` (green) — **Active** (redirect is synced and working)
- `badge--neutral` (gray) — **Disabled** (domain/redirect is turned off), **No redirect**
- `badge--warning` (orange) — **Pending** (sync in progress, awaiting propagation)
- `badge--danger` (red) — **Error** (sync failed, DNS error, expired)

This color scheme applies to domains table, redirects table, TDS streams, and all other operational status indicators throughout the member area.

---

## 4. Components

### 4.1. Buttons (contrast-safe)

**Rules:**

* Modifiers follow BEM: `.btn btn--{primary|ghost|danger|social}`; legacy `.btn-ghost`/`.btn-danger` are deprecated.
* `.btn.btn--primary` — default primary actions (Save, Create, Continue).
* `.btn.btn--cf` — Cloudflare-level CTAs only (connect account, verify token, purge cache, apply WAF/SSL rules).
* `.btn.btn--ghost` — neutral/secondary actions (cancel, filters, toolbar toggles).
* `.btn.btn--danger` — destructive actions.
* `.btn.btn--social` — OAuth starts; layout = icon + left-aligned label, same height as other controls.

Buttons use explicit size modifiers: `.btn--sm`, `.btn--md`, `.btn--lg`. `btn--md` is the default and must match `.btn-chip` height so chips, search bars and primary buttons align inside toolbars. Use `btn--md` for all table headers; reserve `btn--lg` for hero/landing layouts. Chip buttons also support `.btn-chip--sm` for compact inline controls (e.g., drawer detail rows).

```html
<button class="btn btn--primary btn--md">Sign in</button>
<button class="btn btn--ghost btn--md">Cancel</button>
<button class="btn btn--danger btn--md">Delete</button>
```

❗ Variants must never alter padding/height. Do not hard-code button heights or paddings per screen; rely on `.btn--*` size modifiers + shared control tokens.

Icons inside buttons use `1.25em` sizing with `stroke="currentColor"` / `fill="none"` so they stay legible in both themes.

#### Tabs & chips

Tabs, filters and table chips reuse the same `.btn-chip` component and the shared control recipe. Do not create alternate chip paddings or heights; the auth tabs, table filter chips and toolbar filters must look like a single family of controls.

#### Table chips / action chips (Table Controls & Chips)

**Разметка для всех чипов:**

```html
<button class="btn-chip btn-chip--variant">
  <span class="btn-chip__icon" data-icon="..."></span>     <!-- optional -->
  <span class="btn-chip__label">Label text</span>           <!-- required -->
  <span class="btn-chip__chevron" data-icon="mono/chevron-down"></span> <!-- optional -->
</button>
```

Базовые правила:

* высота выводится из рецепта `font-size × line-height + 2 × paddingY`;
* фон: `var(--bg-elevated)`;
* текст: `var(--text-main)`;
* иконки — только через `.btn-chip__icon` / `.btn-chip__chevron` с `1.25em` SVG в `currentColor`;
* `padding-inline: var(--control-pad-x)` (вертикальный паддинг считаем через `--control-pad-y`);
* скругление: `var(--control-radius)`.

Варианты (`btn-chip--*`):

| Вариант              | Использование         | Описание                                                 |
| -------------------- | --------------------- | -------------------------------------------------------- |
| `btn-chip--dropdown` | фильтры со стрелкой   | Добавляет chevron справа; управление обёрнуто в Table Search Bar markup |
| `btn-chip--cf`       | Cloudflare provider   | Цвет фона = `--accent-cf-bg`, текст = `--accent-cf-text` |
| `btn-chip--status`   | Active/Paused/Expired | Цвет фона по статусу (`--status-active`, …)              |
| `btn-chip--primary`  | основной акцент       | Использует токены primary                                |
| `btn-chip--sm`       | компактные inline чипы | Уменьшенная версия для drawer detail rows, масштаб `--control-scale-sm` (0.9) |

Toolbar with chips **должен** переиспользовать разметку Table Search Bar целиком (search + clear button) — форы и «альтернативные» инпуты запрещены. Любые новые состояния добавляем в компонент и копируем в демо.

> Toolbar uses exact classes:
> • Search = `.table-search`
> • Dropdown filter = `.btn-chip.btn-chip--dropdown`
> • Provider/action chip = `.btn-chip…` (brand variant allowed)
> • Primary action = `.btn.btn--primary`
> **Do not** use `.btn` for chips, and do not fork the search markup.

Dropdown chip pattern:

```html
<button class="btn-chip btn-chip--dropdown" type="button">
  <span class="icon" data-icon="mono/filter"></span>
  Status: Active
  <span class="icon" data-icon="mono/chevron-down"></span>
</button>

<div class="table-filter__menu">
  <button class="dropdown__item is-active" type="button">All statuses</button>
  <button class="dropdown__item" type="button">Active only</button>
  <button class="dropdown__item" type="button">Paused</button>
  <button class="dropdown__item" type="button">DNS error</button>
</div>
```

Toolbar example combining the real components (search bar + dropdown chip + Cloudflare chip + primary button). All four controls share the unified control recipe; do not introduce custom paddings or heights on individual buttons:

```html
<div class="controls-row table-controls">
  <div class="table-search" data-table-search>
    <span class="icon" data-icon="mono/search"></span>
    <input type="text" class="table-search__input" placeholder="Search by domain, project or account…" />
    <button class="table-search__clear" type="button" aria-label="Clear">
      <span class="icon" data-icon="mono/close"></span>
    </button>
  </div>

  <div class="table-filter" data-demo="status-filter">
    <button class="btn-chip btn-chip--dropdown" type="button" aria-expanded="false">
      <span class="icon" data-icon="mono/filter"></span>
      Status: Active
      <span class="icon" data-icon="mono/chevron-down"></span>
    </button>

    <div class="table-filter__menu" hidden>
      <button class="dropdown__item is-active" type="button">All statuses</button>
      <button class="dropdown__item" type="button">Active only</button>
      <button class="dropdown__item" type="button">Paused</button>
      <button class="dropdown__item" type="button">DNS error</button>
    </div>
  </div>

  <button class="btn-chip btn-chip--cf" type="button">
    <span class="icon" data-icon="brand/cloudflare"></span>
    Cloudflare
  </button>

  <button class="btn btn--primary" type="button">
    <span class="icon" data-icon="mono/plus"></span>
    Add domain
  </button>
</div>
```

#### Header controls (chips only)

Внутри заголовков таблицы (`<th>`) элементы управления оформляются **только** как чипы (`.btn-chip…`). Кнопки `.btn…` и отдельные инпуты в `<th>` запрещены. Поиск в таблицах — это компонент `.table-search` и расположен в верхней панели (controls-row) **над таблицей**.

Чипы в `<th>` используют общий рецепт размеров и выглядят одной высоты с кнопками и поиском (см. Unified Control System). Для группировки внутри ячейки используйте контейнер `.th-controls` внутри `<th class="th--controls">…</th>` — стили уже готовы.

Variant table for the toolbar row:

| Variant     | Class                          | Notes                              |
| ----------- | ----------------------------- | ---------------------------------- |
| Search bar  | `.table-search`               | Unified control recipe + pill radius |
| Status chip | `.btn-chip.btn-chip--dropdown`| Unified control recipe + pill radius |
| Provider    | `.btn-chip.btn-chip--cf`      | Unified control recipe + pill radius |
| Primary     | `.btn.btn--primary`           | Unified control recipe + pill radius |

**Важно:** разметка и классы чипов в документации и демо-страницах должны совпадать.

#### Bulk Actions Bar (Buttons on Glass)

Floating action bar для массовых операций над выбранными элементами (domains, sites, streams). Использует glassmorphism эффект для визуального отделения от контента.

**Контейнер (`.bulk-actions-bar`):**

```css
.bulk-actions-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  /* Glassmorphism */
  background: color-mix(in srgb, var(--bg-card) 85%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  /* Upward shadow - matches --shadow-lg opacity from canon */
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25); /* Light theme */
}

/* Dark theme - stronger shadow */
[data-theme="dark"] .bulk-actions-bar {
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.65);
}
```

**Glassmorphism tokens:**
- **Background**: `color-mix(in srgb, var(--bg-card) 85%, transparent)` — полупрозрачный фон
- **Backdrop**: `blur(20px) + saturate(180%)` — размытие + насыщенность
- **Border**: `color-mix(in srgb, var(--border) 60%, transparent)` — полупрозрачная граница
- **Shadow**: upward shadow using `--shadow-lg` opacity (0.25 light, 0.65 dark) — адаптируется к теме

**Кнопки внутри bar:**

Все action buttons используют **outline стиль** с заливкой при hover:

```css
/* Action buttons (Export, Status, Move, Monitor, Sync) */
.bulk-actions-bar__actions .btn--ghost,
.bulk-actions-bar__actions .btn--primary {
  background: transparent;
  border: 1px solid var(--brand);
  color: var(--brand);
}

.bulk-actions-bar__actions .btn--ghost:hover,
.bulk-actions-bar__actions .btn--primary:hover {
  background: var(--brand);
  color: var(--btn-text-on-dark);  /* белый в обеих темах */
}

/* Danger button (Delete) */
.bulk-actions-bar__actions .btn--danger {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
}

.bulk-actions-bar__actions .btn--danger:hover {
  background: var(--danger);
  color: var(--btn-text-on-dark);
}

/* Cancel - canonical ghost style */
.bulk-actions-bar__actions [data-bulk-cancel] {
  border-color: var(--border-subtle);
  color: var(--text-main);
}

.bulk-actions-bar__actions [data-bulk-cancel]:hover {
  background: var(--panel);
  border-color: var(--border-strong);
}
```

**Ключевые правила:**

1. **Selection counter chip** использует small sizing (`--control-scale-sm`) для выравнивания с `.btn--sm`
2. **Action buttons** (primary/ghost) заливаются брендовым цветом (`var(--brand)`) при hover
3. **Danger button** заливается красным (`var(--danger)`) при hover
4. **Cancel** использует канонический ghost-стиль (нейтральный, без цветной заливки)
5. **Текст на цветном фоне** всегда `var(--btn-text-on-dark)` (белый в обеих темах)
6. **Gap между кнопками**: `var(--inline-gap)` для визуального разделения
7. **Порядок элементов**: Chip + Cancel → Actions → Danger

**Пример разметки:**

```html
<div class="bulk-actions-bar" data-bulk-actions hidden>
  <div class="container">
    <div class="bulk-actions-bar__content">
      <div class="bulk-actions-bar__info">
        <div class="btn-chip">
          <span class="icon" data-icon="mono/check-circle"></span>
          <strong data-selected-count>5</strong>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" data-bulk-cancel>Cancel</button>
      </div>
      <div class="bulk-actions-bar__actions">
        <button class="btn btn--ghost btn--sm" type="button">Export</button>
        <button class="btn btn--ghost btn--sm" type="button">Change Status</button>
        <button class="btn btn--ghost btn--sm" type="button">Move to Project</button>
        <button class="btn btn--ghost btn--sm" type="button">Toggle Monitoring</button>
        <button class="btn btn--primary btn--sm" type="button">Sync Registrar</button>
        <button class="btn btn--danger btn--sm" type="button">Delete</button>
      </div>
    </div>
  </div>
</div>
```

**Адаптивная раскладка (grid-based):**

- **Desktop (>768px):**
  - Info: icon + count + Cancel в одной строке
  - Actions: 6 кнопок в ряд (`grid-template-columns: repeat(6, auto)`)
- **Tablet (≤768px):**
  - Info: icon + count на первой строке, Cancel на второй (full width)
  - Actions (481-767px): 3 колонки × 2 ряда
- **Mobile (≤480px):**
  - Вертикальный layout (`flex-direction: column`)
  - Actions: 2 колонки × 3 ряда (`repeat(2, 1fr)`)
  - Все кнопки `width: 100%`

**Контекст использования:**

- Domains table (bulk delete, export, sync, status change)
- Sites table (bulk operations)
- Streams management (bulk enable/disable)

**НЕ дублируем:** базовый `.btn--ghost` из канона работает иначе (subtle hover, не заливка). В контексте bulk actions bar нужна яркая обратная связь, поэтому стили переопределены через `.bulk-actions-bar__actions` scope.

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

### 4.3. Cards v2

Unified recipe for all cards/panels: tokenized paddings, backgrounds and accent options that stay consistent in light/dark themes.

**Types**

- `card card--panel` — primary functional cards (forms, dashboards, data blocks) with subtle border/shadow.
- `card card--soft` — promo/onboarding hints with softer background (`--bg-soft`).
- `card card--ghost` — transparent wrapper when a borderless container is needed.

**Modifiers**

- `card--compact` — reduced vertical/horizontal padding for dense layouts.
- `card--accent` — left stripe colored via `--accent` (defaults to brand); add semantic hues with `card--accent-success`, `card--accent-warning`, `card--accent-danger`, `card--accent-info`, `card--accent-cf`.
- `card--interactive` — hover/focus feedback for clickable tiles; keep focus ring visible.

**Anatomy**

`card` → optional `card__media` → `card__header` → `card__body` → optional `card__footer`. Use `card__title`, `card__meta` and `card__actions` inside header/body/footers as needed.

**Rules**

- On the same screen, avoid mixing `panel` and `soft` without a clear reason: promo/onboarding → `soft`, functional blocks → `panel`.
- Lists inside cards use helpers: `list--spaced` for relaxed bullet items; `list--ruled` for ordered steps with separators.
- Accessibility: keep contrast ≥ 4.5:1; never remove focus outline on interactive cards.
- Monochrome icons inherit `currentColor`, so they stay legible in dark mode.
- Panel cards carry primary actions and inputs; soft cards host helper copy, onboarding hints or contextual promos. Keep buttons and fields on the unified control recipe (see §4.2 Form controls) to align heights across both types.

**Code samples** (light/dark ready):

```html
<!-- Panel card with header/body -->
<article class="card card--panel">
  <header class="card__header">
    <p class="card__meta">System update</p>
    <h3 class="card__title">Edge configuration</h3>
  </header>
  <div class="card__body">
    Panel cards rely on tokenized padding and radii.
  </div>
  <footer class="card__footer card__actions">
    <button class="btn btn--primary" type="button">Apply changes</button>
    <button class="btn btn--ghost" type="button">Cancel</button>
  </footer>
</article>

<!-- Soft accent promo -->
<aside class="card card--soft card--accent">
  <header class="card__header">
    <h3 class="card__title">Upgrade to Pro</h3>
    <p class="text-muted">Stripe color comes from --accent; swap to `card--accent-success|warning|danger|info` for status stripes.</p>
  </header>
  <div class="card__body card__actions">
    <button class="btn btn--primary" type="button">Enable add-ons</button>
    <button class="btn btn--ghost" type="button">View roadmap</button>
  </div>
</aside>

<!-- Compact checklist -->
<section class="card card--panel card--compact">
  <header class="card__header">
    <h3 class="card__title">Checklist</h3>
  </header>
  <div class="card__body">
    <ol class="list--ruled">
      <li>Connect Cloudflare account.</li>
      <li>Import zones and apply presets.</li>
      <li>Launch redirects or TDS.</li>
    </ol>
  </div>
</section>
```

**Ruled lists (`.list--ruled`)**

Use ruled lists for step-by-step onboarding or configuration checklists. Separators and spacing are baked in; avoid manual margins.

```html
<ol class="list--ruled">
  <li>Paste Account ID from Cloudflare → Account Home → Overview.</li>
  <li>Create a Bootstrap API token with Account API Tokens: Edit scope.</li>
  <li>Save &amp; verify to unlock zone management.</li>
</ol>
```

### 4.4. Confirmation Dialogs

Centered modal dialogs for critical actions and confirmations. Unlike drawers (side panels for forms/details), dialogs are used for short, focused confirmations that require immediate user attention.

**When to use:**
- Confirming destructive actions (delete domain, disconnect account)
- Critical Cloudflare-specific actions
- Any action that cannot be undone

**When NOT to use:**
- Forms with multiple fields → use Drawer
- Viewing details or data → use Drawer
- Multi-step processes → use Drawer

#### Structure

```html
<div class="dialog" data-dialog="name" hidden>
  <div class="dialog__overlay" data-dialog-close></div>
  <div class="dialog__panel">
    <header class="dialog__header">
      <h2 class="dialog__title">Delete domain?</h2>
      <button class="btn-close" type="button" data-dialog-close aria-label="Close">
        <span class="icon" data-icon="mono/close"></span>
      </button>
    </header>
    <div class="dialog__body">
      <p>Are you sure you want to delete <strong>example.com</strong>? This action cannot be undone.</p>
    </div>
    <footer class="dialog__footer">
      <button class="btn btn--danger" type="button" data-confirm>
        <span class="icon" data-icon="mono/delete"></span>
        <span>Delete domain</span>
      </button>
      <button class="btn btn--ghost" type="button" data-dialog-close>Cancel</button>
    </footer>
  </div>
</div>
```

#### Variants

All variants use **left accent border (4px)** to visually categorize the action severity. Uses same pattern as `.card--accent`.

**Danger variant** `.dialog--danger` (destructive actions):
- **Border**: Red (`var(--danger)`)
- **Button**: `.btn--danger`
- **Icons**: `mono/delete`, `mono/close`, `mono/alert-triangle`
- **Use for**: Delete domain, disconnect account, remove data
- **Example**: "Delete domain?", "Disconnect account?"

**Warning variant** `.dialog--warning` (caution required):
- **Border**: Yellow/Orange (`var(--warning)`)
- **Button**: `.btn--primary` or `.btn--ghost`
- **Icons**: `mono/alert-triangle`, `mono/alert`
- **Use for**: Actions requiring user attention, potential data loss
- **Example**: "Unsaved changes", "Override settings?"

**Cloudflare variant** `.dialog--cf` (CF-specific actions):
- **Border**: Cloudflare orange (`var(--accent-cf)`)
- **Button**: `.btn--cf`
- **Icons**: `brand/cloudflare`
- **Use for**: Cloudflare account connection, API token actions
- **Example**: "Connect Cloudflare account?"

**Info variant** `.dialog--info` (informational):
- **Border**: Blue (`var(--primary)`)
- **Button**: `.btn--primary`
- **Icons**: `mono/info`, `mono/help-circle`
- **Use for**: Confirmation of non-destructive actions, information prompts
- **Example**: "Apply this preset?", "Start migration?"

#### Design specs

- **Max width**: 480px (vs 560px for drawers)
- **Animation**: fade + scale (vs slide-in for drawers)
- **z-index**: 1000 (same as drawer)
- **Backdrop**: rgba(0, 0, 0, 0.5) + blur(4px)
- **Padding**: var(--space-4) on all sections
- **Border radius**: var(--radius-lg)

#### Dialog vs Drawer

| Feature | Dialog | Drawer |
|---------|--------|--------|
| Use case | Confirmations, alerts | Forms, details, editing |
| Position | Center | Right side |
| Width | 480px max | 560px max |
| Animation | Fade + scale | Slide-in |
| Content | 1-3 lines text | Multi-field forms |
| Close | Buttons only | Click outside or button |

### 4.5. Custom Tooltips

Rich tooltips for complex information that needs more than native `title` can provide. Use for error states with full messages, sync details with timestamps, or multi-line formatted content. For simple hints (Disabled, Pending), use native `title`.

**Structure:**

```html
<div class="tooltip tooltip--{variant}">
  <div class="tooltip__header">Main title</div>
  <div class="tooltip__body">Detailed message</div>
  <div class="tooltip__footer">Timestamp or context</div>
</div>
```

**Variants:** `tooltip--success` (green), `tooltip--danger` (red), `tooltip--warning` (yellow), or no modifier (neutral).

**Usage:**

```typescript
import { formatTooltipTimestamp, initTooltips } from '@ui/tooltip';

const content = `
  <div class="tooltip tooltip--danger">
    <div class="tooltip__header">Sync Failed</div>
    <div class="tooltip__body">${escapeHtml(error)}</div>
    <div class="tooltip__footer">Last attempt: ${formatTooltipTimestamp(timestamp)}</div>
  </div>
`.trim();

return `<span class="badge badge--danger" data-tooltip data-tooltip-content="${escapeHtml(content)}">Error</span>`;

// After rendering:
initTooltips();
```

**Features:** Auto-positioning (dropdown logic), 150ms fade-in, `cursor: help`, XSS-safe, 280px max-width, design tokens.

### 4.6. Tables

Domains tables stay in a single row layout even on mobile; wrap the table in a horizontal scroller and keep action menus inside dropdowns so the row stays compact. Above the table you can place a search bar, one or more dropdown filter chips, provider action chips and a primary button. The example shows a table search bar, a status dropdown chip, a Cloudflare action chip and a primary “Add domain” button — all sharing the unified control recipe.

#### Headers

**Header cells contain only sortable titles.** Toolbar (search + chips + primary) lives above the table. Header cells contain sort-only controls (icon next to label). No `.btn` / chips inside `<th>`.

```css
.table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.table thead { background: var(--bg-soft); }
.table th,
.table td { padding: 0.6rem 0.75rem; text-align: left; }
.table th { font-weight: var(--fw-medium); color: var(--text-muted); border-bottom: 1px solid var(--border-strong); white-space: nowrap; }
.th-sort { display: inline-flex; align-items: center; gap: 0.35em; font: inherit; color: inherit; background: transparent; border: 0; padding: 0; margin: 0; line-height: 1; cursor: pointer; }
.th-sort .icon { width: 1em; height: 1em; }
.table tbody tr { border-bottom: 1px solid var(--border-subtle); }
.table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }

.table-wrapper { overflow-x: auto; width: 100%; }
.table--domains { min-width: 720px; }
.table__th-actions, .table__cell-actions { width: 1%; white-space: nowrap; text-align: right; }
.table-controls { display: flex; flex-wrap: wrap; gap: var(--inline-gap); }
.table-controls .table-search { flex: 1 1 0; min-width: 14rem; /* Keeps chips inline on mobile */ }
.table-controls .btn, .table-controls .btn-chip { flex: 0 0 auto; }
@media (min-width: 1024px) { .table-controls { flex-wrap: nowrap; } /* Desktop: one line */ }
.table-filter { position: relative; }
.btn-chip__icon, .btn-chip__chevron { display: inline-flex; align-items: center; justify-content: center; }
.btn-chip__label { white-space: nowrap; }
.table-search { flex: 1 1 16rem; min-width: 0; background: var(--input-bg); color: var(--text-main); border-color: var(--input-border); }
.table-search__input { flex: 1 1 auto; -webkit-appearance: none; appearance: none; font: inherit; line-height: inherit; background: transparent; border: none; color: var(--text); width: 100%; outline: none; padding: 0; }
.table-search__input::placeholder { color: var(--muted); }
.table-search__clear { display: none; background: transparent; border: none; padding: 0; align-items: center; justify-content: center; width: 1em; height: 1em; flex: 0 0 1em; }
.table-search__clear .icon { color: var(--muted); }
.table-search--active .table-search__clear { display: inline-flex; }
.dropdown { position: relative; display: inline-block; }
.dropdown__menu { position: absolute; top: calc(100% + 0.35rem); right: 0; min-width: 220px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: var(--space-2) 0; display: none; box-shadow: var(--shadow-soft); }
.dropdown--open .dropdown__menu { display: block; }
.table-filter__menu { position: absolute; top: calc(100% + 0.25rem); left: 0; z-index: var(--z-dropdown); min-width: 11rem; padding: 0.25rem 0; border-radius: var(--radius-lg); background: var(--panel); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-md); }
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

#### Smart dropdown positioning

**Автоматическое определение позиции dropdown меню** для таблиц и фильтров.

**Проблема:** В последних строках таблиц dropdown меню обрезаются за пределами viewport.

**Решение:** JavaScript функция `adjustDropdownPosition()` (из `@ui/dropdown`) автоматически добавляет класс `.dropdown__menu--up` если меню не помещается снизу.

**CSS:**
```css
/* Базовая позиция - вниз */
.dropdown__menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
}

/* Автоматически применяется JS - меню вверх */
.dropdown__menu--up {
  top: auto;
  bottom: calc(100% + 0.35rem);
}
```

**TypeScript usage:**
```typescript
import { adjustDropdownPosition } from '@ui/dropdown';

// При открытии dropdown
dropdown.classList.add('dropdown--open');
trigger.setAttribute('aria-expanded', 'true');

// Применить smart positioning после открытия
requestAnimationFrame(() => {
  adjustDropdownPosition(dropdown);
});

// При закрытии убрать класс
const menu = dropdown.querySelector('.dropdown__menu');
if (menu) menu.classList.remove('dropdown__menu--up');
```

**Использование:**
- Таблицы доменов (action меню в последних строках)
- Filter chips (на всех экранах)
- Любые dropdown в скроллируемых контейнерах

**Не применяется:**
- Dropdown в header/footer (фиксированные элементы)
- Модальные окна с центрированным контентом

---

**Dropdown menu fit-to-trigger modifier** для предотвращения выхода за границы экрана на мобильных.

**Проблема:** Dropdown меню с `min-width` могут выходить за левый край экрана, если триггер находится у левого края (например, в drawer'ах).

**Решение:** Модификатор `.dropdown__menu--fit-trigger` делает ширину меню равной ширине триггера.

**CSS:**
```css
.dropdown__menu--fit-trigger {
  width: 100%;
  min-width: unset;
  max-width: unset;
}
```

**HTML usage:**
```html
<div class="dropdown" data-dropdown="redirect-code">
  <button class="btn-chip btn-chip--dropdown dropdown__trigger">301</button>
  <div class="dropdown__menu dropdown__menu--fit-trigger" role="menu">
    <button class="dropdown__item">301 - Permanent</button>
    <button class="dropdown__item">302 - Temporary</button>
  </div>
</div>
```

**Когда использовать:**
- Dropdown в drawer'ах на левом краю экрана
- Компактные btn-chip с dropdown на мобильных устройствах
- Ситуации, где контент меню умещается в ширину триггера

**Не использовать:**
- Для основных action меню с длинными лейблами
- Dropdown в центре экрана (нет риска выхода за границы)

#### 4.5.1. Domains table reference

* Responsive rule: keep `.table--domains` at `min-width: 720px` and wrap in `.table-wrapper` for horizontal scroll on mobile (no card collapse).
* **Domain column optimization:** First column (`th:first-child`, `td:first-child`) has `max-width: 220px` to prevent excessive space waste. Even long domains (20+ chars) fit comfortably and wrap naturally. This ensures low-priority columns (Expires, Notes) remain visible on desktop with expanded sidebar.
* Actions live inside a dropdown menu; provider column shows only `cloudflare`, `namecheap`, `namesilo` brand icons.
* Status/expiry stays in one column, SSL mode and Zone ID surface through the dropdown actions only.
* Toolbar demo pairs search with a single status dropdown filter, a Cloudflare action chip and a primary button in the same controls row.

**Mobile behavior (≤640px):**
- Search bar takes full width (100%) and appears first (`order: -1`)
- Filters, provider chips, and primary button wrap below search in priority order:
  1. Search (full width, first)
  2. Dropdown filters (e.g., Status: Active)
  3. Provider action chips (e.g., Cloudflare)
  4. Primary button (e.g., + Add domain)
- All controls maintain unified height from control recipe
- Gap remains consistent (`--inline-gap`) for touch targets

Example toolbar + table markup:

```html
  <div class="controls-row table-controls">
    <div class="table-search" data-table-search>
      <span class="icon" data-icon="mono/search"></span>
      <input type="text" class="table-search__input" placeholder="Search by domain, project or account…" />
      <button class="table-search__clear" type="button" aria-label="Clear">
        <span class="icon" data-icon="mono/close"></span>
      </button>
    </div>

    <div class="table-filter" data-demo="status-filter">
      <button class="btn-chip btn-chip--dropdown" type="button" aria-expanded="false">
        <span class="icon" data-icon="mono/filter"></span>
        Status: Active
        <span class="icon" data-icon="mono/chevron-down"></span>
      </button>
      <div class="table-filter__menu" hidden>
        <button class="dropdown__item is-active" type="button">All statuses</button>
        <button class="dropdown__item" type="button">Active only</button>
        <button class="dropdown__item" type="button">Paused</button>
        <button class="dropdown__item" type="button">DNS error</button>
      </div>
    </div>

    <button class="btn-chip btn-chip--cf" type="button">
      <span class="icon" data-icon="brand/cloudflare"></span>
      Cloudflare
    </button>

    <button class="btn btn--primary" type="button">
      <span class="icon" data-icon="mono/plus"></span>
      Add domain
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

### 4.7. Navigation shell

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
* Social buttons use `.btn.btn--social` with brand-specific skins for Google/GitHub.
* `.app-alert` is the global status banner. Align with `.page-shell` gutters via `.app-alert__inner`, keep `padding-block: var(--space-3)` and `margin-bottom: var(--block-gap)`; color via modifiers `.app-alert--success | .app-alert--error | .app-alert--info`.

---

## 6. Cloudflare-specific UI rules

* **Orange buttons (`.btn--cf`) are reserved for Cloudflare actions only.**
  * Good: `Connect Cloudflare account`, `Sync zones`, `Apply Cloudflare security rules`, `Purge Cloudflare cache`, `Update SSL mode`.
  * Bad: generic `Save`, `Next`, `Create project` → use blue (`.btn btn--primary`) instead.
* Cloudflare states should use `.badge-cf` or `.badge-success` depending on context.
* Screens that are “Cloudflare-heavy” (WAF, cache presets) may use subtle orange highlights, but avoid full orange backgrounds — keep the minimal SaaS feel and contrast predictable.

---

## 7. Accessibility notes

* Main text colors (`--text-main`, `--text-muted`) and button labels (`.btn btn--primary`, `.btn btn--cf`) are tuned to meet **WCAG AA** contrast targets on their backgrounds.
* Avoid changing `--primary`, `--accent-cf`, and `--text-main` without re-checking contrast (e.g. via any WCAG contrast tool).
* Use `.text-muted` for secondary information, not for critical content.
* For long paragraphs on colored backgrounds, prefer solid backgrounds from `--bg`, `--bg-elevated`, `--bg-soft` rather than semi-transparent overlays.

---

## 8. UI System 1.0 migration map

* Tokens: use `--space-*`, `--radius`, `--radius-lg`, `--control-radius`, and unified control tokens (`--fs-control`, `--lh-control`, `--control-pad-*`). Legacy aliases are removed.
* Classes: `.btn-ghost` / `.btn-danger` → `.btn.btn--ghost` / `.btn.btn--danger`.
* Controls: table toolbars reuse the exact Table Search Bar markup (search + clear button). No forks per page.
* Demos: any change to tokens/components requires rebuilding all demo pages in the same PR.

## Pre-/Post-login layout

- **Login page**: слева форма, справа `promo-card` (`data-onlogout`) → после входа `setup-card` (`data-onlogin`).
- **Dashboard**: двухколоночная сетка — «Текущий сетап» + «Помощь по экрану».
- Управление видимостью только через `hidden` на `[data-onlogin]/[data-onlogout]` + инициализация в JS.
- Кнопки/чипы и иконки в шапке наследуют `currentColor` для поддержки dark/light.

---

## Loading Indicator

**1px animated shimmer bar** in utility-bar for page loads and async operations.

### Color variants

- **Brand (blue)**: Page loads, general operations
- **CF (orange)**: Cloudflare API operations (account connection, domain sync, etc.)
- **Primary (blue)**: Same as brand, for consistency

### Usage

```typescript
// Manual control
showLoading('cf');
await someCloudflareOperation();
hideLoading();

// Automatic with promise wrapper
const result = await withLoading(
  fetchCloudflareAccounts(),
  'cf'
);
```

### Implementation

- Shimmer effect using `::before` pseudo-element with `translateX` animation
- Base color at 40% opacity with bright shimmer wave
- 1.5s duration for smooth effect
- Minimum display time: 600ms (ensures animation visibility)
- No layout shifts: `position: absolute` inside utility-bar
- Functions exposed globally: `window.showLoading()`, `window.hideLoading()`, `window.withLoading()`

### When to use

- **Page loads**: Automatically shown via `initPageLoadIndicator()` in main.ts
- **CF operations**: Use `'cf'` type for orange shimmer during Cloudflare API calls
- **Long operations**: Wrap promises with `withLoading()` for automatic show/hide

---

## 9. CSS Architecture & Modularization

### 9.1. File Structure

The CSS is organized into modular files loaded in order:

1. **`theme.css`** - Design tokens (colors, typography, spacing, transitions)
2. **`layout.css`** - Page shells, grids, containers, **fluid layout tokens**
3. **`site.css`** - Global components (buttons, cards, forms, typography)
4. **`tables.css`** - Table system (dashboard pages only)

### 9.2. Fluid Tokens Policy

**Where fluid tokens live:** `layout.css :root` (layout-specific sizing)

**Rules:**
- `vw` units are used **ONLY inside `clamp()`** - never hardcoded per-component
- New classes (`.app-layout`, `.table-grid`) are **NOT introduced** - use existing selectors + tokens
- Fluid tokens are opt-in: added first, used later after testing
- Any new adaptive behavior: either via `clamp()` tokens OR existing media queries

**Token naming:**
- `--sidebar-w`, `--sidebar-w-collapsed` - layout structure
- `--table-min-*` - table minimum widths
- `--col-*` - column sizing
- `--menu-min`, `--menu-max` - dropdown constraints

**Migration strategy:** Small phases (0-4), each self-contained and revertible.

### 9.3. tables.css Module

**Purpose:** Self-contained table system for dashboard pages with data tables.

**When to load:** Only on pages with tables (domains, redirects, etc.) to keep auth/marketing pages lean.

**Dependencies:** Requires `site.css` for base button/control styles.

**Architecture:**

1. **Dropdown Menus** - Filter menus and kebab actions
2. **Table Structure & Variants** - Base table, `.table--domains`, `.table--redirects`
3. **Table Controls & Filters** - Search bar, filter chips, responsive grid
4. **Bulk Actions Bar** - Glassmorphic floating bar with selection controls
5. **Table States** - Empty state, loading spinner
6. **Pagination** - Page navigation controls
7. **Table-Specific Components** - Badges, domain cells, provider labels, IDN indicators
8. **Drawer** - Side panel for edit/add forms
9. **Page-Specific Components** - Stats cards, metrics

**Design System Compliance:**

- ✅ All spacing uses tokens (`--space-1` through `--space-6`)
- ✅ All font sizes use tokens (`--fs-xs`, `--fs-sm`, `--fs-md`, etc.)
- ✅ All font weights use tokens (`--fw-normal`, `--fw-medium`, `--fw-semibold`, `--fw-bold`)
- ✅ All border radii use tokens (`--radius`, `--radius-lg`, `--r-pill`)
- ✅ All transitions use tokens (`--transition-fast`, `--transition-md`)
- ✅ No fixed heights (uses font-driven sizing where applicable)
- ✅ Responsive breakpoints at 480px, 768px, 1024px

**Exceptions:**

- Icon sizes (20px, 24px, 32px, 40px, 64px) - component-specific design decisions
- Table min-widths (720px, 950px) - content-driven, prevents horizontal cramming
- Badge micro-font (0.625rem) - intentionally smaller than `--fs-xs` for compact display
- Dropdown menu gaps (0.35em) - em-based for font-relative spacing

**Usage in HTML:**

```html
<link rel="stylesheet" href="/css/theme.css" />
<link rel="stylesheet" href="/css/layout.css" />
<link rel="stylesheet" href="/css/site.css" />
<link rel="stylesheet" href="/css/tables.css" />
```

**Table Column Priorities:**

All table columns MUST have a `data-priority` attribute to control progressive hiding on narrow containers.

**Priority Levels:**

| Priority | Hidden When | Use For | Examples |
|----------|-------------|---------|----------|
| `critical` | **Never** | Essential columns that must always be visible | Domain, Actions, Checkbox |
| `high` | < 480px (very narrow) | Important but can hide on mobile | Status, Code, Provider |
| `medium` | < 600px (narrow) | Useful but not essential | Health, Last Sync, Role |
| `low` | < 720px (compact) | Nice-to-have metadata | Expires, Created At, Notes |

**HTML Example:**

```html
<table class="table table--domains">
  <thead>
    <tr>
      <th data-priority="critical">Domain</th>
      <th data-priority="high">Status</th>
      <th data-priority="medium">Health</th>
      <th data-priority="high">Provider</th>
      <th data-priority="low">Expires</th>
      <th data-priority="critical">Actions</th>
      <th data-priority="critical" class="table__th-checkbox">☑</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-priority="critical">example.com</td>
      <td data-priority="high">Active</td>
      <td data-priority="medium">✓</td>
      <td data-priority="high">Namecheap</td>
      <td data-priority="low">2025-12-01</td>
      <td data-priority="critical">...</td>
      <td data-priority="critical" class="table__cell-checkbox">☑</td>
    </tr>
  </tbody>
</table>
```

**Checklist for New Tables:**

When creating a new table, always:

1. ✅ **Assign priorities** to ALL `<th>` and `<td>` elements
2. ✅ **Mark critical columns** - Domain/Name, Actions, Checkbox are always `critical`
3. ✅ **Evaluate metadata** - Dates, timestamps, notes are usually `low`
4. ✅ **Test container sizes** - Verify columns hide in correct order at 720px, 600px, 480px
5. ✅ **Document exceptions** - If a column breaks the pattern, explain why in HTML comment

**Why This Matters:**

- 🎯 **Semantic** - Priority is visible in HTML, self-documenting
- 🛡️ **Resilient** - Adding/removing columns doesn't break hiding logic
- 📱 **Mobile-first** - Critical content always accessible on narrow screens
- 🔧 **Maintainable** - Easy to adjust priorities without touching CSS

### 9.4. Token Usage Rules

**Always prefer tokens over hardcoded values:**

```css
/* ❌ BAD - Hardcoded values */
.example {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  gap: 0.25rem;
  transition: all 0.15s ease;
}

/* ✅ GOOD - Using design tokens */
.example {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--r-pill);
  gap: var(--space-1);
  transition: all var(--transition-md);
}
```

**When to use hardcoded values:**

- **Em-based spacing** - Use when spacing should scale with font-size (e.g., `padding: 0.35em 0.9em` in buttons)
- **Component-specific sizes** - Icon dimensions, table min-widths, empty state heights
- **Micro-adjustments** - Values not covered by tokens (e.g., `0.625rem` for tiny badges)
- **Character-based spacing** - Use `ch` units for character width (e.g., `margin-left: 0.5ch`)

### 9.5. Repository Ecology Rule

> Whenever design system updates are introduced, ALL UI components and ALL demo pages must be refactored to follow the new rules. No page in the system is allowed to use outdated paddings, heights, or markup. StyleGuide + demo pages = single source of truth.

This ensures:
- Consistent visual language across all pages
- No legacy patterns lingering in codebase
- Demo pages (`/ui-style-guide`) accurately represent production code
- Design tokens are enforced systematically
