import { getToken } from '@state/auth-state';
import { createApiError } from '@utils/errors';
import { logDebug } from '@utils/logger';
import { parseJsonSafe } from '@utils/json';

const API_ROOT = 'https://api.301.st/auth';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  const token = getToken();

  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

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
}

export async function healthcheck(): Promise<boolean> {
  try {
    await apiFetch<unknown>('/me', { method: 'HEAD' });
    return true;
  } catch (error) {
    logDebug('Healthcheck failed', error);
    return false;
  }
}

export async function authFetchBuster(): Promise<void> {
  try {
    await apiFetch<unknown>('/me', { method: 'HEAD' });
  } catch (error) {
    logDebug('Auth fetch buster failed', error);
  }
}
