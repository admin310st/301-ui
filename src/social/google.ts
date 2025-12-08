import { socialStartGoogle } from '@api/auth';
import { showGlobalMessage } from '@ui/notifications';
import { logDebug } from '@utils/logger';
import { handleOAuthSuccess, isOAuthSuccessPath } from './oauth-success';

const VERIFIER_KEY = 'google_code_verifier';
const STATE_KEY = 'google_oauth_state';

type OAuthStartPayload = { url?: string; auth_url?: string; redirect_url?: string; verifier?: string; code_verifier?: string; state?: string };

function getRedirectUrl(response: OAuthStartPayload): string {
  return response.redirect_url || response.auth_url || response.url || '';
}

async function beginGoogleFlow(): Promise<void> {
  const res = await socialStartGoogle();
  const redirectUrl = getRedirectUrl(res);
  if (res.code_verifier || res.verifier) sessionStorage.setItem(VERIFIER_KEY, res.code_verifier || res.verifier || '');
  if (res.state) sessionStorage.setItem(STATE_KEY, res.state);
  if (!redirectUrl) throw new Error('OAuth redirect URL is missing');
  window.location.href = redirectUrl;
}

async function handleOAuthReturn(): Promise<void> {
  const url = new URL(window.location.href);
  if (!isOAuthSuccessPath(url)) return;
  const token = url.searchParams.get('token');
  const state = url.searchParams.get('state');
  if (!token) {
    showGlobalMessage('error', 'Google sign-in is unavailable right now');
    return;
  }

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (expectedState && state && expectedState !== state) {
    logDebug('OAuth state mismatch, ignoring response');
    return;
  }

  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  await handleOAuthSuccess(token, 'Signed in with Google');
}

function setLoadingState(btn: HTMLButtonElement, labelEl: HTMLElement | null): () => void {
  const originalText = labelEl?.textContent ?? btn.textContent ?? '';
  btn.disabled = true;
  btn.classList.add('is-loading');
  if (labelEl) {
    labelEl.textContent = 'Connecting…';
  }

  return () => {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    if (labelEl) {
      labelEl.textContent = originalText;
    }
  };
}

export function initGoogleOAuth(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-social="google"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    const label = btn.querySelector<HTMLElement>('[data-social-label]');

    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      const resetLoading = setLoadingState(btn, label);
      try {
        await beginGoogleFlow();
      } catch (error) {
        logDebug('Google OAuth start failed', error as Error);
        showGlobalMessage('error', 'Unable to start Google login. Please try again later.');
        resetLoading();
      }
    });
  });

  void handleOAuthReturn();
}
