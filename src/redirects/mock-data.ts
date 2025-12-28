/**
 * Domain Redirects Mock Data
 *
 * Simple 301/302 redirects for domains
 * NOT to be confused with Streams/TDS (complex conditional routing)
 */

export type RedirectCode = 301 | 302;
export type SyncStatus = 'never' | 'pending' | 'synced' | 'error';
export type DomainStatus = 'active' | 'parked' | 'expired';
export type CfImplementation = 'redirect_rule' | 'worker' | null;
export type SiteType = 'landing' | 'tds' | 'hybrid';
export type DomainRole = 'acceptor' | 'donor' | 'reserve';
export type AnalyticsTrend = 'up' | 'down' | 'neutral';

/**
 * Analytics data for a redirect or target domain
 */
export interface RedirectAnalytics {
  clicks_total: number;      // Total clicks all-time
  clicks_24h: number;         // Clicks in last 24 hours
  clicks_7d: number;          // Clicks in last 7 days
  clicks_30d: number;         // Clicks in last 30 days
  trend: AnalyticsTrend;      // Trend indicator (vs previous period)
  last_click_at: string | null; // ISO timestamp of last click
}

export interface DomainRedirect {
  id: number;

  // Source
  domain_id: number;
  domain: string;  // e.g., "old-domain.com"
  domain_status: DomainStatus;
  role: DomainRole;  // acceptor = primary (receives traffic), donor = redirects to acceptor, reserve = not attached

  // Target
  target_url: string | null;  // null = no redirect
  has_redirect: boolean;  // explicit flag: true = redirect configured

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
  site_type: SiteType;  // 'landing' | 'tds' | 'hybrid'
  project_id: number;
  project_name: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // Analytics (optional - only present when analytics are loaded)
  analytics?: RedirectAnalytics;
}

/**
 * Mock domain redirects
 *
 * Structure: 4 projects, 5 sites, 23 domains
 * - Project: CryptoBoss (id: 17) - 9 domains
 *   - Site: CryptoBoss (En) 🇺🇸 [Landing] - 3 domains (primary: cryptoboss.pics)
 *   - Site: CryptoBoss (Ru) 🇷🇺 [Landing] - 6 domains (primary: finbosse.ru)
 * - Project: TestProject (id: 18) - 4 domains
 *   - Site: Test Site 🇬🇧 [Landing] - 4 domains (primary: example.com)
 * - Project: Vavada (id: 19) - 6 domains
 *   - Site: Vavada (Ru) 🇷🇺 [TDS] - 6 domains (primary: casinovavada.cyou)
 * - Project: BetHub (id: 20) - 4 domains
 *   - Site: BetHub (Eu) 🇪🇺 [Hybrid] - 4 domains (primary: bethub.eu)
 *
 * Site types:
 * - Landing: Simple landing page sites (3 sites)
 * - TDS: Traffic Distribution System with routing logic (1 site)
 * - Hybrid: Landing + TDS combined (1 site)
 *
 * Primary domains: 5 (main site domains that receive traffic)
 * Status distribution: 13 with redirects, 10 without, 2 pending, 0 error
 */
