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
  name_servers: string[];
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
 * Move domain to a different project
 *
 * PATCH /domains/:id
 *
 * @param accountId - Account ID (not used in URL, kept for signature compatibility)
 * @param domainId - Domain ID
 * @param projectId - Target project ID (null to remove from project)
 * @returns Updated domain data
 */
export async function moveDomainToProject(
  accountId: number,
  domainId: number,
  projectId: number | null
): Promise<void> {
  await apiFetch(`/domains/${domainId}`, {
    method: 'PATCH',
    body: JSON.stringify({ project_id: projectId }),
  });
}
