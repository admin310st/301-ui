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

// Domain from API (GET /domains)
export interface APIDomain {
  id: number;
  site_id: number | null;
  zone_id: number;
  key_id: number | null;
  parent_id: number | null;
  project_id: number | null;
  domain_name: string;
  role: DomainRole;
  ns: string;
  ns_verified: number; // 0 = not verified, 1 = verified
  proxied: number; // 0 = DNS only, 1 = proxied
  blocked: number; // 0 = active, 1 = blocked
  blocked_reason: string | null; // phishing, ad_network, manual, etc.
  ssl_status: 'valid' | 'pending' | 'none' | 'error' | string;
  expired_at: string | null; // ISO timestamp
  created_at: string;
  updated_at: string;
  // Denormalized from related tables
  site_name: string | null;
  site_status: 'active' | 'paused' | 'archived' | null;
  project_name: string | null;
  // Only in GET /domains/:id (detail response)
  cf_zone_id?: string;
  zone_status?: string;
  ns_expected?: string;
  // Health data (from list response)
  health: {
    status: 'healthy' | 'warning' | 'blocked' | 'unknown';
    threat_score: number | null;
    categories: string[] | null;
    checked_at: string | null;
  } | null;
}

export interface DomainsGroup {
  root: string;
  zone_id: number;
  domains: APIDomain[];
}

export interface GetDomainsResponse {
  ok: boolean;
  total: number;
  groups: DomainsGroup[];
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

// =============================================================================
// Projects API Types
// =============================================================================

export interface Project {
  id: number;
  account_id: number;
  project_name: string;
  description: string | null;
  brand_tag: string | null;
  commercial_terms: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  sites_count: number;
  domains_count: number;
}

export interface ProjectIntegration {
  id: number;
  account_key_id: number;
  created_at: string;
  provider: string;
  key_alias: string;
  status: string;
  external_account_id: string;
}

export interface GetProjectsResponse {
  ok: true;
  total: number;
  projects: Project[];
}

export interface GetProjectResponse {
  ok: true;
  project: Project;
  sites: Site[];
  integrations: ProjectIntegration[];
}

export interface CreateProjectRequest {
  project_name: string;
  description?: string;
  brand_tag?: string;
  commercial_terms?: string;
  start_date?: string;
  end_date?: string;
  site_name?: string;
}

export interface CreateProjectResponse {
  ok: true;
  project: {
    id: number;
    project_name: string;
    description: string | null;
    brand_tag: string | null;
  };
  site: {
    id: number;
    site_name: string;
    status: string;
  };
}

export interface UpdateProjectRequest {
  project_name?: string;
  description?: string;
  brand_tag?: string;
  commercial_terms?: string;
  start_date?: string;
  end_date?: string;
}

export interface GetProjectIntegrationsResponse {
  ok: true;
  integrations: ProjectIntegration[];
}

export interface AttachIntegrationRequest {
  account_key_id: number;
}

export interface AttachIntegrationResponse {
  ok: true;
  integration: {
    id: number;
    project_id: number;
    account_key_id: number;
    provider: string;
    key_alias: string;
  };
}

// =============================================================================
// Sites API Types
// =============================================================================

export type SiteStatus = 'active' | 'paused' | 'archived';
export type DomainRole = 'acceptor' | 'donor' | 'reserve';

export interface Site {
  id: number;
  project_id: number;
  site_name: string;
  site_tag: string | null;
  status: SiteStatus;
  created_at: string;
  updated_at: string;
  domains_count: number;
  acceptor_domain?: string | null;
  project_name?: string;
}

export interface SiteDomain {
  id: number;
  domain_name: string;
  role: DomainRole;
  blocked: number;
  blocked_reason: string | null;
}

export interface GetSitesResponse {
  ok: true;
  project: {
    id: number;
    project_name: string;
  };
  total: number;
  sites: Site[];
}

export interface GetSiteResponse {
  ok: true;
  site: Site;
  domains: SiteDomain[];
}

export interface CreateSiteRequest {
  site_name: string;
  site_tag?: string;
}

export interface CreateSiteResponse {
  ok: true;
  site: {
    id: number;
    project_id: number;
    site_name: string;
    site_tag: string | null;
    status: SiteStatus;
  };
}

export interface UpdateSiteRequest {
  site_name?: string;
  site_tag?: string;
  status?: SiteStatus;
}

export interface AttachDomainRequest {
  domain_id: number;
  role?: DomainRole;
}

export interface AttachDomainResponse {
  ok: true;
  domain: {
    id: number;
    domain_name: string;
    site_id: number;
    project_id: number;
    role: DomainRole;
  };
}

// =============================================================================
// Redirects API Types
// =============================================================================

export type SyncStatus = 'pending' | 'synced' | 'error';
export type Trend = 'up' | 'down' | 'neutral';

/**
 * Redirect rule (nested object inside RedirectDomain)
 */
export interface RedirectRule {
  id: number;
  template_id: string;
  preset_id: string | null;
  preset_order: number | null;
  rule_name: string;
  params: Record<string, any>;
  status_code: 301 | 302;
  enabled: boolean;
  sync_status: SyncStatus;
  cf_rule_id: string | null;
  clicks_total: number;
  clicks_today: number;
  clicks_yesterday: number;
  trend: Trend;
  created_at: string;
  updated_at: string;
}

/**
 * Domain with optional redirect (main entity in redirects table)
 * Note: Different from SiteDomain - this includes full redirect info
 */
export interface RedirectDomain {
  domain_id: number;
  domain_name: string;
  domain_role: DomainRole;
  zone_id: number | null;
  zone_name: string | null;
  redirect: RedirectRule | null; // null = domain without redirect
}

/**
 * Zone limit info for redirects
 */
export interface RedirectZoneLimit {
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
}

/**
 * GET /sites/:siteId/redirects response
 */
export interface GetSiteRedirectsResponse {
  ok: boolean;
  site_id: number;
  site_name: string;
  domains: RedirectDomain[];
  zone_limits: RedirectZoneLimit[];
  total_domains: number;
  total_redirects: number;
}

/**
 * GET /redirects/:id response
 */
export interface GetRedirectResponse {
  ok: boolean;
  redirect: RedirectRule;
}

/**
 * Redirect template (T1-T7)
 */
export interface RedirectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'domain' | 'canonical' | 'path' | 'temporary';
  preservePath: boolean;
  preserveQuery: boolean;
  defaultStatusCode: 301 | 302;
  params: Array<{
    name: string;
    type: 'url' | 'path';
    required: boolean;
    description: string;
  }>;
}

