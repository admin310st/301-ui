// src/forms/reset-verify.ts
//
// Обработка ссылок вида /auth/verify?type=reset&token=XXX
// без самостоятельной верстки форм. Всё, что мы делаем:
//  - забираем token из URL;
//  - шлём POST /auth/verify на api.301.st;
//  - сохраняем csrf_token в reset-session;
//  - переключаем экраны: с "verify" -> "reset-confirm".

import { apiFetch } from '@api/auth';
import type { CommonErrorResponse, VerifyResetResponse } from '@api/types';
import { setResetCsrfToken } from '@state/reset-session';
import { showAuthView } from '@ui/auth-routing';
import { qs } from '@ui/dom';
import { showNotice } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

type VerifyResponse = VerifyResetResponse & {
  ok?: boolean;
  type?: string;
};

type AuthViewName = 'login' | 'register' | 'reset' | 'verify' | 'reset-confirm';

function getAuthView(name: AuthViewName): HTMLElement | null {
  return qs<HTMLElement>(`[data-auth-view="${name}"]`);
}

function extractResetToken(url: URL): string | null {
  return url.searchParams.get('token')?.trim() || null;
}

function mapVerifyError(code?: string | null): string {
  switch (code) {
    case 'invalid_token':
      return 'Reset link is invalid. Please start password recovery again.';
    case 'expired_token':
      return 'Reset link has expired. Please request a new one.';
    case 'reset_session_required':
    case 'reset_session_expired':
      return 'Reset session has expired. Please restart the reset flow.';
    default:
      return 'Unable to validate reset link, please try again later.';
  }
}

async function handleResetVerify(url: URL, token: string): Promise<void> {
  const verifyView = getAuthView('verify');
  const resetConfirmView = getAuthView('reset-confirm');

  if (verifyView) {
    showAuthView('verify');
    window.location.hash = '#verify';
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
    const apiError = err as ApiError<CommonErrorResponse>;
    const errorCode = apiError?.body?.code || apiError?.body?.error;
    showNotice('error', mapVerifyError(errorCode));
    setResetCsrfToken(null);
    window.location.hash = '#reset';
    showAuthView('reset');
    return;
  }

  if (!data || !data.ok || data.type !== 'reset' || !data.csrf_token) {
    const errorCode = data?.error || data?.message || null;
    showNotice('error', mapVerifyError(errorCode));
    setResetCsrfToken(null);
    window.location.hash = '#reset';
    showAuthView('reset');
    return;
  }

  setResetCsrfToken(data.csrf_token);

  try {
    url.searchParams.delete('token');
    const search = url.searchParams.toString();
    const cleanUrl = search ? `${url.pathname}?${search}` : url.pathname;
    history.replaceState(null, '', `${cleanUrl}#reset-confirm`);
  } catch {
    // ignore history errors
  }

  if (resetConfirmView) {
    showAuthView('reset-confirm');
  }
}

export function initResetVerifyFlow(): void {
  if (!window.location.pathname.startsWith('/auth/verify')) return;

  const url = new URL(window.location.href);
  const type = url.searchParams.get('type');
  if (type !== 'reset') return;

  const token = extractResetToken(url);
  if (!token) {
    showNotice('error', 'Reset link is invalid. Please start password recovery again.');
    window.location.hash = '#reset';
    showAuthView('reset');
    return;
  }

  void handleResetVerify(url, token);
}