export const mockDomainRedirects: DomainRedirect[] = [
  // ===== CryptoBoss (En) 🇺🇸 =====
  {
    id: 1,
    domain_id: 101,
    domain: 'cryptoboss.pics',
    domain_status: 'active',
    role: 'acceptor',  // Primary domain - receives traffic
    target_url: null,  // Main domain, no redirect (primary domain = receiver)
    has_redirect: false,
    redirect_code: 301,
    enabled: true,  // Primary domains can be "enabled" conceptually
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'never',  // Primary domains never sync (nothing to sync)
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-08T10:00:00Z',
    updated_at: '2025-01-08T10:00:00Z',
    // Acceptor domain - aggregated clicks from cryptoboss.online (1847) + verylongdomainname20.com (523)
    analytics: {
      clicks_total: 12847,
      clicks_24h: 142,
      clicks_7d: 2370,    // 1847 + 523
      clicks_30d: 8901,
      trend: 'up',
      last_click_at: '2025-12-28T14:23:17Z'
    }
  },
  {
    id: 2,
    domain_id: 102,
    domain: 'cryptoboss.online',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://cryptoboss.pics',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_abc123',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-01-13T18:15:27Z',
    sync_status: 'synced',  // Active (enabled + synced)
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-10T12:00:00Z',
    updated_at: '2025-01-13T18:15:27Z',
    // Donor domain - individual redirect clicks
    analytics: {
      clicks_total: 5423,
      clicks_24h: 89,
      clicks_7d: 1847,
      clicks_30d: 4102,
      trend: 'up',
      last_click_at: '2025-12-28T14:19:03Z'
    }
  },
  {
    id: 3,
    domain_id: 103,
    domain: 'cryptoboss.click',
    domain_status: 'parked',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: null,
    has_redirect: false,
    redirect_code: 301,
    enabled: false,  // Disabled (by user)
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'never',  // Disabled = never syncs
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-05T14:00:00Z',
    updated_at: '2025-01-05T14:00:00Z'
  },
  {
    id: 24,
    domain_id: 104,
    domain: 'verylongdomainname20.com',  // Test long domain name (20 chars before dot)
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://cryptoboss.pics',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_long123',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-01-14T10:20:30Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 1,
    site_name: 'CryptoBoss (En)',
    site_flag: '🇺🇸',
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-12T08:00:00Z',
    updated_at: '2025-01-14T10:20:30Z',
    // Donor domain - neutral trend (stable traffic)
    analytics: {
      clicks_total: 1892,
      clicks_24h: 21,
      clicks_7d: 523,
      clicks_30d: 1203,
      trend: 'neutral',
      last_click_at: '2025-12-28T13:45:12Z'
    }
  },

  // ===== CryptoBoss (Ru) 🇷🇺 =====
  {
    id: 4,
    domain_id: 201,
    domain: 'finbosse.ru',
    domain_status: 'active',
    role: 'acceptor',  // Primary domain - receives traffic
    target_url: null,  // Main domain, no redirect (primary domain)
    redirect_code: 301,
    enabled: true,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'never',  // Primary domains never sync
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-06T09:00:00Z',
    updated_at: '2025-01-06T09:00:00Z',
    // Acceptor domain - aggregated from cryptoboss.icu + cryptopot.ru + cryptovalve.ru + hitboss.ru
    analytics: {
      clicks_total: 28394,
      clicks_24h: 198,
      clicks_7d: 3847,    // sum of all donors
      clicks_30d: 12034,
      trend: 'down',      // trending down vs previous period
      last_click_at: '2025-12-28T14:18:52Z'
    }
  },
  {
    id: 5,
    domain_id: 202,
    domain: 'cryptoboss.icu',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://finbosse.ru',
    has_redirect: true,
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
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-11T11:00:00Z',
    updated_at: '2025-01-13T18:15:27Z',
    // Donor domain - trending up
    analytics: {
      clicks_total: 8234,
      clicks_24h: 87,
      clicks_7d: 1523,
      clicks_30d: 5102,
      trend: 'up',
      last_click_at: '2025-12-28T14:12:33Z'
    }
  },
  {
    id: 6,
    domain_id: 203,
    domain: 'cryptopot.ru',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://finbosse.ru',
    has_redirect: true,
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
    site_type: 'landing',
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
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://finbosse.ru',
    has_redirect: true,
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
    site_type: 'landing',
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
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://finbosse.ru',
    has_redirect: true,
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
    site_type: 'landing',
    project_id: 17,
    project_name: 'CryptoBoss',
    created_at: '2025-01-12T15:00:00Z',
    updated_at: '2025-01-12T16:20:15Z',
    // Donor domain with error status - trending down (might be related to sync error)
    analytics: {
      clicks_total: 3421,
      clicks_24h: 12,
      clicks_7d: 234,
      clicks_30d: 987,
      trend: 'down',
      last_click_at: '2025-12-28T11:23:05Z'
    }
  },
  {
    id: 9,
    domain_id: 206,
    domain: 'casino-boss.ru',
    domain_status: 'parked',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: null,
    has_redirect: false,
    redirect_code: 301,
    enabled: false,  // Disabled
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'never',  // Disabled = never syncs
    sync_error: null,
    site_id: 2,
    site_name: 'CryptoBoss (Ru)',
    site_flag: '🇷🇺',
    site_type: 'landing',
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
    role: 'acceptor',  // Primary domain - receives traffic
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
    site_type: 'landing',
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
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://example.com',
    has_redirect: true,
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
    site_type: 'landing',
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
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://example.com/staging',
    has_redirect: true,
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
    site_type: 'landing',
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
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: null,
    has_redirect: false,
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
    site_type: 'landing',
    project_id: 18,
    project_name: 'TestProject',
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z'
  },

  // ===== Vavada (Ru) 🇷🇺 - TDS =====
  {
    id: 14,
    domain_id: 401,
    domain: 'casinovavada.cyou',
    domain_status: 'active',
    role: 'acceptor',  // Primary domain - receives traffic
    target_url: null,  // Main domain, no redirect
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 4,
    site_name: 'Vavada (Ru)',
    site_flag: '🇷🇺',
    site_type: 'tds',
    project_id: 19,
    project_name: 'Vavada',
    created_at: '2025-11-20T09:00:00Z',
    updated_at: '2025-11-20T09:00:00Z'
  },
  {
    id: 15,
    domain_id: 402,
    domain: 'bdblogov.ru',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://casinovavada.cyou/',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_vav1',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-11-22T10:32:59Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 4,
    site_name: 'Vavada (Ru)',
    site_flag: '🇷🇺',
    site_type: 'tds',
    project_id: 19,
    project_name: 'Vavada',
    created_at: '2025-11-21T08:00:00Z',
    updated_at: '2025-11-22T10:32:59Z'
  },
  {
    id: 16,
    domain_id: 403,
    domain: 'casinovavada.homes',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://casinovavada.cyou/*',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_vav2',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-11-22T10:19:57Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 4,
    site_name: 'Vavada (Ru)',
    site_flag: '🇷🇺',
    site_type: 'tds',
    project_id: 19,
    project_name: 'Vavada',
    created_at: '2025-11-21T09:00:00Z',
    updated_at: '2025-11-22T10:19:57Z'
  },
  {
    id: 17,
    domain_id: 404,
    domain: 'clubvavada.ru',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://casinovavada.cyou/*',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_vav3',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-11-22T10:19:57Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 4,
    site_name: 'Vavada (Ru)',
    site_flag: '🇷🇺',
    site_type: 'tds',
    project_id: 19,
    project_name: 'Vavada',
    created_at: '2025-11-21T10:00:00Z',
    updated_at: '2025-11-22T10:19:57Z'
  },
  {
    id: 18,
    domain_id: 405,
    domain: 'vavada.monster',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://casinovavada.cyou/*',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_vav4',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-11-22T10:19:57Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 4,
    site_name: 'Vavada (Ru)',
    site_flag: '🇷🇺',
    site_type: 'tds',
    project_id: 19,
    project_name: 'Vavada',
    created_at: '2025-11-21T11:00:00Z',
    updated_at: '2025-11-22T10:19:57Z'
  },
  {
    id: 19,
    domain_id: 406,
    domain: 'vavada10.ru',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://casinovavada.cyou/*',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_vav5',
    cf_implementation: 'redirect_rule',
    last_sync_at: '2025-11-22T10:19:57Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 4,
    site_name: 'Vavada (Ru)',
    site_flag: '🇷🇺',
    site_type: 'tds',
    project_id: 19,
    project_name: 'Vavada',
    created_at: '2025-11-21T12:00:00Z',
    updated_at: '2025-11-22T10:19:57Z'
  },

  // ===== BetHub (Eu) 🇪🇺 - Hybrid =====
  {
    id: 20,
    domain_id: 501,
    domain: 'bethub.eu',
    domain_status: 'active',
    role: 'acceptor',  // Primary domain - receives traffic
    target_url: null,  // Main domain, no redirect
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 5,
    site_name: 'BetHub (Eu)',
    site_flag: '🇪🇺',
    site_type: 'hybrid',
    project_id: 20,
    project_name: 'BetHub',
    created_at: '2025-12-01T08:00:00Z',
    updated_at: '2025-12-01T08:00:00Z'
  },
  {
    id: 21,
    domain_id: 502,
    domain: 'bet-hub.com',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://bethub.eu',
    has_redirect: true,
    redirect_code: 301,
    enabled: true,
    cf_rule_id: 'rule_bh1',
    cf_implementation: 'worker',
    last_sync_at: '2025-12-15T14:20:00Z',
    sync_status: 'synced',
    sync_error: null,
    site_id: 5,
    site_name: 'BetHub (Eu)',
    site_flag: '🇪🇺',
    site_type: 'hybrid',
    project_id: 20,
    project_name: 'BetHub',
    created_at: '2025-12-10T09:00:00Z',
    updated_at: '2025-12-15T14:20:00Z'
  },
  {
    id: 22,
    domain_id: 503,
    domain: 'betseu.net',
    domain_status: 'active',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: 'https://bethub.eu',
    has_redirect: true,
    redirect_code: 302,
    enabled: true,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'pending',
    sync_error: null,
    site_id: 5,
    site_name: 'BetHub (Eu)',
    site_flag: '🇪🇺',
    site_type: 'hybrid',
    project_id: 20,
    project_name: 'BetHub',
    created_at: '2025-12-18T10:00:00Z',
    updated_at: '2025-12-18T10:00:00Z'
  },
  {
    id: 23,
    domain_id: 504,
    domain: 'gambling-eu.org',
    domain_status: 'parked',
    role: 'donor',  // Donor domain - redirects to acceptor
    target_url: null,
    has_redirect: false,
    redirect_code: 301,
    enabled: false,
    cf_rule_id: null,
    cf_implementation: null,
    last_sync_at: null,
    sync_status: 'synced',
    sync_error: null,
    site_id: 5,
    site_name: 'BetHub (Eu)',
    site_flag: '🇪🇺',
    site_type: 'hybrid',
    project_id: 20,
    project_name: 'BetHub',
    created_at: '2025-12-05T11:00:00Z',
    updated_at: '2025-12-05T11:00:00Z'
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
    site_type: domains[0].site_type,
    project_id: domains[0].project_id,
    project_name: domains[0].project_name,
    domains,
  }));
}

