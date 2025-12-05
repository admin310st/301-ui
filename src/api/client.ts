import { getAuthToken, setAuthToken } from '../utils/authState';
import type {
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  UserMe,
} from './types';

const API_ROOT = 'https://api.301.st/auth';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['content-type'] = 'application/json';
  }

  const res = await fetch(`${API_ROOT}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as T & ErrorResponse;

  if (!res.ok) {
    const error = data.error || data.message || res.statusText;
    throw new Error(error);
  }

  return data as T;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await request<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.access_token) setAuthToken(res.access_token);
  return res;
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const res = await request<RegisterResponse>('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.access_token) setAuthToken(res.access_token);
  return res;
}

export async function me(): Promise<UserMe> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return request<UserMe>('/me', { headers });
}

export async function refresh(): Promise<RefreshResponse> {
  const res = await request<RefreshResponse>('/refresh', { method: 'POST' });
  if (res.access_token) setAuthToken(res.access_token);
  return res;
}

export async function logout(): Promise<LogoutResponse> {
  const res = await request<LogoutResponse>('/logout', { method: 'POST' });
  setAuthToken(null);
  return res;
}

export async function authFetchBuster(): Promise<void> {
  try {
    await request('/me', { method: 'HEAD' });
  } catch (err) {
    console.debug('auth fetch buster failed', err);
  }
}

export { request };
