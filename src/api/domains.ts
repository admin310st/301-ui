/**
 * Domains API client
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix } from './cache';
import type { GetDomainsResponse } from './types';

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
 * @returns List of all domains grouped by root domain
 */
export async function getDomains(): Promise<GetDomainsResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = 'domains:all';
  const cached = getCached<GetDomainsResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const response = await apiFetch<GetDomainsResponse>('/domains');

  // Store in cache
  setCache(cacheKey, response);
  return response;
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
  const response = await apiFetch<BatchZoneResponse>('/domains/zones/batch', {
    method: 'POST',
    body: JSON.stringify(data),
    showLoading: 'cf', // Orange shimmer for Cloudflare operations
  });

  // Invalidate domains cache after zone creation
  invalidateCacheByPrefix('domains:');

  return response;
}

/**
 * Move domain to a different project
 *
 * PATCH /accounts/:accountId/domains/:domainId
 *
 * @param accountId - Account ID
 * @param domainId - Domain ID
 * @param projectId - Target project ID
 * @returns Updated domain data
 */
export async function moveDomainToProject(
  accountId: number,
  domainId: number,
  projectId: number
): Promise<void> {
  await apiFetch(`/accounts/${accountId}/domains/${domainId}`, {
    method: 'PATCH',
    body: JSON.stringify({ project_id: projectId }),
  });

  // Invalidate domains and projects cache after moving domain
  invalidateCacheByPrefix('domains:');
  invalidateCacheByPrefix('projects:');
  invalidateCacheByPrefix('project:');
}
