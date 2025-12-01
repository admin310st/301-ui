const API_ROOT = 'https://api.301.st/auth';
const DEFAULT_SITEKEY = '1x00000000000000000000AA';
const AUTH_TABS = ['login', 'register', 'forgot'];
const THEME_STORAGE_KEY = '301-ui-theme';

const ERROR_MESSAGES = {
  invalid_credentials: 'Неверный email или пароль.',
  email_taken: 'Этот email уже зарегистрирован.',
  turnstile_failed: 'Подтвердите, что вы не робот.',
  validation_failed: 'Проверьте заполнение полей.',
  rate_limited: 'Слишком много попыток, попробуйте позже.',
  session_not_found: 'Сессия не найдена, войдите заново.',
};

let accessToken = null;
let currentUser = null;
let currentAccount = null;
let authStatus = 'anonymous';
let oauthProviders = [];
let turnstileSitekey = DEFAULT_SITEKEY;

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let turnstileReadyResolve;
const turnstileReady = new Promise((resolve) => {
  turnstileReadyResolve = resolve;
});

setTimeout(() => {
  if (turnstileReadyResolve) turnstileReadyResolve(window.turnstile || null);
}, 1500);

window.onTurnstileLoad = () => {
  if (turnstileReadyResolve) turnstileReadyResolve(window.turnstile);
};

function setAuthState(state) {
  authStatus = state;
  document.documentElement.dataset.authState = state;
}

function setAccessToken(token) {
  accessToken = token || null;
}

function setMessage(target, type, message) {
  const box = target ? qs('[data-status]', target) : qs('[data-global-message]');
  if (!box) return;
  box.textContent = message || '';
  box.dataset.type = type;
  box.hidden = !message;
}

function clearFormMessages() {
  qsa('[data-status]').forEach((node) => {
    node.textContent = '';
    node.hidden = true;
  });
}

function setStatusText(text) {
  const node = qs('[data-auth-status]');
  if (node) node.textContent = text;
}

function setSessionSummary(text) {
  const node = qs('[data-session-summary]');
  if (node) node.textContent = text || '';
}

function updateThemeToggleLabel(theme) {
  const toggleBtn = qs('[data-action="toggle-theme"]');
  if (!toggleBtn) return;
  toggleBtn.textContent = theme === 'light' ? 'Тёмная тема' : 'Светлая тема';
}

function setTheme(theme, { persist = true } = {}) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = normalized;
  if (persist) localStorage.setItem(THEME_STORAGE_KEY, normalized);
  updateThemeToggleLabel(normalized);
  applyTurnstileTheme(normalized);
}

function loadStoredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : document.documentElement.dataset.theme || 'dark';
}

