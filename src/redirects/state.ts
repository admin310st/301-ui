/**
 * Redirects state management
 * Single source of truth for redirects page
 *
 * Works with RedirectDomain[] (domains with nested redirect | null)
 * from GET /sites/:siteId/redirects
 */

import type {
  RedirectDomain,
  RedirectRule,
  RedirectZoneLimit,
  DomainRole,
} from '@api/types';
import { getSiteRedirects } from '@api/redirects';

// =============================================================================
// State Interface
// =============================================================================

export interface RedirectsState {
  /** Currently selected site ID */
  currentSiteId: number | null;
  /** Site name for display */
  siteName: string;
  /** All domains of the site (with redirect or null) */
  domains: RedirectDomain[];
  /** Zone limits for CF redirect rules */
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
  currentSiteId: null,
  siteName: '',
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
 * Load domains/redirects for a site
 * @param siteId Site ID
 * @param options.force Skip cache (for explicit Refresh button)
 */
export async function loadSiteRedirects(
  siteId: number,
  options: { force?: boolean } = {}
): Promise<void> {
  // Update loading state
  state = {
    ...state,
    loading: true,
    error: null,
    currentSiteId: siteId,
  };
  notifyListeners();

  try {
    const response = await getSiteRedirects(siteId, options);

    state = {
      ...state,
      siteName: response.site_name,
      domains: response.domains,
      zoneLimits: response.zone_limits,
      totalDomains: response.total_domains,
      totalRedirects: response.total_redirects,
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
 * Refresh current site redirects (force cache skip)
 */
export async function refreshRedirects(): Promise<void> {
  if (!state.currentSiteId) return;
  await loadSiteRedirects(state.currentSiteId, { force: true });
}

// =============================================================================
// Optimistic Updates
// =============================================================================

/**
 * Find domain by ID
 */
function findDomain(domainId: number): RedirectDomain | undefined {
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
  const redirectId = domain.redirect.id;

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
    currentSiteId: null,
    siteName: '',
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
export function getDomainsWithRedirects(): RedirectDomain[] {
  return state.domains.filter(d => d.redirect !== null);
}

/**
 * Get domains without redirects (reserve)
 */
export function getReserveDomains(): RedirectDomain[] {
  return state.domains.filter(d => d.redirect === null);
}

/**
 * Get acceptor domain (primary target)
 */
export function getAcceptorDomain(): RedirectDomain | undefined {
  return state.domains.find(d => d.domain_role === 'acceptor');
}

/**
 * Get donor domains (have redirects)
 */
export function getDonorDomains(): RedirectDomain[] {
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
 * Get domains sorted by role (acceptor first, then donors, then reserve)
 */
export function getSortedDomains(): RedirectDomain[] {
  return [...state.domains].sort((a, b) => {
    // Acceptor first
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
