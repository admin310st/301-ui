/**
 * Redirect Rules Mock Data
 *
 * Redirects = Traffic Control Plane routing rules
 * Users: SEO specialists, webmasters, marketers, affiliates
 */

export type RedirectType = 'simple' | 'weighted' | 'conditional' | 'regex';
export type RedirectCode = 301 | 302 | 307;
export type PathType = 'exact' | 'prefix' | 'regex';
export type RuleStatus = 'active' | 'disabled' | 'error';
export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export interface RedirectDestination {
  url: string;
  weight?: number;  // for weighted rules
  enabled: boolean;
}

export interface RedirectConditions {
  countries?: string[];      // ['RU', 'UA', 'KZ']
  devices?: DeviceType[];
  browsers?: string[];
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
}

export interface RedirectRule {
  id: number;
  name: string;

  // Type
  type: RedirectType;
  redirect_code: RedirectCode;

  // Source
  source_domain_id: number;
  source_domain: string;  // denormalized for display
  source_path_type: PathType;
  source_path: string;

  // Destinations
  destinations: RedirectDestination[];

  // Conditions
  conditions: RedirectConditions;

  // Status & Metrics
  status: RuleStatus;
  error_message?: string;

  hits_24h: number;
  hits_7d: number;
  hits_total: number;

  // Metadata
  project_id: number;
  project_name: string;  // denormalized for display
  priority: number;
  stop_execution: boolean;

  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
}

/**
 * Mock redirect rules
 */
