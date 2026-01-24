import { verifyToken } from '@api/auth';
import type { CommonErrorResponse, VerifyRequest } from '@api/types';
import { t } from '@i18n';
import { applyLoginStateToDOM } from '@ui/auth-dom';
import { showAuthView } from '@ui/auth-routing';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.message ||
    apiError?.body?.error ||
    apiError?.body?.code ||
    apiError?.message ||
    t('auth.verify.error')
  );
}

function setVerifyStatus(state: 'pending' | 'error' | 'success', message: string): void {
  const status = document.querySelector<HTMLElement>('[data-verify-status]');
  if (!status) return;
  status.dataset.type = state;
  status.textContent = message;
  status.hidden = false;
}

type VerifyUrlParams = {
  token: string | null;
  type: string | null;
  code: string | null;
};

function parseSearchParams(): VerifyUrlParams {
  const params = new URLSearchParams(window.location.search);

  return {
    token: params.get('token') || null,
    type: params.get('type'),
    code: params.get('code') || null,
  };
}

function buildVerifyPayload(params: VerifyUrlParams): VerifyRequest | null {
  if (!params.token) return null;

  const payload: VerifyRequest = { token: params.token };
  if (params.code) payload.code = params.code;

  return payload;
}

function shouldHandleVerification(params: VerifyUrlParams): boolean {
  const hash = window.location.hash.replace('#', '');

  if (params.type === 'reset') return false;

  if (params.type === 'register' && params.token) return true;

  if (hash === 'verify') return true;

  return Boolean(params.token);
}

async function handleVerification(params: VerifyUrlParams): Promise<void> {
  if (!shouldHandleVerification(params)) return;

  // Show verify view so user can see status
  showAuthView('verify');

  const payload = buildVerifyPayload(params);

  if (!payload) {
    const errorMsg = t('auth.verify.missingParams');
    setVerifyStatus('error', errorMsg);
    showGlobalMessage('danger', errorMsg);
    return;
  }

  try {
    setVerifyStatus('pending', t('auth.verify.pending'));
    const res = await verifyToken(payload);

    const basePath = window.location.pathname;
    const user = ('user' in res ? res.user : null) || null;
    applyLoginStateToDOM(user);
    const successMessage = res.message || t('auth.verify.successRegister');
    showGlobalMessage('success', successMessage);
    setVerifyStatus('success', successMessage);
    history.replaceState(null, '', `${basePath}#account`);
    window.location.hash = '#account';
  } catch (error) {
    const errorMsg = extractError(error);
    setVerifyStatus('error', errorMsg);
    showGlobalMessage('danger', errorMsg);
  }
}

export function initVerifyFlow(): void {
  const runIfVerifyRoute = (): void => {
    const params = parseSearchParams();
    const { pathname, hash } = window.location;
    const isVerifyPath = pathname.startsWith('/auth/verify');
    const isVerifyHash = hash.replace('#', '') === 'verify';

    if (isVerifyPath || isVerifyHash) {
      void handleVerification(params);
    }
  };

  const params = parseSearchParams();

  if (
    params.type === 'register' &&
    params.token &&
    window.location.hash.replace('#', '') !== 'verify'
  ) {
    window.location.hash = '#verify';
  }

  window.addEventListener('hashchange', runIfVerifyRoute);
  runIfVerifyRoute();
}
