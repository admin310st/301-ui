import { verifyToken } from '@api/auth';
import type { CommonErrorResponse, VerifyRequest, VerifyResetResponse } from '@api/types';
import { setResetCsrfToken } from '@state/reset-session';
import { applyLoginStateToDOM } from '@ui/auth-dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Verification failed';
}

function setVerifyStatus(state: 'pending' | 'error' | 'success', message: string): void {
  const status = document.querySelector<HTMLElement>('[data-verify-status]');
  if (!status) return;
  status.dataset.type = state;
  status.textContent = message;
  status.hidden = false;
}

function parseSearchParams(): VerifyRequest | null {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const token = params.get('token');
  if (!type || !token) return null;
  if (type !== 'register' && type !== 'reset') return null;
  return { type, token } as VerifyRequest;
}

async function handleVerification(): Promise<void> {
  const payload = parseSearchParams();
  if (!payload) {
    setVerifyStatus('error', 'Нет параметров для подтверждения.');
    return;
  }

  try {
    setVerifyStatus('pending', 'Подтверждаем...');
    const res = await verifyToken(payload);

    if (payload.type === 'register') {
      applyLoginStateToDOM('user' in res ? res.user ?? null : null);
      showGlobalMessage('success', 'Email подтверждён, перенаправляем...');
      setVerifyStatus('success', 'Email подтверждён, перенаправляем...');
      window.location.hash = '#account';
      return;
    }

    const resetRes = res as VerifyResetResponse;
    setResetCsrfToken(resetRes.csrf_token ?? null);
    if (!resetRes.csrf_token) {
      setVerifyStatus('error', 'Ссылка для сброса устарела.');
      return;
    }

    showGlobalMessage('success', 'Подтверждено, задайте новый пароль');
    setVerifyStatus('success', 'Переходим к установке нового пароля');
    window.location.hash = '#reset';
  } catch (error) {
    setVerifyStatus('error', extractError(error));
  }
}

export function initVerifyFlow(): void {
  const runIfVerifyRoute = (): void => {
    if (window.location.hash.replace('#', '') === 'verify') {
      void handleVerification();
    }
  };

  window.addEventListener('hashchange', runIfVerifyRoute);
  runIfVerifyRoute();
}
