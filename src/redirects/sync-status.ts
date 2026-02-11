import type { ExtendedRedirectDomain } from './state';
import { updateNavItemIndicators } from '@ui/sidebar-nav';
import { applyZoneRedirects } from '@api/redirects';
import { safeCall } from '@api/ui-client';
import { getState, markZoneSynced, refreshRedirects } from './state';
import { showGlobalNotice } from '@ui/globalNotice';

export interface SyncStats {
  synced: number;
  pending: number;
  error: number;
  total: number;
  ratio: number;
  lastSync?: string;
}

/**
 * Calculate sync statistics from redirect data
 * Only counts domains with a redirect rule (main or canonical)
 * Excludes paused/archived sites from counts
 */
export function calculateSyncStats(redirects: ExtendedRedirectDomain[]): SyncStats {
  // Filter to domains with any redirect (main or canonical T3/T4)
  // Exclude paused/archived sites from sync statistics
  const withRedirects = redirects.filter((r) =>
    (r.redirect || r.canonical_redirect) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );

  const stats = {
    synced: 0,
    pending: 0,
    error: 0,
    total: 0,
    ratio: 0,
    lastSync: undefined as string | undefined,
  };

  let mostRecentSync: Date | null = null;

  withRedirects.forEach((domain) => {
    // Count main redirect if present
    if (domain.redirect) {
      stats.total++;
      if (domain.redirect.sync_status === 'synced') {
        stats.synced++;
        if (domain.redirect.updated_at) {
          const syncDate = new Date(domain.redirect.updated_at);
          if (!mostRecentSync || syncDate > mostRecentSync) {
            mostRecentSync = syncDate;
          }
        }
      } else if (domain.redirect.sync_status === 'pending') {
        stats.pending++;
      } else if (domain.redirect.sync_status === 'error') {
        stats.error++;
      }
    }

    // Count canonical redirect (T3/T4) if present
    const canonical = domain.canonical_redirect;
    if (canonical) {
      stats.total++;
      if (canonical.sync_status === 'synced') {
        stats.synced++;
        if (canonical.updated_at) {
          const syncDate = new Date(canonical.updated_at);
          if (!mostRecentSync || syncDate > mostRecentSync) {
            mostRecentSync = syncDate;
          }
        }
      } else if (canonical.sync_status === 'pending') {
        stats.pending++;
      } else if (canonical.sync_status === 'error') {
        stats.error++;
      }
    }
  });

  stats.ratio = stats.total > 0 ? stats.synced / stats.total : 0;

  // Format last sync time
  if (mostRecentSync) {
    const now = new Date();
    const diffMs = now.getTime() - mostRecentSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      stats.lastSync = `${diffMins} min ago`;
    } else if (diffHours < 24) {
      stats.lastSync = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      stats.lastSync = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  }

  return stats;
}

/**
 * Update sync status indicator UI (header button with progress bar)
 */
export function updateSyncIndicator(stats: SyncStats): void {
  const button = document.querySelector<HTMLButtonElement>('[data-sync-chip] button');
  const fill = document.querySelector<HTMLElement>('.sync-indicator-btn .metric-pill__fill');

  if (!button || !fill) {
    console.warn('[Sync] Indicator elements not found', { button, fill });
    return;
  }

  // Update fill ratio
  const fillValue = stats.ratio.toFixed(2);
  fill.style.setProperty('--metric-fill', fillValue);

  // Update status attribute for color
  // success = green (100% synced), pending = orange, error = red
  let status: 'success' | 'pending' | 'error' = 'pending';
  if (stats.error > 0) {
    status = 'error';
  } else if (stats.pending > 0) {
    status = 'pending';
  } else if (stats.ratio === 1 && stats.total > 0) {
    status = 'success'; // All donors synced → green
  }
  button.setAttribute('data-status', status);

  // Update tooltip
  const parts: string[] = [];
  if (stats.synced > 0) parts.push(`${stats.synced} synced`);
  if (stats.pending > 0) parts.push(`${stats.pending} pending`);
  if (stats.error > 0) parts.push(`${stats.error} error`);
  if (stats.lastSync) parts.push(`Last sync: ${stats.lastSync}`);

  const tooltip = parts.join(' • ') || 'No redirects configured';
  button.title = tooltip;

  // Also update sidebar indicator
  updateSidebarSyncIndicator(stats);
}

/**
 * Update sidebar navigation indicator for redirects
 */
