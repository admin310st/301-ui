import { socialStartGithub } from '@api/auth';
import { loadUser, setAuthToken } from '@state/auth-state';
import { showGlobalMessage } from '@ui/notifications';
import { logDebug } from '@utils/logger';

const STATE_KEY = 'github_oauth_state';

function getRedirectUrl(response: { url?: string; auth_url?: string }): string {
  return response.auth_url || response.url || '';
}

async function beginGithubFlow(): Promise<void> {
  const res = await socialStartGithub();
  const redirectUrl = getRedirectUrl(res);
  if (res.state) sessionStorage.setItem(STATE_KEY, res.state);
  if (!redirectUrl) throw new Error('GitHub OAuth URL missing');
  window.location.href = redirectUrl;
}

async function handleOAuthReturn(): Promise<void> {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  const state = url.searchParams.get('state');
  if (!token) return;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (expectedState && state && expectedState !== state) {
    logDebug('GitHub OAuth state mismatch, ignoring response');
    return;
  }

  setAuthToken(token);
  await loadUser();
  showGlobalMessage('success', 'Signed in with GitHub');
  sessionStorage.removeItem(STATE_KEY);
  window.history.replaceState({}, document.title, '/account');
}

export function initGithubOAuth(): void {
  document.querySelectorAll<HTMLElement>('[data-social="github"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await beginGithubFlow();
      } catch (error) {
        logDebug('GitHub OAuth start failed', error as Error);
        showGlobalMessage('error', 'GitHub sign-in is unavailable');
      }
    });
  });

  void handleOAuthReturn();
}
