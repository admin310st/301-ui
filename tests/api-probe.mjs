/**
 * API Probe — tests real API responses against our TypeScript types.
 *
 * Usage:
 *   MODE=login EMAIL=click@clx.cx PASSWORD=Robotics777 node tests/api-probe.mjs
 *
 * Workflow:
 *   1) Opens real Chrome, logs in (Turnstile auto-solves)
 *   2) Saves browser session to .api-session.json (~7 days reuse)
 *   3) Immediately tests all API endpoints from browser context
 *   4) Saves results to api-probe-results.json
 *
 * Subsequent runs (reuse saved session):
 *   node tests/api-probe.mjs          ← headless, uses saved session
 *   MODE=login ... node tests/api-probe.mjs  ← fresh login + test
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODE = process.env.MODE || 'test';
const EMAIL = process.env.EMAIL || '';
const PASSWORD = process.env.PASSWORD || '';
const BASE = 'https://app.301.st';
const API = 'https://api.301.st';

const SESSION_FILE = resolve(__dirname, '.api-session.json');
const RESULTS_FILE = resolve(__dirname, 'api-probe-results.json');

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  let page, context, browser;

  if (MODE === 'login') {
    ({ page, context, browser } = await doLogin());
  } else {
    ({ page, context, browser } = await restoreSession());
  }

  // Run tests from browser context (preserves fingerprint, cookies, tokens)
  await runTests(page);

  await browser.close();
}

// ============================================================================
// LOGIN — open real Chrome, fill form, get past Turnstile
// ============================================================================

async function doLogin() {
  if (!EMAIL || !PASSWORD) {
    console.error('ERROR: EMAIL and PASSWORD env vars required for login mode');
    process.exit(1);
  }

  console.log('=== LOGIN ===');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto(BASE + '/#login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Fill form
  console.log('Filling form...');
  await page.locator('[data-form="login"] input[type="email"], [data-form="login"] input[name="email"]').fill(EMAIL);
  await page.locator('[data-form="login"] input[type="password"], [data-form="login"] input[name="password"]').fill(PASSWORD);

  // Wait for Turnstile
  console.log('Waiting for Turnstile...');
  const submitBtn = page.locator('[data-form="login"] button[type="submit"]');
  let needManualLogin = false;

  try {
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('[data-form="login"] button[type="submit"]');
        return btn && !btn.disabled;
      },
      { timeout: 15000, polling: 500 }
    );
    console.log('Turnstile auto-solved.');
  } catch {
    needManualLogin = true;
    console.log('');
    console.log('  Turnstile needs manual solve in the browser window.');
    console.log('  Solve it and click login. Waiting 120s...');
    console.log('');
  }

  if (!needManualLogin) {
    console.log('Submitting...');
    await submitBtn.click();
  }

  // Wait for dashboard
  try {
    await page.waitForURL('**/dashboard**', { timeout: needManualLogin ? 120000 : 15000 });
    console.log('Login successful!');
  } catch {
    await page.screenshot({ path: resolve(__dirname, 'login-debug.png') });
    console.error('Login failed. Screenshot saved.');
    await browser.close();
    process.exit(1);
  }

  // Save session for reuse
  const state = await context.storageState();
  writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2));
  console.log('Session saved.\n');

  return { page, context, browser };
}

// ============================================================================
// RESTORE SESSION — headless, use saved browser state
// ============================================================================