function bindThemeToggle() {
  const toggleBtn = qs('[data-action="toggle-theme"]');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

function initTheme() {
  const initialTheme = loadStoredTheme();
  setTheme(initialTheme, { persist: false });
  bindThemeToggle();
}

function populateAccounts(accounts = []) {
  const list = qs('[data-accounts-list]');
  if (!list) return;
  list.innerHTML = '';
  if (!accounts.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'Ваш аккаунт пока не создан полностью';
    list.appendChild(li);
    return;
  }

  accounts.forEach((account) => {
    const li = document.createElement('li');
    const name = account.name || account.slug || account.id || 'Аккаунт';
    const type = account.type || account.plan || '';
    li.textContent = name;
    if (type) {
      const badge = document.createElement('span');
      badge.className = 'muted';
      badge.textContent = type;
      li.appendChild(badge);
    }
    list.appendChild(li);
  });
}

function renderProfile(user) {
  qs('[data-user-email]').textContent = user?.name || user?.email || 'друг';
  const subtitle = qs('[data-dashboard-subtitle]');
  if (subtitle) {
    const role = user?.role || user?.user_type || user?.type;
    const identifier = user?.email || user?.phone || user?.tg_id || user?.id;
    subtitle.textContent = role && identifier
      ? `${identifier} · ${role}`
      : identifier || 'Ваш аккаунт пока не загружен';
  }

  const pre = qs('[data-profile-dump]');
  if (pre) {
    pre.textContent = user ? JSON.stringify(user, null, 2) : 'Профиль не загружен';
  }

  populateAccounts(user?.accounts || []);
}

function showAuthenticatedUI() {
  const dashboard = qs('[data-view="dashboard"]');
  const authView = qs('[data-view="auth"]');
  if (dashboard) dashboard.hidden = false;
  if (authView) authView.hidden = false; // остаётся видимой, но заблокирована CSS
  setAuthState('authenticated');
  setStatusText('Вы авторизованы');
  setSessionSummary(currentUser?.email || 'Профиль загружен');
  setMessage(null, '', '');
}

function showAnonymousUI(message) {
  const dashboard = qs('[data-view="dashboard"]');
  const authView = qs('[data-view="auth"]');
  if (dashboard) dashboard.hidden = true;
  if (authView) authView.hidden = false;
  setAuthState('anonymous');
  setStatusText(message || 'Вы не авторизованы');
  setSessionSummary('Авторизуйтесь, чтобы управлять 301.st');
  setMessage(null, '', '');
}

function toggleTab(name) {
  const target = AUTH_TABS.includes(name) ? name : AUTH_TABS[0];

  if (window.location.hash !== `#${target}`) {
    history.replaceState(null, '', `#${target}`);
  }

  document.documentElement.dataset.activeAuthTab = target;

  qsa('[data-auth-form]').forEach((form) => {
    const active = form.dataset.authForm === target;
    form.hidden = !active;
    form.setAttribute('aria-hidden', String(!active));
    form.tabIndex = active ? 0 : -1;
  });

  qsa('[data-tab-target]').forEach((btn) => {
    const isActive = btn.dataset.tabTarget === target;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.tabIndex = isActive ? 0 : -1;
  });

  clearFormMessages();

  const activeForm = qs(`[data-auth-form="${target}"]`);
  const firstField = qs('input', activeForm);
  if (firstField) firstField.focus();
  resetTurnstile();
}

function getTabFromHash() {
  const hash = window.location.hash.replace('#', '').trim();
  return AUTH_TABS.includes(hash) ? hash : null;
}

function resetTurnstile() {
  qsa('.cf-turnstile').forEach((node) => {
    const widgetId = node.dataset.widgetId;
    if (!widgetId) return;
    try {
      if (window.turnstile) window.turnstile.reset(widgetId);
    } catch (err) {
      console.error(err);
    }
  });
}

function getTurnstileToken(form) {
  const widget = form ? qs('.cf-turnstile', form) : qs('.cf-turnstile');
  const widgetId = widget?.dataset.widgetId;
  const input = qs('input[name="cf-turnstile-response"]', form) || qs('input[name="cf-turnstile-response"]');
  const value = input?.value?.trim();
  if (value) return value;
  try {
    if (window.turnstile && widgetId) return window.turnstile.getResponse(widgetId) || '';
  } catch {}
  return '';
}

async function loadTurnstileSitekey() {
  try {
    const res = await fetch('/env', { cache: 'no-store' });
    if (!res.ok) throw new Error('env failed');
    const data = await res.json();
    return data.turnstileSitekey || DEFAULT_SITEKEY;
  } catch {
    return DEFAULT_SITEKEY;
  }
}

async function renderTurnstile(sitekey) {
  turnstileSitekey = sitekey;
  await turnstileReady;
  qsa('.cf-turnstile').forEach((node) => {
    const existingId = node.dataset.widgetId;
    if (existingId) {
      try {
        window.turnstile?.remove?.(existingId);
      } catch {}
    }
    node.dataset.sitekey = sitekey;
    try {
      const id = window.turnstile?.render?.(node, {
        sitekey,
        theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
        retry: 'auto',
      });
      if (id) node.dataset.widgetId = id;
    } catch {}
  });
}

async function applyTurnstileTheme(theme) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  qsa('.cf-turnstile').forEach((node) => {
    node.dataset.theme = normalized;
  });
  await renderTurnstile(turnstileSitekey);
}

