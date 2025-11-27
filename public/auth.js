const API_ROOT = 'https://api.301.st/auth';
const DEFAULT_SITEKEY = '1x00000000000000000000AA';
const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
];

const ERROR_MESSAGES = {
  turnstile_failed: 'Complete the Turnstile check to continue.',
  invalid_credentials: 'Email or password is incorrect.',
  email_taken: 'This email is already registered.',
  validation_failed: 'Please double-check the form fields.',
  rate_limited: 'Too many attempts. Please try again later.',
  session_not_found: 'Session not found. Please sign in again.',
};

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let currentToken = '';
let hasSession = false;

const setWSVar = (name, value) => {
  try {
    if (typeof window.webstudioSetVariable === 'function') {
      window.webstudioSetVariable(name, value);
    }
  } catch {}
};

const setToken = (token = '') => {
  currentToken = token || '';
  setWSVar('authBearer', token ? `Bearer ${token}` : '');
  window.dispatchEvent(new CustomEvent('auth:token', { detail: { token } }));
};

function authHeaders(headers = {}) {
  const merged = { ...headers };
  if (currentToken) merged.Authorization = `Bearer ${currentToken}`;
  return merged;
}

function showAuthView() {
  const authView = qs('[data-view="auth"]');
  const dashboard = qs('[data-view="dashboard"]');
  if (authView) authView.hidden = false;
  if (dashboard) dashboard.hidden = true;
  document.documentElement.dataset.authState = 'out';
}

function normalizeUser(data) {
  if (!data) return null;
  if (data.user && typeof data.user === 'object') {
    return {
      ...data.user,
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
      active_account_id: data.active_account_id ?? null,
    };
  }
  if (data.profile && typeof data.profile === 'object') return data.profile;
  if (data.email || data.id || data.name) return data;
  return null;
}

function extractUser(payload) {
  return normalizeUser(payload) || normalizeUser(payload?.user) || normalizeUser(payload?.profile);
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
  document.documentElement.dataset.authState = 'in';
}

function setMessage(form, type, message) {
  const box = qs('[data-status]', form);
  if (!box) return;
  box.textContent = message;
  box.dataset.type = type;
  box.hidden = !message;
}

function toggleForms(active) {
  qsa('[data-auth-form]').forEach((form) => {
    const isActive = form.dataset.authForm === active;
    form.hidden = !isActive;
  });

  const label = qs('#auth-toggle-label');
  const toggle = qs('#auth-toggle');
  if (active === 'login') {
    if (label) label.textContent = "Don't have an account?";
    if (toggle) toggle.textContent = 'Create one';
  } else {
    if (label) label.textContent = 'Already have an account?';
    if (toggle) toggle.textContent = 'Back to sign in';
  }
}

function getTurnstileToken(form) {
  const inputInForm = qs('input[name="cf-turnstile-response"]', form);
  if (inputInForm?.value) return inputInForm.value.trim();
  const globalInput = qs('input[name="cf-turnstile-response"]');
  if (globalInput?.value) return globalInput.value.trim();
  try {
    const token = window.turnstile?.getResponse?.();
    if (token) return token.trim();
  } catch {}
  return '';
}

function resetTurnstile() {
  try {
    window.turnstile?.reset?.();
  } catch {}
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
  return `${API_ROOT}/oauth/${provider}/start`;
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

async function apiRequest(path, { method = 'GET', body, headers = {}, withCredentials = true, auth = false } = {}) {
  const options = {
    method,
    credentials: withCredentials ? 'include' : 'same-origin',
    headers: auth ? authHeaders(headers) : { ...headers },
  };

  if (body) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_ROOT}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, ...data };
}

async function register({ email, password, turnstileToken }) {
  return apiRequest('/register', {
    method: 'POST',
    body: { email, password, turnstile_token: turnstileToken },
  });
}

