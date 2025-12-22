/**
 * Domain Redirects Mock Data
 *
 * Simple 301/302 redirects for domains
 * NOT to be confused with Streams/TDS (complex conditional routing)
 */

export type RedirectCode = 301 | 302;
export type SyncStatus = 'synced' | 'pending' | 'error';
export type DomainStatus = 'active' | 'parked' | 'expired';
export type CfImplementation = 'redirect_rule' | 'worker' | null;

export interface DomainRedirect {
  id: number;

  // Source
  domain_id: number;
  domain: string;  // e.g., "old-domain.com"
  domain_status: DomainStatus;

  // Target
  target_url: string | null;  // null = no redirect

  // Redirect Type
  redirect_code: RedirectCode;  // 301 = permanent, 302 = temporary

  // Status
  enabled: boolean;

  // Cloudflare Sync
  cf_rule_id: string | null;  // Cloudflare Redirect Rule ID
  cf_implementation: CfImplementation;
  last_sync_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;

  // Grouping
  site_id: number;
  site_name: string;  // e.g., "CryptoBoss (En)"
  site_flag: string;  // emoji flag for display
  project_id: number;
  project_name: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Mock domain redirects
 *
 * Structure: 2 projects, 3 sites, 13 domains
 * - Project: CryptoBoss (id: 17) - 9 domains
 *   - Site: CryptoBoss (En) 🇺🇸 - 3 domains (primary: cryptoboss.pics)
 *   - Site: CryptoBoss (Ru) 🇷🇺 - 6 domains (primary: finbosse.ru)
 * - Project: TestProject (id: 18) - 4 domains
 *   - Site: Test Site 🇬🇧 - 4 domains (primary: example.com)
 *
 * Primary domains: 3 (main site domains that receive traffic)
 * Status distribution: 7 with redirects, 6 without, 2 pending, 1 error
 */
export const mockDomainRedirects: DomainRedirect[] = [
  // ===== CryptoBoss (En) 🇺🇸 =====
  {
    id: 1,
    domain_id: 101,
    domain: 'cryptoboss.pics',
    domain_status: 'active',
    target_url: null,  // Main domain, no redirect
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-08T10:00:00Z',
    updated_at: '2025-01-08T10:00:00Z'
  },
  {
    id: 2,
    domain_id: 102,
    domain: 'cryptoboss.online',
    domain_status: 'active',
    target_url: 'https://cryptoboss.pics',
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_abc123',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-01-13T18:15:27Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-10T12:00:00Z',
    updated_at: '2025-01-13T18:15:27Z'
  },
  {
    id: 3,
    domain_id: 103,
    domain: 'cryptoboss.click',
    domain_status: 'parked',
    target_url: null,
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-05T14:00:00Z',
    updated_at: '2025-01-05T14:00:00Z'
  },

  // ===== CryptoBoss (Ru) 🇷🇺 =====
  {
    id: 4,
    domain_id: 201,
    domain: 'finbosse.ru',
    domain_status: 'active',
    target_url: null,  // Main domain, no redirect
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-06T09:00:00Z',
    updated_at: '2025-01-06T09:00:00Z'
  },
  {
    id: 5,
    domain_id: 202,
    domain: 'cryptoboss.icu',
    domain_status: 'active',
    target_url: 'https://finbosse.ru',
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_def456',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-01-13T18:15:27Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-11T11:00:00Z',
    updated_at: '2025-01-13T18:15:27Z'
  },
  {
    id: 6,
    domain_id: 203,
    domain: 'cryptopot.ru',
    domain_status: 'active',
    target_url: 'https://finbosse.ru',
    redirect_code: 302,
    enabled: true,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'pending',
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-13T19:00:00Z',
    updated_at: '2025-01-13T19:00:00Z'
  },
  {
    id: 7,
    domain_id: 204,
    domain: 'cryptovalve.ru',
    domain_status: 'active',
    target_url: 'https://finbosse.ru',
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_ghi789',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-01-13T18:15:27Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-12T10:30:00Z',
    updated_at: '2025-01-13T18:15:27Z'
  },
  {
    id: 8,
    domain_id: 205,
    domain: 'hitboss.ru',
    domain_status: 'active',
    target_url: 'https://finbosse.ru',
    redirect_code: 301,
    enabled: true,
    cf_rule_id: null,
    cf_implementation: 'worker',
    last_sync_at: '2025-01-12T16:20:15Z',
    sync_status: 'error',
    sync_error: 'Cloudflare API timeout (Worker deployment failed)',
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-12T15:00:00Z',
    updated_at: '2025-01-12T16:20:15Z'
  },
  {
    id: 9,
    domain_id: 206,
    domain: 'casino-boss.ru',
    domain_status: 'parked',
    target_url: null,
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-04T13:00:00Z',
    updated_at: '2025-01-04T13:00:00Z'
  },

  // ===== Test Site 🇬🇧 =====
  {
    id: 10,
    domain_id: 300,
    domain: 'example.com',
    domain_status: 'active',
    target_url: null,  // Main domain, no redirect
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 3,
    site_name: 'Test Site',
    site_flag: '🇬🇧',
    project_id: 18,
    project_name: 'TestProject',
    created_at: '2025-01-07T09:00:00Z',
    updated_at: '2025-01-07T09:00:00Z'
  },
  {
    id: 11,
    domain_id: 301,
    domain: 'test-domain.com',
    domain_status: 'active',
    target_url: 'https://example.com',
    redirect_code: 302,
    enabled: true,
    cf_rule_id: 'rule_test1',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-01-13T10:00:00Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 3,
    site_name: 'Test Site',
    site_flag: '🇬🇧',
    project_id: 18,
    project_name: 'TestProject',
    created_at: '2025-01-09T08:00:00Z',
    updated_at: '2025-01-13T10:00:00Z'
  },
  {
    id: 12,
    domain_id: 302,
    domain: 'staging-test.net',
    domain_status: 'active',
    target_url: 'https://example.com/staging',
    redirect_code: 302,
    enabled: true,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'pending',
    sync_error: null,
    site_id: 3,
    site_name: 'Test Site',
    site_flag: '🇬🇧',
    project_id: 18,
    project_name: 'TestProject',
    created_at: '2025-01-13T20:00:00Z',
    updated_at: '2025-01-13T20:00:00Z'
  },
  {
    id: 13,
    domain_id: 303,
    domain: 'dev-test.org',
    domain_status: 'expired',
    target_url: null,
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 3,
    site_name: 'Test Site',
    site_flag: '🇬🇧',
    project_id: 18,
    project_name: 'TestProject',
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z'
  }
];

/**
 * Get redirect statistics
 */
export function getRedirectStats(redirects: DomainRedirect[]) {
  return {
    total: redirects.length,
    with_redirect: redirects.filter(r => r.target_url !== null).length,
    without_redirect: redirects.filter(r => r.target_url === null).length,
    enabled: redirects.filter(r => r.enabled && r.target_url !== null).length,
    disabled: redirects.filter(r => !r.enabled || r.target_url === null).length,
    synced: redirects.filter(r => r.sync_status === 'synced').length,
    pending: redirects.filter(r => r.sync_status === 'pending').length,
    errors: redirects.filter(r => r.sync_status === 'error').length,
  };
}

/**
 * Group redirects by site
 */
export function groupBySite(redirects: DomainRedirect[]) {
  const groups = new Map<number, DomainRedirect[]>();

  for (const redirect of redirects) {
    if (!groups.has(redirect.site_id)) {
      groups.set(redirect.site_id, []);
    }
    groups.get(redirect.site_id)!.push(redirect);
  }

  return Array.from(groups.entries()).map(([siteId, domains]) => ({
    site_id: siteId,
    site_name: domains[0].site_name,
    site_flag: domains[0].site_flag,
    project_id: domains[0].project_id,
    project_name: domains[0].project_name,
    domains,
  }));
}