async function apiRequest(path, { method = 'GET', body, headers = {}, auth = false } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: { ...headers },
  };
  if (auth && accessToken) {
    options.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (body) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_ROOT}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, ...data };
}

async function login({ email, password, turnstileToken }) {
  return apiRequest('/login', {
    method: 'POST',
    body: { email, password, turnstile_token: turnstileToken },
  });
}

async function register({ email, password, turnstileToken }) {
  return apiRequest('/register', {
    method: 'POST',
    body: { email, password, turnstile_token: turnstileToken },
  });
}

async function forgotPassword({ email, turnstileToken }) {
  return apiRequest('/reset_password', {
    method: 'POST',
    body: { type: 'email', value: email, turnstile_token: turnstileToken },
  });
}

async function refreshSession(silent = false) {
  const res = await apiRequest('/refresh', { method: 'POST' });
  if (res.ok && res.access_token) {
    setAccessToken(res.access_token);
    setSessionSummary('Сессия обновлена');
    return loadMe({ attemptRefresh: false });
  }
  setAccessToken(null);
  currentUser = null;
  currentAccount = null;
  if (!silent) {
    showAnonymousUI('Сессия устарела, войдите снова');
  } else {
    showAnonymousUI();
  }
  return null;
}

async function loadMe({ attemptRefresh = true } = {}) {
  if (!accessToken) {
    return attemptRefresh ? refreshSession() : null;
  }

  const res = await apiRequest('/me', { auth: true });
  if (res.status === 401 && attemptRefresh) {
    return refreshSession();
  }
  if (!res.ok) {
    showAnonymousUI('Не удалось загрузить профиль');
    return null;
  }

  currentUser = res.user || res.profile || res;
  currentAccount = res.accounts?.[0] || null;
  setAuthState('authenticated');
  renderProfile(currentUser);
  showAuthenticatedUI();
  return currentUser;
}

async function handleSubmit(form, action, handler) {
  const submitButton = qs('button[type="submit"]', form);
  const defaultText = submitButton?.textContent;
  if (submitButton) {
    submitButton.disabled = true;
    const labels = {
      login: 'Входим...',
      register: 'Создаём аккаунт...',
      forgot: 'Отправляем письмо...'
    };
    submitButton.textContent = labels[action] || defaultText;
  }
  clearFormMessages();
  setMessage(form, 'loading', 'Обработка...');

  try {
    const result = await handler();
    if (!result?.ok) {
      const message = ERROR_MESSAGES[result?.error_code] || result?.message || 'Ошибка запроса.';
      setMessage(form, 'error', message);
      return;
    }

    if (result.access_token) {
      setAccessToken(result.access_token);
    }

    if (action === 'login') {
      setMessage(form, 'success', 'Вы успешно вошли.');
      resetTurnstile();
      await loadMe();
      return;
    }

    if (action === 'register') {
      setMessage(form, 'success', 'Проверьте почту для подтверждения регистрации.');
      form.reset();
      resetTurnstile();
      return;
    }

    if (action === 'forgot') {
      setMessage(form, 'success', 'Если такой email есть в системе, мы отправили письмо со ссылкой.');
      form.reset();
      resetTurnstile();
    }
  } catch (err) {
    console.error(err);
    setMessage(form, 'error', 'Сеть недоступна.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = defaultText;
    }
  }
}