async function login({ email, password, turnstileToken }) {
  return apiRequest('/login', {
    method: 'POST',
    body: { email, password, turnstile_token: turnstileToken },
  });
}

async function refresh() {
  return apiRequest('/refresh', { method: 'POST', body: {} });
}

async function logout() {
  return apiRequest('/logout', { method: 'POST', body: {} });
}

async function me() {
  return apiRequest('/me', { auth: true });
}

async function fetchSession() {
  const requestMe = async () => {
    const res = await me();
    if (!res.ok) return null;
    return extractUser(res);
  };

  const user = await requestMe();
  if (user) return user;

  const refreshed = await refresh();
  if (refreshed.ok && refreshed.access_token) {
    hasSession = true;
    setToken(refreshed.access_token);
    return requestMe();
  }

  return null;
}

async function refreshSession() {
  const user = await fetchSession();
  if (user) {
    hasSession = true;
    showDashboard(user);
    return user;
  }

  hasSession = false;
  setToken('');
  showAuthView();
  return null;
}

async function submitAuth(form, endpoint) {
  const email = qs('input[name="email"]', form)?.value?.trim();
  const password = qs('input[name="password"]', form)?.value;

  if (!email || !password) {
    setMessage(form, 'error', 'Enter email and password.');
    return;
  }

  const turnstileToken = getTurnstileToken(form);
  if (!turnstileToken) {
    setMessage(form, 'error', 'Complete the challenge to continue.');
    return;
  }

  setMessage(form, 'loading', 'Working...');

  try {
    const res = await (endpoint === 'register'
      ? register({ email, password, turnstileToken })
      : login({ email, password, turnstileToken }));

    resetTurnstile();

    if (!res.ok) {
      const message = ERROR_MESSAGES[res.error_code] || res.message || 'Request failed.';
      setMessage(form, 'error', message);
      return;
    }

    if (res.access_token) {
      hasSession = true;
      setToken(res.access_token);
    }

    const user = extractUser(res);
    if (user?.email) {
      renderUserDetails(user);
      setWSVar('authUserEmail', user.email);
      setWSVar('authUserName', user.name || user.email);
    }

    setMessage(form, 'success', res.message || 'Signed in successfully.');
    await refreshSession();
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

function initSessionActions() {
  const refreshForm = qs('[data-session-action="refresh"]');
  const logoutForm = qs('[data-session-action="logout"]');
  const meForm = qs('[data-session-action="me"]');
  const passwordForm = qs('[data-session-action="password-reminder"]');

  if (refreshForm) {
    refreshForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(refreshForm, 'loading', 'Refreshing session...');
      const res = await refresh();
      if (res.ok && res.access_token) {
        hasSession = true;
        setToken(res.access_token);
        await refreshSession();
        setMessage(refreshForm, 'success', 'Session refreshed.');
      } else {
        setMessage(refreshForm, 'error', ERROR_MESSAGES[res.error_code] || res.message || 'Refresh failed.');
      }
    });
  }

  if (logoutForm) {
    logoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(logoutForm, 'loading', 'Signing out...');
      const res = await logout();
      if (res.ok) {
        hasSession = false;
        setToken('');
        showAuthView();
        setMessage(logoutForm, 'success', 'Signed out.');
      } else {
        setMessage(logoutForm, 'error', ERROR_MESSAGES[res.error_code] || res.message || 'Logout failed.');
      }
    });
  }

  if (meForm) {
    meForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(meForm, 'loading', 'Checking session...');
      const user = await refreshSession();
      if (user) {
        renderUserDetails(user);
        setMessage(meForm, 'success', 'User is authenticated.');
      } else {
        setMessage(meForm, 'error', 'Session invalid.');
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      setMessage(passwordForm, 'error', 'Password reminder is not yet available via API.');
    });
  }
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
  initSessionActions();
  initAddAccountButton();

  await refreshSession();

  const sitekey = await loadEnv();
  renderTurnstileWidgets(sitekey);
});
