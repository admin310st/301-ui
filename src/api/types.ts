export interface UserProfile {
  id?: string | number;
  email: string;
  name?: string;
  tg_id?: string | number;
  role?: string;
  type?: string;
  plan?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface LoginResponse {
  ok?: boolean;
  access_token?: string;
  user?: UserProfile;
  message?: string;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface RegisterResponse {
  ok?: boolean;
  access_token?: string;
  user?: UserProfile;
  message?: string;
  error?: string;
  channel?: string;
  token?: string;
}

export interface ResetPasswordRequest {
  type: 'email' | 'tg';
  value: string;
  turnstile_token: string;
}

export interface ResetPasswordResponse {
  ok?: boolean;
  status?: 'ok' | 'oauth_only';
  oauth_only?: boolean;
  provider?: 'google' | 'github' | 'apple' | 'telegram';
  message?: string;
  error?: string;
}

export interface ConfirmPasswordRequest {
  password: string;
  csrf_token: string;
}

export interface ConfirmPasswordResponse {
  ok?: boolean;
  user_id?: number;
  message?: string;
  error?: string;
}

export interface VerifyRequest {
  type: 'register' | 'reset';
  token: string;
  code?: string;
  turnstile_token?: string;
}

export interface VerifyRegisterResponse {
  ok?: boolean;
  access_token?: string;
  user?: UserProfile;
  message?: string;
  error?: string;
}

export interface VerifyResetResponse {
  ok?: boolean;
  type?: 'reset';
  user_id?: number;
  csrf_token?: string;
  message?: string;
  error?: string;
}

export type VerifyResponse = VerifyRegisterResponse | VerifyResetResponse;

export interface MeResponse {
  ok?: boolean;
  user?: UserProfile;
  email?: string;
  access_token?: string;
}

export interface OAuthStartResponse {
  url?: string;
  auth_url?: string;
  code_verifier?: string;
  verifier?: string;
  state?: string;
}

export interface CommonErrorResponse {
  status?: number;
  error?: string;
  message?: string;
  code?: string;
}
