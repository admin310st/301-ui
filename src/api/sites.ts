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
 * Get all sites for a project
 * @param projectId Project ID
 * @param status Optional status filter (active, paused, archived)
 * @returns Sites list with project info
 */
export async function getSites(projectId: number, status?: SiteStatus): Promise<GetSitesResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `sites:project:${projectId}${status ? `:${status}` : ''}`;
  const cached = getCached<GetSitesResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const params = status ? new URLSearchParams({ status }) : undefined;
  const url = params
    ? `/projects/${projectId}/sites?${params}`
    : `/projects/${projectId}/sites`;
  const response = await apiFetch<GetSitesResponse>(url);

  // Store in cache
  setCache(cacheKey, response);
  return response;
}

/**
 * Get site details with attached domains
 * @param id Site ID
 * @returns Site details with domains list
 */
export async function getSite(id: number): Promise<GetSiteResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `site:${id}`;
  const cached = getCached<GetSiteResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const response = await apiFetch<GetSiteResponse>(`${BASE_URL}/${id}`);

  // Store in cache
  setCache(cacheKey, response);
  return response;
}

/**
 * Create a new site in a project
 * @param projectId Project ID
 * @param data Site creation data
 * @returns Created site
 */
export async function createSite(
  projectId: number,
  data: CreateSiteRequest
): Promise<CreateSiteResponse> {
  const response = await apiFetch<CreateSiteResponse>(`/projects/${projectId}/sites`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Invalidate sites cache for this project
  invalidateCacheByPrefix(`sites:project:${projectId}`);
  invalidateCacheByPrefix(`project:${projectId}`); // Project details include sites_count

  return response;
}

/**
 * Update site details
 * @param id Site ID
 * @param data Updated fields
 */
export async function updateSite(id: number, data: UpdateSiteRequest): Promise<void> {
  await apiFetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  // Invalidate site cache
  invalidateCacheByPrefix(`site:${id}`);
  invalidateCacheByPrefix(`sites:`); // All sites caches
}

/**
 * Delete a site (domains become reserve with site_id = NULL)
 * @param id Site ID
 */
export async function deleteSite(id: number): Promise<void> {
  await apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  // Invalidate all site-related caches
  invalidateCacheByPrefix(`site:${id}`);
  invalidateCacheByPrefix(`sites:`);
  invalidateCacheByPrefix('project:'); // Project details include sites_count
}

/**
 * Attach a domain to a site (assign tag)
 * @param siteId Site ID
 * @param data Domain attachment data
 * @returns Updated domain
 */
export async function attachDomain(
  siteId: number,
  data: AttachDomainRequest
): Promise<AttachDomainResponse> {
  const response = await apiFetch<AttachDomainResponse>(`${BASE_URL}/${siteId}/domains`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Invalidate site and domains caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix('domains:'); // Domain list may be affected

  return response;
}

/**
 * Detach a domain from a site (remove tag, domain becomes reserve)
 * @param siteId Site ID
 * @param domainId Domain ID
 */
export async function detachDomain(siteId: number, domainId: number): Promise<void> {
  await apiFetch(`${BASE_URL}/${siteId}/domains/${domainId}`, {
    method: 'DELETE',
  });

  // Invalidate site and domains caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix('domains:'); // Domain list may be affected
}
