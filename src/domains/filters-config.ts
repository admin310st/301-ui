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
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export const DOMAIN_FILTERS: FilterConfig[] = [
  {
    id: 'project',
    label: 'Project',
    type: 'single-select',
    priority: 'critical', // Always visible - primary grouping/filtering, state persisted
    options: [
      { value: 'all', label: 'All' },
      // Dynamic options populated from API
    ],
  },
  {
    id: 'status',
    label: 'Status',
    type: 'single-select',
    priority: 'high', // Hidden < 560px - relates to Status column
    options: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'blocked', label: 'Blocked' },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    type: 'multi-select',
    priority: 'medium', // Hidden < 720px - relates to Health column
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
    priority: 'medium', // Hidden < 720px - metadata filter, not visible column
    options: [
      { value: 'all', label: 'All' },
      { value: 'cloudflare', label: 'Cloudflare' },
      { value: 'namecheap', label: 'Namecheap' },
      { value: 'namesilo', label: 'NameSilo' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'role',
    label: 'Role',
    type: 'single-select',
    priority: 'high', // Hidden < 560px - relates to redirect logic
    options: [
      { value: 'all', label: 'All' },
      { value: 'donor', label: 'Donor' },
      { value: 'acceptor', label: 'Acceptor' },
    ],
  },
  {
    id: 'expiry',
    label: 'Expiry',
    type: 'single-select',
    priority: 'low', // Hidden < 880px - relates to Expires column
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
  role?: string;
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
    (filters.role && filters.role !== 'all') ||
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
    role: 'all',
    expiry: 'any',
  };
}

/**
 * Update project filter options with real data from API
 * @param projects Array of projects from API
 */
export function updateProjectFilterOptions(projects: Array<{ id: number; name: string }>): void {
  const projectFilter = DOMAIN_FILTERS.find((f) => f.id === 'project');
  if (!projectFilter) return;

  // Reset to "All" + dynamic project options
  projectFilter.options = [
    { value: 'all', label: 'All' },
    ...projects.map((p) => ({ value: p.id.toString(), label: p.name })),
  ];
}