function bindForms() {
  qsa('[data-auth-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = qs('input[name="email"]', form)?.value?.trim();
      const password = qs('input[name="password"]', form)?.value;
      const turnstileToken = getTurnstileToken(form);

      const type = form.dataset.authForm;
      if (type === 'login') {
        if (!email || !password) return setMessage(form, 'error', 'Введите email и пароль.');
        if (!turnstileToken) return setMessage(form, 'error', 'Подтвердите Turnstile.');
        return handleSubmit(form, 'login', () => login({ email, password, turnstileToken }));
      }
      if (type === 'register') {
        if (!email || !password) return setMessage(form, 'error', 'Введите email и пароль.');
        if (!turnstileToken) return setMessage(form, 'error', 'Подтвердите Turnstile.');
        return handleSubmit(form, 'register', () => register({ email, password, turnstileToken }));
      }
      if (type === 'forgot') {
        if (!email) return setMessage(form, 'error', 'Введите email.');
        if (!turnstileToken) return setMessage(form, 'error', 'Подтвердите Turnstile.');
        return handleSubmit(form, 'forgot', () => forgotPassword({ email, turnstileToken }));
      }
    });
  });

  qsa('[data-switch-to]').forEach((link) => {
    link.addEventListener('click', () => {
      toggleTab(link.dataset.switchTo);
    });
  });
}

function bindTabs() {
  qsa('[data-tab-target]').forEach((btn) => {
    btn.addEventListener('click', () => toggleTab(btn.dataset.tabTarget));
  });
}

function bindDashboardActions() {
  const refreshBtn = qs('[data-action="refresh-session"]');
  const reloadBtn = qs('[data-action="reload-profile"]');
  const logoutBtn = qs('[data-action="logout"]');

  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    const user = await refreshSession();
    refreshBtn.disabled = false;
    if (user) setMessage(null, 'success', 'Сессия обновлена');
  });

  reloadBtn?.addEventListener('click', async () => {
    reloadBtn.disabled = true;
    const user = await loadMe({ attemptRefresh: false });
    reloadBtn.disabled = false;
    if (user) setMessage(null, 'success', 'Профиль обновлён');
  });

  logoutBtn?.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    await apiRequest('/logout', { method: 'POST' });
    setAccessToken(null);
    currentUser = null;
    showAnonymousUI();
    logoutBtn.disabled = false;
  });
}

async function fetchProviders() {
  try {
    const res = await apiRequest('/providers');
    if (res.ok && res.providers) return res.providers;
    if (Array.isArray(res)) return res;
  } catch (err) {
    console.error(err);
  }
  return [
    { id: 'google', label: 'Sign in with Google' },
    { id: 'github', label: 'Sign in with GitHub' },
  ];
}

function renderOAuthButtons(providers) {
  const container = qs('[data-oauth-buttons]');
  if (!container) return;
  container.innerHTML = '';

  providers.forEach((provider) => {
    const id = provider.id || provider.name || provider;
    const label = provider.label || provider.title || `Sign in with ${id}`;
    const link = document.createElement('a');
    link.className = 'social-button';
    link.dataset.oauthProvider = id;
    link.href = `${API_ROOT}/oauth/${id}/start`;
    link.textContent = label;
    container.appendChild(link);
  });
}

function handleOAuthReturn() {
  const { pathname, searchParams } = new URL(window.location.href);
  if (pathname === '/auth/success') {
    const token = searchParams.get('token');
    if (token) {
      setAccessToken(token);
      history.replaceState(null, '', '/');
    }
  }
}

async function bootstrap() {
  initTheme();
  showAnonymousUI();
  toggleTab(getTabFromHash() || 'login');
  bindForms();
  bindTabs();
  bindDashboardActions();

  window.addEventListener('hashchange', () => {
    const next = getTabFromHash();
    if (next) toggleTab(next);
  });

  handleOAuthReturn();

  oauthProviders = await fetchProviders();
  renderOAuthButtons(oauthProviders);

  const sitekey = await loadTurnstileSitekey();
  await renderTurnstile(sitekey);

  if (accessToken) {
    await loadMe();
  } else {
    await refreshSession(true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
