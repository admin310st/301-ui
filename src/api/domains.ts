/**
 * Domains API client
 */

import { apiFetch } from './client';
import type { GetDomainsResponse } from './types';

/**
 * Filters for GET /domains
 */
export interface GetDomainsFilters {
  project_id?: number;
  site_id?: number;
  role?: 'donor' | 'acceptor';
  blocked?: boolean;
}

/**
 * Batch zone creation request
 */
export interface BatchZoneRequest {
  account_key_id: number;
  domains: string[];
}

/**
 * Successful zone creation result
 */
export interface BatchZoneSuccess {
  domain: string;
  zone_id: number;
  cf_zone_id: string;
  /** Nameservers - API may return as 'ns' or 'name_servers' */
  ns?: string[];
  name_servers?: string[];
  status: string;
}

/**
 * Failed zone creation result
 */
export interface BatchZoneFailed {
  domain: string;
  error: string;
  error_message: string;
}

/**
 * Batch zone creation response
 */
export interface BatchZoneResponse {
  ok: boolean;
  results: {
    success: BatchZoneSuccess[];
    failed: BatchZoneFailed[];
  };
}

/**
 * Get all domains for current user
 *
 * GET /domains
 *
 * @param filters - Optional filters (project_id, site_id, role, blocked)
 * @returns List of all domains grouped by root domain
 */
export async function getDomains(filters?: GetDomainsFilters): Promise<GetDomainsResponse> {
  let url = '/domains';

  // Build query string from filters
  if (filters) {
    const params = new URLSearchParams();
    if (filters.project_id !== undefined) params.append('project_id', String(filters.project_id));
    if (filters.site_id !== undefined) params.append('site_id', String(filters.site_id));
    if (filters.role) params.append('role', filters.role);
    if (filters.blocked !== undefined) params.append('blocked', String(filters.blocked));

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }

  return apiFetch<GetDomainsResponse>(url);
}

/**
 * Create zones in batch (up to 10 root domains)
 *
 * POST /domains/zones/batch
 *
 * @param data - Request payload with account_key_id and domains array
 * @returns Batch operation results with success/failed lists
 */
export async function createZonesBatch(data: BatchZoneRequest): Promise<BatchZoneResponse> {
  return apiFetch<BatchZoneResponse>('/domains/zones/batch', {
    method: 'POST',
    body: JSON.stringify(data),
    showLoading: 'cf', // Orange shimmer for Cloudflare operations
  });
}

/**
 * Assign domain to a site (which automatically sets project_id from site)
 *
 * POST /sites/:id/domains
 *
 * @param siteId - Site ID to assign domain to
 * @param domainId - Domain ID
 * @param role - Domain role (acceptor, donor, reserve)
 * @returns Updated domain data
 */
export async function assignDomainToSite(
  siteId: number,
  domainId: number,
  role?: 'acceptor' | 'donor' | 'reserve'
): Promise<void> {
  const payload: { domain_id: number; role?: string } = { domain_id: domainId };
  if (role) payload.role = role;

  console.log('[assignDomainToSite]', { siteId, domainId, role, payload, body: JSON.stringify(payload) });

  await apiFetch(`/sites/${siteId}/domains`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Remove domain from site (sets site_id = null, role = 'reserve')
 *
 * DELETE /sites/:id/domains/:domainId
 *
 * Note: Domain stays in project, only site_id becomes null.
 * Domain is then available for reassignment to other sites in same project.
 *
 * @param siteId - Site ID
 * @param domainId - Domain ID to remove
 */
export async function removeDomainFromSite(
  siteId: number,
  domainId: number
): Promise<void> {
  console.log('[removeDomainFromSite]', { siteId, domainId });

  await apiFetch(`/sites/${siteId}/domains/${domainId}`, {
    method: 'DELETE',
  });

  // Invalidate domain-related caches
  // Note: We can't invalidate project-specific caches here because we don't have project_id
  // The caller should handle project-specific cache invalidation
  const { invalidateCacheByPrefix } = await import('./cache');
  invalidateCacheByPrefix('domains');
  invalidateCacheByPrefix(`site:${siteId}`);
}

/**
 * Update domain role (acceptor, donor, reserve)
 *
 * PATCH /domains/:id
 *
 * @param domainId - Domain ID
 * @param role - New role: acceptor, donor, reserve
 */
export async function updateDomainRole(
  domainId: number,
  role: 'acceptor' | 'donor' | 'reserve'
): Promise<void> {
  console.log('[updateDomainRole]', { domainId, role });

  await apiFetch(`/domains/${domainId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

/**
 * Remove domain from project (unassign project_id, site_id, reset role to reserve)
 *
 * PATCH /domains/:id
 *
 * Sets project_id=null, site_id=null, role='reserve'.
 * Works for domains both with and without site_id.
 *
 * @param domainId - Domain ID
 */
export async function removeDomainFromProject(
  domainId: number
): Promise<void> {
  console.log('[removeDomainFromProject]', { domainId });

  await apiFetch(`/domains/${domainId}`, {
    method: 'PATCH',
    body: JSON.stringify({ project_id: null, site_id: null, role: 'reserve' }),
  });

  const { invalidateCacheByPrefix } = await import('./cache');
  invalidateCacheByPrefix('domains');
}

/**
 * @deprecated Use assignDomainToSite() instead. This is kept for backward compatibility with mock domains page.
 *
 * Legacy function for bulk actions on mock domains page.
 * Real implementation should use POST /sites/:id/domains
 */
export async function moveDomainToProject(
  accountId: number,
  domainId: number,
  projectId: number | null
): Promise<void> {
  console.warn('[moveDomainToProject] DEPRECATED - Use assignDomainToSite() instead');
  throw new Error('This function is deprecated. Use assignDomainToSite() for real implementation.');
}
