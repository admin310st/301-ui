# Layout & Grid System

## Layout Types

| Page Type | Body Class | Sidebar | Grid |
|-----------|-----------|---------|------|
| **Dashboard** | `.layout-dashboard` | Collapsible | `var(--sidebar-width) 1fr` |
| **Wizard** | `.layout-wizard` | None | Centered, max 960px |
| **Auth** | `.layout-auth` | None | 2-column auth grid |
| **Content** | `.layout-content` | None | Single column, max 800px |

## Key CSS Variables

Defined in `static/css/theme.css` and `static/css/layout.css`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `--sidebar-width` | `280px` | Sidebar expanded width |
| `--sidebar-width-collapsed` | `64px` | Sidebar collapsed width |
| `--header-height` | `96px` | Total header height |
| `--dashboard-gap` | `1.5rem` | Gap between sidebar and content |
| `--z-sidebar` | `100` | Sidebar z-index |
| `--z-sidebar-overlay` | `99` | Mobile overlay z-index |

## Responsive Breakpoints

| Breakpoint | Sidebar Behavior | Grid |
|------------|-----------------|------|
| **Mobile** `<1024px` | Fixed overlay drawer, hidden by default | `1fr` single column |
| **Tablet** `1024-1279px` | Sidebar 240px, gap 1rem | `240px 1fr` |
| **Desktop** `>=1280px` | Sidebar 280px, collapsible to 64px | `280px 1fr` |

## Dashboard Grid Rules

- `.dashboard-shell` uses CSS Grid: `grid-template-columns: var(--sidebar-width) 1fr`
- `body.sidebar-collapsed` switches to `var(--sidebar-width-collapsed) 1fr`
- `.dashboard-content` must have `min-width: 0` to prevent overflow
- Mobile: `.dashboard-content` needs `padding-inline: var(--space-3)` (grid gap is removed)

## Sidebar Collapse

- State class: `body.sidebar-collapsed`
- Persisted in `localStorage` key `ui.sidebar.collapsed`
- Transition: `300ms cubic-bezier(0.4, 0, 0.2, 1)`
- Labels: `opacity: 0` + `pointer-events: none` when collapsed
- Icons: remain visible, centered
- Tooltips: appear on hover via `data-tooltip` attr + `::after` pseudo-element
- Toggle button: update `aria-expanded` and swap icon (`menu-close` / `menu-open`)

## Mobile Sidebar Drawer

- Sidebar becomes `position: fixed; transform: translateX(-100%)`
- `body.sidebar-open` shows sidebar + dark overlay backdrop
- `body.sidebar-open` locks body scroll (`overflow: hidden`)
- Burger button (`.burger-button`) visible only below 1024px

## Do / Don't

| Do | Don't |
|----|-------|
| Use `--sidebar-width` variable for grid columns | Hardcode `280px` in grid definitions |
| Add `min-width: 0` on grid children | Let content overflow the grid |
| Use `--dashboard-gap` for sidebar-content spacing | Use custom margin/padding between sidebar and content |
| Set `padding-inline` on `.dashboard-content` for mobile | Assume grid gap handles mobile spacing |
| Use `--space-*` tokens for internal spacing | Use raw `rem`/`px` values in layout |
| Test collapsed state and mobile drawer after layout changes | Only test expanded desktop view |
