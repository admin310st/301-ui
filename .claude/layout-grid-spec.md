# Layout & Grid System Specification

**Дата создания:** 2025-12-17
**Статус:** ✅ Ready for Implementation
**Цель:** Унифицировать layout систему для dashboard с collapsible sidebar и responsive grid

---

## 📋 Текущее состояние (As-Is)

### Существующая структура:

```css
/* CSS Variables */
--aside-w: 280px;              /* Sidebar width (expanded) */
--aside-w-collapsed: 72px;     /* Sidebar width (collapsed) */
--shell-top: 96px;             /* Header height offset */

/* Layout Classes */
.page-shell                    /* Max-width container (1400px) */
.app-shell                     /* Grid: sidebar + content */
.sidebar                       /* Sticky sidebar */
.sidebar.is-collapsed          /* Collapsed state */
.content                       /* Main content area */
```

### Проблемы:

❌ **Grid не реагирует на collapsed sidebar**
- Grid остаётся `280px 1fr`, контент не растягивается
- Пустое пространство слева

❌ **Нет плавных transitions**
- Sidebar collapse без анимации

❌ **Mobile не определён**
- Нет breakpoints для скрытия sidebar

---

## 🎯 Целевое состояние (To-Be)

### 1. Dashboard Grid System (Grid везде)

#### HTML Structure:

```html
<body class="layout-dashboard">
  <header class="site-header">
    {{> header-top}}
    <div class="utility-bar">...</div>
  </header>

  <main class="page-shell dashboard-shell">
    <aside class="sidebar" data-sidebar>
      <div class="sidebar__head">
        <button
          class="btn-icon btn-icon--compact"
          type="button"
          aria-label="Toggle sidebar"
          aria-expanded="true"
          data-sidebar-toggle
        >
          <span class="icon" data-icon="mono/chevron-left"></span>
        </button>
      </div>

      <nav class="sidebar__nav">
        <!-- Navigation items -->
      </nav>
    </aside>

    <div class="dashboard-content">
      <div class="content-inner">
        <!-- Page content -->
      </div>
    </div>
  </main>

  <footer class="site-footer">...</footer>
</body>
```

#### CSS Grid (все breakpoints):

```css
/* ============================================
   CSS Variables
   ============================================ */
:root {
  /* Sidebar */
  --sidebar-width: 280px;
  --sidebar-width-collapsed: 72px;
  --sidebar-transition: 300ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Layout heights */
  --header-height: 96px;          /* site-header + utility-bar */
  --footer-height: 120px;

  /* Dashboard grid */
  --dashboard-gap: 1.5rem;        /* --space-4 */
  --dashboard-padding: 1.5rem;

  /* Content constraints */
  --content-max-width: 1400px;    /* .page-shell */
  --dashboard-content-max: 1200px;

  /* Z-index */
  --z-sidebar: 100;
  --z-sidebar-overlay: 99;
  --z-header: 200;
}

/* ============================================
   Dashboard Shell (Grid everywhere)
   ============================================ */
.dashboard-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-areas: "sidebar content";
  gap: var(--dashboard-gap);
  align-items: start;
  min-height: calc(100dvh - var(--header-height) - var(--footer-height));
  padding-top: var(--space-4);
  padding-bottom: var(--space-4);
}

/* Collapsed state */
body.sidebar-collapsed .dashboard-shell {
  grid-template-columns: var(--sidebar-width-collapsed) 1fr;
}

/* ============================================
   Sidebar
   ============================================ */
.sidebar {
  grid-area: sidebar;
  position: sticky;
  top: var(--header-height);
  height: calc(100dvh - var(--header-height));
  background: var(--panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  transition: width var(--sidebar-transition);
}

/* ============================================
   Dashboard Content
   ============================================ */
.dashboard-content {
  grid-area: content;
  min-width: 0;                   /* Prevent overflow */
  width: 100%;
}

.content-inner {
  /* Optional: constrain content width */
  max-width: var(--dashboard-content-max);
  /* margin: 0 auto; */           /* Uncomment for centered content */
}

/* ============================================
   Responsive (Grid everywhere)
   ============================================ */

/* Mobile: Single column, sidebar as overlay */
@media (max-width: 1023px) {
  .dashboard-shell {
    grid-template-columns: 1fr;   /* Single column only */
    grid-template-areas: "content";
    gap: 0;
  }

  .sidebar {
    /* Remove from grid flow */
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: var(--sidebar-width);
    z-index: var(--z-sidebar);
    border-radius: 0;
    transform: translateX(-100%);
    transition: transform 300ms ease-in-out;
  }

  /* Open state (mobile drawer) */
  body.sidebar-open .sidebar {
    transform: translateX(0);
  }

  /* Overlay backdrop */
  body.sidebar-open::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--z-sidebar-overlay);
    animation: fadeIn 200ms ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Burger button visible */
  .burger-button {
    display: flex;
  }

  /* Body scroll lock when sidebar open */
  body.sidebar-open {
    overflow: hidden;
  }
}

/* Tablet: Reduce sidebar width */
@media (min-width: 1024px) and (max-width: 1279px) {
  :root {
    --sidebar-width: 240px;
    --sidebar-width-collapsed: 64px;
    --dashboard-gap: 1rem;
  }
}

/* Desktop: Full layout */
@media (min-width: 1280px) {
  :root {
    --sidebar-width: 280px;
    --sidebar-width-collapsed: 72px;
    --dashboard-gap: 1.5rem;
  }

  .burger-button {
    display: none;
  }
}
```

