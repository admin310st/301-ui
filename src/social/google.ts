import { socialStartGoogle } from '@api/auth';
import { loadUser, setToken } from '@state/auth-state';
import { showGlobalMessage } from '@ui/notifications';
import { logDebug } from '@utils/logger';

const VERIFIER_KEY = 'google_code_verifier';
const STATE_KEY = 'google_oauth_state';

function getRedirectUrl(response: { url?: string; auth_url?: string }): string {
  return response.url || response.auth_url || '';
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
  const token = url.searchParams.get('token');
  const state = url.searchParams.get('state');
  if (!token) return;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (expectedState && state && expectedState !== state) {
    logDebug('OAuth state mismatch, ignoring response');
    return;
  }

  setToken(token);
  await loadUser();
  showGlobalMessage('success', 'Signed in with Google');
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  window.history.replaceState({}, document.title, '/account');
}

export function initGoogleOAuth(): void {
  document.querySelectorAll<HTMLElement>('[data-social="google"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await beginGoogleFlow();
      } catch (error) {
        logDebug('Google OAuth start failed', error as Error);
        showGlobalMessage('error', 'Google sign-in is unavailable right now');
      }
    });
  });

  void handleOAuthReturn();
}
