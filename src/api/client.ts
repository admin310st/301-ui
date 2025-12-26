import { getAuthToken } from '@state/auth-state';
import { createApiError } from '@utils/errors';
import { logDebug } from '@utils/logger';
import { parseJsonSafe } from '@utils/json';
import { showLoading, hideLoading } from '@ui/loading-indicator';

const API_ROOT = 'https://api.301.st';

export interface ApiFetchOptions extends RequestInit {
  /** Show loading indicator during request */
  showLoading?: 'brand' | 'cf' | false;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  const token = getAuthToken();
  const loadingType = options.showLoading;

  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

  // Show loading indicator if requested
  if (loadingType) {
    showLoading(loadingType);
  }

  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    });

    const body = await parseJsonSafe<unknown>(response);

    if (!response.ok) {
      throw createApiError(response.status, body, response.statusText);
    }

    return (body ?? ({} as T)) as T;
  } finally {
    // Always hide loading, even on error
    if (loadingType) {
      hideLoading();
    }
  }
}

export async function healthcheck(): Promise<boolean> {
  try {
    await apiFetch<unknown>('/auth/me');
    return true;
  } catch (error) {
    logDebug('Healthcheck failed', error);
    return false;
  }
}

export async function authFetchBuster(): Promise<void> {
  try {
    await apiFetch<unknown>('/auth/me');
  } catch (error) {
    logDebug('Auth fetch buster failed', error);
  }
}
