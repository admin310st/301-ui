# i18n Conventions

## Two Translation Layers

| Layer | Scope | Approach |
|-------|-------|----------|
| **UI Interface** | Buttons, menus, forms, notifications, table headers | `data-i18n` attributes + locale files |
| **Content Pages** | About, Privacy, Terms, Security, Docs | Static English HTML, NO `data-i18n` |

These layers do NOT overlap. Content pages must never use `data-i18n` attributes.

## Key Naming Rules

Format: `{section}.{category}.{key}` using dot notation.

```
layout.nav.home              # Navigation
layout.footer.about          # Footer links
auth.login                   # Auth actions
auth.messages.loginSuccess   # Auth messages
auth.errors.invalidEmail     # Auth errors
cf.wizard.title              # Cloudflare wizard
notice.close                 # Notifications
```

**Do:**
- Use dot notation: `auth.errors.invalidCredentials`
- Prefix with section context: `layout.nav.*`, `domains.table.columns.*`

**Don't:**
- Flat keys without context: `integrations`
- Underscores as separators: `auth_error_invalid`
- camelCase for full path: `cloudflareWizardTitle`

## HTML Binding Attributes

| Attribute | Use for | Example |
|-----------|---------|---------|
| `data-i18n` | Short text (single line, no HTML) | `<button data-i18n="auth.login">Login</button>` |
| `data-i18n-html` | Text containing HTML tags | `<div data-i18n-html="cf.wizard.help">Go to <strong>Profile</strong>...</div>` |
| `data-i18n-aria` | `aria-label` attribute | `<button data-i18n-aria="notice.close">` |
| `data-i18n-placeholder` | `placeholder` attribute | `<input data-i18n-placeholder="auth.form.emailPlaceholder">` |
| `data-i18n-title` | `title` attribute | `<a data-i18n-title="layout.nav.docs">` |

## Dashboard Section Namespace

Every dashboard section follows a standard structure (see CLAUDE.md "Internationalization" section for full details):

```
{section}.title
{section}.subtitle
{section}.empty.{title|description|cta}
{section}.actions.{create|edit|delete|...}
{section}.table.columns.{name|status|...}
{section}.status.{active|inactive|...}
{section}.filters.{all|active|...}
{section}.messages.{created|updated|...}
```

Sections: `overview`, `integrations`, `projects`, `domains`, `sites`, `streams`, `redirects`, `analytics`

## Adding Translations Checklist

1. Add keys to both `src/i18n/locales/en.ts` and `src/i18n/locales/ru.ts`
2. Use correct `data-i18n*` attribute in HTML
3. Verify language switching works for new elements

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Hardcoded text in UI: `<button>Login</button>` | Use `data-i18n`: `<button data-i18n="auth.login">Login</button>` |
| `data-i18n` on content with HTML tags | Use `data-i18n-html` instead |
| `data-i18n` on content pages (About, Terms) | Remove it -- content pages are static English |
| Flat/inconsistent keys: `t('loginButton')` | Use namespaced: `t('auth.login')` |
