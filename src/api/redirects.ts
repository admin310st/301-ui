/**
 * API client for Redirects
 * Base URL: https://api.301.st
 *
 * Key patterns:
 * - Templates/Presets: long TTL (24h), rarely change
 * - Site redirects: short TTL (30s), abortPrevious on site change
 * - Mutations: invalidate cache, UI does optimistic updates
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix, invalidateCache } from './cache';
import { withInFlight, abortPrevious } from './ui-client';
import type {
  RedirectTemplate,
  RedirectPreset,
  RedirectRule,
  RedirectZoneLimit,
  GetSiteRedirectsResponse,
  GetRedirectResponse,
  GetTemplatesResponse,
  GetPresetsResponse,
  CreateRedirectRequest,
  CreateRedirectResponse,
  UpdateRedirectRequest,
  ApplyPresetRequest,
  ApplyPresetResponse,
  ApplyRedirectsResponse,
  GetZoneLimitsResponse,
} from './types';

// =============================================================================
// Cache TTL Constants
// =============================================================================

const TTL_TEMPLATES = 24 * 60 * 60 * 1000; // 24 hours
const TTL_PRESETS = 24 * 60 * 60 * 1000; // 24 hours
const TTL_SITE_REDIRECTS = 30 * 1000; // 30 seconds
const TTL_REDIRECT_DETAIL = 30 * 1000; // 30 seconds
const TTL_ZONE_LIMITS = 15 * 1000; // 15 seconds

// =============================================================================
// Reference Data (long-lived, rarely change)
// =============================================================================

/**
 * Get available redirect templates (T1-T7)
 * TTL: 24 hours
 */
export async function getTemplates(): Promise<RedirectTemplate[]> {
  const cacheKey = 'redirects:templates:v1';
  const cached = getCached<RedirectTemplate[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetTemplatesResponse>('/redirects/templates', {
      showLoading: false, // Silent background load
    });
    setCache(cacheKey, response.templates, TTL_TEMPLATES);
    return response.templates;
  });
}

/**
 * Get available redirect presets (P1-P5)
 * TTL: 24 hours
 */
export async function getPresets(): Promise<RedirectPreset[]> {
  const cacheKey = 'redirects:presets:v1';
  const cached = getCached<RedirectPreset[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetPresetsResponse>('/redirects/presets', {
      showLoading: false, // Silent background load
    });
    setCache(cacheKey, response.presets, TTL_PRESETS);
    return response.presets;
  });
}

// =============================================================================
// Site Redirects (main working list)
// =============================================================================

/**
 * Get all domains with redirects for a site
 * TTL: 30 seconds
 * Supports abort on site change (last wins)
 *
 * @param siteId Site ID
 * @param options.force Skip cache (for explicit Refresh button)
 */
export async function getSiteRedirects(
  siteId: number,
  options: { force?: boolean } = {}
): Promise<GetSiteRedirectsResponse> {
  const cacheKey = `redirects:site:${siteId}:v1`;

  // Skip cache if force refresh
  if (!options.force) {
    const cached = getCached<GetSiteRedirectsResponse>(cacheKey);
    if (cached) return cached;
  }

  // Fetch with in-flight guard + abort support
  return withInFlight(cacheKey, async () => {
    // Abort previous request for this operation (last wins on site change)
    const signal = abortPrevious('redirects:listSite');

    const response = await apiFetch<GetSiteRedirectsResponse>(
      `/sites/${siteId}/redirects`,
      { signal, showLoading: 'brand' }
    );

    // Store in cache
    setCache(cacheKey, response, TTL_SITE_REDIRECTS);
    return response;
  });
}

/**
 * Get single redirect details
 * TTL: 30 seconds
 * Used for drawer when list data is insufficient
 */
export async function getRedirect(id: number): Promise<RedirectRule> {
  const cacheKey = `redirect:${id}:v1`;
  const cached = getCached<RedirectRule>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetRedirectResponse>(`/redirects/${id}`, {
      showLoading: false, // Silent load for drawer
    });
    setCache(cacheKey, response.redirect, TTL_REDIRECT_DETAIL);
    return response.redirect;
  });
}

