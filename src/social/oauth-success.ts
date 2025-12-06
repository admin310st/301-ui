import { loadUser, setAuthToken } from '@state/auth-state';
import { showGlobalMessage } from '@ui/notifications';
import { logDebug } from '@utils/logger';

export function isOAuthSuccessPath(url: URL): boolean {
  return url.pathname === '/auth/success' || url.pathname === '/auth/success/';
}

export async function handleOAuthSuccess(token: string, successMessage: string): Promise<void> {
  try {
    setAuthToken(token);
    await loadUser();
    showGlobalMessage('success', successMessage);
  } catch (error) {
    logDebug('OAuth success handling failed', error as Error);
  } finally {
    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.search = '';
    window.history.replaceState({}, document.title, cleanedUrl.toString());
    window.location.href = '/#account';
  }
}