### 2. Sidebar Collapse Mechanism

#### JavaScript (src/ui/sidebar-toggle.ts):

```typescript
const STORAGE_KEY = 'ui.sidebar.collapsed';

export function initSidebarToggle(): void {
  const sidebar = document.querySelector('[data-sidebar]');
  const toggle = document.querySelector('[data-sidebar-toggle]');

  if (!sidebar || !toggle) return;

  // Load saved state
  const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (isCollapsed) {
    document.body.classList.add('sidebar-collapsed');
    updateToggleState(toggle, false);
  }

  // Toggle handler
  toggle.addEventListener('click', () => {
    const willCollapse = !document.body.classList.contains('sidebar-collapsed');

    document.body.classList.toggle('sidebar-collapsed');
    updateToggleState(toggle, !willCollapse);
    localStorage.setItem(STORAGE_KEY, String(willCollapse));
  });
}

function updateToggleState(button: Element, isExpanded: boolean): void {
  button.setAttribute('aria-expanded', String(isExpanded));

  const icon = button.querySelector('.icon');
  if (icon) {
    const iconName = isExpanded ? 'chevron-left' : 'chevron-right';
    icon.setAttribute('data-icon', `mono/${iconName}`);
  }
}

// Export for use in main.ts
export { initSidebarToggle };
```

#### Sidebar Collapse Styles:

```css
/* ============================================
   Sidebar Collapse Animation
   ============================================ */

/* Labels fade out on collapse */
.sidebar .label {
  opacity: 1;
  transition: opacity 200ms ease-in-out;
}

body.sidebar-collapsed .sidebar .label {
  opacity: 0;
  pointer-events: none;
}

/* Icons stay visible, center on collapse */
.sidebar .navitem {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  transition: padding 200ms ease;
}

body.sidebar-collapsed .sidebar .navitem {
  justify-content: center;
  padding: var(--space-2);
}

/* Toggle button icon rotation */
.sidebar [data-sidebar-toggle] .icon {
  transition: transform 200ms ease;
}

body.sidebar-collapsed .sidebar [data-sidebar-toggle] .icon {
  transform: rotate(180deg);
}

/* ============================================
   Tooltips for Collapsed State
   ============================================ */
body.sidebar-collapsed .sidebar .navitem {
  position: relative;
}

body.sidebar-collapsed .sidebar .navitem::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%) scale(0.95);
  padding: var(--space-1) var(--space-2);
  background: var(--panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r);
  box-shadow: var(--shadow-md);
  font-size: var(--fs-sm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease, transform 200ms ease;
  z-index: 10;
}

body.sidebar-collapsed .sidebar .navitem:hover::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
```

#### Update sidebar.hbs:

```handlebars
<aside class="sidebar" data-sidebar>
  <div class="sidebar__head">
    <button
      class="btn-icon btn-icon--compact"
      type="button"
      aria-label="Toggle sidebar"
      aria-expanded="true"
      data-sidebar-toggle
    >
      <span class="icon" data-icon="mono/chevron-left"></span>
    </button>
  </div>

  <nav class="sidebar__nav">
    <a
      class="navitem{{#if (eq activePage 'dashboard')}} is-active{{/if}}"
      href="/dashboard.html"
      data-tooltip="Overview"
    >
      <span class="icon" data-icon="mono/home"></span>
      <span class="label" data-i18n="layout.nav.overview">Overview</span>
    </a>

    <a
      class="navitem{{#if (eq activePage 'integrations')}} is-active{{/if}}"
      href="#integrations"
      data-tooltip="Integrations"
    >
      <span class="icon" data-icon="mono/puzzle-outline"></span>
      <span class="label" data-i18n="layout.nav.integrations">Integrations</span>
    </a>

    <!-- ... other nav items with data-tooltip ... -->

    <div class="sidebar__spacer"></div>

    <a
      class="navitem{{#if (eq activePage 'analytics')}} is-active{{/if}}"
      href="#analytics"
      data-tooltip="Analytics"
    >
      <span class="icon" data-icon="mono/analytics"></span>
      <span class="label" data-i18n="layout.nav.analytics">Analytics</span>
    </a>
  </nav>
</aside>
```

### 3. Wizard Page Layout

#### HTML Structure:

```html
<body class="layout-wizard">
  <header class="site-header">
    {{> header-top}}
    <div class="utility-bar">...</div>
  </header>

  <main class="wizard-shell">
    <div class="wizard-container">
      <header class="wizard-header">
        <h1 class="h2" data-i18n="cf.wizard.title">Cloudflare Setup Wizard</h1>
        <p class="text-muted" data-i18n="cf.wizard.subtitle">Step 1 · Connect your account</p>
      </header>

      <div class="wizard-body">
        <!-- Form, cards, instructions -->
      </div>
    </div>
  </main>

  <footer class="site-footer">...</footer>
</body>
```

#### CSS:

```css
/* ============================================
   Wizard Layout
   ============================================ */
.wizard-shell {
  padding-top: var(--space-6);      /* Breathing room from header */
  padding-bottom: var(--space-6);
  min-height: calc(100dvh - var(--header-height) - var(--footer-height));
}

.wizard-container {
  max-width: 960px;                 /* Narrower than dashboard */
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.wizard-header {
  margin-bottom: var(--space-5);
  text-align: center;
}

.wizard-header h1 {
  margin-bottom: var(--space-2);
}

.wizard-body {
  /* Content area for forms, cards */
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .wizard-shell {
    padding-top: var(--space-4);
    padding-bottom: var(--space-4);
  }

  .wizard-container {
    padding: 0 var(--space-3);
  }
}
```

### 4. Visual Enhancements

#### Enhanced Hover States:

```css
/* ============================================
   Sidebar Visual Enhancements
   ============================================ */

/* Smooth hover with subtle transform */
.sidebar .navitem {
  position: relative;
  transition:
    background 200ms ease,
    color 200ms ease,
    transform 150ms ease;
}

.sidebar .navitem:hover {
  background: var(--bg-soft);
  color: var(--text);
  transform: translateX(2px);
}

/* Active state indicator (left accent bar) */
.sidebar .navitem.is-active {
  background: var(--bg-soft);
  color: var(--text);
}

.sidebar .navitem.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--brand);
  border-radius: 0 2px 2px 0;
}

/* Section dividers */
.sidebar-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: var(--space-2) var(--space-3);
  transition: margin 200ms ease;
}

body.sidebar-collapsed .sidebar-divider {
  margin: var(--space-2) var(--space-1);
}

/* Focus visible (accessibility) */
.sidebar .navitem:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
```

---

## 📐 Layout Types Summary

| Page Type | Class | Sidebar | Header | Grid |
|-----------|-------|---------|--------|------|
| **Dashboard** | `.layout-dashboard` | ✅ Collapsible | Full (top + utility) | `280px 1fr` → `72px 1fr` |
| **Wizard** | `.layout-wizard` | ❌ No | Full (top + utility) | Centered (max 960px) |
| **Auth** | `.layout-auth` | ❌ No | Minimal | 2-col auth grid |
| **Content** | `.layout-content` | ❌ No | Full (top only) | Single col (max 800px) |

---

## 🛠 Implementation Plan

### Phase 1: Dashboard Grid Refactor ⭐ HIGH PRIORITY

**Files to modify:**
- `static/css/layout.css` - Add CSS variables
- `static/css/site.css` - Update `.dashboard-shell`, `.sidebar`
- `dashboard.html` - Update markup classes

**Tasks:**
1. [ ] Replace `.app-shell` with `.dashboard-shell`
2. [ ] Update CSS variables (`--sidebar-width`, reactive)
3. [ ] Add `body.sidebar-collapsed` state handler
4. [ ] Test grid on desktop (280px → 72px transition)
5. [ ] Test on tablet (240px)
6. [ ] Test on mobile (1fr, sidebar overlay)

