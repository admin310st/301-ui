const API_BASE = 'https://api.301.st/auth';
const DEFAULT_SITEKEY = '1x00000000000000000000AA';
const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
];

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setMessage(form, type, message) {
  const box = qs('[data-status]', form);
  if (!box) return;
  box.textContent = message;
  box.dataset.type = type;
}

function toggleForms(active) {
  qsa('[data-auth-form]').forEach((form) => {
    const isActive = form.dataset.authForm === active;
    form.hidden = !isActive;
  });

  const label = qs('#auth-toggle-label');
  const toggle = qs('#auth-toggle');
  if (active === 'login') {
    label.textContent = "Don't have an account?";
    toggle.textContent = 'Create one';
  } else {
    label.textContent = 'Already have an account?';
    toggle.textContent = 'Back to sign in';
  }
}

function getTurnstileToken(form) {
  const inputInForm = qs('input[name="cf-turnstile-response"]', form);
  if (inputInForm?.value) return inputInForm.value;
  const globalInput = qs('input[name="cf-turnstile-response"]');
  if (globalInput?.value) return globalInput.value;
  try {
    const token = window.turnstile?.getResponse?.();
    if (token) return token;
  } catch {}
  return '';
}

function renderTurnstileWidgets(sitekey) {
  qsa('.cf-turnstile').forEach((node) => {
    node.dataset.sitekey = sitekey;
    try {
      if (window.turnstile) {
        window.turnstile.render(node, { sitekey });
      }
    } catch {}
  });
}

function buildOAuthUrl(provider) {
  const redirectUri = new URL('/auth/success/', window.location.origin).toString();
  return `${API_BASE}/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function initOAuthButtons() {
  const container = qs('[data-oauth-buttons]');
  if (!container) return;

  container.innerHTML = '';

  OAUTH_PROVIDERS.forEach(({ id, label }) => {
    const link = document.createElement('a');
    link.className = 'social-button';
    link.dataset.oauthProvider = id;
    link.href = buildOAuthUrl(id);
    link.textContent = label;
    container.appendChild(link);
  });
}

async function loadEnv() {
  try {
    const res = await fetch('/env', { cache: 'no-store' });
    if (!res.ok) throw new Error('env failed');
    const data = await res.json();
    return data.turnstileSitekey || DEFAULT_SITEKEY;
  } catch {
    return DEFAULT_SITEKEY;
  }
}

async function submitAuth(form, endpoint) {
  const email = qs('input[name="email"]', form)?.value?.trim();
  const password = qs('input[name="password"]', form)?.value;

  if (!email || !password) {
    setMessage(form, 'error', 'Enter email and password.');
    return;
  }

  const turnstile_token = getTurnstileToken(form);
  if (!turnstile_token) {
    setMessage(form, 'error', 'Complete the challenge to continue.');
    return;
  }

  setMessage(form, 'loading', 'Working...');

  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, turnstile_token }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(form, 'error', data?.message || 'Request failed');
      return;
    }

    setMessage(form, 'success', data?.message || 'Success. Redirecting...');
    // Placeholder for future redirect
  } catch {
    setMessage(form, 'error', 'Network error.');
  }
}

function initForms() {
  qsa('[data-auth-form]').forEach((form) => {
    const endpoint = form.dataset.authForm === 'register' ? 'register' : 'login';
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitAuth(form, endpoint);
    });
  });
}

function initToggle() {
  const toggleLink = qs('#auth-toggle');
  if (!toggleLink) return;

  toggleLink.addEventListener('click', (event) => {
    event.preventDefault();
    const active = qs('[data-auth-form]:not([hidden])');
    const next = active?.dataset.authForm === 'login' ? 'register' : 'login';
    toggleForms(next);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  toggleForms('login');
  initToggle();
  initForms();
  initOAuthButtons();

  const sitekey = await loadEnv();
  renderTurnstileWidgets(sitekey);
});
