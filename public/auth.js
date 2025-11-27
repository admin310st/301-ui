const API_BASE = 'https://api.301.st/auth';
const DEFAULT_SITEKEY = '1x00000000000000000000AA';
const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
];

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showAuthView() {
  const authView = qs('[data-view="auth"]');
  const dashboard = qs('[data-view="dashboard"]');
  if (authView) authView.hidden = false;
  if (dashboard) dashboard.hidden = true;
}

function renderUserDetails(user) {
  const displayName = user?.name?.trim() || user?.email?.trim() || 'friend';
  qsa('[data-user-name]').forEach((node) => {
    node.textContent = displayName;
  });

  const subtitle = qs('[data-dashboard-subtitle]');
  if (subtitle) {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    const summary = name && email ? `${name} · ${email}` : name || email || 'Your 301.st workspace';
    subtitle.textContent = summary;
  }
}

function showDashboard(user) {
  renderUserDetails(user);
  const authView = qs('[data-view="auth"]');
  const dashboard = qs('[data-view="dashboard"]');
  if (authView) authView.hidden = true;
  if (dashboard) dashboard.hidden = false;
}

async function fetchSession() {
  try {
    const res = await fetch(`${API_BASE}/session`, {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data) return null;
    return data.user || data;
  } catch {
    return null;
  }
}

async function refreshSession() {
  const user = await fetchSession();
  if (user) {
    showDashboard(user);
  } else {
    showAuthView();
  }
}

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
  return `${API_BASE}/oauth/${provider}/start`;
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

    setMessage(form, 'success', data?.message || 'Signed in successfully.');
    refreshSession();
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

function initAddAccountButton() {
  const button = qs('[data-action="add-account"]');
  if (!button) return;

  button.addEventListener('click', () => {
    button.textContent = 'Opening Cloudflare...';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = 'Add Cloudflare account';
      button.disabled = false;
    }, 900);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  toggleForms('login');
  initToggle();
  initForms();
  initOAuthButtons();
  refreshSession();
  initAddAccountButton();

  const sitekey = await loadEnv();
  renderTurnstileWidgets(sitekey);
});