/**
 * GET /redirects/templates response
 */
export interface GetTemplatesResponse {
  ok: boolean;
  templates: RedirectTemplate[];
}

/**
 * Redirect preset (P1-P5)
 */
export interface RedirectPreset {
  id: string;
  name: string;
  description: string;
  useCase: string;
  rulesCount: number | string;
  rules: Array<{
    template_id: string;
    order: number | string;
    description: string;
  }>;
}

/**
 * GET /redirects/presets response
 */
export interface GetPresetsResponse {
  ok: boolean;
  presets: RedirectPreset[];
}

/**
 * POST /domains/:domainId/redirects request
 */
export interface CreateRedirectRequest {
  template_id: string;
  rule_name?: string;
  params: Record<string, any>;
  status_code?: 301 | 302;
}

/**
 * POST /domains/:domainId/redirects response
 */
export interface CreateRedirectResponse {
  ok: boolean;
  redirect: RedirectRule;
  zone_limit: RedirectZoneLimit;
}

/**
 * PATCH /redirects/:id request
 */
export interface UpdateRedirectRequest {
  rule_name?: string;
  params?: Record<string, any>;
  status_code?: 301 | 302;
  enabled?: boolean;
}

/**
 * POST /domains/:domainId/redirects/preset request
 */
export interface ApplyPresetRequest {
  preset_id: string;
  params: Record<string, any>;
}

/**
 * POST /domains/:domainId/redirects/preset response
 */
export interface ApplyPresetResponse {
  ok: boolean;
  preset_id: string;
  preset_name: string;
  created_count: number;
  redirect_ids: number[];
  zone_limit: RedirectZoneLimit;
}

/**
 * POST /zones/:id/apply-redirects response
 */
export interface ApplyRedirectsResponse {
  ok: boolean;
  zone_id: number;
  cf_zone_id: string;
  cf_ruleset_id: string;
  rules_applied: number;
  synced_rules: Array<{ id: number; cf_rule_id: string }>;
  warnings?: string[];
}

/**
 * GET /zones/:id/redirect-limits response
 */
export interface GetZoneLimitsResponse {
  ok: boolean;
  zone_id: number;
  zone_name: string;
  used: number;
  max: number;
  available: number;
}