**Estimated time:** 2-3 hours

---

### Phase 2: Sidebar Collapse Functionality ⭐ HIGH PRIORITY

**Files to create/modify:**
- `src/ui/sidebar-toggle.ts` - **NEW FILE**
- `src/main.ts` - Import and init
- `partials/sidebar.hbs` - Add toggle button, tooltips
- `static/css/site.css` - Collapse transitions

**Tasks:**
1. [ ] Create `sidebar-toggle.ts` with localStorage persistence
2. [ ] Add toggle button to `sidebar.hbs`
3. [ ] Add `data-tooltip` attributes to all navitems
4. [ ] Implement CSS transitions (width, opacity, transform)
5. [ ] Add tooltip styles for collapsed state
6. [ ] Test keyboard navigation (Tab, Enter, Escape)

**Estimated time:** 3-4 hours

---

### Phase 3: Wizard Layout 🟡 MEDIUM PRIORITY

**Files to modify:**
- `wizard.html` - Update markup
- `static/css/site.css` - Add `.wizard-shell`

**Tasks:**
1. [ ] Create `.wizard-shell` and `.wizard-container`
2. [ ] Add top padding (`--space-6`)
3. [ ] Test breathing room from header
4. [ ] Verify max-width constraint (960px)

**Estimated time:** 1 hour

---

### Phase 4: Mobile Sidebar Drawer 🟡 MEDIUM PRIORITY

**Files to modify:**
- `partials/header-top.hbs` - Add burger button
- `src/ui/mobile-menu.ts` - Mobile drawer logic
- `static/css/site.css` - Mobile breakpoints

**Tasks:**
1. [ ] Add burger button (visible < 1024px)
2. [ ] Implement drawer open/close
3. [ ] Add overlay backdrop
4. [ ] Body scroll lock when open
5. [ ] Touch swipe to close (optional)
6. [ ] Test on mobile devices

**Estimated time:** 2-3 hours

---

### Phase 5: Visual Polish 🟢 LOW PRIORITY

**Tasks:**
1. [ ] Enhanced hover effects
2. [ ] Active state left accent bar
3. [ ] Section dividers
4. [ ] Focus-visible styles
5. [ ] Micro-interactions polish

**Estimated time:** 1-2 hours

---

## ✅ Acceptance Criteria

### Dashboard Grid:
- ✅ Grid остаётся grid на всех breakpoints
- ✅ Desktop: `grid-template-columns: 280px 1fr`
- ✅ Collapsed: `grid-template-columns: 72px 1fr`
- ✅ Mobile: `grid-template-columns: 1fr` (sidebar = fixed overlay)
- ✅ Контент растягивается плавно при collapse
- ✅ Нет layout shift или пустого пространства

### Sidebar Collapse:
- ✅ Toggle button работает (click)
- ✅ Состояние сохраняется в localStorage
- ✅ Плавная анимация (300ms)
- ✅ Labels fade out, icons остаются
- ✅ Tooltips появляются при hover (collapsed)
- ✅ Icon rotation (chevron left/right)

### Wizard Layout:
- ✅ Centered content (max 960px)
- ✅ Top padding `--space-6`
- ✅ Нет sidebar
- ✅ Responsive на mobile

### Mobile:
- ✅ Sidebar = fixed overlay drawer
- ✅ Burger button visible
- ✅ Overlay backdrop с fade in
- ✅ Body scroll lock
- ✅ Grid: single column

### Accessibility:
- ✅ `aria-expanded` обновляется
- ✅ `aria-label` на toggle button
- ✅ `:focus-visible` на всех navitems
- ✅ Keyboard navigation (Tab, Enter)

---

## 📝 Breaking Changes

⚠️ **Changes required:**
- `.app-shell` → `.dashboard-shell` (rename class)
- `dashboard.html` markup update
- Add `<body class="layout-dashboard">` to dashboard pages
- Sidebar needs toggle button added

---

## 🔮 Future Enhancements

- [ ] Sidebar resizable (drag handle)
- [ ] Auto-expand on hover (collapsed mode)
- [ ] Keyboard shortcut (Cmd+B to toggle)
- [ ] Pinned/favorite items
- [ ] Multiple sidebar widths (compact, normal, wide)
- [ ] Sidebar themes (different backgrounds)

---

**Status:** ✅ Ready for Implementation
**Total estimated time:** 9-13 hours
**Priority:** HIGH (blocks dashboard UX improvements)
