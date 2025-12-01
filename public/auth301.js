const API_ROOT = 'https://api.301.st/auth';

let accessToken = null;
let currentUser = null;
const authSubscribers = new Set();

function setAccessToken(token) {
  accessToken = token || null;
}

function setFormState(form, state = 'idle', msg = '') {
  if (!form) return;

  form.dataset.state = state;

  let box = form.querySelector('[data-status]');
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('data-status', '');
    box.classList.add('auth-status');
    form.appendChild(box);
  }

  box.textContent = msg;
  box.dataset.type = state;
  box.hidden = !msg;
}

function setWebstudioVariable(name, value) {
  try {
    window.webstudioSetVariable?.(name, value ?? '');
  } catch (err) {
    console.error('webstudioSetVariable error', err);
  }
}

function toggleLoginVisibility(loggedIn) {
  document.querySelectorAll('[data-onlogin]').forEach((node) => {
    const mode = node.dataset.onlogin;
    if (loggedIn) {
      if (mode === 'show') node.style.display = '';
      if (mode === 'hide') node.style.display = 'none';
    } else {
      if (mode === 'show') node.style.display = 'none';
      if (mode === 'hide') node.style.display = '';
    }
  });
}

function applyAuthState(user) {
  currentUser = user || null;
  const loggedIn = Boolean(user);
  document.documentElement.dataset.authState = loggedIn ? 'in' : 'out';

  setWebstudioVariable('authUserEmail', user?.email ?? '');
  setWebstudioVariable('authUserName', user?.name ?? '');

  toggleLoginVisibility(loggedIn);
  authSubscribers.forEach((cb) => {
    try {
      cb(user || null);
    } catch (err) {
      console.error(err);
    }
  });
}

function onAuthStateChanged(cb) {
  if (typeof cb === 'function') {
    authSubscribers.add(cb);
    cb(currentUser);
  }
  return () => authSubscribers.delete(cb);
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

  const res = await fetch(`${API_ROOT}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}

async function fetchMe() {
  const res = await apiRequest('/me', { auth: true });
  if (res.ok && res.user) {
    applyAuthState(res.user);
    return res.user;
  }
  return null;
}

async function refreshSession() {
  const res = await apiRequest('/refresh', { method: 'POST' });
  if (res.ok && res.access_token) {
    setAccessToken(res.access_token);
    return fetchMe();
  }
  applyAuthState(null);
  return null;
}

async function auth301Logout() {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch (err) {
    console.error(err);
  }
  setAccessToken(null);
  applyAuthState(null);
}

function resolveErrorMessage(res, fallback) {
  return res?.error || res?.message || fallback;
}

async function handleSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector('[name="email"]')?.value?.trim();
  const password = form.querySelector('[name="password"]')?.value || '';
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn?.textContent;

  if (!email || !password) {
    return setFormState(form, 'error', 'Enter email/phone & password');
  }

  setFormState(form, 'loading', 'Signing in...');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiRequest('/login', {
      method: 'POST',
      body: { email, password },
    });

    if (res.ok && res.access_token) {
      setAccessToken(res.access_token);
      const user = res.user || (await fetchMe());
      applyAuthState(user);
      setFormState(form, 'success', 'Logged in.');
      setTimeout(() => {
        if (location.pathname.startsWith('/auth/login')) {
          window.location.href = '/account';
        }
      }, 300);
      return;
    }

    const message = resolveErrorMessage(res, 'Sign-in error');
    setFormState(form, 'error', message);
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', 'Sign-in error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (originalText) submitBtn.textContent = originalText;
    }
  }
}

function bindLoginForm() {
  const form =
    document.querySelector('[data-auth="login"]') ||
    document.getElementById('auth-login-form') ||
    document.getElementById('form-signin-form');

  if (form && !form.dataset.authBound) {
    form.dataset.authBound = 'true';
    form.addEventListener('submit', handleSignIn);
  }
}

function bindLogoutButton() {
  const btn = document.getElementById('AccountLogout');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      auth301Logout();
    });
  }
}

function bindAccountFields() {
  onAuthStateChanged((user) => {
    const nameEl = document.getElementById('AccountName');
    const emailEl = document.getElementById('AccountEmail');
    const logout = document.getElementById('AccountLogout');

    if (!nameEl || !emailEl) return;

    if (!user) {
      nameEl.textContent = '';
      emailEl.textContent = '';
      if (logout) logout.style.display = 'none';
      return;
    }

    const label =
      (user.name && user.name.trim()) ||
      (user.email && user.email.trim()) ||
      `User #${user.id}`;
    nameEl.textContent = label;
    emailEl.textContent = user.email || '';
    if (logout) logout.style.display = '';
  });
}

function initAuthUI() {
  bindLoginForm();
  bindLogoutButton();
  bindAccountFields();
  toggleLoginVisibility(Boolean(currentUser));
}

async function bootstrapAuth() {
  initAuthUI();
  await refreshSession();
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapAuth();
});

window.auth301Logout = auth301Logout;
window.onAuthStateChanged = onAuthStateChanged;
window.auth301RefreshSession = refreshSession;
window.auth301ApplyState = applyAuthState;
window.auth301SetFormState = setFormState;