export const mockRedirectRules: RedirectRule[] = [
  // 1. Simple 301 redirect - Blog migration
  {
    id: 1,
    name: 'Old blog → New blog',
    type: 'simple',
    redirect_code: 301,
    source_domain_id: 101,
    source_domain: 'example.com',
    source_path_type: 'prefix',
    source_path: '/blog/*',
    destinations: [{
      url: 'https://blog.example.com',
      enabled: true
    }],
    conditions: {},
    status: 'active',
    hits_24h: 1234,
    hits_7d: 8567,
    hits_total: 45678,
    project_id: 1,
    project_name: 'Example Project',
    priority: 100,
    stop_execution: false,
    created_at: '2025-11-15T10:00:00Z',
    updated_at: '2025-12-01T14:30:00Z',
    last_triggered_at: '2025-12-22T09:15:00Z'
  },

  // 2. Weighted split - A/B testing
  {
    id: 2,
    name: 'Landing A/B test',
    type: 'weighted',
    redirect_code: 302,
    source_domain_id: 102,
    source_domain: 'promo.example.com',
    source_path_type: 'exact',
    source_path: '/special-offer',
    destinations: [
      { url: 'https://landing-a.example.com', weight: 70, enabled: true },
      { url: 'https://landing-b.example.com', weight: 30, enabled: true }
    ],
    conditions: {},
    status: 'active',
    hits_24h: 567,
    hits_7d: 3456,
    hits_total: 12345,
    project_id: 2,
    project_name: 'Marketing Campaign',
    priority: 200,
    stop_execution: false,
    created_at: '2025-12-01T08:00:00Z',
    updated_at: '2025-12-15T12:00:00Z',
    last_triggered_at: '2025-12-22T09:30:00Z'
  },

  // 3. Conditional - GEO + device targeting
  {
    id: 3,
    name: 'RU mobile → special landing',
    type: 'conditional',
    redirect_code: 302,
    source_domain_id: 103,
    source_domain: 'example.com',
    source_path_type: 'prefix',
    source_path: '/offer/*',
    destinations: [{
      url: 'https://ru-mobile.example.com',
      enabled: true
    }],
    conditions: {
      countries: ['RU', 'BY', 'KZ'],
      devices: ['mobile']
    },
    status: 'active',
    hits_24h: 890,
    hits_7d: 5432,
    hits_total: 23456,
    project_id: 3,
    project_name: 'Regional Campaigns',
    priority: 150,
    stop_execution: false,
    created_at: '2025-11-20T14:00:00Z',
    updated_at: '2025-12-10T16:00:00Z',
    last_triggered_at: '2025-12-22T09:45:00Z'
  },

  // 4. Regex-based - SEO URL migration
  {
    id: 4,
    name: 'Product URLs migration',
    type: 'regex',
    redirect_code: 301,
    source_domain_id: 104,
    source_domain: 'shop.example.com',
    source_path_type: 'regex',
    source_path: '^/products/(\\d+)$',
    destinations: [{
      url: 'https://new-shop.example.com/items/$1',
      enabled: true
    }],
    conditions: {},
    status: 'active',
    hits_24h: 234,
    hits_7d: 1456,
    hits_total: 8765,
    project_id: 4,
    project_name: 'E-commerce',
    priority: 300,
    stop_execution: false,
    created_at: '2025-10-01T09:00:00Z',
    updated_at: '2025-11-01T11:00:00Z',
    last_triggered_at: '2025-12-22T08:00:00Z'
  },

  // 5. Multi-geo weighted split
  {
    id: 5,
    name: 'EU traffic distribution',
    type: 'weighted',
    redirect_code: 302,
    source_domain_id: 105,
    source_domain: 'eu.example.com',
    source_path_type: 'prefix',
    source_path: '/*',
    destinations: [
      { url: 'https://de-server.example.com', weight: 50, enabled: true },
      { url: 'https://fr-server.example.com', weight: 30, enabled: true },
      { url: 'https://nl-server.example.com', weight: 20, enabled: true }
    ],
    conditions: {
      countries: ['DE', 'FR', 'NL', 'BE', 'AT', 'CH']
    },
    status: 'active',
    hits_24h: 2345,
    hits_7d: 15678,
    hits_total: 89012,
    project_id: 5,
    project_name: 'EU Distribution',
    priority: 180,
    stop_execution: false,
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-12-01T15:00:00Z',
    last_triggered_at: '2025-12-22T09:50:00Z'
  },

  // 6. Browser-specific redirect
  {
    id: 6,
    name: 'Legacy IE redirect',
    type: 'conditional',
    redirect_code: 302,
    source_domain_id: 106,
    source_domain: 'app.example.com',
    source_path_type: 'prefix',
    source_path: '/*',
    destinations: [{
      url: 'https://legacy.example.com',
      enabled: true
    }],
    conditions: {
      browsers: ['IE', 'Internet Explorer']
    },
    status: 'active',
    hits_24h: 12,
    hits_7d: 89,
    hits_total: 456,
    project_id: 6,
    project_name: 'Web App',
    priority: 250,
    stop_execution: true,
    created_at: '2025-08-15T12:00:00Z',
    updated_at: '2025-11-15T14:00:00Z',
    last_triggered_at: '2025-12-21T18:00:00Z'
  },

  // 7. Disabled rule (paused campaign)
  {
    id: 7,
    name: 'Black Friday campaign',
    type: 'simple',
    redirect_code: 302,
    source_domain_id: 107,
    source_domain: 'promo.example.com',
    source_path_type: 'exact',
    source_path: '/black-friday',
    destinations: [{
      url: 'https://sale.example.com/black-friday-2025',
      enabled: true
    }],
    conditions: {},
    status: 'disabled',
    hits_24h: 0,
    hits_7d: 0,
    hits_total: 45678,
    project_id: 2,
    project_name: 'Marketing Campaign',
    priority: 100,
    stop_execution: false,
    created_at: '2025-11-01T00:00:00Z',
    updated_at: '2025-11-30T23:59:00Z',
    last_triggered_at: '2025-11-29T23:55:00Z'
  },

  // 8. Error state - invalid destination
  {
    id: 8,
    name: 'Broken affiliate link',
    type: 'simple',
    redirect_code: 302,
    source_domain_id: 108,
    source_domain: 'track.example.com',
    source_path_type: 'prefix',
    source_path: '/aff/*',
    destinations: [{
      url: 'https://invalid-domain-12345.com',
      enabled: true
    }],
    conditions: {},
    status: 'error',
    error_message: 'Destination domain not reachable (DNS resolution failed)',
    hits_24h: 0,
    hits_7d: 0,
    hits_total: 234,
    project_id: 7,
    project_name: 'Affiliates',
    priority: 100,
    stop_execution: false,
    created_at: '2025-10-15T10:00:00Z',
    updated_at: '2025-12-20T08:00:00Z',
    last_triggered_at: '2025-12-18T14:00:00Z'
  },

  // 9. Complex conditional - device + geo + browser
  {
    id: 9,
    name: 'US iOS Safari → App Store',
    type: 'conditional',
    redirect_code: 302,
    source_domain_id: 109,
    source_domain: 'get.example.com',
    source_path_type: 'exact',
    source_path: '/app',
    destinations: [{
      url: 'https://apps.apple.com/app/example',
      enabled: true
    }],
    conditions: {
      countries: ['US', 'CA'],
      devices: ['mobile', 'tablet'],
      browsers: ['Safari', 'Mobile Safari']
    },
    status: 'active',
    hits_24h: 456,
    hits_7d: 2345,
    hits_total: 12345,
    project_id: 8,
    project_name: 'Mobile App',
    priority: 220,
    stop_execution: true,
    created_at: '2025-11-10T09:00:00Z',
    updated_at: '2025-12-05T11:00:00Z',
    last_triggered_at: '2025-12-22T09:20:00Z'
  },

  // 10. Query param based redirect
  {
    id: 10,
    name: 'UTM campaign redirect',
    type: 'conditional',
    redirect_code: 302,
    source_domain_id: 110,
    source_domain: 'example.com',
    source_path_type: 'exact',
    source_path: '/landing',
    destinations: [{
      url: 'https://special.example.com/campaign',
      enabled: true
    }],
    conditions: {
      query_params: {
        'utm_source': 'email',
        'utm_campaign': 'winter2025'
      }
    },
    status: 'active',
    hits_24h: 123,
    hits_7d: 789,
    hits_total: 3456,
    project_id: 2,
    project_name: 'Marketing Campaign',
    priority: 170,
    stop_execution: false,
    created_at: '2025-12-10T08:00:00Z',
    updated_at: '2025-12-15T10:00:00Z',
    last_triggered_at: '2025-12-22T08:30:00Z'
  }
];

/**
 * Get redirect statistics
 */
export function getRedirectStats(rules: RedirectRule[]) {
  return {
    total: rules.length,
    active: rules.filter(r => r.status === 'active').length,
    disabled: rules.filter(r => r.status === 'disabled').length,
    errors: rules.filter(r => r.status === 'error').length,
    hits_24h: rules.reduce((sum, r) => sum + r.hits_24h, 0),
    hits_7d: rules.reduce((sum, r) => sum + r.hits_7d, 0)
  };
}
