const API_ROOT = 'https://api.301.st/auth';
const THEME_STORAGE_KEY = '301-ui-theme';

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function setGlobalMessage(type = null, text = '') {
  const el = qs('[data-global-message]');
  if (!el) return;

  if (!type || !text) {
    el.hidden = true;
    el.textContent = '';
    delete el.dataset.type;
    return;
  }

  el.hidden = false;
  el.dataset.type = type;
  el.textContent = text;
}

function setStatusText(state) {
  const statusEl = qs('[data-auth-status]');
  const summaryEl = qs('[data-session-summary]');

  if (statusEl) {
    statusEl.textContent = state === 'authenticated' ? 'Вы авторизованы' : 'Вы не авторизованы';
  }

  if (summaryEl) {
    summaryEl.textContent =
      state === 'authenticated'
        ? 'Вы вошли в аккаунт. Управляйте доменами и Cloudflare-настройками.'
        : 'Авторизуйтесь, чтобы управлять 301.st';
  }
}

function setAuthState(state) {
  const root = document.documentElement;
  root.dataset.authState = state;

  const authPanel = qs('[data-view="auth"]');
  const dashboard = qs('[data-view="dashboard"]');

  if (authPanel) authPanel.hidden = state === 'authenticated';
  if (dashboard) dashboard.hidden = state !== 'authenticated';

  setStatusText(state);
}

function activateTab(name) {
  qsa('[data-tab-target]').forEach((btn) => {
    const isActive = btn.dataset.tabTarget === name;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  qsa('[data-auth-form]').forEach((form) => {
    const isActive = form.dataset.authForm === name;
    form.hidden = !isActive;
  });
}

function initTabs() {
  const panel = qs('.auth-panel');
  if (!panel) return;

  qsa('[data-tab-target]', panel).forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      activateTab(btn.dataset.tabTarget);
    });
  });

  qsa('[data-switch-to]', panel).forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      activateTab(link.dataset.switchTo);
    });
  });

  activateTab('login');
}

function getStoredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = normalized;
  localStorage.setItem(THEME_STORAGE_KEY, normalized);

  const toggle = qs('[data-action="toggle-theme"]');
  if (toggle) {
    toggle.textContent = normalized === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }
}

