import type { Redirect } from './mock-data';

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
 */
export function calculateSyncStats(redirects: Redirect[]): SyncStats {
  const stats = {
    synced: 0,
    pending: 0,
    error: 0,
    total: redirects.length,
    ratio: 0,
    lastSync: undefined as string | undefined,
  };

  let mostRecentSync: Date | null = null;

  redirects.forEach((redirect) => {
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
 * Update sync status indicator UI
 */
export function updateSyncIndicator(stats: SyncStats): void {
  const button = document.querySelector<HTMLButtonElement>('[data-sync-chip] button');
  const fill = document.querySelector<HTMLElement>('.sync-indicator-btn .metric-pill__fill');

  if (!button || !fill) return;

  // Update fill ratio
  fill.style.setProperty('--metric-fill', stats.ratio.toFixed(2));

  // Update status attribute for color
  let status: 'synced' | 'pending' | 'error' = 'synced';
  if (stats.error > 0) {
    status = 'error';
  } else if (stats.pending > 0) {
    status = 'pending';
  }
  button.setAttribute('data-status', status);

  // Update tooltip
  const parts: string[] = [];
  if (stats.synced > 0) parts.push(`${stats.synced} synced`);
  if (stats.pending > 0) parts.push(`${stats.pending} pending`);
  if (stats.error > 0) parts.push(`${stats.error} error`);
  if (stats.lastSync) parts.push(`Last sync: ${stats.lastSync}`);

  button.title = parts.join(' • ') || 'No redirects';
}

/**
 * Initialize sync status dropdown and functionality
 */
export function initSyncStatus(redirects: Redirect[]): void {
  const dropdown = document.querySelector('[data-sync-chip]');
  const button = dropdown?.querySelector<HTMLButtonElement>('.dropdown__trigger');
  const menu = dropdown?.querySelector<HTMLElement>('.dropdown__menu');

  if (!dropdown || !button || !menu) return;

  // Calculate and update initial stats
  const stats = calculateSyncStats(redirects);
  updateSyncIndicator(stats);

  // Toggle dropdown
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', (!isExpanded).toString());
    menu.hidden = isExpanded;
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target as Node)) {
      button.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  });

  // Action handlers
  const syncNowBtn = menu.querySelector('[data-action="sync-now"]');
  const addRedirectsBtn = menu.querySelector('[data-action="add-redirects"]');
  const cancelSyncBtn = menu.querySelector('[data-action="cancel-sync"]');

  syncNowBtn?.addEventListener('click', () => {
    console.log('Sync to Cloudflare clicked');
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    // TODO: Implement CF sync action
  });

  addRedirectsBtn?.addEventListener('click', () => {
    console.log('Add Redirects clicked');
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    // TODO: Open redirect drawer (same as existing Add Redirect button)
    const event = new CustomEvent('open-redirect-drawer');
    document.dispatchEvent(event);
  });

  cancelSyncBtn?.addEventListener('click', () => {
    console.log('Cancel sync clicked');
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    // TODO: Implement cancel sync action
  });
}
