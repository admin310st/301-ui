/**
 * API client for Sites
 * Base URL: https://api.301.st/sites
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix } from './cache';
import { withInFlight } from './ui-client';
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
 * Get all sites for an account (aggregates from all projects)
 * Note: Backend doesn't have a global sites endpoint, so we fetch all projects first
 * @param accountId Account ID
 * @param status Optional status filter (active, paused, archived)
 * @returns Sites list with project info
 */
export async function getSites(accountId: number, status?: SiteStatus): Promise<Site[]> {
  // Check cache first (30 second TTL)
  const cacheKey = `sites:account:${accountId}${status ? `:${status}` : ''}`;
  const cached = getCached<Site[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API with in-flight guard to prevent duplicate requests
  return withInFlight(cacheKey, async () => {
    // Fetch all projects first
    const { getProjects } = await import('./projects');
    const projects = await getProjects(accountId);

    // Fetch sites for each project in parallel
    const allSitesArrays = await Promise.all(
      projects.map(project => getProjectSites(project.id, status))
    );

    // Flatten and combine all sites
    const allSites = allSitesArrays.flat();

    // Store in cache
    setCache(cacheKey, allSites);
    return allSites;
  });
}

/**
 * Get sites for a specific project
 * GET /projects/:id/sites
 * @param projectId Project ID
 * @param status Optional status filter (active, paused, archived)
 * @returns Sites list for the project
 */
export async function getProjectSites(
  projectId: number,
  status?: SiteStatus
): Promise<Site[]> {
  // Check cache first (30 second TTL)
  const cacheKey = `sites:project:${projectId}${status ? `:${status}` : ''}`;
  const cached = getCached<Site[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API with in-flight guard to prevent duplicate requests
  return withInFlight(cacheKey, async () => {
    const params = status ? new URLSearchParams({ status }) : undefined;
    const url = params
      ? `/projects/${projectId}/sites?${params}`
      : `/projects/${projectId}/sites`;
    const response = await apiFetch<GetSitesResponse>(url);

    // Add project_name to each site from response.project
    const sitesWithProjectName = response.sites.map(site => ({
      ...site,
      project_name: response.project.project_name,
    }));

    // Store in cache
    setCache(cacheKey, sitesWithProjectName);
    return sitesWithProjectName;
  });
}

/**
 * Get site details with attached domains
 * GET /sites/:id
 * @param siteId Site ID
 * @returns Site details with domains list
 */
export async function getSite(siteId: number): Promise<GetSiteResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `site:${siteId}`;
  const cached = getCached<GetSiteResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API with in-flight guard to prevent duplicate requests
  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetSiteResponse>(`/sites/${siteId}`);

    // Store in cache
    setCache(cacheKey, response);
    return response;
  });
}

/**
 * Create a new site in a project
 * POST /projects/:id/sites
 * @param projectId Project ID
 * @param data Site creation data
 * @returns Created site
 */
export async function createSite(
  projectId: number,
  data: CreateSiteRequest
): Promise<CreateSiteResponse> {
  const response = await apiFetch<CreateSiteResponse>(
    `/projects/${projectId}/sites`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  // Invalidate sites cache for this project and all accounts
  invalidateCacheByPrefix(`sites:project:${projectId}`);
  invalidateCacheByPrefix(`sites:account:`); // All account-level caches
  invalidateCacheByPrefix(`project:${projectId}`); // Project details include sites_count

  return response;
}

/**
 * Update site details
 * PATCH /sites/:id
 * @param siteId Site ID
 * @param data Updated fields
 */
export async function updateSite(
  siteId: number,
  data: UpdateSiteRequest
): Promise<void> {
  await apiFetch(`/sites/${siteId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  // Invalidate site cache
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix(`sites:`); // All sites caches
}

/**
 * Delete a site (domains become reserve with site_id = NULL)
 * DELETE /sites/:id
 * @param siteId Site ID
 */
export async function deleteSite(siteId: number): Promise<void> {
  await apiFetch(`/sites/${siteId}`, {
    method: 'DELETE',
  });

  // Invalidate all site-related caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix(`sites:`);
  invalidateCacheByPrefix('project:'); // Project details include sites_count
}

/**
 * Attach a domain to a site (assign tag)
 * POST /sites/:id/domains
 * @param siteId Site ID
 * @param domainId Domain ID
 * @returns Updated domain
 */
export async function attachDomain(
  siteId: number,
  domainId: number
): Promise<AttachDomainResponse> {
  const response = await apiFetch<AttachDomainResponse>(
    `/sites/${siteId}/domains`,
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
 * DELETE /sites/:id/domains/:domainId
 * @param siteId Site ID
 * @param domainId Domain ID
 */
export async function detachDomain(
  siteId: number,
  domainId: number
): Promise<void> {
  await apiFetch(`/sites/${siteId}/domains/${domainId}`, {
    method: 'DELETE',
  });

  // Invalidate site and domains caches
  invalidateCacheByPrefix(`site:${siteId}`);
  invalidateCacheByPrefix('domains:'); // Domain list may be affected
}
