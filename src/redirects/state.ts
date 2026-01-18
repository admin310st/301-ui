/**
 * Redirects state management
 * Single source of truth for redirects page
 *
 * Supports multi-site selection:
 * - Works with RedirectDomain[] from GET /sites/:siteId/redirects
 * - Aggregates domains from multiple selected sites
 * - Domains are extended with site_id, site_name for grouping
 */

import type {
  RedirectDomain,
  RedirectRule,
  RedirectZoneLimit,
  DomainRole,
} from '@api/types';
import { getSiteRedirects } from '@api/redirects';

// =============================================================================
// Types
// =============================================================================

/**
 * Site context info passed from site selector
 */
export interface SiteContext {
  siteId: number;
  siteName: string;
  projectId: number;
  projectName: string;
}

/**
 * Extended domain with site context (for multi-site view)
 */
export interface ExtendedRedirectDomain extends RedirectDomain {
  site_id: number;
  site_name: string;
}

// =============================================================================
// State Interface
// =============================================================================

export interface RedirectsState {
  /** Currently selected site IDs (multi-select) */
  selectedSiteIds: number[];
  /** Site contexts for all selected sites */
  siteContexts: SiteContext[];
  /** Project ID (from project selector) */
  projectId: number | null;
  /** Project name (from project selector) */
  projectName: string;
  /** All domains from ALL selected sites (with site_id, site_name) */
  domains: ExtendedRedirectDomain[];
  /** Zone limits for CF redirect rules (aggregated) */
  zoneLimits: RedirectZoneLimit[];
  /** Total domains count */
  totalDomains: number;
  /** Total redirects count (domains with redirect != null) */
  totalRedirects: number;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Timestamp of last successful load */
  lastLoadedAt: number | null;
}

// =============================================================================
// State Singleton
// =============================================================================

let state: RedirectsState = {
  selectedSiteIds: [],
  siteContexts: [],
  projectId: null,
  projectName: '',
  domains: [],
  zoneLimits: [],
  totalDomains: 0,
  totalRedirects: 0,
  loading: false,
  error: null,
  lastLoadedAt: null,
};

// =============================================================================
// Listeners (reactive updates)
// =============================================================================

type StateListener = (state: RedirectsState) => void;
const listeners: StateListener[] = [];

function notifyListeners(): void {
  listeners.forEach(fn => fn(state));
}

/**
 * Subscribe to state changes
 * @returns Unsubscribe function
 */