/**
 * Group redirects by project (not site)
 * One project can contain multiple sites with their domains
 */
export interface TargetSubgroup {
  target_key: string;  // Unique key for grouping (target_url or "site:{site_id}" or "no-redirect")
  target_display: string;  // Display text (hostname or "No redirect")
  target_type: 'site' | 'redirect' | 'none';  // site = primary domain with site_type, redirect = external target, none = no redirect
  site_type?: SiteType;  // Only for target_type === 'site'
  domains: DomainRedirect[];
}

export interface ProjectGroup {
  project_id: number;
  project_name: string;
  targets: TargetSubgroup[];
  totalDomains: number;
}

/**
 * Group domains by site within a project
 * Each site has a primary domain (the target) and domains redirecting to it
 */
function groupByTarget(domains: DomainRedirect[]): TargetSubgroup[] {
  // Group by site_id
  const siteGroups = new Map<number, DomainRedirect[]>();
  const noSiteDomains: DomainRedirect[] = [];

  for (const domain of domains) {
    if (domain.site_id) {
      if (!siteGroups.has(domain.site_id)) {
        siteGroups.set(domain.site_id, []);
      }
      siteGroups.get(domain.site_id)!.push(domain);
    } else {
      // Domains without site (orphaned/external redirects)
      noSiteDomains.push(domain);
    }
  }

  // Convert site groups to TargetSubgroups
  const result: TargetSubgroup[] = [];

  for (const [siteId, siteDomains] of siteGroups.entries()) {
    // Find primary domain (no redirect, has site_type)
    const primary = siteDomains.find(d => !d.target_url && d.site_type);

    if (primary) {
      // Sort: primary first, then others
      const sorted = [
        primary,
        ...siteDomains.filter(d => d.id !== primary.id)
      ];

      result.push({
        target_key: `site:${siteId}`,
        target_display: primary.domain,
        target_type: 'site' as const,
        site_type: primary.site_type,
        domains: sorted,
      });
    } else {
      // No primary found - treat as regular group
      result.push({
        target_key: `site:${siteId}`,
        target_display: siteDomains[0].domain,
        target_type: 'redirect' as const,
        domains: siteDomains,
      });
    }
  }

  // Add domains without site (if any)
  if (noSiteDomains.length > 0) {
    result.push({
      target_key: 'no-site',
      target_display: 'Other domains',
      target_type: 'none' as const,
      domains: noSiteDomains,
    });
  }

  return result;
}

export function groupByProject(redirects: DomainRedirect[]): ProjectGroup[] {
  const groups = new Map<number, DomainRedirect[]>();

  for (const redirect of redirects) {
    if (!groups.has(redirect.project_id)) {
      groups.set(redirect.project_id, []);
    }
    groups.get(redirect.project_id)!.push(redirect);
  }

  return Array.from(groups.entries()).map(([projectId, domains]) => ({
    project_id: projectId,
    project_name: domains[0].project_name,
    targets: groupByTarget(domains),
    totalDomains: domains.length,
  }));
}
