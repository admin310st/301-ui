# Icons Workflow

This document describes how SVG icons are stored, processed, generated and used inside the 301 UI.

The goal is:

- keep all raw SVG icons in a clear folder structure;
- automatically generate a single SVG sprite + preview + map;
- avoid duplicating SVG paths in templates;
- enable color-adaptive UI (icons follow light/dark theme automatically);
- make the process easy for any contributor (Codex, external devs, etc.).

---

## 1. Source icons

All **source** SVGs live in:

```

static/img/icons-src/
mono/    → monochrome icons tinted via currentColor
brand/   → colored icons (Google, GitHub, Cloudflare, etc.)

```

Example:

```

static/
img/
icons-src/
mono/
eye.svg
theme-light-dark.svg
brand/
google.svg
github.svg
cloudflare.svg

````

You must **not** edit the generated sprite manually — always modify raw SVGs in `icons-src`.

---

## 2. Rules for mono vs. brand icons

### Mono icons (`mono/`)

Used for UI controls, buttons, toggles, inputs, etc.

❗ Rule:

> **Mono icons must have `fill="currentColor"` applied to every visible shape.**

This allows them to automatically inherit CSS color:

- They become white inside a white-on-brand button
- They become dark in light mode
- They become light in dark mode
- They follow any CSS class color (danger, muted, etc.)

Mono icons **must not** contain hardcoded colors like `fill="#000"`.

Example raw SVG (`static/img/icons-src/mono/eye.svg`):

```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor"
        d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9
           M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17
           M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5
           C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
</svg>
````

---

### Brand icons (`brand/`)

Used for:

* Google OAuth
* GitHub OAuth
* Cloudflare branding
* External service logos

Rules:

* **Keep all original colors.**
* Do not convert to `currentColor`.
* Do not simplify shapes.

Brand icons must look identical across all themes.

---

## 3. Build process

Icons are processed by the Node script:

```
scripts/build-icons.mjs
```

Run:

```bash
npm run build:icons
```

This generates 3 files:

| Output file                 | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `static/icons-sprite.svg`   | Contains `<symbol>` elements used in `<use>` |
| `static/icons-map.json`     | Machine-readable list of available icons     |
| `static/icons-preview.html` | Visual gallery of all icons                  |

### How generation works

1. Script walks `static/img/icons-src/mono` and `static/img/icons-src/brand`.
2. Optimizes SVG via SVGO (removes metadata, titles, dimensions, comments).
3. Extracts inner SVG content with `<symbol id="…">`.
4. Builds a sprite containing all symbols.
5. Saves a human-friendly preview with live icons and IDs.

### Where generated files are served

Under Vite dev:

```
http://localhost:5173/icons-preview.html
http://localhost:5173/icons-sprite.svg
```

Under Wrangler:

```
/icons-preview.html
/icons-sprite.svg
```

📝 Note: Codex does **not** see `icons-src` in sandbox,
but **all IDs and usage rules are documented** here.

---

## 4. Symbol naming

Naming pattern:

```
i-<category>-<fileName>
```

Examples:

| Source file                                  | Symbol ID                  |
| -------------------------------------------- | -------------------------- |
| `static/img/icons-src/mono/eye.svg`          | `#i-mono-eye`              |
| `static/img/icons-src/mono/theme-light-dark` | `#i-mono-theme-light-dark` |
| `static/img/icons-src/brand/google.svg`      | `#i-brand-google`          |
| `static/img/icons-src/brand/github.svg`      | `#i-brand-github`          |

Preview gallery (`/icons-preview.html`) shows icons exactly as rendered.

---

## 5. Injecting the sprite in the application

We do not inline the sprite manually.

`main.ts` loads it once:

```ts
async function injectIconSprite(): Promise<void> {
  const res = await fetch('/icons-sprite.svg', { cache: 'force-cache' });
  if (!res.ok) return;
  const svgText = await res.text();

  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.width = '0';
  wrapper.style.height = '0';
  wrapper.style.overflow = 'hidden';
  wrapper.innerHTML = svgText;

  const sprite = wrapper.firstElementChild;
  if (sprite) document.body.prepend(sprite);
}
```

This makes all `<symbol>` icons available globally.

---

# ⭐ 6. Coloring icons via `currentColor` (the most important concept)

Mono icons (`mono/`) are **color-adaptive** by design.

They inherit the CSS `color:` property of **any parent element**.

> If you change the `color` of a button, link, label, or wrapper —
> the icon automatically changes with it.

This makes all icons:

* automatically dark in light theme,
* automatically light in dark theme,
* consistent in buttons,
* consistent in form controls,
* consistent across all languages and layouts.

### Example: white icon in primary button

```html
<button class="btn-primary">
  <svg class="icon"><use href="#i-mono-eye"></use></svg>
  Login
</button>
```

```css
.btn-primary {
  color: white;         /* the eye icon becomes white automatically */
  background: var(--brand);
}
```

### Example: muted icon in input

```css
.password-toggle {
  color: var(--muted);
}
```

### Example: theme switching

If your theme uses variables:

```css
:root { --text-color: #111; }
[data-theme="dark"] { --text-color: #eee; }

.icon {
  color: var(--text-color);
}
```

Then icons automatically flip to correct contrast.

### Example: error state

```css
.error .icon {
  color: var(--danger);
}
```

### ❗ Brand icons do **not** inherit color

Because they preserve official colors:

* Google
* GitHub
* Cloudflare

They ignore `currentColor`.

---

# 7. Using icons in markup

Use:

```html
<svg class="icon" aria-hidden="true">
  <use href="#i-mono-eye"></use>
</svg>
```

Recommended base CSS:

```css
.icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-block;
}
```

### Examples

#### Password toggle

```html
<button class="password-toggle" type="button">
  <svg class="icon"><use href="#i-mono-eye"></use></svg>
</button>
```

#### Theme toggle

```html
<button class="theme-toggle">
  <svg class="icon"><use href="#i-mono-theme-light-dark"></use></svg>
</button>
```

#### Google login

```html
<button class="auth-social-btn auth-social-btn--google">
  <svg class="icon"><use href="#i-brand-google"></use></svg>
  Continue with Google
</button>
```

---

## 8. Adding a new icon

1. Choose category:

   | When to use   | Folder                       |
   | ------------- | ---------------------------- |
   | Tintable icon | `static/img/icons-src/mono`  |
   | Logo/brand    | `static/img/icons-src/brand` |

2. Prepare SVG:

   * **mono:** ensure every `<path>` has `fill="currentColor"`
   * **brand:** keep original fills

3. Save the file as:

   ```
   static/img/icons-src/<category>/<name>.svg
   ```

4. Run:

   ```bash
   npm run build:icons
   ```

5. Check preview:

   ```
   http://localhost:5173/icons-preview.html
   ```

6. Use in markup:

   ```html
   <svg class="icon"><use href="#i-mono-name"></use></svg>
   ```

---

## 9. Notes for Codex / external tools

* Raw SVGs in `static/img/icons-src/` may not be visible in a sandbox,
  but all symbols follow a **predictable naming convention**.

* The authoritative list of available icons is always visible at:

  ```
  /icons-preview.html
  ```

* To use an icon, refer to its ID:

  * `#i-mono-eye`
  * `#i-mono-theme-light-dark`
  * `#i-brand-google`
  * `#i-brand-github`
  * `#i-brand-cloudflare`
  * etc.

* Do **not** manually edit:

  * `icons-sprite.svg`
  * SVG inside templates

* Always update icons via:

  ```bash
  npm run build:icons
  ```
