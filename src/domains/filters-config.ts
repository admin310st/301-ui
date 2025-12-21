/**
 * Domain filters configuration
 * Defines available filters for domains table
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'single-select' | 'multi-select';
  options: FilterOption[];
}

export const DOMAIN_FILTERS: FilterConfig[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'single-select',
    options: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'expiring', label: 'Expiring (30d)' },
      { value: 'expired', label: 'Expired' },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    type: 'multi-select',
    options: [
      { value: 'ok', label: 'OK' },
      { value: 'ssl_bad', label: 'SSL issues' },
      { value: 'dns_bad', label: 'DNS issues' },
      { value: 'abuse_bad', label: 'Abuse warnings' },
    ],
  },
  {
    id: 'provider',
    label: 'Provider',
    type: 'single-select',
    options: [
      { value: 'all', label: 'All' },
      { value: 'cloudflare', label: 'Cloudflare' },
      { value: 'namecheap', label: 'Namecheap' },
      { value: 'namesilo', label: 'NameSilo' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'project',
    label: 'Project',
    type: 'single-select',
    options: [
      { value: 'all', label: 'All' },
      // Dynamic options populated from API
    ],
  },
  {
    id: 'language',
    label: 'Language',
    type: 'single-select',
    options: [
      { value: 'all', label: 'All' },
      { value: 'ru', label: 'RU' },
      { value: 'en', label: 'EN' },
      { value: 'es', label: 'ES' },
      { value: 'fr', label: 'FR' },
      { value: 'de', label: 'DE' },
    ],
  },
  {
    id: 'expiry',
    label: 'Expiry',
    type: 'single-select',
    options: [
      { value: 'any', label: 'Any' },
      { value: '30d', label: '≤ 30 days' },
      { value: '60d', label: '≤ 60 days' },
      { value: '90d', label: '≤ 90 days' },
      { value: 'expired', label: 'Expired' },
    ],
  },
];

/**
 * Active filters state
 */
export interface ActiveFilters {
  status?: string;
  health?: string[];
  provider?: string;
  project?: string;
  language?: string;
  expiry?: string;
}

/**
 * Check if any filters are active (non-default)
 */
export function hasActiveFilters(filters: ActiveFilters): boolean {
  return !!(
    (filters.status && filters.status !== 'all') ||
    (filters.health && filters.health.length > 0) ||
    (filters.provider && filters.provider !== 'all') ||
    (filters.project && filters.project !== 'all') ||
    (filters.language && filters.language !== 'all') ||
    (filters.expiry && filters.expiry !== 'any')
  );
}

/**
 * Reset all filters to defaults
 */
export function getDefaultFilters(): ActiveFilters {
  return {
    status: 'all',
    health: [],
    provider: 'all',
    project: 'all',
    language: 'all',
    expiry: 'any',
  };
}
