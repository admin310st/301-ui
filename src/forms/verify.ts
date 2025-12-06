import { verifyToken } from '@api/auth';
import type { CommonErrorResponse, VerifyRequest } from '@api/types';
import { t } from '@i18n';
import { applyLoginStateToDOM } from '@ui/auth-dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';
import { setResetCsrfToken } from '@state/reset-session';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || t('auth.verify.error')
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
  const token = params.get('token') || '';
  const typeParam = params.get('type');

  const type = typeParam === 'register' || typeParam === 'reset' ? typeParam : null;

  if (!token || !type) return null;

  return { type, token };
}

async function handleVerification(): Promise<void> {
  const payload = parseSearchParams();

  if (!payload) {
    setVerifyStatus('error', t('auth.verify.missingParams'));
    return;
  }

  try {
    setVerifyStatus('pending', t('auth.verify.pending'));
    const res = await verifyToken(payload);

    const basePath = window.location.pathname;

    if (payload.type === 'register') {
      const user = ('user' in res ? res.user : null) || null;
      applyLoginStateToDOM(user);
      const successMessage = res.message || t('auth.verify.successRegister');
      showGlobalMessage('success', successMessage);
      setVerifyStatus('success', successMessage);
      history.replaceState(null, '', `${basePath}#account`);
      window.location.hash = '#account';
    } else {
      const csrf = (res as any).csrf_token || '';
      if (csrf) setResetCsrfToken(csrf);
      const successMessage = (res as any).message || t('auth.verify.resetSuccess');
      showGlobalMessage('success', successMessage);
      setVerifyStatus('success', successMessage);
      history.replaceState(null, '', `${basePath}#reset-confirm`);
      window.location.hash = '#reset-confirm';
    }
  } catch (error) {
    setVerifyStatus('error', extractError(error));
  }
}

export function initVerifyFlow(): void {
  const runIfVerifyRoute = (): void => {
    const { pathname, hash } = window.location;
    const isVerifyPath = pathname.startsWith('/auth/verify');
    const isVerifyHash = hash.replace('#', '') === 'verify';

    if (isVerifyPath || isVerifyHash) {
      void handleVerification();
    }
  };

  if (parseSearchParams() && window.location.hash.replace('#', '') !== 'verify') {
    window.location.hash = '#verify';
  }

  window.addEventListener('hashchange', runIfVerifyRoute);
  runIfVerifyRoute();
}
