/**
 * API client for Sites
 * Base URL: https://api.301.st/sites
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix } from './cache';
import type {
  Site,
  SiteDomain,
  GetSitesResponse,
  GetSiteResponse,
  CreateSiteRequest,
  CreateSiteResponse,
  UpdateSiteRequest,
  AttachDomainRequest,
  AttachDomainResponse,
  SiteStatus,
} from './types';

const BASE_URL = '/sites';

/**
 * Get all sites for an account (global list across all projects)
 * @param accountId Account ID
 * @param status Optional status filter (active, paused, archived)
 * @returns Sites list with project info
 */
export async function getSites(accountId: number, status?: SiteStatus): Promise<GetSitesResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `sites:account:${accountId}${status ? `:${status}` : ''}`;
  const cached = getCached<GetSitesResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const params = status ? new URLSearchParams({ status }) : undefined;
  const url = params
    ? `/accounts/${accountId}/sites?${params}`
    : `/accounts/${accountId}/sites`;
  const response = await apiFetch<GetSitesResponse>(url);

  // Store in cache
  setCache(cacheKey, response);
  return response;
}

/**
 * Get sites for a specific project
 * @param accountId Account ID
 * @param projectId Project ID
 * @param status Optional status filter (active, paused, archived)
 * @returns Sites list for the project
 */
export async function getProjectSites(
  accountId: number,
  projectId: number,
  status?: SiteStatus
): Promise<GetSitesResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `sites:project:${projectId}${status ? `:${status}` : ''}`;
  const cached = getCached<GetSitesResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const params = status ? new URLSearchParams({ status }) : undefined;
  const url = params
    ? `/accounts/${accountId}/projects/${projectId}/sites?${params}`
    : `/accounts/${accountId}/projects/${projectId}/sites`;
  const response = await apiFetch<GetSitesResponse>(url);

  // Store in cache
  setCache(cacheKey, response);
  return response;
}

/**
 * Get site details with attached domains
 * @param accountId Account ID
 * @param siteId Site ID
 * @returns Site details with domains list
 */
export async function getSite(accountId: number, siteId: number): Promise<GetSiteResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `site:${siteId}`;
  const cached = getCached<GetSiteResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const response = await apiFetch<GetSiteResponse>(`/accounts/${accountId}/sites/${siteId}`);

  // Store in cache
  setCache(cacheKey, response);
  return response;
}

/**
 * Create a new site in a project
 * @param accountId Account ID
 * @param projectId Project ID
 * @param data Site creation data
 * @returns Created site
 */
export async function createSite(
  accountId: number,
  projectId: number,
  data: CreateSiteRequest
): Promise<CreateSiteResponse> {
  const response = await apiFetch<CreateSiteResponse>(
    `/accounts/${accountId}/projects/${projectId}/sites`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  // Invalidate sites cache for this project and account
  invalidateCacheByPrefix(`sites:project:${projectId}`);
  invalidateCacheByPrefix(`sites:account:${accountId}`);
  invalidateCacheByPrefix(`project:${projectId}`); // Project details include sites_count

  return response;
}

/**
 * Update site details
 * @param accountId Account ID
 * @param siteId Site ID
 * @param data Updated fields
 */
export async function updateSite(
  accountId: number,
  siteId: number,
  data: UpdateSiteRequest
): Promise<void> {
  await apiFetch(`/accounts/${accountId}/sites/${siteId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  // Invalidate site cache
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix(`sites:`); // All sites caches
}

/**
 * Delete a site (domains become reserve with site_id = NULL)
 * @param accountId Account ID
 * @param siteId Site ID
 */
export async function deleteSite(accountId: number, siteId: number): Promise<void> {
  await apiFetch(`/accounts/${accountId}/sites/${siteId}`, {
    method: 'DELETE',
  });

  // Invalidate all site-related caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix(`sites:`);
  invalidateCacheByPrefix('project:'); // Project details include sites_count
}

/**
 * Attach a domain to a site (assign tag)
 * @param accountId Account ID
 * @param siteId Site ID
 * @param domainId Domain ID
 * @returns Updated domain
 */
export async function attachDomain(
  accountId: number,
  siteId: number,
  domainId: number
): Promise<AttachDomainResponse> {
  const response = await apiFetch<AttachDomainResponse>(
    `/accounts/${accountId}/sites/${siteId}/domains`,
    {
      method: 'POST',
      body: JSON.stringify({ domain_id: domainId }),
    }
  );

  // Invalidate site and domains caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix('domains:'); // Domain list may be affected

  return response;
}

/**
 * Detach a domain from a site (remove tag, domain becomes reserve)
 * @param accountId Account ID
 * @param siteId Site ID
 * @param domainId Domain ID
 */
export async function detachDomain(
  accountId: number,
  siteId: number,
  domainId: number
): Promise<void> {
  await apiFetch(`/accounts/${accountId}/sites/${siteId}/domains/${domainId}`, {
    method: 'DELETE',
  });

  // Invalidate site and domains caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix('domains:'); // Domain list may be affected
}
