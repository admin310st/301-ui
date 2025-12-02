const API_ROOT = 'https://api.301.st/auth';
const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAACB-_l9VwF1M_QHU';
const TURNSTILE_DEBUG = false;
const PROVIDER_NAMES = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  telegram: 'Telegram',
};

let accessToken = null;
let currentUser = null;
const authSubscribers = new Set();
const DEFAULT_AVATAR = '/img/anonymous-avatar.svg';
let turnstileScriptPromise = null;
let turnstileSiteKey = DEFAULT_TURNSTILE_SITE_KEY;
let resetCsrfToken = '';

async function loadTurnstileSiteKey() {
  try {
    const res = await fetch('/env', { cache: 'no-store' });
    if (!res.ok) throw new Error('env failed');
    const data = await res.json();
    const sitekey = data?.turnstileSitekey || data?.turnstile_sitekey;
    return sitekey || DEFAULT_TURNSTILE_SITE_KEY;
  } catch (err) {
    if (TURNSTILE_DEBUG) console.error('Failed to load /env', err);
    return DEFAULT_TURNSTILE_SITE_KEY;
  }
}

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.turnstile && typeof window.turnstile.render === 'function') {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-turnstile]');
    if (!existing) {
      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.appendChild(script);
    }

    const ready = () => {
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        renderTurnstileWidgets();
      }
      resolve(window.turnstile || null);
    };
    window.onTurnstileLoad = ready;
    setTimeout(ready, 2000);
  });

  return turnstileScriptPromise;
}

function renderTurnstileWidgets(root = document) {
  if (!window.turnstile || typeof window.turnstile.render !== 'function') return;

  const containers = root.querySelectorAll('.turnstile-widget');
  containers.forEach((container) => {
    if (!container) return;
    if (container.dataset.tsRendered === '1') return;
    if (container.children.length > 0) return;

    container.dataset.tsRendered = '1';

    const form = container.closest('form');
    const authMode = form?.dataset.auth || 'login';
    const hiddenInput = form?.querySelector('input[name="turnstile_token"]');
    const btn =
      (authMode && form?.querySelector(`[data-auth-submit="${authMode}"]`)) ||
      form?.querySelector('[data-auth-submit]');

    if (btn) {
      if (!btn.dataset.labelReady) btn.dataset.labelReady = (btn.textContent || 'Sign In').trim();
      if (!btn.dataset.labelCaptcha) btn.dataset.labelCaptcha = 'Turnstile required';
      btn.disabled = true;
      btn.textContent = btn.dataset.labelCaptcha;
    }

    const widgetId = window.turnstile.render(container, {
      sitekey: turnstileSiteKey,
      theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      size: 'normal',

      callback(token) {
        if (hiddenInput) hiddenInput.value = token;
        if (btn) {
          btn.disabled = false;
          btn.textContent = btn.dataset.labelReady || 'Sign In';
        }
      },

      'expired-callback'() {
        if (hiddenInput) hiddenInput.value = '';
        if (btn) {
          btn.disabled = true;
          btn.textContent = btn.dataset.labelCaptcha || 'Turnstile required';
        }
        try {
          window.turnstile.reset(widgetId);
        } catch {}
      },

      'error-callback'(errCode) {
        if (TURNSTILE_DEBUG) console.error('Turnstile error:', errCode);
        if (btn) {
          btn.disabled = true;
          btn.textContent = btn.dataset.labelCaptcha || 'Turnstile unavailable';
        }
        const status = form?.querySelector('[data-status]');
        if (status) {
          status.textContent = 'Captcha unavailable. Try again.';
          status.dataset.type = 'error';
          status.hidden = false;
        }
      },
    });
  });
}

function initTurnstileSupport(root = document) {
  loadTurnstileSiteKey()
    .then((sitekey) => {
      turnstileSiteKey = sitekey;
      return loadTurnstileScript();
    })
    .then(() => renderTurnstileWidgets(root));

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-state') {
        const el = m.target;
        if (el.getAttribute('data-state') === 'open' && el.querySelector('.turnstile-widget')) {
          renderTurnstileWidgets(el);
        }
      }

      if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          if (
            node.matches?.('[data-state="open"]') &&
            (node.querySelector('.turnstile-widget') || node.matches('.turnstile-widget'))
          ) {
            renderTurnstileWidgets(node);
            return;
          }

          const openWithWidget =
            node.querySelector?.('[data-state="open"] .turnstile-widget') ||
            node.querySelector?.('.turnstile-widget');

          if (openWithWidget) {
            renderTurnstileWidgets(node);
          }
        });
      }
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-state'],
  });
}

function getTurnstileToken(form) {
  return form?.querySelector('input[name="turnstile_token"]')?.value?.trim() || '';
}

