import { showGlobalMessage } from '@ui/notifications';
import { logDebug } from '@utils/logger';
import { handleOAuthSuccess, isOAuthSuccessPath } from './oauth-success';

const GOOGLE_START_BASE_URL = 'https://api.301.st/auth/oauth/google/start';

function beginGoogleFlow(): void {
  const host = window.location.host; // app.301.st | dev.301.st | localhost:5173
  const url = `${GOOGLE_START_BASE_URL}?redirect_host=${encodeURIComponent(host)}`;
  window.location.href = url;
}

async function handleOAuthReturn(): Promise<void> {
  const url = new URL(window.location.href);
  if (!isOAuthSuccessPath(url)) return;
  const token = url.searchParams.get('token');
  if (!token) {
    showGlobalMessage('error', 'Google sign-in is unavailable right now');
    return;
  }

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

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const resetLoading = setLoadingState(btn, label);
      try {
        beginGoogleFlow();
      } catch (error) {
        logDebug('Google OAuth start failed', error as Error);
        showGlobalMessage('error', 'Unable to start Google login. Please try again later.');
        resetLoading();
      }
    });
  });

  void handleOAuthReturn();
}
