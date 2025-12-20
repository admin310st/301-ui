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

* Icons inside controls scale via `em` sizing (no px icons).
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
*Header content uses the same page container.* Wrap header rows with `.page-shell` (and `.page-header` for section headers). Background may be full-bleed; inner content aligns to the page grid.

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

- `.page-shell.dashboard-shell` removes default page padding (grid handles spacing)
- `.dashboard-content` has no padding on desktop (content manages its own spacing)
- On mobile, `.dashboard-content` gets `padding-inline: var(--space-3)` to prevent edge sticking
- Sidebar partial: `{{> sidebar}}` (defined in `partials/sidebar.hbs`)
- Burger menu button (`.burger-button`) only visible on dashboard pages at mobile breakpoint

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

Buttons use explicit size modifiers: `.btn--sm`, `.btn--md`, `.btn--lg`. `btn--md` is the default and must match `.btn-chip` height so chips, search bars and primary buttons align inside toolbars. Use `btn--md` for all table headers; reserve `btn--lg` for hero/landing layouts.

```html
<button class="btn btn--primary btn--md">Sign in</button>
<button class="btn btn--ghost btn--md">Cancel</button>
<button class="btn btn--danger btn--md">Delete</button>
```

❗ Variants must never alter padding/height. Do not hard-code button heights or paddings per screen; rely on `.btn--*` size modifiers + shared control tokens.

Icons inside buttons use `1em` sizing with `stroke="currentColor"` / `fill="none"` so they stay legible in both themes.

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
* иконки — только через `.btn-chip__icon` / `.btn-chip__chevron` с `1em` SVG в `currentColor`;
* `padding-inline: var(--control-pad-x)` (вертикальный паддинг считаем через `--control-pad-y`);
* скругление: `var(--control-radius)`.

Варианты (`btn-chip--*`):

| Вариант              | Использование         | Описание                                                 |
| -------------------- | --------------------- | -------------------------------------------------------- |
| `btn-chip--dropdown` | фильтры со стрелкой   | Добавляет chevron справа; управление обёрнуто в Table Search Bar markup |
| `btn-chip--cf`       | Cloudflare provider   | Цвет фона = `--accent-cf-bg`, текст = `--accent-cf-text` |
| `btn-chip--status`   | Active/Paused/Expired | Цвет фона по статусу (`--status-active`, …)              |
| `btn-chip--primary`  | основной акцент       | Использует токены primary                                |

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

**Danger variant** (delete, disconnect):
- Use `.btn--danger` for confirm button
- Icon: `mono/delete`, `mono/close`, etc.
- Example: "Delete domain?", "Disconnect account?"

**Cloudflare variant** (CF actions):
- Use `.btn--cf` for confirm button (orange)
- Icon: `brand/cloudflare`
- Example: "Connect Cloudflare account?"

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

### 4.5. Tables

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

#### 4.5.1. Domains table reference

* Responsive rule: keep `.table--domains` at `min-width: 720px` and wrap in `.table-wrapper` for horizontal scroll on mobile (no card collapse).
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

### 4.6. Navigation shell

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
