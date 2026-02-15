import { apiFetch } from './client';
export { apiFetch } from './client';
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ConfirmPasswordRequest,
  ConfirmPasswordResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  OAuthStartResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyRequest,
  VerifyResponse,
} from './types';
import { clearAuthToken, setAuthToken, setUser } from '@state/auth-state';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    showLoading: 'brand',
  });
  if (res.access_token) setAuthToken(res.access_token);
  if (res.user) setUser(res.user);
  return res;
}

export async function refresh(): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/refresh', { method: 'POST' });
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const res = await apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    showLoading: 'brand',
  });
  return res;
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>('/auth/reset_password', {
    method: 'POST',
    body: JSON.stringify(payload),
    showLoading: 'brand',
  });
}

export async function verifyToken(payload: VerifyRequest): Promise<VerifyResponse> {
  const res = await apiFetch<VerifyResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
    showLoading: 'brand',
  });
  if ('access_token' in res && res.access_token) setAuthToken(res.access_token);
  if ('user' in res && res.user) setUser(res.user);
  return res;
}

export async function confirmPassword(payload: ConfirmPasswordRequest): Promise<ConfirmPasswordResponse> {
  return apiFetch<ConfirmPasswordResponse>('/auth/confirm_password', {
    method: 'POST',
    body: JSON.stringify(payload),
    showLoading: 'brand',
  });
}

export async function changePassword(payload: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return apiFetch<ChangePasswordResponse>('/auth/change_password', {
    method: 'POST',
    body: JSON.stringify(payload),
    showLoading: 'brand',
  });
}

export async function socialStartGoogle(): Promise<OAuthStartResponse> {
  return apiFetch<OAuthStartResponse>('/auth/oauth/google/start');
}

export async function socialStartGithub(): Promise<OAuthStartResponse> {
  return apiFetch<OAuthStartResponse>('/auth/oauth/github/start');
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<unknown>('/auth/logout', {
      method: 'POST',
      showLoading: 'brand',
    });
  } catch (error) {
    // ignore network errors to avoid blocking logout
    console.debug('Logout request failed', error);
  }
  clearAuthToken();
  setUser(null);
}

export async function me(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}
