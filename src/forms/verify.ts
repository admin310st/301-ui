import { verifyToken } from '@api/auth';
import type { CommonErrorResponse, VerifyRequest } from '@api/types';
import { applyLoginStateToDOM } from '@ui/auth-dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || 'Verification failed'
  );
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
  const token = params.get('token');
  const type = params.get('type');
  if (!token || type !== 'register') return null;
  return { token };
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

    applyLoginStateToDOM('user' in res ? res.user ?? null : null);
    showGlobalMessage('success', 'Email подтверждён, перенаправляем...');
    setVerifyStatus('success', 'Email подтверждён, перенаправляем...');
    window.location.hash = '#account';
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

  if (parseSearchParams() && window.location.hash.replace('#', '') !== 'verify') {
    window.location.hash = '#verify';
  }

  window.addEventListener('hashchange', runIfVerifyRoute);
  runIfVerifyRoute();
}