export function onStateChange(fn: StateListener): () => void {
  listeners.push(fn);
  // Call immediately with current state
  fn(state);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Get current state (readonly snapshot)
 */
export function getState(): Readonly<RedirectsState> {
  return state;
}

// =============================================================================
// Actions (load data)
// =============================================================================

/**
 * Load domains/redirects for multiple sites
 * @param contexts Site contexts with project info (from site selector)
 * @param options.force Skip cache (for explicit Refresh button)
 */
export async function loadSitesRedirects(
  contexts: SiteContext[],
  options: { force?: boolean } = {}
): Promise<void> {
  if (contexts.length === 0) {
    clearState();
    return;
  }

  // Update loading state
  state = {
    ...state,
    loading: true,
    error: null,
    selectedSiteIds: contexts.map(c => c.siteId),
    siteContexts: contexts,
    projectId: contexts[0].projectId,
    projectName: contexts[0].projectName,
  };
  notifyListeners();

  try {
    // Load redirects from all sites in parallel
    const responses = await Promise.all(
      contexts.map(ctx =>
        getSiteRedirects(ctx.siteId, options)
          .then(response => ({
            ...response,
            siteContext: ctx,
          }))
      )
    );

    // Aggregate domains from all sites
    const allDomains: ExtendedRedirectDomain[] = [];
    const allZoneLimits: RedirectZoneLimit[] = [];
    let totalDomains = 0;
    let totalRedirects = 0;

    for (const response of responses) {
      // Add site_id and site_name to each domain
      const domainsWithSite = response.domains.map(d => ({
        ...d,
        site_id: response.siteContext.siteId,
        site_name: response.siteContext.siteName,
      }));
      allDomains.push(...domainsWithSite);

      // Aggregate zone limits (deduplicate by zone_id)
      for (const limit of response.zone_limits) {
        if (!allZoneLimits.find(z => z.zone_id === limit.zone_id)) {
          allZoneLimits.push(limit);
        }
      }

      totalDomains += response.total_domains;
      totalRedirects += response.total_redirects;
    }

    state = {
      ...state,
      domains: allDomains,
      zoneLimits: allZoneLimits,
      totalDomains,
      totalRedirects,
      loading: false,
      lastLoadedAt: Date.now(),
    };
    notifyListeners();
  } catch (error: any) {
    // Handle abort (not an error)
    if (error.code === 'ABORTED') {
      return;
    }

    state = {
      ...state,
      loading: false,
      error: error.message || 'Failed to load redirects',
    };
    notifyListeners();
  }
}

/**
 * Legacy single-site load (for backwards compatibility)
 */
export async function loadSiteRedirects(
  context: SiteContext,
  options: { force?: boolean } = {}
): Promise<void> {
  await loadSitesRedirects([context], options);
}

/**
 * Refresh current sites redirects (force cache skip)
 */
export async function refreshRedirects(): Promise<void> {
  if (state.siteContexts.length === 0) return;
  await loadSitesRedirects(state.siteContexts, { force: true });
}

// =============================================================================
// Optimistic Updates
// =============================================================================

/**
 * Find domain by ID
 */
function findDomain(domainId: number): ExtendedRedirectDomain | undefined {
  return state.domains.find(d => d.domain_id === domainId);
}

/**
 * Update redirect in domain (optimistic)
 * Used after PATCH /redirects/:id
 */
export function updateDomainRedirect(
  domainId: number,
  updates: Partial<RedirectRule>
): void {
  const domain = findDomain(domainId);
  if (!domain?.redirect) return;

  // Apply updates to redirect
  domain.redirect = { ...domain.redirect, ...updates };

  // If enabled/params changed, mark as pending
  if ('enabled' in updates || 'params' in updates) {
    domain.redirect.sync_status = 'pending';
  }

  // Create new state reference
  state = { ...state, domains: [...state.domains] };
  notifyListeners();
}

/**
 * Remove redirect from domain (optimistic)
 * Used after DELETE /redirects/:id
 * Domain stays in list with redirect: null, role: 'reserve'
 */
export function removeRedirectFromDomain(domainId: number): void {
  const domain = findDomain(domainId);
  if (!domain?.redirect) return;

  const zoneId = domain.zone_id;

  // Clear redirect, set role to reserve
  domain.redirect = null;
  domain.domain_role = 'reserve';

  // Update zone limit (decrement used)
  if (zoneId) {
    const zoneLimit = state.zoneLimits.find(z => z.zone_id === zoneId);
    if (zoneLimit && zoneLimit.used > 0) {
      zoneLimit.used--;
    }
  }

  // Update counts
  state = {
    ...state,
    domains: [...state.domains],
    zoneLimits: [...state.zoneLimits],
    totalRedirects: Math.max(0, state.totalRedirects - 1),
  };
  notifyListeners();
}

/**
 * Add redirect to domain (optimistic)
 * Used after POST /domains/:domainId/redirects
 */
export function addRedirectToDomain(
  domainId: number,
  redirect: RedirectRule,
  newRole: DomainRole = 'donor'
): void {
  const domain = findDomain(domainId);
  if (!domain) return;

  // Set redirect and role
  domain.redirect = redirect;
  domain.domain_role = newRole;

  // Update zone limit (increment used)
  if (domain.zone_id) {
    const zoneLimit = state.zoneLimits.find(z => z.zone_id === domain.zone_id);
    if (zoneLimit) {
      zoneLimit.used++;
    }
  }

  // Update counts
  state = {
    ...state,
    domains: [...state.domains],
    zoneLimits: [...state.zoneLimits],
    totalRedirects: state.totalRedirects + 1,
  };
  notifyListeners();
}

/**
 * Bulk update enabled status (optimistic)
 * Used after multiple PATCH /redirects/:id calls
 */
export function bulkUpdateEnabled(domainIds: number[], enabled: boolean): void {
  let changed = false;

  state.domains.forEach(domain => {
    if (domainIds.includes(domain.domain_id) && domain.redirect) {
      domain.redirect.enabled = enabled;
      domain.redirect.sync_status = 'pending';
      changed = true;
    }
  });

  if (changed) {
    state = { ...state, domains: [...state.domains] };
    notifyListeners();
  }
}

/**
 * Mark zone as synced (optimistic)
 * Used after POST /zones/:id/apply-redirects
 */
export function markZoneSynced(zoneId: number, syncedRedirectIds: number[]): void {
  let changed = false;

  state.domains.forEach(domain => {
    if (domain.zone_id === zoneId && domain.redirect) {
      if (syncedRedirectIds.includes(domain.redirect.id)) {
        domain.redirect.sync_status = 'synced';
        changed = true;
      }
    }
  });

  if (changed) {
    state = { ...state, domains: [...state.domains] };
    notifyListeners();
  }
}

/**
 * Clear state (on logout or page leave)
 */
export function clearState(): void {
  state = {
    selectedSiteIds: [],
    siteContexts: [],
    projectId: null,
    projectName: '',
    domains: [],
    zoneLimits: [],
    totalDomains: 0,
    totalRedirects: 0,
    loading: false,
    error: null,
    lastLoadedAt: null,
  };
  notifyListeners();
}

// =============================================================================
// Selectors (computed values)
// =============================================================================

/**
 * Get domains with redirects only
 */
export function getDomainsWithRedirects(): ExtendedRedirectDomain[] {
  return state.domains.filter(d => d.redirect !== null);
}

/**
 * Get domains without redirects (reserve)
 */
export function getReserveDomains(): ExtendedRedirectDomain[] {
  return state.domains.filter(d => d.redirect === null);
}

/**
 * Get acceptor domains (one per site)
 */
export function getAcceptorDomains(): ExtendedRedirectDomain[] {
  return state.domains.filter(d => d.domain_role === 'acceptor');
}

/**
 * Get acceptor domain for a specific site
 */
export function getAcceptorDomain(siteId?: number): ExtendedRedirectDomain | undefined {
  if (siteId !== undefined) {
    return state.domains.find(d => d.site_id === siteId && d.domain_role === 'acceptor');
  }
  return state.domains.find(d => d.domain_role === 'acceptor');
}

/**
 * Get donor domains (have redirects)
 */
export function getDonorDomains(): ExtendedRedirectDomain[] {
  return state.domains.filter(d => d.domain_role === 'donor');
}

/**
 * Get pending sync count
 */
export function getPendingSyncCount(): number {
  return state.domains.filter(d => d.redirect?.sync_status === 'pending').length;
}

/**
 * Get error sync count
 */
export function getErrorSyncCount(): number {
  return state.domains.filter(d => d.redirect?.sync_status === 'error').length;
}

/**
 * Get synced count
 */
export function getSyncedCount(): number {
  return state.domains.filter(d => d.redirect?.sync_status === 'synced').length;
}

/**
 * Get domains sorted by site, then by role (acceptor first, then donors, then reserve)
 */
export function getSortedDomains(): ExtendedRedirectDomain[] {
  return [...state.domains].sort((a, b) => {
    // First sort by site_id to group by site
    if (a.site_id !== b.site_id) {
      return a.site_id - b.site_id;
    }

    // Acceptor first within site
    if (a.domain_role === 'acceptor') return -1;
    if (b.domain_role === 'acceptor') return 1;

    // Donors (with redirects) before reserve
    if (a.redirect && !b.redirect) return -1;
    if (!a.redirect && b.redirect) return 1;

    // Alphabetical within same category
    return a.domain_name.localeCompare(b.domain_name);
  });
}

/**
 * Check if there are any pending changes
 */
export function hasPendingChanges(): boolean {
  return getPendingSyncCount() > 0;
}

/**
 * Check if there are any sync errors
 */
export function hasSyncErrors(): boolean {
  return getErrorSyncCount() > 0;
}
