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
];

/**
 * Active filters state
 */
export interface ActiveFilters {
  project?: string[];
}

/**
 * Check if any filters are active (non-default)
 */
export function hasActiveFilters(filters: ActiveFilters): boolean {
  return !!(filters.project && filters.project.length > 0);
}

/**
 * Reset all filters to defaults
 */
export function getDefaultFilters(): ActiveFilters {
  return {
    project: [],
  };
}
