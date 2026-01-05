import { t } from '@i18n';
import { getSites, getSite, updateSite } from '@api/sites';
import type { Site, UpdateSiteRequest } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from './notifications';
import { safeCall } from '@api/ui-client';

// State
let allSites: Site[] = [];
let searchQuery = '';

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
 * Filter sites by search query (name, tag, project, acceptor domain)
 */
function filterSites(sites: Site[], query: string): Site[] {
  if (!query) return sites;

  const trimmed = query.trim().toLowerCase();
  return sites.filter((site) => {
    const searchable = [
      site.site_name,
      site.site_tag || '',
      site.project_name || '',
      site.acceptor_domain || '',
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(trimmed);
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
      <td data-priority="critical" style="font-weight: var(--fw-medium)">
        ${site.site_name}
      </td>
      <td data-priority="medium">${site.site_tag ? `<code>${site.site_tag}</code>` : '—'}</td>
      <td data-priority="high">
        ${site.project_name ? `<a href="/projects.html?id=${site.project_id}" class="link">${site.project_name}</a>` : '—'}
      </td>
      <td data-priority="high" class="text-right">${site.domains_count}</td>
      <td data-priority="medium" class="text-muted">${site.acceptor_domain || '—'}</td>
      <td data-priority="high">
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td data-priority="low" class="text-muted">${formatDate(site.updated_at)}</td>
      <td data-priority="critical">
        <button
          class="btn-icon"
          type="button"
          data-action="manage-domains"
          data-site-id="${site.id}"
          aria-label="${t('sites.actions.manageDomains')}"
          title="${t('sites.actions.manageDomains')}"
        >
          <span class="icon" data-icon="mono/web"></span>
        </button>
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
 * Render filtered sites to table
 */
function renderSitesTable(): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-sites-table] tbody');
  if (!tbody) return;

  const filtered = filterSites(allSites, searchQuery);

  if (filtered.length === 0) {
    if (searchQuery) {
      // Show "no results" message for search
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted" style="padding: var(--space-6);">
            No sites found for "${searchQuery}"
          </td>
        </tr>
      `;
    } else {
      showEmpty();
    }
    return;
  }

  showTable();
  tbody.innerHTML = filtered.map(renderSiteRow).join('');

  // Re-apply icon injection after DOM update
  if (typeof (window as any).injectIcons === 'function') {
    (window as any).injectIcons();
  }
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

  showLoading();

  try {
    const sites = await getSites(accountId);

    hideLoading();

    // Store sites in module state
    allSites = sites;

    if (sites.length === 0) {
      showEmpty();
      return;
    }

    // Render sites table with current search filter
    renderSitesTable();
  } catch (error) {
    hideLoading();
    console.error('Failed to load sites:', error);
    showGlobalMessage('error', t('common.messages.error') || 'Failed to load sites');
  }
}

/**
 * Set status dropdown value and label
 */
function setStatusDropdownValue(status: string): void {
  const label = document.querySelector<HTMLElement>('[data-site-status-label]');
  const hiddenInput = document.querySelector<HTMLInputElement>('[data-site-status-value]');
  const trigger = document.querySelector<HTMLButtonElement>('[data-site-status-select]');

  if (!label || !hiddenInput || !trigger) return;

  const statusLabels: Record<string, string> = {
    active: 'Active',
    paused: 'Paused',
    archived: 'Archived',
  };

  const displayLabel = statusLabels[status] || status;

  label.textContent = displayLabel;
  hiddenInput.value = status;
  trigger.setAttribute('data-selected-value', status);
}

/**
 * Show form status message
 */
function showFormStatus(message: string, type: 'error' | 'success'): void {
  const statusEl = document.querySelector<HTMLElement>('[data-edit-site-status]');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `panel panel--${type === 'error' ? 'danger' : 'success'}`;
  statusEl.hidden = false;
}

/**
 * Hide form status message
 */
function hideFormStatus(): void {
  const statusEl = document.querySelector<HTMLElement>('[data-edit-site-status]');
  if (statusEl) statusEl.hidden = true;
}

/**
 * Open edit site drawer and populate with site data (global sites page version)
 */
async function openEditSiteDrawer(siteId: number): Promise<void> {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-site"]');
  if (!drawer) return;

  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-site"]');
  if (!form) return;

  try {
    // Fetch site details
    const data = await safeCall(
      () => getSite(siteId),
      { retryOn401: true, lockKey: `site:${siteId}` }
    );

    const { site } = data;

    // Populate form
    form.querySelector<HTMLInputElement>('[name="site_id"]')!.value = String(site.id);
    form.querySelector<HTMLInputElement>('[name="project_id"]')!.value = String(site.project_id);
    form.querySelector<HTMLInputElement>('[name="site_name"]')!.value = site.site_name;
    form.querySelector<HTMLInputElement>('[name="site_tag"]')!.value = site.site_tag || '';

    // Set status dropdown value
    setStatusDropdownValue(site.status);

    // Clear status panel
    hideFormStatus();

    // Show drawer
    drawer.removeAttribute('hidden');

    // Focus first input
    setTimeout(() => form.querySelector<HTMLInputElement>('[name="site_name"]')?.focus(), 100);
  } catch (error: any) {
    showGlobalMessage('error', error.message || 'Failed to load site details');
  }
}

/**
 * Close edit site drawer
 */
function closeEditSiteDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-site"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');

  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-site"]');
  if (form) {
    form.reset();
    hideFormStatus();
  }
}

/**
 * Handle edit site form submission (global sites page version)
 */
async function handleEditSiteSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  const siteId = parseInt(formData.get('site_id') as string, 10);

  // Validate required fields
  const siteName = (formData.get('site_name') as string || '').trim();
  if (!siteName) {
    showFormStatus(t('sites.errors.nameRequired') || 'Site name is required', 'error');
    return;
  }

  const status = formData.get('status') as string;
  if (!status) {
    showFormStatus('Status is required', 'error');
    return;
  }

  // Build request payload
  const request: UpdateSiteRequest = {
    site_name: siteName,
    status: status as any,
  };

  // Add optional site_tag if provided
  const siteTag = (formData.get('site_tag') as string || '').trim();
  if (siteTag) {
    request.site_tag = siteTag;
  }

  try {
    hideFormStatus();

    // Disable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('common.messages.saving') || 'Saving...';
    }

    // Update site via API
    await safeCall(
      () => updateSite(siteId, request),
      {
        lockKey: `edit-site-${siteId}`,
        retryOn401: true,
      }
    );

    // Show success message
    showGlobalMessage('success', t('sites.messages.updated') || 'Site updated successfully');

    // Close drawer
    closeEditSiteDrawer();

    // Reload sites table
    await loadSites();
  } catch (error: any) {
    const errorMessage = error.message || t('sites.errors.updateFailed') || 'Failed to update site';
    showFormStatus(errorMessage, 'error');

    // Re-enable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="icon" data-icon="mono/check"></span>
        <span>Save changes</span>
      `;
      // Re-inject icons
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
    }
  }
}

/**
 * Initialize search functionality for sites table
 */
function initSitesSearch(): void {
  const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
  const searchClear = document.querySelector<HTMLButtonElement>('[data-search-clear]');
  const tableSearch = document.querySelector<HTMLElement>('[data-table-search]');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderSitesTable();

    // Toggle search active state
    if (tableSearch) {
      if (searchQuery.length > 0) {
        tableSearch.classList.add('table-search--active');
      } else {
        tableSearch.classList.remove('table-search--active');
      }
    }
  });

  // Clear button
  if (searchClear && tableSearch) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      renderSitesTable();
      tableSearch.classList.remove('table-search--active');
      searchInput.focus();
    });
  }

  // Clear search on Escape key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchQuery = '';
      renderSitesTable();
      if (tableSearch) {
        tableSearch.classList.remove('table-search--active');
      }
    }
  });
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
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const editBtn = target.closest<HTMLButtonElement>('[data-action="edit-site"]');

    if (editBtn) {
      const siteId = editBtn.dataset.siteId;
      if (siteId) {
        await openEditSiteDrawer(parseInt(siteId, 10));
      }
    }
  });

  // Close handlers for edit drawer
  document.querySelectorAll('[data-drawer="edit-site"] [data-drawer-close]').forEach(btn => {
    btn.addEventListener('click', closeEditSiteDrawer);
  });

  // Escape key to close drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-site"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeEditSiteDrawer();
      }
    }
  });

  // Form submit handler
  const editForm = document.querySelector<HTMLFormElement>('[data-form="edit-site"]');
  if (editForm) {
    editForm.addEventListener('submit', handleEditSiteSubmit);
  }

  // Status dropdown item click handlers
  document.querySelectorAll<HTMLButtonElement>('[data-site-status-menu] .dropdown__item').forEach(item => {
    item.addEventListener('click', () => {
      const value = item.getAttribute('data-value');
      if (value) {
        setStatusDropdownValue(value);
      }
    });
  });

  // Initialize search functionality
  initSitesSearch();
}
