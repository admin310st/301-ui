/**
 * Adapter for gradual migration from mock-data to real API
 *
 * Converts new API structure (RedirectDomain[]) to legacy format (DomainRedirect[])
 * This allows existing UI code to work while we migrate to the new structure.
 *
 * TODO: Remove this file once UI is fully migrated to new structure
 */

import type { RedirectDomain, RedirectRule, DomainRole } from '@api/types';
import type { DomainRedirect, SyncStatus, DomainStatus, SiteType, AnalyticsTrend } from './mock-data';

/**
 * Convert new API domain to legacy DomainRedirect format
 */
export function adaptDomainToLegacy(
  domain: RedirectDomain,
  siteInfo: {
    site_id: number;
    site_name: string;
    site_tag?: string | null;
    site_status?: 'active' | 'paused' | 'archived';
    site_flag?: string;
    site_type?: SiteType;
    project_id?: number;
    project_name?: string;
  }
): DomainRedirect {
  const redirect = domain.redirect;

  // Map sync_status from API to legacy format
  const syncStatusMap: Record<string, SyncStatus> = {
    pending: 'pending',
    synced: 'synced',
    error: 'error',
  };

  // Map domain_role to legacy role
  const roleMap: Record<DomainRole, DomainRedirect['role']> = {
    acceptor: 'acceptor',
    donor: 'donor',
    reserve: 'reserve',
  };

  // Build analytics from redirect data (with safe defaults)
  const analytics = redirect ? {
    clicks_total: redirect.clicks_total ?? 0,
    clicks_24h: redirect.clicks_today ?? 0,
    clicks_7d: redirect.clicks_total ?? 0, // API doesn't have 7d, use total
    clicks_30d: 0, // Not available
    trend: (redirect.trend as AnalyticsTrend) ?? 'neutral',
    last_click_at: null, // Not available
  } : undefined;

  return {
    id: redirect?.id ?? domain.domain_id, // Use redirect id if available, else domain_id
    domain_id: domain.domain_id,
    domain: domain.domain_name,
    domain_status: 'active' as DomainStatus, // API doesn't provide this, default to active
    role: roleMap[domain.domain_role],

    // Target info
    target_url: redirect?.params?.target_url ?? null,
    has_redirect: redirect !== null,
    redirect_code: redirect?.status_code ?? 301,

    // Status
    enabled: redirect?.enabled ?? false,

    // Cloudflare sync
    cf_rule_id: redirect?.cf_rule_id ?? null,
    cf_implementation: redirect?.cf_rule_id ? 'redirect_rule' : null,
    last_sync_at: redirect?.updated_at ?? null,
    sync_status: redirect ? (syncStatusMap[redirect.sync_status] ?? 'never') : 'never',
    sync_error: null, // API doesn't provide error message in list

    // Grouping (from site info)
    site_id: siteInfo.site_id,
    site_name: siteInfo.site_name,
    site_tag: siteInfo.site_tag ?? undefined,
    site_status: siteInfo.site_status ?? 'active',
    site_flag: '', // Not used in real API, kept for type compatibility
    site_type: 'landing', // Default, not returned by API
    project_id: siteInfo.project_id ?? 0,
    project_name: siteInfo.project_name ?? '',

    // Metadata
    created_at: redirect?.created_at ?? new Date().toISOString(),
    updated_at: redirect?.updated_at ?? new Date().toISOString(),

    // Analytics
    analytics,
  };
}

/**
 * Convert array of API domains to legacy format
 */
export function adaptDomainsToLegacy(
  domains: RedirectDomain[],
  siteInfo: {
    site_id: number;
    site_name: string;
    site_tag?: string | null;
    site_status?: 'active' | 'paused' | 'archived';
    site_flag?: string;
    site_type?: SiteType;
    project_id?: number;
    project_name?: string;
  }
): DomainRedirect[] {
  return domains.map(domain => adaptDomainToLegacy(domain, siteInfo));
}

/**
 * Get target URL from redirect params based on template
 */
export function getTargetUrlFromRedirect(
  domain: RedirectDomain,
  redirect: RedirectRule
): string | null {
  const { template_id, params } = redirect;

  // T1, T6, T7: explicit target_url in params
  if (params?.target_url) {
    return params.target_url;
  }

  // T3: non-www → www
  if (template_id === 'T3') {
    return `https://www.${domain.domain_name}`;
  }

  // T4: www → non-www
  if (template_id === 'T4') {
    return `https://${domain.domain_name.replace(/^www\./, '')}`;
  }

  // T5: path redirect (source → target)
  if (template_id === 'T5' && params?.source_path && params?.target_path) {
    return `${params.source_path} → ${params.target_path}`;
  }

  return null;
}
