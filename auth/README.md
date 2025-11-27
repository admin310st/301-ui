# Auth page

Static authentication page for 301.st that interacts with `https://api.301.st/auth`.

## How to use
Open `index.html` in a browser. The page will attempt to detect an existing session via `/auth/me` and exposes login, registration, and logout actions. Requests use `fetch` with `credentials: 'include'` where cookies are required.

## Files
- `index.html` — markup for login and registration forms.
- `auth.js` — ES module with API interactions and UI handling.
- `auth.css` — minimal styling to make the page readable.
