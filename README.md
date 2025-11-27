# 301 UI Worker

Cloudflare Worker that serves the 301.st authentication page as static assets and exposes public environment values for the frontend.

## Structure
- `wrangler.toml` – Worker configuration (name `301-app`, assets in `public/`).
- `src/worker.ts` – Minimal Worker that serves static assets and exposes `/env` with public variables.
- `public/` – Static authentication page (`index.html`, `auth.js`, `auth.css`).
- `package.json` – Scripts and Wrangler dependency.

## Local development
1. Install dependencies: `npm install`
2. Start the Worker locally: `npm run dev`
3. Open `http://localhost:8787/` to view the auth page. The `/env` endpoint returns `{ "turnstileSitekey": "..." }` using the `TURNSTILE_SITEKEY` environment variable.

## Deployment
Deploy to the existing Cloudflare Worker (`301-app`) with:

```bash
npm run deploy
```

Secrets like `TURNSTILE_SITEKEY` should be configured via Cloudflare Dashboard (Worker secrets) and are not stored in the repository.
