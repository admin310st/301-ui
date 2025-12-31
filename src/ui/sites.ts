import { t } from '@i18n';
import { getSites } from '@api/sites';
import type { Site } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from './notifications';

/**
 * Format date to locale string
 */
function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Render a single site row
 */
function renderSiteRow(site: Site): string {
  const statusClass = site.status === 'active' ? 'badge--success' :
                      site.status === 'paused' ? 'badge--warning' : 'badge--neutral';
  const statusLabel = t(`sites.status.${site.status}` as any) || site.status;

  return `
    <tr data-site-id="${site.id}">
      <td data-priority="critical">
        <strong>${site.site_name}</strong>
        ${site.site_tag ? `<br><code class="text-sm">${site.site_tag}</code>` : ''}
      </td>
      <td data-priority="medium">${site.site_tag || '—'}</td>
      <td data-priority="high">
        ${site.project_name ? `<a href="/projects.html?id=${site.project_id}" class="link">${site.project_name}</a>` : '—'}
      </td>
      <td data-priority="high" class="text-right">${site.domains_count}</td>
      <td data-priority="medium" class="text-muted">${site.acceptor_domain || '—'}</td>
      <td data-priority="high">
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td data-priority="low" class="text-muted">${formatDate(site.updated_at)}</td>
      <td data-priority="critical" class="table-actions">
        <button
          class="btn-icon"
          type="button"
          data-action="edit-site"
          data-site-id="${site.id}"
          aria-label="Edit ${site.site_name}"
        >
          <span class="icon" data-icon="mono/pencil-circle"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Show loading state
 */
function showLoading() {
  const loading = document.querySelector<HTMLElement>('[data-sites-loading]');
  const empty = document.querySelector<HTMLElement>('[data-sites-empty]');
  const container = document.querySelector<HTMLElement>('[data-sites-table-container]');

  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  if (container) container.hidden = true;
}

/**
 * Hide loading state
 */
function hideLoading() {
  const loading = document.querySelector<HTMLElement>('[data-sites-loading]');
  if (loading) loading.hidden = true;
}

/**
 * Show empty state
 */
function showEmpty() {
  const empty = document.querySelector<HTMLElement>('[data-sites-empty]');
  const container = document.querySelector<HTMLElement>('[data-sites-table-container]');

  if (empty) empty.hidden = false;
  if (container) container.hidden = true;
}

/**
 * Hide empty state and show table
 */
function showTable() {
  const empty = document.querySelector<HTMLElement>('[data-sites-empty]');
  const container = document.querySelector<HTMLElement>('[data-sites-table-container]');

  if (empty) empty.hidden = true;
  if (container) container.hidden = false;
}

/**
 * Load and render sites list (global view across all projects)
 */
export async function loadSites(): Promise<void> {
  const accountId = getAccountId();
  if (!accountId) {
    console.error('No account ID found');
    return;
  }

  const tbody = document.querySelector<HTMLTableSectionElement>('[data-sites-table] tbody');
  if (!tbody) return;

  showLoading();

  try {
    const sites = await getSites(accountId);

    hideLoading();

    if (sites.length === 0) {
      showEmpty();
      return;
    }

    showTable();
    tbody.innerHTML = sites.map(renderSiteRow).join('');

    // Re-apply icon injection after DOM update
    if (typeof (window as any).injectIcons === 'function') {
      (window as any).injectIcons();
    }
  } catch (error) {
    hideLoading();
    console.error('Failed to load sites:', error);
    showGlobalMessage('error', t('common.messages.error') || 'Failed to load sites');
  }
}

/**
 * Initialize sites page (global sites list)
 */
export function initSitesPage(): void {
  // Only run on sites page
  if (!document.querySelector('[data-sites-table]')) return;

  // Load sites when account ID becomes available
  const accountId = getAccountId();
  if (accountId) {
    // Account ID already available (page reload case)
    loadSites();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          loadSites();
          unsubscribe(); // Only load once
        }
      });
    });
  }

  // Event delegation for edit-site buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const editBtn = target.closest<HTMLButtonElement>('[data-action="edit-site"]');

    if (editBtn) {
      const siteId = editBtn.dataset.siteId;
      if (siteId) {
        // TODO: Open edit site drawer
        console.log('Edit site:', siteId);
        showGlobalMessage('info', 'Edit site functionality coming soon');
      }
    }
  });
}
