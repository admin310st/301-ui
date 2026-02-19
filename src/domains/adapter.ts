/**
 * Adapter for domains API migration
 *
 * Converts APIDomain (from backend) to Domain (UI interface)
 * This allows existing UI code to work while we migrate from mock data.
 */

import type { APIDomain, DomainsGroup } from '@api/types';
import type { Domain } from './mock-data';

/**
 * Check if a date is expiring soon (within N days)
 */
function isExpiringSoon(dateStr: string, daysThreshold: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= daysThreshold;
}

/**
 * Calculate UI status from API fields
 * Status hierarchy: blocked > expired > expiring > pending > active
 */
function calculateStatus(api: APIDomain): Domain['status'] {
  // Blocked takes precedence
  if (api.blocked === 1) {
    return 'blocked';
  }

  // Check expiration
  if (api.expired_at) {
    const expDate = new Date(api.expired_at);
    const now = new Date();

    if (expDate < now) {
      return 'expired';
    }

    if (isExpiringSoon(api.expired_at, 30)) {
      return 'expiring';
    }
  }

  // NS not verified = pending
  if (api.ns_verified === 0) {
    return 'pending';
  }

  return 'active';
}

/**
 * Map API ssl_status to UI ssl_status
 */
function mapSSLStatus(apiStatus: string): Domain['ssl_status'] {
  switch (apiStatus) {
    case 'valid':
      return 'valid';
    case 'pending':
    case 'none':
      return 'off';
    case 'error':
      return 'invalid';
    default:
      return 'off';
  }
}

/**
 * Map API health to UI abuse_status
 */
function mapHealthToAbuse(health: APIDomain['health']): Domain['abuse_status'] {
  if (!health) return 'clean';

  switch (health.status) {
    case 'blocked':
      return 'blocked';
    case 'warning':
      return 'warning';
    case 'healthy':
    case 'unknown':
    default:
      return 'clean';
  }
}

/**
 * Get registrar display info from key_id
 * TODO: After provider integrations - lookup via integrations API
 */
export function getRegistrarDisplay(keyId: number | null): {
  registrar: Domain['registrar'];
  title: string;
} {
  if (!keyId) {
    return { registrar: 'manual', title: 'Manual' };
  }
  // Temporarily return cloudflare as placeholder
  // Real implementation will lookup key_id → provider via integrations API
  return { registrar: 'cloudflare', title: `Integration #${keyId}` };
}

/**
 * Convert single APIDomain to UI Domain
 */
export function adaptAPIDomainToUI(api: APIDomain): Domain {
  const { registrar } = getRegistrarDisplay(api.key_id);

  return {
    id: api.id,
    domain_name: api.domain_name,
    project_id: api.project_id ?? 0,
    project_name: api.project_name ?? 'Unassigned',
    // project_lang not in API, omit
    status: calculateStatus(api),
    role: api.role,
    registrar,
    cf_zone_id: api.cf_zone_id,
    site_id: api.site_id ?? undefined,
    zone_id: api.zone_id ?? undefined,
    ns_expected: api.ns || undefined,
    ssl_status: mapSSLStatus(api.ssl_status),
    // ssl_valid_to not in API list response
    abuse_status: mapHealthToAbuse(api.health),
    expires_at: api.expired_at
      ? new Date(api.expired_at).toISOString().split('T')[0]
      : 'N/A',
    monitoring_enabled: false, // Not in API
    last_check_at: api.health?.checked_at
      ? new Date(api.health.checked_at).toISOString().split('T')[0]
      : undefined,
    has_errors:
      api.blocked === 1 ||
      api.health?.status === 'blocked' ||
      api.health?.status === 'warning' ||
      api.ssl_status === 'error',
  };
}

/**
 * Flatten API groups response to flat domain array
 */
export function flattenDomainsGroups(groups: DomainsGroup[]): APIDomain[] {
  return groups.flatMap(group => group.domains);
}

/**
 * Convert API response to UI domains
 */
export function adaptDomainsResponseToUI(groups: DomainsGroup[]): Domain[] {
  const flatDomains = flattenDomainsGroups(groups);
  return flatDomains.map(adaptAPIDomainToUI);
}

/**
 * Extended domain info with API-specific fields for drawer/detail view
 */
export interface DomainDetailUI extends Domain {
  // Additional fields from APIDomain
  site_id: number | null;
  site_name: string | null;
  site_status: 'active' | 'paused' | 'archived' | null;
  zone_id: number;
  key_id: number | null;
  ns: string;
  ns_verified: boolean;
  proxied: boolean;
  blocked: boolean;
  blocked_reason: string | null;
  health_status: 'healthy' | 'warning' | 'blocked' | 'unknown' | null;
  health_threat_score: number | null;
  health_categories: string[] | null;
  health_checked_at: string | null;
}

/**
 * Convert APIDomain to detailed UI format (for drawer)
 */
export function adaptAPIDomainToDetailUI(api: APIDomain): DomainDetailUI {
  const base = adaptAPIDomainToUI(api);

  return {
    ...base,
    site_id: api.site_id,
    site_name: api.site_name,
    site_status: api.site_status as DomainDetailUI['site_status'],
    zone_id: api.zone_id,
    key_id: api.key_id,
    ns: api.ns,
    ns_verified: api.ns_verified === 1,
    proxied: api.proxied === 1,
    blocked: api.blocked === 1,
    blocked_reason: api.blocked_reason,
    health_status: api.health?.status ?? null,
    health_threat_score: api.health?.threat_score ?? null,
    health_categories: api.health?.categories ?? null,
    health_checked_at: api.health?.checked_at ?? null,
  };
}
