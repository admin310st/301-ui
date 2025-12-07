# Icons workflow

This document describes how SVG icons are stored, processed and used in the 301 UI.

The goal is:

- keep all raw icons in a single place in the repo,
- generate an SVG sprite + small helper files automatically,
- use icons in markup via `<svg><use></use></svg>` without duplicating paths,
- make it easy for any contributor (including Codex) to understand the rules.

---

## Source locations

All **source** SVG icons live in:

- `static/img/icons-src/mono` – monochrome icons that should be tinted via `currentColor`
- `static/img/icons-src/brand` – colored icons (Google, GitHub, Cloudflare, etc.)

Examples:

```text
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

> Never edit the generated sprite directly. Always edit icons in `icons-src` and re-run the build script.

### Mono icons (`mono/`)

* These icons are meant to be tinted via CSS.
* Each **visible shape** should have `fill="currentColor"` set **in the source SVG**.
* We do **not** auto-modify `fill` in the build script – the author of the icon decides what is tintable.

Example `static/img/icons-src/mono/eye.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <title>eye</title>
  <path
    fill="currentColor"
    d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"
  />
</svg>
```

### Brand icons (`brand/`)

* Brand icons keep their **original colors**.
* Do not replace `fill` with `currentColor` for brand logos.
* Use official SVGs whenever possible (Google, GitHub, etc).

---

## Build step

Icons are processed by a small Node script:

* `scripts/build-icons.mjs`

Run:

```bash
npm run build:icons
```

This will:

1. Walk `static/img/icons-src/mono` and `static/img/icons-src/brand`
2. Optimize each SVG with **SVGO** (remove metadata, titles, dimensions, etc.)
3. Wrap each SVG into `<symbol>` and generate a single sprite file
4. Generate:

   * `static/icons-sprite.svg`     – the sprite with `<symbol>` elements
   * `static/icons-map.json`       – simple JSON map of available icons
   * `static/icons-preview.html`   – a small preview page showing all icons

### Output files

* Sprite: `static/icons-sprite.svg` → served as `/icons-sprite.svg`
* Map: `static/icons-map.json` → served as `/icons-map.json` (for tooling)
* Preview: `static/icons-preview.html` → served as `/icons-preview.html`

On dev (Vite):

```text
http://localhost:5173/icons-preview.html
```

> Note: Codex / remote tools do **not** see these static files directly, but the IDs and structure are documented here.

---

## Sprite IDs and naming

Each icon becomes a `<symbol>` inside the sprite with the following `id` pattern:

* Mono icon (`static/img/icons-src/mono/eye.svg`)
  → `<symbol id="i-mono-eye" ...>`

* Brand icon (`static/img/icons-src/brand/google.svg`)
  → `<symbol id="i-brand-google" ...>`

General rule:

```text
i-<category>-<fileNameWithoutExtension>
```

Where `category` is `mono` or `brand`.

You can inspect all generated IDs and how the icons look via:

```text
/icons-preview.html
```

---

## Sprite injection in the app

We do not inline the sprite in HTML manually. Instead we load it once at runtime.

In `src/main.ts` there is a helper:

```ts
async function injectIconSprite(): Promise<void> {
  try {
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
    if (sprite) {
      document.body.prepend(sprite);
    }
  } catch (err) {
    console.warn('[icons] Failed to inject sprite', err);
  }
}
```

And it is called on `DOMContentLoaded`:

```ts
document.addEventListener('DOMContentLoaded', async () => {
  await injectIconSprite();
  // ... other init calls
});
```

So every page has the sprite available once in the DOM.

---

## Using icons in markup

To use an icon, reference it via `<use>` and the `id` defined above.

### Mono icon example (tinted with `currentColor`)

```html
<button class="password-toggle" type="button">
  <svg class="icon" aria-hidden="true">
    <use href="#i-mono-eye"></use>
  </svg>
  <span class="sr-only">Show password</span>
</button>
```

With CSS:

```css
.icon {
  width: 1.25rem;
  height: 1.25rem;
  display: inline-block;
}

.password-toggle {
  color: var(--muted);
}

.button-primary .icon {
  color: #fff; /* mono icons will inherit this */
}
```

### Brand icon example (Google / GitHub)

```html
<button class="auth-social-btn auth-social-btn--google" type="button">
  <svg class="icon" aria-hidden="true">
    <use href="#i-brand-google"></use>
  </svg>
  <span>Continue with Google</span>
</button>
```

Brand icons use their own `fill` colors from the source SVG, so they do **not** respond to `color:`.

---

## Adding a new icon

1. Decide the category:

   * `mono` if it should inherit `currentColor`
   * `brand` if it should keep its own colors

2. Place the SVG:

   * `static/img/icons-src/mono/my-icon.svg`
   * or `static/img/icons-src/brand/my-brand.svg`

3. For mono icons:

   * Ensure visible shapes have `fill="currentColor"`
   * Remove any hardcoded colors (black, etc.)

4. Run:

   ```bash
   npm run build:icons
   ```

5. Check `/icons-preview.html` to make sure it looks correct.

6. Use the icon in markup via:

   ```html
   <svg class="icon" aria-hidden="true">
     <use href="#i-mono-my-icon"></use>
   </svg>
   ```

---

## Notes for external contributors (Codex, etc.)

* The raw SVG files under `static/img/icons-src` are **not** visible in remote sandboxes,
  so you may not see the actual graphics.

* However, you can safely rely on the documented IDs:

  * `#i-mono-eye`
  * `#i-mono-theme-light-dark`
  * `#i-brand-google`
  * `#i-brand-github`
  * `#i-brand-cloudflare`
  * (and any future icons following the same naming pattern)

* When adding markup or CSS, use `<svg><use href="#..."></use></svg>` and the IDs listed here.

* Do not modify `icons-sprite.svg` by hand – it is generated.
