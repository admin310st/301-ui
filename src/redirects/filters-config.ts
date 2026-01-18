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
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

// Note: Project and Site selectors are now separate dropdowns (data-project-selector, data-site-selector)
// loaded dynamically from API in site-selector.ts

export const REDIRECT_FILTERS: FilterConfig[] = [
  {
    id: 'configured',
    label: 'Configured',
    type: 'multi-select',
    priority: 'critical', // Always visible - relates to Target column
    options: [
      { value: 'has-redirect', label: 'Has redirect' },
      { value: 'no-redirect', label: 'No redirect' },
    ],
  },
  {
    id: 'sync',
    label: 'Sync',
    type: 'multi-select',
    priority: 'high', // Hidden < 560px - relates to Status column
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
    priority: 'high', // Hidden < 560px - relates to Status column
    options: [
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
];

/**
 * Active filters state
 * Note: Project/Site selection is handled by separate selectors, not here
 */
export interface ActiveFilters {
  configured?: string[];
  sync?: string[];
  enabled?: string[];
}

/**
 * Check if any filters are active (non-default)
 */
export function hasActiveFilters(filters: ActiveFilters): boolean {
  return !!(
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
    configured: [],
    sync: [],
    enabled: [],
  };
}
