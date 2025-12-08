# 301 UI Worker

Modular frontend for 301.st authentication pages, built with Vite and deployed via Cloudflare Worker. Today the repo ships the login/registration/reset flows, Turnstile integration, OAuth starts, and auth-state helpers that power the existing auth page.

The broader product roadmap (user cabinet, integrations, domains, TDS/streams, sites, redirects, admin tooling) is captured in `docs/ui-roadmap.ru.md`; the current codebase is the "layer 0" foundation described there.

> 🔗 **Backend API spec:**
> https://github.com/admin310st/301/wiki/API

The current codebase covers the core login/register/reset flows with Turnstile, Omni-token verification for password reset, and OAuth start links. However, a recent audit against the [API wiki](https://github.com/admin310st/301/wiki/API) shows several gaps and contract drifts that need to be addressed.

## Current implementation (code status)

- **Email/password auth** with Turnstile for login and registration (`src/forms/login.ts`, `src/forms/register.ts`).
- **Password reset** via email/TG identifier with Turnstile, including reset-session verification and CSRF handling (`src/forms/reset-request.ts`, `src/forms/reset-verify.ts`, `src/forms/reset-confirm.ts`).
- **Register verification** handler wired to `/auth/verify` on hash `#verify` (`src/forms/verify.ts`).
- **OAuth start links** for Google and GitHub (`src/social/google.ts`, `src/social/github.ts`).
- **Session restore/refresh** via `/auth/refresh` and `/auth/me` (`src/state/auth-state.ts`).

## Known divergences vs API wiki

1. **Verify request shape** — API expects only `{ token, code? }` with type encoded inside the token, but UI sends `{ type: 'register', token }` and ignores reset verification in this path. This breaks OmniFlow parity, especially for phone/OTP variants. 【F:src/api/types.ts†L46-L55】【F:src/forms/verify.ts†L21-L48】【d519b4†L31-L64】
2. **Login inputs** — API supports `email` **or** `phone` plus password and requires Turnstile; the UI form only accepts email/password and never passes phone. 【F:src/forms/login.ts†L39-L67】【9bcd75†L18-L39】
3. **Response typing** — API returns `active_account_id`, `accounts`, and `expires_in` for `/auth/login` and `/auth/me`, but client types only model `access_token` and a minimal `user` object. Downstream UI ignores account selection entirely. 【F:src/api/types.ts†L12-L24】【F:src/api/types.ts†L66-L78】【e7e50e†L12-L35】
4. **Register response** — API returns `{ status, mode, channel, token }` while the UI types still expect `access_token`/`user` and treat any message as final success. This can mislead the UI into thinking registration is complete before verification. 【F:src/api/types.ts†L25-L37】【03ba13†L35-L58】

Use the bullets above as the starting backlog to bring the UI back in sync with the backend contract.

---

## Project structure

```text
301-ui/
├── index.html            # Vite entry, forms markup with data-* attributes
├── public/               # Built assets (Vite outDir)
├── src/
│   ├── api/              # API client and typed endpoints
│   │   ├── client.ts     # apiFetch, error shape { status, body }
│   │   ├── auth.ts       # login/register/reset/verify, OAuth start, logout
│   │   └── types.ts      # request/response types (kept in sync with API spec)
│   ├── forms/            # Form initializers (login/register/reset/verify)
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── reset-request.ts
│   │   ├── reset-confirm.ts
│   │   └── verify.ts
│   ├── social/           # OAuth flows (Google, GitHub)
│   │   ├── google.ts
│   │   └── github.ts
│   ├── state/            # Auth state, token, /me, refresh, subscriptions
│   │   └── auth-state.ts
│   ├── ui/               # DOM utils, notifications, visibility helpers
│   │   ├── dom.ts        # qs/qsa, setFormState, state attributes
│   │   ├── notifications.ts
│   │   └── visibility.ts # data-onlogin/onlogout/auth-email handlers
│   ├── utils/            # Generic helpers (json/errors/logger/webstudio)
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   └── webstudio.ts  # setWSVar(), authFetchBuster() integration
│   ├── turnstile.ts      # Auto-load + render Turnstile, resetTurnstile()
│   └── main.ts           # Vite entry point, bootstraps all forms + auth state
├── static/               # Static assets for local dev
├── vite.config.ts        # Build to public/
├── tsconfig.json         # strict TS + alias
└── wrangler.toml         # Cloudflare Worker deploy config
````

---

## Auth flows → files mapping

This section tells you **exactly where each API endpoint is used in the UI**.

> All endpoints below are under the `/auth` prefix on the backend.
> See the API wiki for full details and error codes.

### 1) Register (email + password)

* **Backend endpoint:** `POST /auth/register`
* **Turnstile:** **required** (`turnstile_token` in request body)
* **Files:**

  * `src/forms/register.ts` – form handler, Turnstile token, client validation
  * `src/api/auth.ts` → `register()`
  * `src/api/types.ts` → `RegisterRequest`, `RegisterResponse`

**Contract notes:**

* UI must:

  * Collect email + password
  * Validate password strength **before** sending (length + complexity)
  * Require Turnstile token (do not submit without it)
  * Show success message about email confirmation link

---

### 2) Login (email + password)

* **Backend endpoint:** `POST /auth/login`
* **Turnstile:** **required**
* **Files:**

  * `src/forms/login.ts`
  * `src/api/auth.ts` → `login()`
  * `src/state/auth-state.ts` → `setAuthToken()`, `setUser()`

**Contract notes:**

* UI must:

  * Require Turnstile token (do not submit without it)
  * On success:

    * Store access token
    * Fetch `/auth/me`
    * Update UI via visibility helpers (`data-onlogin`, `data-auth-email`)
  * Map common error codes to human-readable messages
    (e.g. `invalid_credentials`, `turnstile_failed`, `turnstile_required`).

---

### 3) Email verification (Omni token)

* **Backend endpoint:** `POST /auth/verify`
* **Request body:**

  * `{"token": "omni-token"}` (no `type` field – type is encoded inside the token)
* **Files:**

  * `src/forms/verify.ts`
  * `src/api/auth.ts` → `verifyToken()`
  * `src/api/types.ts` → `VerifyRequest`, `VerifyResponse`

**Contract notes:**

* UI reads `?type=register|reset&token=...` from URL:

  * `type` is only used for **UI flow selection**, not sent to backend.
* On success:

  * For `type=register`: complete registration → set token → `/auth/me` → redirect to account.
  * For `type=reset`: mark reset as confirmed → redirect to reset-confirm form.

---

### 4) Password reset: request

* **Backend endpoint:** `POST /auth/reset_password`
* **Turnstile:** **required**
* **Files:**

  * `src/forms/reset-request.ts`
  * `src/api/auth.ts` → `requestPasswordReset()`

**Contract notes:**

* UI must:

  * Require email + Turnstile
  * Show success message about reset link (15 min TTL)
  * Handle special errors:

    * `oauth_only` → suggest login via provider (Google/GitHub/etc)
    * `email_not_verified` → suggest email verification / registration

---

### 5) Password reset: confirm

* **Backend endpoint:** `POST /auth/confirm_password`
* **Files:**

  * `src/forms/reset-confirm.ts`
  * `src/api/auth.ts` → `confirmPasswordReset()`

**Contract notes:**

* UI must:

  * Validate new password on client (same rules as registration)
  * Use CSRF + reset session according to API spec
  * Handle errors:

    * `reset_session_required`
    * `reset_session_expired`
    * `csrf_token_invalid`
    * `password_reused`

---

### 6) OAuth (Google, GitHub)

* **Backend endpoints:**

  * `GET /auth/oauth/google/start`
  * `GET /auth/oauth/github/start`
* **Files:**

  * `src/api/auth.ts` → `socialStartGoogle()`, `socialStartGithub()`
  * `src/social/google.ts`, `src/social/github.ts`
  * `src/state/auth-state.ts` → token + `/auth/me` after success
* **Success callback:**

  * `/auth/success?token=JWT` (handled in UI, saves token and redirects)

**Contract notes:**

* UI calls `GET /auth/oauth/*/start`, expects JSON with auth URL, then:

  * Redirects browser to the provider
  * Handles callback token on `/auth/success`

---

### 7) Session & profile

* **Endpoints:**

  * `POST /auth/refresh`
  * `GET /auth/me`
* **Files:**

  * `src/api/auth.ts` → `refresh()`, `me()`
  * `src/state/auth-state.ts` → `initAuthState()`, `scheduleRefresh()`
  * `src/ui/visibility.ts` → toggles UI elements

**Contract notes:**

* Access token is stored in memory / localStorage.
* Refresh cookie is HttpOnly; UI calls `/auth/refresh` when needed.
* `/auth/me` is used both:

  * On startup (to restore session)
  * For health checks (see `authFetchBuster()`).

---

## Turnstile integration

* **Script loader + widget handling:** `src/turnstile.ts`
* **Usage in forms:**

  * Each protected form contains `.turnstile-widget` + hidden `input[name="turnstile_token"]`.
  * Forms must **not** submit if Turnstile token is missing.

Helper functions:

* `renderTurnstileWidgets()` – find and render widgets
* `getTurnstileToken(form)` – get token for a specific form
* `resetTurnstile(form)` – reset widget after server-side Turnstile error

---

## Integration with Webstudio

The UI is designed to be embedded into Webstudio pages.

Key conventions:

* **Form discovery:**
  Forms are located by `data-form` attributes:

  * `data-form="login"`
  * `data-form="register"`
  * `data-form="reset-request"`
  * `data-form="reset-confirm"`
  * `data-form="verify"`

* **Form status:**
  Each form contains an element with `data-status` to show messages and states:

  * `data-status="pending" | "error" | "success"` via `setFormState()`.

* **Visibility toggles:**

  * `[data-onlogin]` – visible only when user is logged in
  * `[data-onlogout]` – visible only when user is logged out
  * `[data-auth-email]` – filled with current user email, if any

* **Webstudio variables:**
  `src/utils/webstudio.ts` provides helpers:

  * `setWSVar(name, value)` – set Webstudio variable if available
  * `authFetchBuster()` – can ping `/auth/me` and bump a version var, used for reactivity

> ⚠️ Markup in Webstudio should follow these data attributes.
> JS assumes this structure; please do not rename the attributes without updating the code.

---

## Local development

```bash
npm install
npm run dev        # Vite dev server http://localhost:5173
```

Build:

```bash
npm run build      # Build to public/
npm run preview    # Local preview from built files
```

---

## Cloudflare Worker deploy

```bash
npm run build
wrangler deploy    # Uses wrangler.toml and serves public/
```

Current `wrangler.toml` (kept in sync with the worker entry + Vite output):

```toml
name = "301-app"
main = "src/worker.ts"
compatibility_date = "2024-10-10"

[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

* `main` points to the TypeScript worker entry.
* `assets.directory` matches the Vite build output (`public/`).
* `not_found_handling = "single-page-application"` ensures SPA-style routing for deep links.

---

## Sync with backend API

Auth endpoints and error mappings in this repo mirror the backend API spec from the Wiki. When the backend changes, please update:

* Request/response types in `src/api/types.ts`
* Endpoint wrappers in `src/api/auth.ts`
* Form handlers in `src/forms/`

The source of truth for the contract remains the backend Wiki; use it to verify new fields or error codes.