async function restoreSession() {
  if (!existsSync(SESSION_FILE)) {
    console.error('No saved session. Run with MODE=login first.');
    process.exit(1);
  }

  console.log('=== RESTORE SESSION ===');
  const state = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));

  // Use installed Chrome even for headless (same fingerprint)
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });
  const context = await browser.newContext({ storageState: state });
  const page = await context.newPage();

  // Navigate to dashboard to trigger auth refresh
  console.log('Loading dashboard...');
  try {
    await page.goto(BASE + '/dashboard.html', { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    console.log('Navigation timeout (continuing)...');
  }
  await page.waitForTimeout(2000);

  // Check if we're authenticated
  const url = page.url();
  if (url.includes('#login') || url.includes('index.html')) {
    console.error('Session expired. Re-run with MODE=login.');
    await browser.close();
    process.exit(1);
  }

  console.log('Session restored.\n');
  return { page, context, browser };
}

// ============================================================================
// TEST — run API calls from browser context
// ============================================================================

async function runTests(page) {
  console.log('=== TESTING API ENDPOINTS ===');

  // Capture auth token from page's outgoing requests
  let token = null;
  page.on('request', (req) => {
    const auth = req.headers()['authorization'];
    if (auth && auth.startsWith('Bearer ') && !token) {
      token = auth;
    }
  });

  // Navigate to a page that triggers API calls to capture the token
  if (!token) {
    try {
      await page.goto(BASE + '/domains.html', { waitUntil: 'networkidle', timeout: 30000 });
    } catch { /* continue */ }
    await page.waitForTimeout(2000);
  }

  if (!token) {
    console.error('Could not capture auth token. Session invalid.');
    process.exit(1);
  }

  console.log('Auth token captured.\n');

  // API call helper — runs fetch() inside browser context (same origin, cookies, fingerprint)
  async function apiGet(path) {
    return page.evaluate(async ({ base, p, tok }) => {
      try {
        const r = await fetch(base + p, {
          headers: { 'Authorization': tok, 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const text = await r.text();
        let body = null;
        try { body = JSON.parse(text); } catch { body = text; }
        return { status: r.status, body };
      } catch (e) {
        return { status: 'ERR', body: e.message };
      }
    }, { base: API, p: path, tok: token });
  }

  const results = {};

  // ---- Core endpoints ----

  // ---- /auth/me first (need account_id) ----
  console.log('Core endpoints:');
  const meResult = await apiGet('/auth/me');
  results['/auth/me'] = meResult;
  console.log(`  [${meResult.status === 200 ? 'OK' : meResult.status}] /auth/me${summarize('/auth/me', meResult.body)}`);

  const accountId = meResult.body?.active_account_id || meResult.body?.account_id;

  // ---- Core list endpoints ----
  const coreEndpoints = [
    '/projects',
    '/domains',
    '/redirects/templates',
    '/redirects/presets',
  ];
  // Integrations need account_id
  if (accountId) {
    coreEndpoints.push(`/integrations/keys?account_id=${accountId}`);
  }

  for (const path of coreEndpoints) {
    const r = await apiGet(path);
    results[path] = r;
    const icon = r.status === 200 ? 'OK' : r.status;
    console.log(`  [${icon}] ${path}${summarize(path, r.body)}`);
  }

  // ---- Dynamic endpoints based on data ----

  console.log('\nDynamic endpoints:');

  // Project detail + project sites
  const projects = extractList(results['/projects']?.body, 'projects');
  if (projects.length > 0) {
    const pid = projects[0].id;
    for (const path of [`/projects/${pid}`, `/projects/${pid}/sites`]) {
      const r = await apiGet(path);
      results[path] = r;
      console.log(`  [${r.status === 200 ? 'OK' : r.status}] ${path}`);

      // Capture sites from project
      if (path.includes('/sites') && r.status === 200) {
        const projectSites = extractList(r.body, 'sites');
        if (projectSites.length > 0) {
          const sid = projectSites[0].id;
          for (const sp of [`/sites/${sid}`, `/sites/${sid}/redirects`]) {
            const sr = await apiGet(sp);
            results[sp] = sr;
            console.log(`  [${sr.status === 200 ? 'OK' : sr.status}] ${sp}`);

            // Drill into redirect details
            if (sp.includes('/redirects') && sr.status === 200) {
              const domains = sr.body?.domains || [];

              const withRedirect = domains.find(d => d.redirect);
              if (withRedirect) {
                const rp = `/redirects/${withRedirect.redirect.id}`;
                const rr = await apiGet(rp);
                results[rp] = rr;
                console.log(`  [${rr.status === 200 ? 'OK' : rr.status}] ${rp}`);
              }

              const withZone = domains.find(d => d.zone_id);
              if (withZone) {
                for (const zp of [
                  `/zones/${withZone.zone_id}/redirect-limits`,
                  `/zones/${withZone.zone_id}/redirect-status`,
                ]) {
                  const zr = await apiGet(zp);
                  results[zp] = zr;
                  console.log(`  [${zr.status === 200 ? 'OK' : zr.status}] ${zp}`);
                }
              }
            }
          }
        }
      }
    }
  }

  // Domain detail
  const domains = extractList(results['/domains']?.body, 'domains');
  if (domains.length > 0) {
    const did = domains[0].id;
    const r = await apiGet(`/domains/${did}`);
    results[`/domains/${did}`] = r;
    console.log(`  [${r.status === 200 ? 'OK' : r.status}] /domains/${did}`);
  }

  // Integration detail
  const intKey = accountId ? `/integrations/keys?account_id=${accountId}` : null;
  const integrations = intKey ? extractList(results[intKey]?.body, 'keys') : [];
  if (integrations.length > 0) {
    const iid = integrations[0].id;
    const r = await apiGet(`/integrations/keys/${iid}`);
    results[`/integrations/keys/${iid}`] = r;
    console.log(`  [${r.status === 200 ? 'OK' : r.status}] /integrations/keys/${iid}`);
  }

  // ---- Summary ----

  let ok = 0, fail = 0;
  console.log('\n====== SUMMARY ======');
  for (const [path, r] of Object.entries(results)) {
    if (r.status === 200) ok++; else fail++;
    console.log(`  [${r.status === 200 ? 'OK' : 'ERR:' + r.status}] ${path}`);
  }
  console.log(`\n  ${ok} OK / ${fail} failed / ${ok + fail} total`);

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`  Results saved to ${RESULTS_FILE}`);
}

// ============================================================================
// Helpers
// ============================================================================

function extractList(body, key) {
  if (!body) return [];
  const data = body[key] || body;
  return Array.isArray(data) ? data : [];
}

function summarize(path, body) {
  if (!body || typeof body !== 'object') return '';
  if (path === '/auth/me' && body.email) return ` → ${body.email}`;
  for (const key of ['projects', 'domains', 'sites', 'integrations', 'templates', 'presets']) {
    if (body[key] && Array.isArray(body[key])) return ` → ${body[key].length} ${key}`;
  }
  return '';
}

// ============================================================================
// Entry
// ============================================================================

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
