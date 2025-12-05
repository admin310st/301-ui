export interface UserProfile {
  id?: string | number;
  email: string;
  name?: string;
  tg_id?: string | number;
  role?: string;
  type?: string;
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
}

export interface ResetRequest {
  email: string;
  turnstile_token?: string;
}

export interface ResetConfirmRequest {
  token: string;
  password: string;
}

export interface VerifyRequest {
  email: string;
  code: string;
}

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
