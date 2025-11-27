# 301 UI

## Purpose
Frontend entrypoint for 301.st user-facing UI, starting with authentication and prepared for the future user cabinet described in [the wiki](https://github.com/admin310st/301/wiki).

## Current scope (MVP)
- Static auth page located in `/auth`.
- Interacts with `https://api.301.st/auth` endpoints (`login`, `register`, `me`, `refresh`, `logout`).

## Out of scope
- No SPA or routing.
- No Vue, Vite, Pinia, or Tailwind setup yet.

## Future plans
See `docs/ui-roadmap.ru.md` for the detailed roadmap (in Russian).