// =============================================================================
// Mutations (with cache invalidation, UI does optimistic updates)
// =============================================================================

/**
 * Create redirect from template
 * Invalidates: site caches
 *
 * @param domainId Domain ID
 * @param data Template and params
 */
export async function createRedirect(
  domainId: number,
  data: CreateRedirectRequest
): Promise<CreateRedirectResponse> {
  const response = await apiFetch<CreateRedirectResponse>(
    `/domains/${domainId}/redirects`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      showLoading: 'brand',
    }
  );

  // Invalidate caches (UI updates optimistically, cache will refresh on TTL)
  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${response.redirect.id}:v1`);

  return response;
}

/**
 * Create redirects from preset (multiple rules at once)
 * Invalidates: site caches
 *
 * @param domainId Domain ID
 * @param data Preset ID and params
 */
export async function applyPreset(
  domainId: number,
  data: ApplyPresetRequest
): Promise<ApplyPresetResponse> {
  const response = await apiFetch<ApplyPresetResponse>(
    `/domains/${domainId}/redirects/preset`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      showLoading: 'brand',
    }
  );

  // Invalidate site caches
  invalidateCacheByPrefix('redirects:site:');

  return response;
}

/**
 * Update redirect
 * Invalidates: site caches, redirect detail cache
 *
 * @param id Redirect ID
 * @param data Updated fields
 */
export async function updateRedirect(
  id: number,
  data: UpdateRedirectRequest
): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    showLoading: 'brand',
  });

  // Invalidate caches
  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${id}:v1`);
}

/**
 * Delete redirect
 * Invalidates: site caches, redirect detail cache
 *
 * @param id Redirect ID
 */
export async function deleteRedirect(id: number): Promise<void> {
  await apiFetch(`/redirects/${id}`, {
    method: 'DELETE',
    showLoading: 'brand',
  });

  // Invalidate caches
  invalidateCacheByPrefix('redirects:site:');
  invalidateCache(`redirect:${id}:v1`);
}

// =============================================================================
// Zone Operations (Cloudflare sync)
// =============================================================================

/**
 * Apply all redirects for a zone to Cloudflare
 * Invalidates: site caches, zone status cache
 *
 * @param zoneId Zone ID
 */
export async function applyZoneRedirects(zoneId: number): Promise<ApplyRedirectsResponse> {
  const response = await apiFetch<ApplyRedirectsResponse>(
    `/zones/${zoneId}/apply-redirects`,
    {
      method: 'POST',
      showLoading: 'cf', // Orange shimmer for CF operations
    }
  );

  // Invalidate caches
  invalidateCacheByPrefix('redirects:site:'); // Site may contain multiple zones
  invalidateCache(`redirects:zone:${zoneId}:status:v1`);

  return response;
}

/**
 * Get zone redirect limits and status
 * TTL: 15 seconds
 * Used for: zone limits widget, pre-validation before create
 *
 * @param zoneId Zone ID
 */
export async function getZoneLimits(zoneId: number): Promise<GetZoneLimitsResponse> {
  const cacheKey = `redirects:zone:${zoneId}:status:v1`;
  const cached = getCached<GetZoneLimitsResponse>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    // Abort previous request for this zone (fast switching)
    const signal = abortPrevious(`redirects:zoneStatus:${zoneId}`);

    const response = await apiFetch<GetZoneLimitsResponse>(
      `/zones/${zoneId}/redirect-limits`,
      { signal, showLoading: false }
    );

    // Store in cache (short TTL - status changes frequently)
    setCache(cacheKey, response, TTL_ZONE_LIMITS);
    return response;
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Invalidate all redirect-related caches
 * Use after bulk operations or on logout
 */
export function invalidateAllRedirectCaches(): void {
  invalidateCacheByPrefix('redirects:');
  invalidateCacheByPrefix('redirect:');
}
