import type { VerifyResetResponse } from '@api/types';
import { t } from '@i18n';
import { setResetCsrfToken } from '@state/reset-session';
import { showGlobalNotice } from '@ui/globalNotice';
import { logDebug } from '@utils/logger';

const API_ROOT = 'https://api.301.st/auth';
const INVALID_LINK_MESSAGE = () => t('auth.resetVerify.invalidLink');

function setVerifyStatus(state: 'pending' | 'error' | 'success', message: string): void {
  const status = document.querySelector<HTMLElement>('[data-verify-status]');
  if (!status) return;
  status.dataset.type = state;
  status.textContent = message;
  status.hidden = false;
}

interface ResetVerifyParams {
  type: string | null;
  token: string | null;
  url: URL;
}

function parseSearchParams(): ResetVerifyParams {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  const type = url.searchParams.get('type');
  return { token, type, url };
}

function sanitizeUrl(url: URL, hash?: string): void {
  const targetUrl = new URL(url.toString());
  targetUrl.search = '';
  if (hash) targetUrl.hash = `#${hash.replace('#', '')}`;
  window.history.replaceState({}, document.title, targetUrl.toString());
}

async function fetchResetVerification(type: string, token: string): Promise<VerifyResetResponse> {
  const apiUrl = new URL('/verify', API_ROOT);
  apiUrl.searchParams.set('type', type);
  apiUrl.searchParams.set('token', token);

  const res = await fetch(apiUrl.toString(), { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    throw new Error('verification_failed');
  }

  return (await res.json()) as VerifyResetResponse;
}

function handleResetError(message: string, url: URL): void {
  setResetCsrfToken(null);
  showGlobalNotice('error', message);
  setVerifyStatus('error', message);
  sanitizeUrl(url, 'reset');
  window.location.hash = '#reset';
}

export function initResetVerifyFlow(): void {
  const params = parseSearchParams();

  if (params.url.pathname !== '/auth/verify' && params.url.pathname !== '/auth/verify/') return;
  if (params.type !== 'reset') return;

  sanitizeUrl(params.url);
  window.location.hash = '#verify';

  if (!params.token) {
    const invalidMessage = INVALID_LINK_MESSAGE();
    handleResetError(invalidMessage, params.url);
    return;
  }

  setVerifyStatus('pending', t('auth.resetVerify.pending'));

  void fetchResetVerification(params.type, params.token)
    .then((res) => {
      if (res.ok && res.type === 'reset' && res.csrf_token) {
        const message = res.message || t('notice.success.resetDone');
        setResetCsrfToken(res.csrf_token);
        showGlobalNotice('success', message);
        setVerifyStatus('success', t('auth.resetVerify.proceed'));
        sanitizeUrl(params.url, 'reset');
        window.location.href = '/auth#reset';
        return;
      }

      handleResetError(INVALID_LINK_MESSAGE(), params.url);
    })
    .catch((error) => {
      logDebug('Reset verification failed', error as Error);
      handleResetError(INVALID_LINK_MESSAGE(), params.url);
    });
}
