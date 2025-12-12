# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**301-ui** is a modular authentication and UI frontend for the 301.st project, deployed as a Cloudflare Worker at `app.301.st`. It provides:

- Authentication pages (login, registration, password reset)
- UI Style Guide (accessible at `/ui-style-guide`)
- Integration with backend API at `https://api.301.st/auth`
- Cloudflare account connection wizard
- Foundation for future user cabinet, domain management, and TDS/streams functionality

**Stack:** TypeScript + Vite + Vanilla DOM-JS (no frameworks) + Cloudflare Workers + Cloudflare Turnstile + HTML Partials System

## API Reference Documentation

**All API modules must follow the contracts defined in `docs/301-wiki/`.**

The `docs/301-wiki/` directory contains the complete 301.st platform specification. This is the single source of truth for:

- API endpoints, request/response schemas, and authentication flows
- Data models and entity relationships
- System architecture and integration patterns
- Security requirements and access control

### Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/301-wiki/API.md` | **Primary reference** - Complete API specification for `/auth` endpoints, OmniFlow, Turnstile integration, token lifecycle |
| `docs/301-wiki/Data_Model.md` | Database schema, entity relationships, multi-tenant isolation |
| `docs/301-wiki/Architecture.md` | System architecture, Cloudflare Workers structure, deployment topology |
| `docs/301-wiki/Frontend.md` | Frontend architecture, Webstudio integration, routing patterns |
| `docs/301-wiki/Integrations.md` | External service integrations (Cloudflare API, domain registrars, analytics) |
| `docs/301-wiki/TDS.md` | Traffic Distribution System specification (future roadmap) |
| `docs/301-wiki/Security.md` | Security model, CORS policies, authentication requirements |
| `docs/301-wiki/Glossary.md` | Platform terminology and concept definitions |

### When Working with API Code

1. **Before implementing**: Check `docs/301-wiki/API.md` for the authoritative endpoint spec
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

**Always run `npm run build:icons` after adding/modifying icons.**

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
Always use partials for header/footer/sidebar. Page-specific content (breadcrumbs, badges) stays inline. See existing pages (index.html, dashboard.html, wizard.html) for examples.

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
│   └── types.ts      # TypeScript interfaces for API contracts
├── forms/            # Form initialization and handlers (@forms/*)
│   ├── login.ts
│   ├── register.ts
│   ├── reset-request.ts
│   ├── reset-verify.ts
│   ├── reset-confirm.ts
│   ├── verify.ts     # Email/omni-token verification
│   └── cf-wizard.ts  # Cloudflare account connection wizard
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
│   ├── theme.ts            # Dark/light theme switching
│   └── password-toggle.ts  # Password visibility toggle
├── utils/            # General utilities (@utils/*)
│   ├── errors.ts     # API error creation
│   ├── json.ts       # Safe JSON parsing
│   ├── logger.ts     # Debug logging
│   ├── password.ts   # Password strength validation
│   └── webstudio.ts  # Webstudio integration helpers
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
- Base API URL: `https://api.301.st/auth`
- `apiFetch()` in `client.ts` automatically adds Bearer token from auth state
- All responses parsed as JSON; errors thrown with structured `ApiError`
- **API specification**: `docs/301-wiki/API.md` (local reference, always up-to-date)
- All endpoint contracts, schemas, and auth flows documented in the wiki

**4. Cloudflare Worker**
- `src/worker.ts` handles routing and serves static assets
- `/env` endpoint exposes `TURNSTILE_SITEKEY` for client use
- Requests to `/auth/*` routes are rewritten to serve `index.html` (SPA mode)
- Static assets served from `public/` directory via Wrangler's asset binding

**5. Icon System**
- Icons referenced via `data-icon="mono/icon-name"` or `data-icon="brand/provider"`
- Two categories: `mono/` (monochrome UI icons) and `brand/` (provider logos)
- Icons use `currentColor` for automatic theme compatibility
- Injected as SVG sprite on page load via `injectIconSprite()` in `main.ts`

## UI Style Guide - Critical Rules

**The UI Style Guide (`docs/StyleGuide.md` and `/ui-style-guide` page) is the single source of truth for all design decisions.**

### Repository Ecology Rule
> Whenever design system updates are introduced, ALL UI components and ALL demo pages must be refactored to follow the new rules. No page in the system is allowed to use outdated paddings, heights, or markup. StyleGuide + demo pages = single source of truth.