function setAccessToken(token) {
  accessToken = token || null;
}

function md5(str) {
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md51(s) {
    const txt = '';
    let n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;

    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = Array(16).fill(0);
    for (i = 0; i < s.length; i += 1) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i += 1) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function md5cycle(x, k) {
    let [a, b, c, d] = x;

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function add32(a, b) {
    return (a + b) & 0xffffffff;
  }

  function rhex(n) {
    const s = '0123456789abcdef';
    let j;
    let out = '';
    for (j = 0; j < 4; j += 1) {
      out += s.charAt((n >> (j * 8 + 4)) & 0x0f) + s.charAt((n >> (j * 8)) & 0x0f);
    }
    return out;
  }

  function hex(x) {
    return x.map(rhex).join('');
  }

  return hex(md51(str));
}

function buildAvatarUrl(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return DEFAULT_AVATAR;
  const hash = md5(normalized);
  return `https://www.gravatar.com/avatar/${hash}?s=160&d=identicon`;
}

function updateAvatarPreview(email) {
  const img = document.querySelector('[data-avatar-img]');
  const label = document.querySelector('[data-avatar-label]');
  const url = buildAvatarUrl(email);

  if (img && img.src !== url) img.src = url;
  if (label) label.textContent = email?.trim() || 'Укажите email';
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

function bindAvatarPreview() {
  const input = document.querySelector('[data-avatar-source]');
  if (!input) return;
  updateAvatarPreview(input.value);
  input.addEventListener('input', (e) => updateAvatarPreview(e.target.value));
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
  const turnstileToken = getTurnstileToken(form);
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn?.textContent;

  if (!email || !password) {
    return setFormState(form, 'error', 'Enter email/phone & password');
  }
  if (!turnstileToken) {
    return setFormState(form, 'error', 'Подтвердите капчу');
  }

  setFormState(form, 'loading', 'Signing in...');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiRequest('/login', {
      method: 'POST',
      body: { email, password, turnstile_token: turnstileToken },
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

function setResetSubtitle(text) {
  const subtitle = document.querySelector('[data-reset-subtitle]');
  if (subtitle && typeof text === 'string') subtitle.textContent = text;
}

function getResetParams() {
  const url = new URL(location.href);
  return {
    type: url.searchParams.get('type'),
    token: url.searchParams.get('token') || url.searchParams.get('reset_token'),
  };
}

function disableResetForm(form) {
  const passwordInput = form?.querySelector('[name="password"]');
  const submitBtn = form?.querySelector('[type="submit"]');
  if (passwordInput) passwordInput.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
}

function resolveResetVerifyError(res) {
  const code = res?.error || res?.status;
  if (code === 'expired_token') return 'Ссылка устарела. Запросите новое письмо.';
  return resolveErrorMessage(res, 'Не удалось подтвердить ссылку');
}

function resolveResetConfirmError(res) {
  const code = res?.error || res?.status;
  switch (code) {
    case 'reset_session_required':
    case 'reset_session_expired':
      return 'Ссылка для сброса истекла. Запросите новое письмо.';
    case 'csrf_token_required':
    case 'csrf_token_invalid':
      return 'Сессия сброса не найдена или истекла. Запросите новое письмо.';
    case 'password_too_weak':
      return 'Пароль слишком слабый. Попробуйте сложнее.';
    case 'password_reused':
      return 'Новый пароль совпадает со старым.';
    default:
      return resolveErrorMessage(res, 'Не удалось обновить пароль');
  }
}

async function verifyResetLink(form) {
  if (!form) return false;

  const passwordInput = form.querySelector('[name="password"]');
  const submitBtn = form.querySelector('[type="submit"]');
  const { type, token } = getResetParams();

  resetCsrfToken = '';
  disableResetForm(form);

  if (type !== 'reset' || !token) {
    setResetSubtitle('Ссылка сброса не найдена. Запросите новое письмо.');
    setFormState(form, 'error', 'Ссылка сброса не найдена. Запросите новое письмо.');
    return false;
  }

  setFormState(form, 'loading', 'Проверяем ссылку...');
  setResetSubtitle('Проверяем ссылку из письма...');

  try {
    const res = await apiRequest('/verify', { method: 'POST', body: { token } });

    if (res.ok && res.type === 'reset' && res.csrf_token) {
      resetCsrfToken = res.csrf_token;
      setFormState(form, 'success', 'Ссылка подтверждена. Введите новый пароль.');
      setResetSubtitle('Придумайте новый пароль для входа.');
      if (passwordInput) passwordInput.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
      try {
        history.replaceState(null, '', location.pathname);
      } catch {}
      passwordInput?.focus?.();
      return true;
    }

    const message = resolveResetVerifyError(res);
    setFormState(form, 'error', message);
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', 'Не удалось подтвердить ссылку.');
  }

  setResetSubtitle('Ссылка сброса недействительна. Запросите новое письмо.');
  return false;
}

async function handleConfirmPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.querySelector('[name="password"]')?.value || '';
  const submitBtn = form.querySelector('[type="submit"]');

  if (!resetCsrfToken) {
    setFormState(form, 'error', 'Ссылка сброса не подтверждена или истекла.');
    disableResetForm(form);
    return;
  }

  if (!password) {
    return setFormState(form, 'error', 'Введите новый пароль');
  }

  setFormState(form, 'loading', 'Обновляем пароль...');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiRequest('/confirm_password', {
      method: 'POST',
      body: { password, csrf_token: resetCsrfToken },
    });

    if (res.ok && res.status === 'ok') {
      setFormState(form, 'success', 'Пароль обновлён. Можно войти с ним прямо сейчас.');
      form.reset();
      resetCsrfToken = '';
      disableResetForm(form);
      return;
    }

    const message = resolveResetConfirmError(res);
    setFormState(form, 'error', message);

    const code = res?.error || res?.status;
    if (
      code === 'reset_session_required' ||
      code === 'reset_session_expired' ||
      code === 'csrf_token_required' ||
      code === 'csrf_token_invalid'
    ) {
      resetCsrfToken = '';
      disableResetForm(form);
    }
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', 'Не удалось обновить пароль.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
}

function bindResetConfirmForm() {
  const form = document.querySelector('[data-auth="reset-confirm"]');
  if (form && !form.dataset.authBound) {
    form.dataset.authBound = 'true';
    disableResetForm(form);
    verifyResetLink(form);
    form.addEventListener('submit', handleConfirmPassword);
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

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector('[name="email"]')?.value?.trim();
  const password = form.querySelector('[name="password"]')?.value || '';
  const turnstileToken = getTurnstileToken(form);
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn?.textContent;

  if (!email || !password) {
    return setFormState(form, 'error', 'Введите email и пароль');
  }
  if (!turnstileToken) {
    return setFormState(form, 'error', 'Подтвердите капчу');
  }

  setFormState(form, 'loading', 'Создаём аккаунт...');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiRequest('/register', {
      method: 'POST',
      body: { email, password, turnstile_token: turnstileToken },
    });

    if (res.ok) {
      setFormState(form, 'success', 'Проверьте почту или войдите сразу.');
      if (res.access_token) {
        setAccessToken(res.access_token);
        const user = res.user || (await fetchMe());
        applyAuthState(user);
      }
      return;
    }

    setFormState(form, 'error', resolveErrorMessage(res, 'Не удалось создать аккаунт'));
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', 'Ошибка регистрации');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (originalText) submitBtn.textContent = originalText;
    }
  }
}

function bindRegisterForm() {
  const form = document.querySelector('[data-auth="register"]');
  if (form && !form.dataset.authBound) {
    form.dataset.authBound = 'true';
    form.addEventListener('submit', handleRegister);
  }
}

async function handleForgot(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector('[name="email"]')?.value?.trim();
  const turnstileToken = getTurnstileToken(form);
  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn?.textContent;

  if (!email) {
    return setFormState(form, 'error', 'Укажите email');
  }
  if (!turnstileToken) {
    return setFormState(form, 'error', 'Подтвердите капчу');
  }

  setFormState(form, 'loading', 'Отправляем письмо...');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiRequest('/reset_password', {
      method: 'POST',
      body: { type: 'email', value: email, turnstile_token: turnstileToken },
    });

    const code = res.error || res.status;

    if (code === 'oauth_only') {
      const providerLabel = PROVIDER_NAMES[res.provider] || res.provider || 'OAuth';
      const message =
        res.message || `Вход через ${providerLabel}. Сброс пароля недоступен для этого аккаунта.`;
      setFormState(form, 'error', message);
      return;
    }

    if (res.ok) {
      setFormState(form, 'success', 'Письмо отправлено. Проверьте почту, чтобы сбросить пароль.');
      return;
    }

    setFormState(form, 'error', resolveErrorMessage(res, 'Не удалось отправить письмо'));
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', 'Ошибка отправки письма');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (originalText) submitBtn.textContent = originalText;
    }
  }
}

function bindForgotForm() {
  const form = document.querySelector('[data-auth="forgot"]');
  if (form && !form.dataset.authBound) {
    form.dataset.authBound = 'true';
    form.addEventListener('submit', handleForgot);
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
  bindRegisterForm();
  bindForgotForm();
  bindResetConfirmForm();
  bindLogoutButton();
  bindAccountFields();
  toggleLoginVisibility(Boolean(currentUser));
  bindAvatarPreview();
  initTurnstileSupport();
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
