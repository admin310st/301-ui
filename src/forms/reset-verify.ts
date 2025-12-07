// src/forms/reset-verify.ts
//
// Обработка ссылок вида /auth/verify?type=reset&token=XXX
// без самостоятельной верстки форм. Всё, что мы делаем:
//  - забираем token из URL;
//  - шлём POST /auth/verify на api.301.st;
//  - сохраняем csrf_token в reset-session;
//  - переключаем экраны: с "verify" -> "reset-confirm".

import { qs, toggle } from '@ui/dom';
import { apiFetch } from '@api/auth';
import { setResetCsrfToken } from '@state/reset-session';
import { showNotice } from '@ui/notifications';

type VerifyResponse = {
  ok: boolean;
  type: string;
  csrf_token?: string;
  message?: string;
};

type AuthViewName = 'login' | 'register' | 'reset' | 'verify' | 'reset-confirm';

function getAuthView(name: AuthViewName): HTMLElement | null {
  return qs<HTMLElement>(`[data-auth-view="${name}"]`);
}

function switchAuthView(active: AuthViewName): void {
  const all = document.querySelectorAll<HTMLElement>('[data-auth-view]');
  all.forEach((el) => {
    const isActive = el.dataset.authView === active;
    toggle(el, isActive);
  });
}

function extractResetToken(): { token: string | null; isResetRoute: boolean } {
  const url = new URL(window.location.href);
  const type = url.searchParams.get('type');
  const isResetRoute = type === 'reset';

  if (!isResetRoute) return { token: null, isResetRoute };

  const token = url.searchParams.get('token')?.trim() || null;

  // Убираем токен из адресной строки, чтобы не светить его в history
  if (token) {
    try {
      url.searchParams.delete('token');
      const clean = url.search ? `${url.pathname}${url.search}` : url.pathname;
      window.history.replaceState(null, '', clean);
    } catch {
      // no-op
    }
  }

  return { token, isResetRoute };
}

async function handleResetVerify(token: string): Promise<void> {
  // Показываем "Verifying…" (секция data-auth-view="verify")
  const verifyView = getAuthView('verify');
  const resetConfirmView = getAuthView('reset-confirm');

  if (verifyView || resetConfirmView) {
    // если секции размечены, включаем экран верификации
    if (verifyView) switchAuthView('verify');
  }

  let data: VerifyResponse | null = null;

  try {
    data = await apiFetch<VerifyResponse>('/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
      credentials: 'include',
    });
  } catch (err) {
    console.error('[ResetVerify] /auth/verify failed', err);
    showNotice('error', 'Reset link validation failed. Please request a new link.');
    switchAuthView('reset');
    return;
  }

  if (!data || !data.ok || data.type !== 'reset' || !data.csrf_token) {
    const msg =
      data?.message === 'expired_token'
        ? 'The reset link has expired. Please request a new one.'
        : 'Reset link is invalid. Please start password recovery again.';
    showNotice('error', msg);
    switchAuthView('reset');
    return;
  }

  // Всё хорошо: есть CSRF + reset_session cookie
  setResetCsrfToken(data.csrf_token);

  // Переключаемся на форму нового пароля
  if (resetConfirmView) {
    switchAuthView('reset-confirm');
  } else {
    // На всякий случай — если секция не размечена, хотя бы останемся на reset
    switchAuthView('reset');
  }
}

export function initResetVerifyFlow(): void {
  // Работает только на /auth/verify
  if (!window.location.pathname.startsWith('/auth/verify')) return;

  const { token, isResetRoute } = extractResetToken();
  if (!isResetRoute) return;

  if (!token) {
    showNotice('error', 'Reset link is invalid. Please start password recovery again.');
    switchAuthView('reset');
    return;
  }

  void handleResetVerify(token);
}
