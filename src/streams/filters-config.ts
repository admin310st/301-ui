/**
 * TDS filters configuration
 * Defines available filters for TDS rules table
 */

import type { FilterConfig, FilterOption, ActiveFilters } from '@redirects/filters-config';

// Re-export types for convenience
export type { FilterConfig, FilterOption, ActiveFilters };

export const TDS_FILTERS: FilterConfig[] = [
  {
    id: 'tds_type',
    label: 'Type',
    type: 'multi-select',
    priority: 'critical',
    options: [
      { value: 'traffic_shield', label: 'Shield' },
      { value: 'smartlink', label: 'SmartLink' },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    type: 'multi-select',
    priority: 'high',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
  {
    id: 'action',
    label: 'Action',
    type: 'multi-select',
    priority: 'medium',
    options: [
      { value: 'redirect', label: 'Redirect' },
      { value: 'block', label: 'Block' },
      { value: 'pass', label: 'Pass' },
      { value: 'mab_redirect', label: 'A/B Test' },
    ],
  },
];

export interface TdsActiveFilters {
  tds_type?: string[];
  status?: string[];
  action?: string[];
}

export function hasActiveFilters(filters: TdsActiveFilters): boolean {
  return !!(
    (filters.tds_type && filters.tds_type.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    (filters.action && filters.action.length > 0)
  );
}

export function getDefaultFilters(): TdsActiveFilters {
  return {
    tds_type: [],
    status: [],
    action: [],
  };
}
