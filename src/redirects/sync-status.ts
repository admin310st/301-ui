import type { Redirect } from './mock-data';
import { updateNavItemIndicators } from '@ui/sidebar-nav';

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
 * Only counts donors (domains with has_redirect: true)
 */
export function calculateSyncStats(redirects: Redirect[]): SyncStats {
  // Filter to only count donors (domains with configured redirects)
  const donors = redirects.filter((r) => r.has_redirect);

  const stats = {
    synced: 0,
    pending: 0,
    error: 0,
    total: donors.length,
    ratio: 0,
    lastSync: undefined as string | undefined,
  };

  let mostRecentSync: Date | null = null;

  donors.forEach((redirect) => {
    if (redirect.sync_status === 'synced') {
      stats.synced++;
      if (redirect.last_sync_at) {
        const syncDate = new Date(redirect.last_sync_at);
        if (!mostRecentSync || syncDate > mostRecentSync) {
          mostRecentSync = syncDate;
        }
      }
    } else if (redirect.sync_status === 'pending') {
      stats.pending++;
    } else if (redirect.sync_status === 'error') {
      stats.error++;
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
  console.log('[Sync] Fill updated to', fillValue);

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
  console.log('[Sync] Status set to', status);

  // Update tooltip
  const parts: string[] = [];
  if (stats.synced > 0) parts.push(`${stats.synced} synced`);
  if (stats.pending > 0) parts.push(`${stats.pending} pending`);
  if (stats.error > 0) parts.push(`${stats.error} error`);
  if (stats.lastSync) parts.push(`Last sync: ${stats.lastSync}`);

  const tooltip = parts.join(' • ') || 'No redirects configured';
  button.title = tooltip;
  console.log('[Sync] Tooltip:', tooltip);

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

/**
 * Trigger CF sync animation (orange sweep → green success)
 */
function triggerSyncAnimation(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-sync-chip] .sync-indicator-btn');
  if (!button) return;

  // Add syncing class to trigger animation
  button.classList.add('is-syncing');

  // After animation completes, set success status
  setTimeout(() => {
    button.classList.remove('is-syncing');
    // Simulate successful sync - set status to success (green)
    button.setAttribute('data-status', 'success');

    // After showing success for 2 seconds, return to normal status
    setTimeout(() => {
      button.setAttribute('data-status', 'pending'); // Or recalculate actual status
    }, 2000);
  }, 2000); // Match animation duration
}

/**
 * Initialize sync status indicator and action handlers
 * Note: Dropdown toggle is handled by initDropdowns() in redirects.ts
 */
export function initSyncStatus(redirects: Redirect[]): void {
  const dropdown = document.querySelector('[data-sync-chip]');
  const menu = dropdown?.querySelector<HTMLElement>('.dropdown__menu');

  if (!dropdown || !menu) return;

  // Calculate and update initial stats
  const stats = calculateSyncStats(redirects);
  console.log('[Sync] Stats calculated:', stats);
  updateSyncIndicator(stats);

  // Action handlers (dropdown toggle is handled by standard initDropdowns())
  menu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'sync-now':
        triggerSyncAnimation();
        // TODO: Implement actual CF sync API call
        break;

      case 'add-redirects':
        // TODO: Open bulk add drawer
        const event = new CustomEvent('open-redirect-drawer');
        document.dispatchEvent(event);
        break;

      case 'cancel-sync':
        // TODO: Implement cancel sync action
        break;
    }

    // Close dropdown after action
    dropdown.classList.remove('dropdown--open');
    menu.style.display = 'none';
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}
