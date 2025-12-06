import { verifyToken } from '@api/auth';
import type { CommonErrorResponse, VerifyRequest, VerifyResetResponse } from '@api/types';
import { t } from '@i18n';
import { setResetCsrfToken } from '@state/reset-session';
import { showNotice } from '@ui/notice';
import type { ApiError } from '@utils/errors';
import { getTurnstileToken } from '../turnstile';

const INVALID_LINK_MESSAGE = () => t('auth.resetVerify.invalidLink');

function setVerifyStatus(state: 'pending' | 'error' | 'success', message: string): void {
  const status = document.querySelector<HTMLElement>('[data-verify-status]');
  if (!status) return;
  status.dataset.type = state;
  status.textContent = message;
  status.hidden = false;
}

function parseSearchParams(): { token: string | null; type: string | null } {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const type = params.get('type');
  return { token, type };
}

function sanitizeUrl(hash?: string): void {
  const basePath = window.location.pathname.startsWith('/auth') ? '/auth/' : '/';
  const targetHash = hash ? `#${hash.replace('#', '')}` : '';
  window.history.replaceState({}, document.title, `${basePath}${targetHash}`);
}

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || INVALID_LINK_MESSAGE()
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'reset_session_expired':
    case 'reset_session_required':
    case 'token_invalid':
    case 'token_expired':
      return INVALID_LINK_MESSAGE();
    default:
      return code || INVALID_LINK_MESSAGE();
  }
}

async function handleResetVerification(payload: VerifyRequest): Promise<void> {
  setVerifyStatus('pending', t('auth.resetVerify.pending'));
  const turnstileToken = getTurnstileToken();

  try {
    const res = (await verifyToken({ ...payload, turnstile_token: turnstileToken ?? undefined })) as VerifyResetResponse;
    const message = res.message || t('notice.success.resetDone');

    if (res.csrf_token) {
      setResetCsrfToken(res.csrf_token);
      showNotice('success', message);
      setVerifyStatus('success', t('auth.resetVerify.proceed'));
      sanitizeUrl('reset');
      window.location.hash = '#reset';
      return;
    }

    const fallbackSuccess = t('auth.resetVerify.successFallback');
    showNotice('success', message || fallbackSuccess);
    setVerifyStatus('success', message || fallbackSuccess);
    sanitizeUrl('login');
    window.location.hash = '#login';
  } catch (error) {
    const message = mapErrorMessage(extractError(error));
    setResetCsrfToken(null);
    showNotice('error', message);
    setVerifyStatus('error', message);
    sanitizeUrl('login');
  }
}

export function initResetVerifyFlow(): void {
  const params = parseSearchParams();
  if (params.type !== 'reset') return;

  window.location.hash = '#verify';

  if (!params.token) {
    const invalidMessage = INVALID_LINK_MESSAGE();
    showNotice('error', invalidMessage);
    setVerifyStatus('error', invalidMessage);
    sanitizeUrl('login');
    return;
  }

  void handleResetVerification({ token: params.token });
}
