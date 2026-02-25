/**
 * TDS filters configuration
 * Defines available filters for TDS rules table
 */

import type { FilterConfig, FilterOption, ActiveFilters } from '@redirects/filters-config';
import { t } from '@i18n';

// Re-export types for convenience
export type { FilterConfig, FilterOption, ActiveFilters };

export function getTdsFilters(): FilterConfig[] {
  return [
    {
      id: 'tds_type',
      label: t('streams.filters.type'),
      type: 'multi-select',
      priority: 'critical',
      options: [
        { value: 'traffic_shield', label: t('streams.types.traffic_shield') },
        { value: 'smartlink', label: t('streams.types.smartlink') },
      ],
    },
    {
      id: 'status',
      label: t('streams.filters.status'),
      type: 'multi-select',
      priority: 'high',
      options: [
        { value: 'draft', label: t('streams.status.draft') },
        { value: 'active', label: t('streams.status.active') },
        { value: 'disabled', label: t('streams.status.disabled') },
      ],
    },
    {
      id: 'action',
      label: t('streams.filters.action'),
      type: 'multi-select',
      priority: 'medium',
      options: [
        { value: 'redirect', label: t('streams.actionTypes.redirect') },
        { value: 'block', label: t('streams.actionTypes.block') },
        { value: 'pass', label: t('streams.actionTypes.pass') },
        { value: 'mab_redirect', label: t('streams.actionTypes.mab_redirect') },
      ],
    },
  ];
}

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
