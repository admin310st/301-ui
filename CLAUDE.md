# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**301-ui** is a modular authentication and UI frontend for the 301.st project, deployed as a Cloudflare Worker at `app.301.st`. It provides:

- Authentication pages (login, registration, password reset)
- Integration with backend API at `https://api.301.st/auth`
- Cloudflare account connection via drawer (Instructions, Scoped Token, Quick Setup)
- Domains management UI with filters, bulk actions, inspector drawer
- Foundation for user cabinet and TDS/streams functionality

**Stack:** TypeScript + Vite + Vanilla DOM-JS (no frameworks) + Cloudflare Workers + Cloudflare Turnstile + HTML Partials System

## Task Management & Roadmap

**Central TODO index:** [`docs/TODO-index.md`](docs/TODO-index.md)

This is your single source of truth for all project tasks, priorities, and roadmap:

- **Current focus:** What to work on next (Redirects → Projects → Sites)
- **Detailed TODOs:** Links to page-specific TODO files (e.g., `TODO-domains.md`)
- **Roadmap phases:** Layer-by-layer progress (Auth → Integrations → Domains → Projects/Sites/Streams → Redirects/TDS → Admin)
- **Known blockers:** API gaps, missing fields, dependencies
- **Mock data examples:** Structure for each entity type

**When starting new features:**
1. Check `docs/TODO-index.md` for priorities and existing plans
2. Create detailed `TODO-{feature}.md` if needed
3. Update index with progress and status
4. Follow established patterns (dashboard layout, table + drawer, mock-first)

**Detailed TODO files:**
- `TODO-domains.md` - Domains page development (MVP complete, API integration pending)

## API Reference Documentation

**All API modules must follow the contracts defined in `docs/301-wiki/`.**

The `docs/301-wiki/` directory contains the complete 301.st platform specification. This is the single source of truth for:

- API endpoints, request/response schemas, and authentication flows
- Data models and entity relationships
- System architecture and integration patterns
- Security requirements and access control

