import { apiFetch } from './client';
import type {
  CommonErrorResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  OAuthStartResponse,
  RegisterRequest,
  RegisterResponse,
  ResetConfirmRequest,
  ResetRequest,
  VerifyRequest,
} from './types';
import { clearToken, setToken, setUser } from '@state/auth-state';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.access_token) setToken(res.access_token);
  if (res.user) setUser(res.user);
  return res;
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const res = await apiFetch<RegisterResponse>('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.access_token) setToken(res.access_token);
  if (res.user) setUser(res.user);
  return res;
}

export async function requestPasswordReset(payload: ResetRequest): Promise<CommonErrorResponse> {
  return apiFetch<CommonErrorResponse>('/reset/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function confirmPasswordReset(payload: ResetConfirmRequest): Promise<CommonErrorResponse> {
  return apiFetch<CommonErrorResponse>('/reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyCode(payload: VerifyRequest): Promise<CommonErrorResponse> {
  return apiFetch<CommonErrorResponse>('/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function socialStartGoogle(): Promise<OAuthStartResponse> {
  return apiFetch<OAuthStartResponse>('/oauth/google/start', { method: 'POST' });
}

export async function socialStartGithub(): Promise<OAuthStartResponse> {
  return apiFetch<OAuthStartResponse>('/oauth/github/start', { method: 'POST' });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<unknown>('/logout', { method: 'POST' });
  } catch (error) {
    // ignore network errors to avoid blocking logout
    console.debug('Logout request failed', error);
  }
  clearToken();
  setUser(null);
}

export async function me(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me');
}