### Component Development Process
1. Any new UI state/variant must FIRST be described in `docs/StyleGuide.md`
2. Add example to `/ui-style-guide` demo page (in `static/ui-style-guide.html`)
3. Only after documentation + demo, use the pattern in real pages
4. **Never** create alternative versions of existing components with different markup
5. All changes to UI require updating: (a) styles, (b) demo, (c) documentation

### Design System Constraints
- **No Tailwind** - Use vanilla CSS with custom properties (CSS variables)
- **No fixed heights** - All interactive controls use formula: `height = font-size × line-height + padding × 2`
- **Unified control system** - Buttons, chips, search bars, tabs, and inputs share the same sizing recipe
- **Theme support** - All components work in both dark (default) and light themes via `[data-theme]`
- **Icon sizing** - Icons use `1em` sizing with `currentColor` for theme compatibility
- **Orange buttons** - Reserved ONLY for Cloudflare-specific actions (`.btn--cf`)
- **Primary buttons** - Blue (`.btn--primary`) for all other actions

### Component Naming Convention
- Use BEM modifiers: `.btn.btn--primary`, `.btn.btn--ghost`, `.btn.btn--danger`
- Legacy class names (`.btn-ghost`, `.btn-danger`) are deprecated
- Size modifiers: `.btn--sm`, `.btn--md` (default), `.btn--lg`

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
- **Pill vs Field** - Validates border-radius usage (`.btn` uses `--r-pill`, `.input` uses `--r-field`)
- **Table Search Bar** - Enforces single canonical markup without `type="search"` or `min-width` overrides
- **Component naming** - Catches legacy class names (`.btn-ghost` → `.btn.btn--ghost`)
- **Layout rhythm** - Verifies spacing uses tokens (`--inline-gap`, `--stack-gap`) instead of hardcoded rem/px
- **Icon sizing** - Ensures icons inside controls are `1em`, not fixed px sizes
- **Accessibility** - Validates `:focus-visible`, `aria-label`, `aria-pressed`, `role="status"`
- **i18n coverage** - Flags visible text missing translation keys
- **Build artifacts** - Checks that `build/` and `build/purge-report/` aren't committed

**What the agent does:**
1. Scan recent diffs or traverse `src/` and `static/`
2. Compare against canonical sources (`docs/StyleGuide.md`, `static/ui-style-guide.html`)
3. Report violations in three severity levels: Critical → Major → Minor
4. Provide ready-to-apply patches for each issue
5. Generate a GitHub Issue draft with proper labels and tasks

**Report structure:**
- Critical issues (breaking design system rules)
- Major issues (inconsistencies with demo pages)
- Minor issues (optimization opportunities)
- Praise (when everything is correct)
- GitHub Issue draft template (in English, ready to copy)

**When to use this agent:**
- After implementing new UI components
- Before committing CSS/HTML changes
- When updating demo pages or style guide
- As part of PR review process
- When you suspect design system violations

## Known API Contract Gaps

The following discrepancies exist between the current UI implementation and the authoritative specification in `docs/301-wiki/API.md`:

1. **Verification endpoint** - UI sends `{type, token}` but API expects only `{token}` (type is embedded)
2. **Login form** - API supports `phone` OR `email`, but UI only supports `email`
3. **Login/me responses** - API returns `active_account_id`, `accounts[]`, `expires_in` but UI types only expect `access_token` and minimal `user`
4. **Registration response** - API returns `{status, mode, channel, token}` for pending verification, but UI expects immediate `access_token`

**These gaps are documented in README.md under "Известные расхождения с API" and represent technical debt to be addressed.**

When fixing these gaps:
- Consult `docs/301-wiki/API.md` for correct schemas
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
2. Redirect to provider OAuth URL (generated via `google.ts` / `github.ts`)
3. Provider redirects back with code/token
4. Backend exchanges code for access token
5. Frontend stores token and loads user profile

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

### Adding Translations
1. Add keys to `src/i18n/locales/en.ts` and `src/i18n/locales/ru.ts`
2. Use `t('key.path')` in code to get translation
3. Apply to DOM elements with `data-i18n` attribute
4. Language switcher updates `localStorage` and re-renders all `data-i18n` elements

## Webstudio Integration

`utils/webstudio.ts` provides helpers for integrating with Webstudio layouts:
- `setWSVar(key, value)` - Expose variables to Webstudio
- `updateFetchBuster()` - Trigger Webstudio to re-fetch auth state
- Auth token automatically passed as `authBearer` variable

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
4. **View style guide**: Navigate to `/ui-style-guide`
5. **Check icons**: Navigate to `/icons-preview.html`

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