**Git Submodule Setup:**
The documentation is included as a git submodule from [301.wiki repository](https://github.com/admin310st/301.wiki.git).

- **First-time setup** (after cloning 301-ui): `git submodule update --init --recursive`
- **Update documentation** (pull latest changes from 301.wiki): `git submodule update --remote docs/301-wiki`

### Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/TODO-index.md` | **Task management** - Central index of all TODOs, roadmap priorities, current focus, detailed task files |
| `docs/301-wiki/API_Auth.md` | **Primary auth reference** - Authentication API specification for `/auth` endpoints, OmniFlow, Turnstile integration, token lifecycle, OAuth flows |
| `docs/301-wiki/API_Integrations.md` | **Integrations API reference** - Complete CRUD specification for `/integrations` endpoints: Cloudflare bootstrap, Namecheap, API key management |
| `docs/301-wiki/Data_Model.md` | Database schema, entity relationships, multi-tenant isolation |
| `docs/301-wiki/Architecture.md` | System architecture, Cloudflare Workers structure, deployment topology |
| `docs/301-wiki/Frontend.md` | Frontend architecture, routing patterns |
| `docs/301-wiki/Integrations.md` | External service integrations (Cloudflare API, domain registrars, analytics) |
| `docs/301-wiki/Appendix.md` | **Entity hierarchy** - Projects, Sites, Zones, Domains structure, deletion scenarios, migration patterns |
| `docs/301-wiki/TDS.md` | Traffic Distribution System specification (future roadmap) |
| `docs/301-wiki/Security.md` | Security model, CORS policies, authentication requirements |
| `docs/301-wiki/Glossary.md` | Platform terminology and concept definitions |

### When Working with API Code

1. **Before implementing**: Check `docs/301-wiki/API_Auth.md` or `docs/301-wiki/API_Integrations.md` for the authoritative endpoint spec
2. **TypeScript types** in `src/api/types.ts` should match the schemas documented in the wiki
3. **Known discrepancies** are tracked in README.md under "Известные расхождения с API"
4. **When in doubt**: The wiki specification overrides current code implementation

**Example:** The wiki specifies that `/auth/verify` accepts only `{token}` (type embedded), but current code sends `{type, token}`. The wiki is correct; code needs updating.

## Development Commands

### Build and Development
```bash
npm run dev              # Start Vite dev server on port 5173
npm run build            # Build for production (outputs to public/)
npm run preview          # Preview production build locally
npm run deploy           # Build and deploy to Cloudflare Workers
npm run build:icons      # Generate icon sprite from static/img/icons-src/
```

### Icon System
Icons are built from SVG sources in `static/img/icons-src/` into:
- `static/icons-sprite.svg` - SVG sprite for use in HTML
- `static/icons-map.json` - Icon metadata
- `static/icons-preview.html` - Visual preview page

**IMPORTANT: Icon Usage Rules**
1. **Before using an icon**, ALWAYS verify it exists in the catalog:
   - Check `static/img/icons-src/mono/` for monochrome icons
   - Check `static/img/icons-src/brand/` for brand logos
   - OR view the full catalog at `/icons-preview.html` (generated file)
2. **If icon doesn't exist**:
   - Request the user to add it to `static/img/icons-src/`
   - OR suggest an alternative icon from existing catalog
   - NEVER reference icons that don't exist in the project
3. **After adding/modifying icons**, run `npm run build:icons` to regenerate sprite

**Icon naming convention:** Use `data-icon="mono/icon-name"` or `data-icon="brand/provider"` in HTML.

### Testing Utilities
```bash
npm run purge:report     # Analyze unused CSS (output to build/purge-report, not committed)
```

## HTML Partials System

To eliminate code duplication across pages, the project uses a custom Vite plugin for HTML partials:

**Syntax:**
```html
{{> partial-name}}                    <!-- Simple include -->
{{> sidebar activePage="dashboard"}}  <!-- Parameterized include -->
```

**Available Partials:**
- `partials/header-top.hbs` - Logo, primary navigation, language switcher, theme toggle
- `partials/header-utility.hbs` - Help button, notifications, user menu, logout button
- `partials/footer.hbs` - Footer with brand and links
- `partials/sidebar.hbs` - Sidebar navigation with dynamic `is-active` state
- `partials/add-domains-drawer.hbs` - Drawer for adding domains with smart domain parser
- `partials/connect-cloudflare-drawer.hbs` - Drawer for connecting Cloudflare account with tabs (Instructions, Scoped Token, Quick Setup)

**Implementation:**
The custom Vite plugin (`vite.config.ts`) uses regex-based string replacement during the `transformIndexHtml` hook. It supports:
- Simple partial includes: `{{> partial-name}}`
- Parameterized partials: `{{> sidebar activePage="value"}}`
- Handlebars-style conditionals in partials (resolved at build time)

**Benefits:**
- Header/footer changes require editing only 1 file instead of 4+
- Consistent layout across all pages automatically
- Prepared for 20+ pages from roadmap (Layers 1-7)
- No external dependencies (custom plugin, ~40 lines of code)

**When creating new pages:**
Always use partials for header/footer/sidebar. Page-specific content (breadcrumbs, badges) stays inline. See existing pages (index.html, dashboard.html, integrations.html, domains.html) for examples.

## Architecture

### Module Structure

The codebase uses path aliases defined in both `tsconfig.json` and `vite.config.ts`:

```
partials/
├── header-top.hbs    # Logo, nav, lang, theme
├── header-utility.hbs# Help, notifications, user menu
├── footer.hbs        # Footer with brand
└── sidebar.hbs       # Sidebar navigation (dynamic active state)

src/
├── api/              # Backend API client (@api/*)
│   ├── client.ts     # Base fetch wrapper with auth headers
│   ├── auth.ts       # Auth endpoints (login, register, reset, verify, me, refresh)
│   ├── integrations.ts # Integrations endpoints (Cloudflare, Namecheap, key management)
│   └── types.ts      # TypeScript interfaces for API contracts
├── forms/            # Form initialization and handlers (@forms/*)
│   ├── login.ts
│   ├── register.ts
│   ├── reset-request.ts
│   ├── reset-verify.ts
│   ├── reset-confirm.ts
│   ├── verify.ts     # Email/omni-token verification
│   └── cf-connect.ts # Cloudflare drawer forms (scoped/quick)
├── social/           # OAuth integrations (@social/*)
│   ├── google.ts
│   └── github.ts
├── state/            # Application state management (@state/*)
│   ├── auth-state.ts       # Auth token storage, /auth/me, /auth/refresh
│   └── reset-session.ts    # Password reset session state
├── ui/               # DOM utilities and UI helpers (@ui/*)
│   ├── auth-dom.ts         # Update UI based on auth state
│   ├── auth-routing.ts     # Hash-based routing for auth pages
│   ├── visibility.ts       # Show/hide elements via data-* attributes
│   ├── dom.ts              # General DOM helpers
│   ├── notifications.ts    # Toast/alert messages
│   ├── globalNotice.ts     # Global banner alerts
│   ├── integrations.ts     # Integrations page: table rendering, CRUD actions
│   ├── theme.ts            # Dark/light theme switching
│   └── password-toggle.ts  # Password visibility toggle
├── utils/            # General utilities (@utils/*)
│   ├── errors.ts     # API error creation
│   ├── json.ts       # Safe JSON parsing
│   ├── logger.ts     # Debug logging
│   ├── password.ts   # Password strength validation
│   └── dns.ts        # DNS utilities (NS record queries via DNS over HTTPS)
├── i18n/             # Internationalization (@i18n/*)
│   ├── index.ts
│   ├── dom.ts        # Apply translations to DOM
│   ├── helpers.ts
│   └── locales/
│       ├── en.ts
│       └── ru.ts
├── turnstile.ts      # Cloudflare Turnstile widget management
├── main.ts           # Client-side entry point (bootstraps all forms)
└── worker.ts         # Cloudflare Worker entry point
```

### CSS Organization

The project uses a modular CSS architecture with separate files for different concerns:

```
static/css/
├── theme.css      # Design tokens (colors, spacing, typography, shadows, z-index)
├── layout.css     # Page layout structure (shells, grids, sections)
├── site.css       # Core UI components (buttons, forms, cards, dialogs, modals, alerts)
├── tables.css     # Table components (data tables, filters, badges, tabs)
└── drawers.css    # Drawer components (side panels for forms/details/actions)
```

**Loading order** (must be preserved):
1. `theme.css` - Variables must load first
2. `layout.css` - Page structure
3. `site.css` - General components
4. `tables.css` - Table-specific components (when needed)
5. `drawers.css` - Drawer components (when needed)

**Component separation philosophy:**
- **site.css** - Universal UI components used across all pages (buttons, forms, dialogs, alerts)
- **tables.css** - Domain-specific table components (status badges, filters, bulk actions)
- **drawers.css** - Drawer overlays with loading indicators and responsive behavior
- Drawers were separated from tables.css because they're a general UI pattern, not table-specific

### Key Architectural Patterns

**1. Data Attribute Hooks**
- HTML elements use `data-*` attributes for behavior binding
- Forms: `data-form="login"`, `data-form="register"`, etc.
- Visibility: `data-onlogin`, `data-onlogout` (controlled by auth state)
- Dynamic content: `data-auth-email` (populated with user email)
- Password fields: `data-password-field` (enables show/hide toggle)

**2. State Management**
- `auth-state.ts` manages authentication state with a pub/sub pattern
- Listeners subscribe via `onAuthChange(callback)` to react to auth changes
- Token stored in state, auto-refreshes every 10 minutes
- State updates trigger UI updates via `auth-dom.ts`

**3. API Communication**
- Base API URL: `https://api.301.st/auth` (auth endpoints), `https://api.301.st/integrations` (integrations endpoints)
- `apiFetch()` in `client.ts` automatically adds Bearer token from auth state
- All responses parsed as JSON; errors thrown with structured `ApiError`
- **API specification**: `docs/301-wiki/API_Auth.md` and `docs/301-wiki/API_Integrations.md` (local references, always up-to-date)
- All endpoint contracts, schemas, and auth flows documented in the wiki

**4. Cloudflare Worker & Auth Redirect Strategy**
- `src/worker.ts` handles routing and serves static assets
- **Early redirect for authenticated users**: Worker checks session cookies and redirects `/` → `/dashboard.html` before HTML loads (HTTP 307)
  - Cookie patterns checked: `refresh_token`, `session`, `auth_session`, `_301st_session`
  - This runs on Cloudflare Workers edge for optimal performance
- **Client-side fallback**: `index.html` includes inline script in `<head>` that checks `/auth/refresh` and redirects if session is valid
  - Ensures portability: works on any hosting platform (Vercel, Netlify, static hosting)
  - Body hidden with `opacity: 0` during check to prevent "flash" of login page
  - 3-second timeout to avoid blocking page load on slow networks
- `/env` endpoint exposes `TURNSTILE_SITEKEY` for client use
- Requests to `/auth/*` routes are rewritten to serve `index.html` (SPA mode)
- Static assets served from `public/` directory via Wrangler's asset binding

**5. Icon System**
- Icons referenced via `data-icon="mono/icon-name"` or `data-icon="brand/provider"`
- Two categories: `mono/` (monochrome UI icons) and `brand/` (provider logos)
- Icons use `currentColor` for automatic theme compatibility
- Injected as SVG sprite on page load via `injectIconSprite()` in `main.ts`

**6. Dashboard Layout**
- **Desktop (≥1024px)**: Two-column CSS Grid with sticky sidebar
  - `.dashboard-shell` creates grid: `grid-template-columns: var(--sidebar-width) 1fr`
  - `.sidebar` sticky positioned at `top: var(--header-height)`, spans full viewport height
  - `.dashboard-content` contains page content (tables, cards, forms)
  - Collapsible sidebar: `body.sidebar-collapsed` reduces width from 280px to 64px
- **Mobile (≤1023px)**: Single column with overlay drawer
  - Sidebar becomes `position: fixed` drawer, hidden by default (`transform: translateX(-100%)`)
  - Burger button (`.burger-button`) triggers `body.sidebar-open` class
  - Dark overlay backdrop (`body.sidebar-open::before`) blocks interaction with content
  - `.dashboard-content` gets `padding-inline: var(--space-3)` (12px) to prevent edge sticking
- **Key variables**:
  - `--sidebar-width: 280px` (desktop default)
  - `--sidebar-width-collapsed: 64px` (collapsed state)
  - `--dashboard-gap: 1.5rem` (space between sidebar and content)
- **Sidebar partial**: `{{> sidebar}}` in `partials/sidebar.hbs` - global component used across all dashboard pages
- **Important**: `.page-shell.dashboard-shell` removes default page padding on desktop (grid handles spacing), but mobile requires explicit padding on `.dashboard-content`

## UI Style Guide - Critical Rules

**`docs/StyleGuide.md` is the ONLY source of truth for design system.**

### Repository Ecology Rule
> Whenever design system updates are introduced, ALL UI components must be refactored to follow the new rules. No page in the system is allowed to use outdated paddings, heights, or markup. `docs/StyleGuide.md` = single source of truth.

### Component Development Process
1. Any new UI state/variant must FIRST be described in `docs/StyleGuide.md`
2. Implement in CSS (`static/css/site.css` or component-specific files)
3. Use the pattern in real pages
4. **Never** create alternative versions of existing components with different markup
5. All changes to UI require updating: (a) styles, (b) StyleGuide.md documentation

### Design System Constraints
- **No Tailwind** - Use vanilla CSS with custom properties (CSS variables)
- **No fixed heights** - All interactive controls use formula: `height = font-size × line-height + padding × 2`
- **Unified control system** - Buttons, chips, search bars, tabs, and inputs share the same sizing recipe
- **Theme support** - All components work in both dark (default) and light themes via `[data-theme]`
- **Icon sizing** - Icons inside controls use `1.25em` sizing with `currentColor` for theme compatibility
- **Orange buttons** - Reserved ONLY for Cloudflare-specific actions (`.btn--cf`)
- **Primary buttons** - Blue (`.btn--primary`) for all other actions
- **Border radius rules**:
  - Buttons/chips/toggles → `--r-pill` (999px)
  - Inputs/textareas → `--r-field` (0.75rem)
  - Cards/panels → `--radius-lg` (0.75rem)
  - Dropdowns/menus → `--radius` (0.5rem)
- **Spacing tokens** - Use semantic tokens (`--space-1` through `--space-6`, `--inline-gap`, `--stack-gap`, `--block-gap`, `--section-gap`) instead of hardcoded rem/px values

### Component Naming Convention
- Use BEM modifiers: `.btn.btn--primary`, `.btn.btn--ghost`, `.btn.btn--danger`, `.btn.btn--cf`
- Legacy class names (`.btn-ghost`, `.btn-danger`) are deprecated
- Size modifiers: `.btn--sm`, `.btn--md` (default), `.btn--lg`
- Chip modifiers: `.btn-chip`, `.btn-chip--dropdown`, `.btn-chip--cf`, `.btn-chip--status`, `.btn-chip--primary`, `.btn-chip--sm`

### Never Commit Build Artifacts
- `/dist`, `/public`, `/build/` are local/CI-only
- PurgeCSS reports (`/build/purge-report/`) must not be committed
- Keep repository clean of generated files

## Custom Claude Code Agents

This repository includes a specialized UI code review agent to enforce design system consistency.

### UI Code Reviewer Agent

**Name:** `301-ui-reviewer`
**Location:** `.claude/agents/ui-code-reviewer.md`
**Slash command:** `/uix` (defined in `.claude/commands/uix.md`)
**Model:** Sonnet

**Purpose:** Automated style guide compliance checker that reviews code changes and ensures adherence to the 301.st UI design system.

**How to invoke:**
- **Via slash command:** `/uix` (quickest method)
- **Explicitly:** "Use the 301-ui-reviewer agent to check my changes"
- **Automatically:** Claude may invoke it proactively when detecting UI-related changes

**What it checks:**
- **Unified control recipe** - Ensures buttons, chips, search bars, and tabs use consistent sizing (no fixed heights)
- **Border-radius tokens** - Validates correct usage:
  - `.btn`, `.btn-chip` → `--r-pill` (999px)
  - `.input`, `.textarea` → `--r-field` (0.75rem)
  - `.card.card--panel` → `--radius-lg` (0.75rem)
- **Table Search Bar** - Enforces single canonical markup without `type="search"` or `min-width` overrides
- **Component naming** - Catches legacy class names (`.btn-ghost` → `.btn.btn--ghost`)
- **Layout rhythm** - Verifies spacing uses tokens (`--inline-gap`, `--stack-gap`) instead of hardcoded rem/px
- **Icon sizing** - Ensures icons inside controls are `1.25em`, not fixed px sizes
- **Accessibility** - Validates `:focus-visible`, `aria-label`, `aria-pressed`, `role="status"`
- **i18n coverage** - Flags visible text missing translation keys
- **Build artifacts** - Checks that `build/` and `build/purge-report/` aren't committed

**What the agent does:**
1. Scan recent diffs or traverse `src/` and `static/`
2. Compare against canonical source (`docs/StyleGuide.md`)
3. Report violations in three severity levels: Critical → Major → Minor
4. Provide ready-to-apply patches for each issue
5. Generate a GitHub Issue draft with proper labels and tasks

**Report structure:**
- Critical issues (breaking design system rules)
- Major issues (inconsistencies with existing pages)
- Minor issues (optimization opportunities)
- Praise (when everything is correct)
- GitHub Issue draft template (in English, ready to copy)

**When to use this agent:**
- After implementing new UI components
- Before committing CSS/HTML changes
- When updating style guide (`docs/StyleGuide.md`)
- As part of PR review process
- When you suspect design system violations

## Known API Contract Gaps

The following discrepancies exist between the current UI implementation and the authoritative specification in `docs/301-wiki/API_Auth.md`:

1. ~~**Verification endpoint**~~ - ✅ FIXED: Now correctly sends `{token, code?}`
2. **Login form** - API supports `phone` OR `email`, but UI only supports `email`
3. ~~**Login/Verify response types**~~ - ✅ FIXED: Types now include `expires_in`, `active_account_id`, `accounts[]`
4. **Token lifecycle** - UI doesn't use `expires_in` for proactive token refresh yet
5. **Multi-account support** - UI doesn't use `active_account_id` or `accounts[]` yet

**These gaps represent technical debt to be addressed in future iterations.**

When fixing these gaps:
- Consult `docs/301-wiki/API_Auth.md` for correct schemas
- Update TypeScript types in `src/api/types.ts` to match
- Modify form handlers in `src/forms/` accordingly
- Test against actual backend at `https://api.301.st/auth`

## Authentication Flows

### Login Flow
1. User submits email + password + Turnstile token
2. `POST /auth/login` via `login.ts` → `api/auth.ts`
3. On success: store `access_token`, call `/auth/me`, update UI via `auth-state.ts`
4. Elements with `data-onlogin` become visible, `data-onlogout` hidden
5. User email populated into `data-auth-email` elements

### Registration Flow
1. User submits email + password (with client-side strength check) + Turnstile
2. `POST /auth/register` via `register.ts`
3. Show "check your email" message (verification required)
4. User clicks link from email → `/auth/verify?type=register&token=...`
5. UI reads params, sends token to `/auth/verify`, completes registration

### Password Reset Flow
1. **Request**: User enters email/telegram → `reset-request.ts` → `POST /auth/reset`
2. **Verify**: User receives code/link → `reset-verify.ts` → `POST /auth/reset/verify`
3. **Confirm**: User enters new password → `reset-confirm.ts` → `POST /auth/reset/confirm`
4. Reset session tracked via CSRF token in `reset-session.ts`

### OAuth Flow
1. User clicks Google/GitHub button
2. UI redirects to `/auth/oauth/{google,github}/start?redirect_host={current_host}`
3. Backend validates `redirect_host` (whitelist: `app.301.st`, `dev.301.st`, `301.st`, `localhost:5173`)
4. Provider OAuth screen → user authorizes → callback to backend
5. Backend creates/updates user, generates `access_token` + `refresh_cookie`
6. Backend redirects to `https://{redirect_host}/auth/success?token=...`
7. Frontend extracts token from URL, stores it, and redirects to dashboard

## Working with Forms

Forms use declarative initialization pattern:

```typescript
// In form module (e.g., forms/login.ts)
export function initLoginForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-form="login"]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Handle submission
  });
}

// In main.ts
import { initLoginForm } from '@forms/login';
initLoginForm(); // Called on DOMContentLoaded
```

**Turnstile Integration:**
- Reset Turnstile after each form submission via `resetTurnstile(widgetId)`
- Widget IDs stored in `turnstile.ts` state
- Forms must include Turnstile response token in API requests

## Internationalization

Current languages: English (en), Russian (ru)

**📖 Full conventions:** See `.claude/i18n-conventions.md` for complete guidelines

### Key Structure

**UI elements use hierarchical namespace structure:**

```
common.*           // Общие элементы (pleaseWait, etc)
layout.nav.*       // Навигация (home, integrations, projects, etc)
layout.footer.*    // Футер (about, docs, privacy, etc)
auth.*             // Аутентификация (login, register, reset)
notice.*           // Уведомления

// Dashboard sections (полная структура для каждого раздела)
overview.*         // Dashboard/Overview
integrations.*     // Integrations page
projects.*         // Projects page
domains.*          // Domains page
sites.*            // Sites page
streams.*          // Streams page
redirects.*        // Redirects page
analytics.*        // Analytics page
```

**Each dashboard section has standard structure:**
- `{section}.title`, `{section}.subtitle` - Page headers
- `{section}.empty.*` - Empty state (title, description, cta)
- `{section}.actions.*` - Action buttons (create, edit, delete, etc)
- `{section}.table.columns.*` - Table headers
- `{section}.status.*` - Status labels

### Adding Translations

**For UI elements:**
1. Add keys to `src/i18n/locales/en.ts` and `src/i18n/locales/ru.ts`
2. Use appropriate namespace: `layout.*` for navigation, `{section}.*` for page content
3. Apply to HTML with `data-i18n="key.path"` attribute
4. Language switcher automatically updates all elements

**For new dashboard pages:**
```typescript
// Add to en.ts and ru.ts
newSection: {
  title: 'Section Title',
  subtitle: 'Description',
  empty: {
    title: 'Empty state title',
    description: 'Empty state description',
    cta: 'Call to action'
  },
  actions: {
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete'
  },
  table: {
    columns: {
      name: 'Name',
      status: 'Status'
    }
  }
}
```

**Examples:**
```html
<!-- Page headers -->
<h1 data-i18n="integrations.title">Integrations</h1>
<p data-i18n="integrations.subtitle">Connect your accounts...</p>

<!-- Empty state -->
<button data-i18n="integrations.empty.cta">Connect integration</button>

<!-- Actions -->
<button data-i18n="integrations.actions.connect">Connect</button>

<!-- Table -->
<th data-i18n="integrations.table.columns.provider">Provider</th>
```

**Content pages (About, Privacy, Terms, Security, Docs):**
- Static content, NO i18n attributes
- Separate HTML files per language if needed (future)
- See `.claude/i18n-conventions.md` for rationale

## Common Patterns

### Reading Auth State
```typescript
import { getAuthToken, isLoggedIn, onAuthChange } from '@state/auth-state';

// Get current token
const token = getAuthToken();

// Check login status
if (isLoggedIn()) { /* ... */ }

// Subscribe to changes
onAuthChange((state) => {
  console.log('Auth changed:', state.isLoggedIn, state.user);
});
```

### Making API Calls
```typescript
import { apiFetch } from '@api/client';

const response = await apiFetch<SomeType>('/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data })
});
```

### Showing Notifications
```typescript
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';

showGlobalMessage('success', t('auth.messages.loginSuccess'));
showGlobalMessage('error', 'Something went wrong');
```

### Loading Indicator & Global Notices

The 301-ui project uses a unified loading indicator system that coordinates with global notices to provide seamless visual feedback.

**Architecture:**
- **Loading Bar** - 1px animated shimmer bar in utility-bar border
- **Global Notices** - Alert messages that appear in utility-bar with colored border flash
- **Coordination** - Loading shimmer transitions to notice color, then fixes as border for 600ms

**Visual Flow:**
1. **Loading Phase** - Shimmer animation (blue for auth, orange for Cloudflare)
2. **Completion Phase** - Shimmer "flushes" to notice color (green/red/blue) over 1.5s
3. **Border Flash** - Utility-bar border holds notice color for 600ms
4. **Notice Display** - Global notice slides down with message

#### Manual Loading Control

```typescript
import { showLoading, hideLoading } from '@ui/loading-indicator';

// Show loading indicator
showLoading('brand'); // Blue shimmer for general operations
showLoading('cf');    // Orange shimmer for Cloudflare operations

// Perform operation
await someOperation();

// Hide loading (triggers transition if notice pending)
hideLoading();
```

#### Automatic API Integration

All API functions automatically show loading indicators:

```typescript
import { login, register, logout } from '@api/auth';
import { initCloudflare } from '@api/integrations';

// Auth operations show blue shimmer automatically
await login({ email, password, turnstile_token });
// → showLoading('brand') → hideLoading() → automatic coordination

// Cloudflare operations show orange shimmer automatically
await initCloudflare({ cf_account_id, bootstrap_token });
// → showLoading('cf') → hideLoading() → automatic coordination
```

**API Integration Options:**

The `apiFetch()` function accepts `showLoading` parameter:

```typescript
import { apiFetch } from '@api/client';

// With loading indicator
const data = await apiFetch<ResponseType>('/endpoint', {
  method: 'POST',
  body: JSON.stringify(payload),
  showLoading: 'brand', // or 'cf'
});

// Without loading indicator (silent background requests)
const data = await apiFetch<ResponseType>('/auth/me'); // No loading
```

**Current API Coverage:**
- `login()` - `showLoading: 'brand'`
- `register()` - `showLoading: 'brand'`
- `logout()` - `showLoading: 'brand'`
- `resetPassword()` - `showLoading: 'brand'`
- `verifyToken()` - `showLoading: 'brand'`
- `confirmPassword()` - `showLoading: 'brand'`
- `initCloudflare()` - `showLoading: 'cf'`
- `initNamecheap()` - `showLoading: 'brand'`
- `me()` - No loading (background)
- `refresh()` - No loading (background)

#### Coordinated Notice Display

When showing a notice while loading is active, the system automatically coordinates:

```typescript
import { showGlobalNotice } from '@ui/globalNotice';

// If loading is active, notice waits for shimmer flush
showGlobalNotice('success', 'Operation completed successfully');
// → Checks isLoading()
// → Sets pending flash type
// → Waits for shimmer flush (1.5s) + border flash (600ms)
// → Shows notice

// If no loading, shows immediately
showGlobalNotice('error', 'Something went wrong');
```

#### Best Practices

1. **Don't manually call loading in forms** - API functions handle it automatically
2. **Remove duplicate showLoading/hideLoading** - Check if your API call already has `showLoading` parameter
3. **Use correct type** - `'brand'` for general operations, `'cf'` for Cloudflare-specific
4. **Let coordination happen** - Don't manually delay notices, the system handles timing

**Example: Form Submission (Before/After)**

```typescript
// ❌ BEFORE: Manual loading management
async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  showLoading('cf'); // Duplicate!

  try {
    const response = await initCloudflare(data);
    hideLoading(); // Duplicate!
    showGlobalNotice('success', 'Connected!');
  } catch (error) {
    hideLoading(); // Duplicate!
    showGlobalNotice('error', error.message);
  }
}

// ✅ AFTER: Automatic coordination
async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();

  try {
    const response = await initCloudflare(data);
    // Loading already handled by initCloudflare()
    showGlobalNotice('success', 'Connected!');
    // Notice automatically coordinates with loading completion
  } catch (error) {
    showGlobalNotice('error', error.message);
  }
}
```

**Visual Design Reference:**
- See `docs/StyleGuide.md` for visual specifications
- Shimmer animation: 1.5s ease-in-out (infinite during loading, once during flush)
- Border flash: 600ms solid color hold
- Colors: `--brand` (blue), `--accent-cf` (orange), `--success` (green), `--danger` (red), `--info` (blue)

### Toggling Theme
```typescript
import { toggleTheme, getTheme } from '@ui/theme';

toggleTheme(); // Switch between dark/light
const current = getTheme(); // 'dark' | 'light'
```

## Testing Locally

1. **Start dev server**: `npm run dev`
2. **Access**: http://localhost:5173
3. **Test auth flows**: Use forms at `/#login`, `/#register`, `/#reset`
4. **Check icons**: Navigate to `/icons-preview.html`

**Note:** Backend API must be running at `https://api.301.st/auth` or you'll see CORS/network errors.

## Deployment

```bash
npm run deploy  # Builds and deploys to Cloudflare Workers
```

Deployment configuration in `wrangler.toml`:
- Worker name: `301-app`
- Assets directory: `./public`
- SPA mode: All 404s serve `index.html`
- Environment variables: `TURNSTILE_SITEKEY` (set in Cloudflare dashboard)

## History and Changelog

See `CHANGELOG.md` for detailed version history and changes. Notable milestones:
- **v0.2.0** (2025-12-12): Cards v2, unified controls, partials system, PR review bot
- **v0.1.0** (2025-12-11): Initial auth pages, Style Guide foundation, Turnstile integration

## Future Development Roadmap

See `docs/ui-roadmap.ru.md` for the complete roadmap. Key upcoming features:

**Layer 0 (Current):** Auth pages + UI Style Guide foundation

**Layer 1:** Integrations management (Cloudflare accounts, domain registrars)

**Layer 2:** Domain management (sync from providers, status monitoring)

**Layer 3:** Projects (logical grouping of domains, sites, streams)

**Layer 4:** Sites management (landing pages, whitelists)

**Layer 5:** TDS/Streams (traffic distribution system)

**Layer 6:** Redirect rules

**Layer 7:** Admin tools (jobs, system monitoring, marketplace)

All future screens must follow the existing Style Guide patterns and component library.
