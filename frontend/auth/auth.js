const API_ROOT = 'https://api.301.st/auth';
let accessToken = null;

const selectors = {
  loginForm: document.querySelector('#auth-login-form'),
  registerForm: document.querySelector('#auth-register-form'),
  toggle: document.querySelector('#auth-toggle'),
  toggleLabel: document.querySelector('#auth-toggle-label'),
  sessionState: document.querySelector('#auth-session-state'),
  userEmail: document.querySelector('[data-role="user-email"]'),
  refreshBtn: document.querySelector('#auth-refresh'),
  logoutBtn: document.querySelector('#auth-logout'),
};

function setFormMessage(form, message, type = 'muted') {
  const el = form?.querySelector('[data-role="form-message"]');
  if (!el) return;

  el.textContent = message || '';
  el.classList.remove('error', 'success');
  if (type === 'error') el.classList.add('error');
  if (type === 'success') el.classList.add('success');
}

function toggleForms(showRegister) {
  selectors.loginForm.hidden = !!showRegister;
  selectors.registerForm.hidden = !showRegister;
  selectors.toggleLabel.textContent = showRegister
    ? 'Already have an account?'
    : 'Don’t have an account?';
  selectors.toggle.textContent = showRegister ? 'Sign in' : 'Create one';
}

function showSession(email) {
  selectors.sessionState.hidden = !email;
  selectors.loginForm.hidden = !!email;
  selectors.registerForm.hidden = !!email;
  if (selectors.userEmail && email) selectors.userEmail.textContent = email;
}

async function fetchJSON(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (response.ok) {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  let errorMessage = 'Unexpected error';
  try {
    const { message } = await response.json();
    if (message) errorMessage = message;
  } catch (_) {
    /* no-op */
  }
  const error = new Error(errorMessage);
  error.status = response.status;
  throw error;
}

async function login({ email, password }) {
  const payload = { email, password };
  const data = await fetchJSON('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  accessToken = data?.access_token || null;
  await loadMe();
  return data;
}

async function register({ email, password }) {
  const payload = { email, password };
  const data = await fetchJSON('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data;
}

async function loadMe() {
  try {
    const data = await fetchJSON('/me', {
      method: 'GET',
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    showSession(data?.email);
    return data;
  } catch (error) {
    if (error?.status === 401) {
      await refresh();
    } else {
      showSession(null);
      throw error;
    }
  }
}

async function refresh() {
  const data = await fetchJSON('/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  accessToken = data?.access_token || null;
  if (accessToken) {
    await loadMe();
  } else {
    showSession(null);
  }
  return data;
}

async function logout() {
  await fetchJSON('/logout', {
    method: 'POST',
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  accessToken = null;
  showSession(null);
  selectors.loginForm.reset();
  selectors.registerForm.reset();
  toggleForms(false);
}

function bindForm(form, handler) {
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFormMessage(form, '');
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    form.querySelector('button')?.setAttribute('disabled', 'true');
    try {
      const result = await handler({ email, password });
      setFormMessage(form, result?.message || 'Success', 'success');
    } catch (error) {
      setFormMessage(form, error.message || 'Something went wrong', 'error');
    } finally {
      form.querySelector('button')?.removeAttribute('disabled');
    }
  });
}

function init() {
  toggleForms(false);

  bindForm(selectors.loginForm, login);
  bindForm(selectors.registerForm, register);

  selectors.toggle?.addEventListener('click', (event) => {
    event.preventDefault();
    const showRegister = selectors.registerForm.hidden;
    toggleForms(showRegister);
  });

  selectors.refreshBtn?.addEventListener('click', () => refresh());
  selectors.logoutBtn?.addEventListener('click', () => logout());

  loadMe().catch(() => {
    showSession(null);
  });
}

document.addEventListener('DOMContentLoaded', init);

window.__auth301 = {
  login,
  register,
  loadMe,
  refresh,
  logout,
};