function initThemeToggle() {
  applyTheme(getStoredTheme());
  const btn = qs('[data-action="toggle-theme"]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });
}

function setFormStatus(form, type, text) {
  const status = qs('[data-status]', form);
  if (!status) return;

  if (!text) {
    status.hidden = true;
    status.textContent = '';
    delete status.dataset.type;
    return;
  }

  status.hidden = false;
  status.dataset.type = type;
  status.textContent = text;
}

async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers, ...rest } = options;
  const config = {
    method,
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    credentials: 'include',
    ...rest,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_ROOT}${path}`, config);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function collectTurnstileToken(form) {
  const container = form.querySelector('.cf-turnstile');
  if (window.turnstile) {
    try {
      const resp = window.turnstile.getResponse(container) || window.turnstile.getResponse();
      if (resp) return resp;
    } catch (err) {
      console.error(err);
    }
  }
  const hiddenInput = form.querySelector('input[name="cf-turnstile-response"]');
  return hiddenInput?.value?.trim() || '';
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formType = form.dataset.authForm;

  const formData = new FormData(form);
  const email = (formData.get('email') || '').toString().trim();
  const password = (formData.get('password') || '').toString();
  const turnstileToken = collectTurnstileToken(form);

  setFormStatus(form, null, '');
  setGlobalMessage(null);

  if (!email) {
    setFormStatus(form, 'error', 'Введите email.');
    return;
  }
  if ((formType === 'login' || formType === 'register') && !password) {
    setFormStatus(form, 'error', 'Введите пароль.');
    return;
  }
  if (!turnstileToken) {
    setFormStatus(form, 'error', 'Подтвердите, что вы не робот.');
    return;
  }

  const submitBtn = qs('button[type="submit"]', form);
  const originalText = submitBtn?.textContent;
  if (submitBtn) submitBtn.disabled = true;
  if (submitBtn) submitBtn.textContent =
    formType === 'login' ? 'Входим...' : formType === 'register' ? 'Создаём аккаунт...' : 'Отправляем ссылку...';

  try {
    let endpoint = '/login';
    let payload = { email, cf_turnstile_token: turnstileToken };

    if (formType === 'register') {
      endpoint = '/register';
      payload = { ...payload, password };
    } else if (formType === 'forgot') {
      endpoint = '/forgot';
    } else {
      payload = { ...payload, password };
    }

    const { response, data } = await apiRequest(endpoint, { method: 'POST', body: payload });

    if (!response.ok) {
      const message = data?.message || 'Что-то пошло не так. Попробуйте ещё раз или напишите в поддержку.';
      setFormStatus(form, 'error', message);
      return;
    }

    if (formType === 'forgot') {
      setFormStatus(form, 'success', 'Ссылка отправлена на ваш email.');
      form.reset();
      return;
    }

    setFormStatus(form, 'success', 'Готово! Загружаем профиль...');
    await loadProfile();
  } catch (err) {
    console.error(err);
    setFormStatus(form, 'error', 'Что-то пошло не так. Попробуйте ещё раз или напишите в поддержку.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

function initForms() {
  qsa('[data-auth-form]').forEach((form) => {
    form.addEventListener('submit', handleFormSubmit);
  });
}

function populateAccounts(accounts = []) {
  const list = qs('[data-accounts-list]');
  if (!list) return;
  list.innerHTML = '';

  if (!accounts.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'text-muted';
    placeholder.textContent = 'Ваш аккаунт пока не создан полностью';
    list.appendChild(placeholder);
    return;
  }

  accounts.forEach((account) => {
    const li = document.createElement('li');
    li.textContent = account?.name || account?.id || 'Аккаунт';
    list.appendChild(li);
  });
}

function renderProfile(profile = {}) {
  const emailNode = qs('[data-user-email]');
  const subtitle = qs('[data-dashboard-subtitle]');
  const dump = qs('[data-profile-dump]');

  if (emailNode) emailNode.textContent = profile.email || 'друг';
  if (subtitle) subtitle.textContent = profile.email ? `Ваш email: ${profile.email}` : 'Ваш аккаунт пока не загружен';
  if (dump) dump.textContent = Object.keys(profile).length ? JSON.stringify(profile, null, 2) : 'Данные профиля появятся после загрузки.';

  populateAccounts(profile.accounts || []);
}

async function loadProfile() {
  try {
    const { response, data } = await apiRequest('/me', { method: 'GET' });
    if (!response.ok) {
      setAuthState('guest');
      setGlobalMessage('error', 'Не удалось загрузить профиль. Войдите заново.');
      return null;
    }

    setAuthState('authenticated');
    renderProfile(data || {});
    setGlobalMessage(null);
    return data;
  } catch (err) {
    console.error(err);
    setAuthState('guest');
    setGlobalMessage('error', 'Что-то пошло не так. Попробуйте ещё раз или напишите в поддержку.');
    return null;
  }
}

function initDashboardActions() {
  const refreshBtn = qs('[data-action="refresh-session"]');
  const reloadBtn = qs('[data-action="reload-profile"]');
  const logoutBtn = qs('[data-action="logout"]');

  refreshBtn?.addEventListener('click', async () => {
    setGlobalMessage(null);
    refreshBtn.disabled = true;
    try {
      const { response } = await apiRequest('/refresh', { method: 'POST' });
      if (response.ok) {
        await loadProfile();
        setGlobalMessage('success', 'Сессия обновлена');
      } else {
        setAuthState('guest');
        setGlobalMessage('error', 'Сессия устарела, войдите снова.');
      }
    } catch (err) {
      console.error(err);
      setGlobalMessage('error', 'Не удалось обновить сессию.');
    } finally {
      refreshBtn.disabled = false;
    }
  });

  reloadBtn?.addEventListener('click', async () => {
    setGlobalMessage(null);
    reloadBtn.disabled = true;
    await loadProfile();
    reloadBtn.disabled = false;
  });

  logoutBtn?.addEventListener('click', async () => {
    setGlobalMessage(null);
    logoutBtn.disabled = true;
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setAuthState('guest');
    renderProfile({});
    logoutBtn.disabled = false;
  });
}

async function loadOAuthButtons() {
  const container = qs('[data-oauth-buttons]');
  if (!container) return;

  container.innerHTML = '<div class="social-button social-button--placeholder">Загрузка провайдеров...</div>';
  try {
    const { response, data } = await apiRequest('/oauth/providers', { method: 'GET' });
    if (!response.ok || !Array.isArray(data) || !data.length) {
      container.innerHTML = '<div class="social-button social-button--placeholder">Провайдеры недоступны, попробуйте позже</div>';
      return;
    }

    container.innerHTML = '';
    data.forEach((provider) => {
      const btn = document.createElement('a');
      btn.href = `${API_ROOT}/oauth/${provider.id}/start`;
      btn.className = 'social-button';
      btn.textContent = `Войти через ${provider.title || provider.name || provider.id}`;
      container.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="social-button social-button--placeholder">Провайдеры недоступны, попробуйте позже</div>';
  }
}

async function loadProfileOnStart() {
  setAuthState('guest');
  await loadOAuthButtons();
  await loadProfile();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.__auth301Ready) return;
  window.__auth301Ready = true;

  initThemeToggle();
  initTabs();
  initForms();
  initDashboardActions();
  loadProfileOnStart();
});