export function updateSidebarSyncIndicator(stats: SyncStats): void {
  // Determine notification icon color based on sync status
  let iconColor: 'success' | 'warning' | 'danger' | null = null;
  let title = '';

  if (stats.total === 0) {
    // No redirects configured - no indicator
    iconColor = null;
  } else if (stats.error > 0) {
    iconColor = 'danger';
    title = `${stats.error} redirect${stats.error > 1 ? 's' : ''} failed to sync`;
  } else if (stats.pending > 0) {
    iconColor = 'warning';
    title = `${stats.pending} redirect${stats.pending > 1 ? 's' : ''} pending sync`;
  } else if (stats.ratio === 1) {
    iconColor = 'success';
    title = 'All redirects synced';
  }

  updateNavItemIndicators('redirects', {
    badge: stats.total > 0 ? stats.total : null,
    notificationIcon: iconColor,
    notificationTitle: title,
  });
}



/** Whether event listeners have been bound (prevents duplicates) */
let listenersBound = false;

/** Whether a sync operation is in progress (prevents re-entry) */
let isSyncing = false;

/**
 * Initialize sync status indicator and action handlers
 * Safe to call multiple times — listeners are bound only once,
 * stats are recalculated on every call.
 * Note: Dropdown toggle is handled by initDropdowns() in redirects.ts
 */
export function initSyncStatus(redirects: ExtendedRedirectDomain[]): void {
  const dropdown = document.querySelector('[data-sync-chip]');
  const menu = dropdown?.querySelector<HTMLElement>('.dropdown__menu');

  if (!dropdown || !menu) return;

  // Always recalculate stats
  const stats = calculateSyncStats(redirects);
  updateSyncIndicator(stats);

  // Bind action handlers ONCE (idempotent)
  if (listenersBound) return;
  listenersBound = true;

  menu.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;

    // Close dropdown after action
    dropdown.classList.remove('dropdown--open');
    menu.style.display = 'none';
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');

    switch (action) {
      case 'sync-all':
        await handleSyncAll();
        break;

      case 'add-redirects': {
        const event = new CustomEvent('open-redirect-drawer');
        document.dispatchEvent(event);
        break;
      }

      case 'cancel-sync':
        // Not implemented - sync is fast enough
        break;
    }
  });
}

/**
 * Sync only zones that have pending or error redirects to Cloudflare
 * Skips zones where all redirects are already synced.
 * Paused/archived sites are excluded.
 * Protected against re-entry (double-click, duplicate listeners).
 */
async function handleSyncAll(): Promise<void> {
  // Re-entry guard
  if (isSyncing) return;
  isSyncing = true;

  const state = getState();

  // Only collect zones that actually need syncing (pending or error)
  // Includes both main redirects and canonical redirects (T3/T4)
  const zoneIds = new Set<number>();
  for (const domain of state.domains) {
    if (
      domain.zone_id &&
      domain.site_status !== 'paused' &&
      domain.site_status !== 'archived'
    ) {
      const mainNeedsSync = domain.redirect &&
        (domain.redirect.sync_status === 'pending' || domain.redirect.sync_status === 'error');
      const canonicalNeedsSync = domain.canonical_redirect &&
        (domain.canonical_redirect.sync_status === 'pending' || domain.canonical_redirect.sync_status === 'error');
      if (mainNeedsSync || canonicalNeedsSync) {
        zoneIds.add(domain.zone_id);
      }
    }
  }

  if (zoneIds.size === 0) {
    showGlobalNotice('info', 'All redirects are already synced');
    isSyncing = false;
    return;
  }

  // Update button to show syncing state
  const button = document.querySelector<HTMLButtonElement>('[data-sync-chip] .sync-indicator-btn');
  if (button) {
    button.classList.add('is-syncing');
  }

  try {
    let totalSynced = 0;

    for (const zoneId of zoneIds) {
      const response = await safeCall(() => applyZoneRedirects(zoneId), { lockKey: `zone:sync:${zoneId}`, retryOn401: true });
      const syncedIds = response.synced_rules?.map(r => r.id) || [];
      markZoneSynced(zoneId, syncedIds);
      totalSynced += response.rules_applied || 0;
    }

    // Refresh state to get latest data
    await refreshRedirects();

    // Show success
    if (button) {
      button.classList.remove('is-syncing');
      button.setAttribute('data-status', 'success');
      setTimeout(() => {
        // Recalculate status after showing success
        const newStats = calculateSyncStats(state.domains);
        updateSyncIndicator(newStats);
      }, 2000);
    }

    showGlobalNotice('success', `Synced ${zoneIds.size} zone(s): ${totalSynced} redirect(s) applied`);
  } catch (error: any) {
    console.error('[Sync] Error:', error);

    if (button) {
      button.classList.remove('is-syncing');
      button.setAttribute('data-status', 'error');
    }

    showGlobalNotice('error', error.message || 'Failed to sync to Cloudflare');
  } finally {
    isSyncing = false;
  }
}
