/**
 * Redirect filters configuration
 * Defines available filters for redirects table
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  icon?: string;
  type: 'single-select' | 'multi-select';
  options: FilterOption[];
}

export const REDIRECT_FILTERS: FilterConfig[] = [
  {
    id: 'project',
    label: 'Projects',
    type: 'multi-select',
    options: [
      { value: '17', label: 'CryptoBoss' },
      { value: '18', label: 'TestProject' },
      { value: '19', label: 'Vavada' },
      { value: '20', label: 'BetHub' },
    ],
  },
  {
    id: 'configured',
    label: 'Configured',
    type: 'multi-select',
    options: [
      { value: 'has-redirect', label: 'Has redirect' },
      { value: 'no-redirect', label: 'No redirect' },
    ],
  },
  {
    id: 'sync',
    label: 'Sync',
    type: 'multi-select',
    options: [
      { value: 'synced', label: 'Synced' },
      { value: 'pending', label: 'Pending' },
      { value: 'error', label: 'Error' },
      { value: 'never', label: 'Not synced' },
    ],
  },
  {
    id: 'enabled',
    label: 'Enabled',
    type: 'multi-select',
    options: [
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
];

/**
 * Active filters state
 */
export interface ActiveFilters {
  project?: string[];
  configured?: string[];
  sync?: string[];
  enabled?: string[];
}

/**
 * Check if any filters are active (non-default)
 */
export function hasActiveFilters(filters: ActiveFilters): boolean {
  return !!(
    (filters.project && filters.project.length > 0) ||
    (filters.configured && filters.configured.length > 0) ||
    (filters.sync && filters.sync.length > 0) ||
    (filters.enabled && filters.enabled.length > 0)
  );
}

/**
 * Reset all filters to defaults
 */
export function getDefaultFilters(): ActiveFilters {
  return {
    project: [],
    configured: [],
    sync: [],
    enabled: [],
  };
}
