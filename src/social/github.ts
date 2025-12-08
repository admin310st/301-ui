import { showGlobalMessage } from '@ui/notifications';
import { logDebug } from '@utils/logger';
import { handleOAuthSuccess, isOAuthSuccessPath } from './oauth-success';

const GITHUB_START_URL = 'https://api.301.st/auth/oauth/github/start';

function beginGithubFlow(): void {
  window.location.href = GITHUB_START_URL;
}

async function handleOAuthReturn(): Promise<void> {
  const url = new URL(window.location.href);
  if (!isOAuthSuccessPath(url)) return;
  const token = url.searchParams.get('token');
  if (!token) {
    showGlobalMessage('error', 'GitHub sign-in is unavailable');
    return;
  }

  await handleOAuthSuccess(token, 'Signed in with GitHub');
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

export function initGithubOAuth(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-social="github"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    const label = btn.querySelector<HTMLElement>('[data-social-label]');

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const resetLoading = setLoadingState(btn, label);
      try {
        beginGithubFlow();
      } catch (error) {
        logDebug('GitHub OAuth start failed', error as Error);
        showGlobalMessage('error', 'Unable to start GitHub login. Please try again later.');
        resetLoading();
      }
    });
  });

  void handleOAuthReturn();
}
