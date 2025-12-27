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
  expires_in?: number; // Token lifetime in seconds (~900 for 15 min)
  active_account_id?: number;
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
  token: string;
  code?: string;
}

export interface VerifyRegisterResponse {
  ok?: boolean;
  access_token?: string;
  expires_in?: number; // Token lifetime in seconds
  active_account_id?: number;
  accounts?: Array<{ id: number; name?: string }>;
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
  active_account_id?: number;
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

// =============================================================================
// Integrations API Types
// =============================================================================

export type IntegrationProvider =
  | 'cloudflare'
  | 'namecheap'
  | 'namesilo'
  | 'hosttracker'
  | 'google_analytics'
  | 'yandex_metrica';

export type KeyStatus = 'active' | 'expired' | 'revoked';

export interface IntegrationKey {
  id: number;
  account_id: number;
  provider: IntegrationProvider;
  key_alias: string;
  external_account_id: string;
  kv_key: string;
  status: KeyStatus;
  expires_at: string | null;
  last_used: string | null;
  created_at: string;
  provider_scope?: string; // JSON string from API
}

export interface InitCloudflareRequest {
  cf_account_id: string;
  bootstrap_token: string;
  key_alias?: string;
  confirm_replace?: boolean;
}

export interface InitNamecheapRequest {
  username: string;
  api_key: string;
  key_alias?: string;
}

export interface UpdateKeyRequest {
  key_alias?: string;
  status?: KeyStatus;
}

export interface InitIntegrationResponse {
  ok: true;
  key_id: number;
  is_rotation: boolean;
  sync?: {
    zones: number;
    domains: number;
  };
}

export interface Zone {
  id: number;
  account_id?: number;
  key_id: number;
  cf_zone_id: string;
  status: string;
  plan: string;
  ns_expected: string;
  verified: number;
  ssl_status: string;
  ssl_mode?: string;
  auto_https?: number;
  caching_level?: string;
  waf_mode?: string;
  last_sync_at: string | null;
  created_at: string;
  root_domain: string;
}

export interface GetZonesResponse {
  ok: true;
  zones: Zone[];
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  recoverable?: boolean;
  context?: {
    cf_code?: number;
    cf_message?: string;
    [key: string]: unknown;
  };
  message?: string;
}

export interface GetKeysResponse {
  ok: true;
  keys: IntegrationKey[];
}

export interface GetKeyResponse {
  ok: true;
  key: IntegrationKey;
}
