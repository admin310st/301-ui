# 301 UI ↔ Auth API sync (Codex tasks)

This file describes **concrete tasks** to keep the UI in sync with the backend auth API:
https://github.com/admin310st/301/wiki/API

All changes must respect:

- Existing HTML structure in Webstudio (data-* attributes).
- Existing module boundaries:
  - `src/api` – network layer
  - `src/forms` – form handling + state
  - `src/state` – auth token and user
  - `src/ui` – DOM + notifications
  - `src/turnstile.ts` – Turnstile integration

---

## 0. General rules

1. Do **not** change HTML data attributes (`data-form`, `data-onlogin`, etc.) – these are used by Webstudio layouts.
2. Do **not** hardcode API URLs – they are based on `API_ROOT` in `src/api/client.ts`.
3. Keep all new messages in English (or easily translatable).
4. Do not add custom CSS from JS – only change classes/attributes.

---

## Task 1 — Make Turnstile mandatory for register & login

**Goal:** match the API docs: Turnstile is required on `/auth/register` and `/auth/login`.

**Files:**

- `src/forms/register.ts`
- `src/forms/login.ts`
- `src/turnstile.ts` (already provides `getTurnstileToken` and `resetTurnstile`)

**What to do:**

1. In both forms, before calling `register()` / `login()`:

   - Call `getTurnstileToken(form)`.
   - If token is missing (`null` or empty), **do not** send the request.
   - Instead, call:

     ```ts
     setFormState(form, 'error', 'Please complete the Turnstile check.');
     ```

2. When a server error with `error === 'turnstile_required'` or `error === 'turnstile_failed'` is returned:

   - Map it to a human-readable message in the local error mapper (if not present).
   - Call `resetTurnstile(form)` so the widget is re-rendered.

---

## Task 2 — Align OAuth start methods with API (GET, not POST)

**Goal:** `/auth/oauth/google/start` and `/auth/oauth/github/start` must be called with `GET`, as in the API spec.

**Files:**

- `src/api/auth.ts`
- `src/social/google.ts`
- `src/social/github.ts`

**What to do:**

1. In `src/api/auth.ts`, change:

   ```ts
   socialStartGoogle(): apiFetch('/oauth/google/start', { method: 'POST' })
````

to:

```ts
socialStartGoogle(): apiFetch('/oauth/google/start')
```

And same for `socialStartGithub()`.

2. Ensure `social/google.ts` and `social/github.ts`:

   * Read the auth URL from the response (`auth_url` or `url`).
   * Redirect via `window.location.assign(authUrl)`.

3. Do not send any request body with these GET calls.

---

## Task 3 — Fix `/auth/verify` request payload

**Goal:** `/auth/verify` should only receive a token (and optionally a numeric code for OTP), not a `type` field.

**Files:**

* `src/api/types.ts` (`VerifyRequest`)
* `src/api/auth.ts` (`verifyToken`)
* `src/forms/verify.ts`

**What to do:**

1. Update `VerifyRequest`:

   ```ts
   export interface VerifyRequest {
     token: string;
     code?: string; // optional, for phone OTP (future)
   }
   ```

2. In `src/forms/verify.ts`:

   * When parsing URL params, read:

     ```ts
     const type = params.get('type');   // used only for UI flow: 'register'|'reset'
     const token = params.get('token'); // used for API
     ```

   * Build `VerifyRequest` as `{ token }` only.

   * Pass `type` only to UI logic (branching between register and reset flows), not to `verifyToken()`.

3. Make sure the UI flows after verification are:

   * For `type=register`: save token, call `/auth/me`, redirect to account UI.
   * For `type=reset`: mark reset confirmed, redirect to reset-confirm page/section.

---

## Task 4 — Client-side password validation

**Goal:** enforce basic password rules on the client before sending to the backend (as documented in the API).

**Files:**

* `src/utils/password.ts` (new helper file)
* `src/forms/register.ts`
* `src/forms/reset-confirm.ts`

**What to do:**

1. Create `src/utils/password.ts` with:

   ```ts
   export function validatePasswordStrength(password: string): string | null {
     if (!password || password.length < 8) {
       return 'Password must be at least 8 characters long.';
     }

     const hasLower = /[a-z]/.test(password);
     const hasUpper = /[A-Z]/.test(password);
     const hasDigit = /\d/.test(password);

     if (!hasLower || !hasUpper || !hasDigit) {
       return 'Password must contain upper and lower case letters and at least one digit.';
     }

     return null;
   }
   ```

2. In `register.ts` and `reset-confirm.ts`:

   * Before sending the request, call `validatePasswordStrength(password)`.
   * If the function returns a non-null message:

     * Call `setFormState(form, 'error', message);`
     * Do not send the request.

3. Leave server-side error `password_too_weak` handling as a fallback.

---

## Task 5 — Map reset flow error codes to messages

**Goal:** map important backend error codes to readable UI messages in the reset flow.

**Files:**

* `src/forms/reset-request.ts`
* `src/forms/reset-confirm.ts`
* (local error-mapping helpers in these files)

**What to do:**

1. In `reset-request.ts`, ensure the following codes are mapped:

   * `oauth_only` → "This account uses OAuth only. Please sign in with your provider."
   * `email_not_verified` → "Email is not verified. Please check your inbox or register again."

2. In `reset-confirm.ts`, map:

   * `reset_session_required` → "Reset session is missing. Please request a new password reset link."
   * `reset_session_expired` → "This reset link has expired. Please request a new one."
   * `csrf_token_invalid` → "Reset session is invalid. Please request a new reset link."
   * `password_reused` → "New password must be different from the previous one."

3. Use `setFormState(form, 'error', message);` to show the messages.

---

## Task 6 — Use GET /auth/me for healthcheck

**Goal:** do not rely on HEAD /auth/me (not part of the API spec).

**Files:**

* `src/api/client.ts` (`healthcheck`, `authFetchBuster`)

**What to do:**

1. Replace `method: 'HEAD'` calls with simple GET:

   ```ts
   await apiFetch('/me'); // default method is GET
   ```

2. Keep the try/catch logic and logging as-is.

---

## Task 7 — Auth state & refresh (minor)

**Goal:** keep current strategy but ensure defensive behavior.

**Files:**

* `src/state/auth-state.ts`

**What to do:**

1. Confirm that:

   * On any `refresh()` error, both token and user are cleared.
   * `scheduleRefresh()` is only started when a valid token exists.

2. If needed, add a short comment to `initAuthState()` explaining:

   > We call `/auth/refresh` on startup and then periodically to restore the session from HttpOnly refresh cookie, as allowed by the API.

No deeper changes required in this task.

---

*End of tasks.*