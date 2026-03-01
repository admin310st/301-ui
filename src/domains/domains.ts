import { type Domain } from './mock-data';
import { initAddDomainsDrawer } from './add-domains-drawer';
import { formatDomainDisplay } from '@utils/idn';
import { showConfirmDialog } from '@ui/dialog';
import { getDefaultFilters, hasActiveFilters, updateProjectFilterOptions, type ActiveFilters } from './filters-config';
import { filterDomains as applyFiltersAndSearch } from './filters';
import { renderFilterBar, initFilterUI } from './filters-ui';
import { updateDomainsBadge, updateDomainsHealthIndicator } from '@ui/sidebar-nav';
import { initBulkActions, setReloadDomainsCallback } from './bulk-actions';
import { adjustDropdownPosition } from '@ui/dropdown';
import { queryNSRecords } from '@utils/dns';
import { getDomains, updateDomainRole, blockDomain, unblockDomain, deleteDomain } from '@api/domains';
import { getProjects } from '@api/projects';
import { getSiteRedirects, getZoneLimits } from '@api/redirects';
import { safeCall } from '@api/ui-client';
import { invalidateCache } from '@api/cache';
import { getAccountId } from '@state/auth-state';
import { getSelectedProjectName, setSelectedProject, clearSelectedProject } from '@state/ui-preferences';
import { adaptDomainsResponseToUI } from './adapter';
import { showGlobalMessage } from '@ui/notifications';

let currentDomains: Domain[] = [];
const selectedDomains = new Set<number>();
const activeFilters: ActiveFilters = getDefaultFilters();
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 25;

// Loaded projects for filter (used to get id by name when saving)
let loadedProjects: Array<{ id: number; project_name: string }> = [];

export function initDomainsPage(): void {
  const card = document.querySelector('[data-domains-card]');
  if (!card) return;

  // Restore saved project filter
  const savedProjectName = getSelectedProjectName();
  if (savedProjectName) {
    activeFilters.project = savedProjectName;
  }

  // Initialize Add Domains Drawer
  initAddDomainsDrawer();

  // Initialize Bulk Actions Bar
  initBulkActions();

  // Register reload callback for bulk actions
  setReloadDomainsCallback(async () => {
    showLoadingState();
    await loadDomainsFromAPI();
  });

  // Show loading state immediately
  showLoadingState();

  // Load domains from API
  void loadDomainsFromAPI();

  // Add domains button
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsDrawer());
  });

  // Retry button
  const retryBtn = document.querySelector('[data-action="retry"]');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      showLoadingState();
      void loadDomainsFromAPI();
    });
  }

  // Search input
  const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
  const searchClear = document.querySelector<HTMLButtonElement>('[data-search-clear]');
  const tableSearch = document.querySelector<HTMLElement>('[data-table-search]');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      currentPage = 1; // Reset to first page on search
      applyFiltersAndRender();

      // Toggle clear button visibility
      if (tableSearch) {
        if (searchQuery.length > 0) {
          tableSearch.classList.add('table-search--active');
        } else {
          tableSearch.classList.remove('table-search--active');
        }
      }
    });
  }

  // Clear button
  if (searchClear && searchInput && tableSearch) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      currentPage = 1; // Reset to first page
      applyFiltersAndRender();
      tableSearch.classList.remove('table-search--active');
      searchInput.focus();
    });
  }

  // Select all checkbox
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      toggleSelectAll(checked);
    });
  }

  // Inspector actions
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const inspectBtn = target.closest('[data-action="inspect"]');
    if (inspectBtn) {
      const domainId = parseInt(inspectBtn.getAttribute('data-domain-id') || '0');
      openInspector(domainId);
    }
  });

  // Drawer close
  document.querySelectorAll('[data-drawer-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeDrawer());
  });

  // Dropdown toggles (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('.dropdown__trigger');

    if (trigger) {
      e.stopPropagation();
      const dropdown = trigger.closest('.dropdown');
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('dropdown--open');

      // Close all other dropdowns
      document.querySelectorAll('.dropdown--open').forEach((other) => {
        if (other !== dropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isOpen) {
        dropdown.classList.remove('dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
        // Remove positioning class when closing
        const menu = dropdown.querySelector('.dropdown__menu');
        if (menu) menu.classList.remove('dropdown__menu--up');
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
        // Apply smart positioning after opening
        requestAnimationFrame(() => {
          adjustDropdownPosition(dropdown);
        });
      }
    } else {
      // Close all dropdowns when clicking outside
      document.querySelectorAll('.dropdown--open').forEach((dropdown) => {
        dropdown.classList.remove('dropdown--open');
        const ddTrigger = dropdown.querySelector('.dropdown__trigger');
        if (ddTrigger) ddTrigger.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Dropdown actions (delegated, placeholder handlers)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const domainId = actionBtn.getAttribute('data-domain-id');

    if (action === 'inspect') return; // Already handled above

    const domain = currentDomains.find((d) => d.id === parseInt(domainId || '0'));
    if (!domain) return;

    switch (action) {
      case 'block-domain':
        void handleBlockDomain(domain);
        break;
      case 'unblock-domain':
        void handleUnblockDomain(domain);
        break;
      case 'change-role':
        void handleChangeRole(domain, actionBtn.getAttribute('data-role') as Domain['role']);
        break;
      case 'delete-domain': {
        void handleDeleteDomain(domain);
        break;
      }
    }
  });

  // Reset filters button state updater
  const resetBtn = document.querySelector('[data-reset-filters]');
  const updateResetButton = () => {
    if (resetBtn) {
      if (hasActiveFilters(activeFilters)) {
        resetBtn.classList.add('is-active');
      } else {
        resetBtn.classList.remove('is-active');
      }
    }
  };

  // Filter change handler (only re-renders, no listener re-init)
  const onFilterChange = () => {
    currentPage = 1; // Reset to first page on filter change

    // Persist project selection across pages
    if (activeFilters.project && activeFilters.project !== 'all') {
      const project = loadedProjects.find(p => p.project_name === activeFilters.project);
      if (project) {
        setSelectedProject({ id: project.id, name: project.project_name });
      }
    } else {
      clearSelectedProject();
    }

    renderFilters();
    applyFiltersAndRender();
    updateResetButton();
  };

  // Initialize filter bar
  const filterBarContainer = document.querySelector('[data-filter-bar]');
  if (filterBarContainer) {
    renderFilters();
    // Initialize event listeners ONCE (they stay attached to container)
    initFilterUI(filterBarContainer as HTMLElement, activeFilters, onFilterChange);
  }

  // Reset filters button handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Mutate existing object instead of creating new one
      // to preserve reference for event listeners
      const defaults = getDefaultFilters();
      activeFilters.status = defaults.status;
      activeFilters.health = defaults.health;
      activeFilters.provider = defaults.provider;
      activeFilters.project = defaults.project;
      activeFilters.role = defaults.role;
      activeFilters.expiry = defaults.expiry;

      // Clear persisted project
      clearSelectedProject();

      onFilterChange();
    });

    // Initial state
    updateResetButton();
  }

  // Pagination controls
  const prevBtn = document.querySelector<HTMLButtonElement>('[data-pagination-prev]');
  const nextBtn = document.querySelector<HTMLButtonElement>('[data-pagination-next]');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      if (currentPage > 1) {
        currentPage--;
        applyFiltersAndRender();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      const filtered = applyFiltersAndSearch(currentDomains, activeFilters, searchQuery);
      const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage++;
        applyFiltersAndRender();
      }
    });
  }
}

function showLoadingState(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const errorState = document.querySelector('[data-error-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const tableFooter = document.querySelector('[data-table-footer]');

  if (loadingState) loadingState.removeAttribute('hidden');
  if (emptyState) emptyState.setAttribute('hidden', '');
  if (errorState) errorState.setAttribute('hidden', '');
  if (tableShell) tableShell.setAttribute('hidden', '');
  if (tableFooter) tableFooter.setAttribute('hidden', '');
}

/**
 * Show error state UI
 */
function showErrorState(message?: string): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const errorState = document.querySelector('[data-error-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const tableFooter = document.querySelector('[data-table-footer]');

  if (loadingState) loadingState.setAttribute('hidden', '');
  if (emptyState) emptyState.setAttribute('hidden', '');
  if (errorState) {
    errorState.removeAttribute('hidden');
    // Update error message if provided
    const errorText = errorState.querySelector('p');
    if (errorText && message) {
      errorText.textContent = message;
    }
  }
  if (tableShell) tableShell.setAttribute('hidden', '');
  if (tableFooter) tableFooter.setAttribute('hidden', '');
}

/**
 * Load domains from API
 */
async function loadDomainsFromAPI(): Promise<void> {
  try {
    // Load domains and projects in parallel
    const accountId = getAccountId();

    const [domainsResponse, projects] = await Promise.all([
      safeCall(
        () => getDomains(),
        {
          lockKey: 'domains',
          retryOn401: true,
        }
      ),
      // Only load projects if we have accountId
      accountId
        ? safeCall(
            () => getProjects(accountId),
            {
              lockKey: 'projects',
              retryOn401: true,
            }
          )
        : Promise.resolve([]),
    ]);

    // Update project filter options with real data
    if (projects.length > 0) {
      loadedProjects = projects;
      updateProjectFilterOptions(projects);
      // Re-render filters to show updated project options
      renderFilters();
    }

    // Adapt API response to UI format
    const uiDomains = adaptDomainsResponseToUI(domainsResponse.groups);

    // Load into table
    loadDomains(uiDomains);
  } catch (error: unknown) {
    console.error('Failed to load domains:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to load domains. Please retry or check your connection.';

    showErrorState(errorMessage);
    showGlobalMessage('error', 'Failed to load domains');
  }
}

/**
 * Calculate health status from domains
 * Returns: 'danger' | 'warning' | 'success' | null
 */
function calculateDomainsHealth(domains: Domain[]): 'danger' | 'warning' | 'success' | null {
  if (domains.length === 0) return null;

  let hasDanger = false;
  let hasWarning = false;

  for (const domain of domains) {
    // Danger: blocked status, expired, SSL invalid/error, abuse not clean
    if (
      domain.status === 'blocked' ||
      domain.status === 'expired' ||
      domain.ssl_status === 'invalid' ||
      domain.ssl_status === 'error' ||
      domain.abuse_status !== 'clean'
    ) {
      hasDanger = true;
      break; // Highest priority, stop checking
    }

    // Warning: expiring soon, SSL pending, abuse warning
    if (
      domain.status === 'expiring' ||
      domain.ssl_status === 'expiring' ||
      domain.ssl_status === 'pending' ||
      domain.abuse_status === 'warning'
    ) {
      hasWarning = true;
    }
  }

  if (hasDanger) return 'danger';
  if (hasWarning) return 'warning';
  return 'success';
}

function loadDomains(domains: Domain[]): void {
  currentDomains = domains;
  selectedDomains.clear();

  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const tableFooter = document.querySelector('[data-table-footer]');

  if (loadingState) loadingState.setAttribute('hidden', '');

  // Update sidebar badge with total count
  updateDomainsBadge(domains.length);

  // Update sidebar health indicator
  const healthStatus = calculateDomainsHealth(domains);
  updateDomainsHealthIndicator(healthStatus);

  if (domains.length === 0) {
    if (emptyState) emptyState.removeAttribute('hidden');
    if (tableShell) tableShell.setAttribute('hidden', '');
    if (tableFooter) tableFooter.setAttribute('hidden', '');
    return;
  }

  if (emptyState) emptyState.setAttribute('hidden', '');
  if (tableShell) tableShell.removeAttribute('hidden');

  // Apply filters and pagination
  applyFiltersAndRender();
}

function renderDomainsTable(domains: Domain[]): void {
  const tbody = document.querySelector('[data-domains-tbody]');
  if (!tbody) return;

  tbody.innerHTML = domains
    .map((domain) => {
      const statusChip = getStatusChip(domain.status);
      const healthIcons = getHealthIcons(domain);
      const expiresText = getExpiresText(domain);

      return `
        <tr data-domain-id="${domain.id}">
          <td data-priority="critical">
            <div>
              <div class="domain-cell">
                <strong>${formatDomainDisplay(domain.domain_name, 'compact')}</strong>
              </div>
              <div class="text-muted text-sm">
                ${domain.project_name}
              </div>
            </div>
          </td>
          <td data-priority="high">${statusChip}</td>
          <td data-priority="medium">${healthIcons}</td>
          <td data-priority="low">${expiresText}</td>
          <td data-priority="critical">
            <div class="btn-group">
              <button
                class="btn-icon"
                type="button"
                data-action="inspect"
                data-domain-id="${domain.id}"
                aria-label="Inspect ${domain.domain_name}"
              >
                <span class="icon" data-icon="mono/pencil-circle"></span>
              </button>
              <div class="dropdown" data-dropdown>
                <button
                  class="btn-icon btn-icon--ghost dropdown__trigger"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="false"
                  aria-label="More actions for ${domain.domain_name}"
                >
                  <span class="icon" data-icon="mono/dots-vertical"></span>
                </button>
                <div class="dropdown__menu dropdown__menu--align-right" role="menu">
                  ${getRoleMenuItems(domain)}
                  <hr class="dropdown__divider" />
                  ${domain.status === 'blocked' ? `
                  <button class="dropdown__item" type="button" data-action="unblock-domain" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/shield-check"></span>
                    <span>Unblock domain</span>
                  </button>
                  ` : `
                  <button class="dropdown__item dropdown__item--warning" type="button" data-action="block-domain" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/cancel"></span>
                    <span>Block domain</span>
                  </button>
                  `}
                  <hr class="dropdown__divider" />
                  <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-domain" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/delete"></span>
                    <span>Delete subdomain</span>
                  </button>
                </div>
              </div>
            </div>
          </td>
          <td data-priority="critical">
            <input type="checkbox" data-domain-id="${domain.id}" aria-label="Select ${domain.domain_name}" />
          </td>
        </tr>
      `;
    })
    .join('');

  // Attach checkbox listeners
  tbody.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const domainId = parseInt(target.getAttribute('data-domain-id') || '0');
      if (target.checked) {
        selectedDomains.add(domainId);
      } else {
        selectedDomains.delete(domainId);
      }
      updateSelectAllCheckbox();
    });
  });

  // Note: Dropdowns initialized once in initDomainsPage() via event delegation
}

function getStatusChip(status: Domain['status']): string {
  const variants: Record<string, string> = {
    active: 'badge--ok',
    expired: 'badge--danger',
    expiring: 'badge--warning',
    blocked: 'badge--danger',
    pending: 'badge--neutral',
  };
  const labels: Record<string, string> = {
    active: 'Active',
    expired: 'Expired',
    expiring: 'Expiring',
    blocked: 'Blocked',
    pending: 'Pending',
  };
  return `<span class="badge ${variants[status]}">${labels[status]}</span>`;
}

function getStatusColor(status: Domain['status']): string {
  const colors: Record<string, string> = {
    active: 'text-ok',
    expired: 'text-danger',
    expiring: 'text-warning',
    blocked: 'text-danger',
    pending: 'text-muted',
  };
  return colors[status] || 'text-muted';
}

function getHealthIcons(domain: Domain): string {
  const icons: string[] = [];

  // SSL icon - API returns: valid, pending, none, error
  // Mock data returns: valid, expiring, invalid, off
  const sslStatus = domain.ssl_status;
  if (sslStatus === 'valid') {
    icons.push('<span class="icon text-ok" data-icon="mono/lock" title="SSL valid"></span>');
  } else if (sslStatus === 'expiring' || sslStatus === 'pending') {
    icons.push('<span class="icon text-warning" data-icon="mono/lock" title="SSL pending"></span>');
  } else if (sslStatus === 'invalid' || sslStatus === 'error') {
    icons.push('<span class="icon text-danger" data-icon="mono/lock" title="SSL error"></span>');
  } else {
    icons.push('<span class="icon text-muted" data-icon="mono/lock" title="No SSL"></span>');
  }

  // Health/Abuse icon - adapter maps API health.status (ok/warning/danger/unknown) to abuse_status (clean/warning/danger)
  const healthStatus = domain.abuse_status;
  if (healthStatus === 'clean') {
    icons.push('<span class="icon text-ok" data-icon="mono/shield-check" title="Healthy"></span>');
  } else if (healthStatus === 'warning') {
    icons.push('<span class="icon text-warning" data-icon="mono/alert-triangle" title="Warning"></span>');
  } else if (healthStatus === 'danger') {
    icons.push('<span class="icon text-danger" data-icon="mono/security" title="Danger"></span>');
  } else {
    icons.push('<span class="icon text-muted" data-icon="mono/help-circle" title="Unknown"></span>');
  }

  return `<div class="health-icons">${icons.join(' ')}</div>`;
}

function getExpiresText(domain: Domain): string {
  const expiresDate = new Date(domain.expires_at);
  const today = new Date();
  const daysUntil = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const providerIcons: Record<Domain['provider'], string> = {
    cloudflare: 'brand/cloudflare',
    namecheap: 'brand/namecheap',
    namesilo: 'brand/namesilo',
    google: 'brand/google',
    manual: 'mono/dns',
  };

  const providerLabels: Record<Domain['provider'], string> = {
    cloudflare: 'Cloudflare Registrar',
    namecheap: 'Namecheap',
    namesilo: 'NameSilo',
    google: 'Google Domains',
    manual: 'Manually added',
  };

  const icon = `<span class="provider-icon-sm" title="${providerLabels[domain.registrar]}"><span class="icon" data-icon="${providerIcons[domain.registrar]}"></span></span>`;

  let dateText: string;
  if (daysUntil < 0) {
    dateText = `<span class="text-danger">${domain.expires_at}</span>`;
  } else if (daysUntil <= 30) {
    dateText = `<span class="text-warning">${domain.expires_at}</span>`;
  } else {
    dateText = domain.expires_at;
  }

  return `<div class="expires-cell">${icon}${dateText}</div>`;
}

/**
 * Render filter chips into filter bar container
 */
function renderFilters(): void {
  const container = document.querySelector('[data-filter-bar]');
  if (!container) return;

  const filterBarHTML = renderFilterBar(activeFilters);
  container.innerHTML = filterBarHTML;

  // Re-inject icons (since we're replacing HTML)
  container.querySelectorAll('[data-icon]').forEach((el) => {
    if (!el.querySelector('svg')) {
      const iconName = el.getAttribute('data-icon');
      if (iconName) {
        const symbolId = `i-${iconName.replace('/', '-')}`;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);
        svg.appendChild(use);
        el.appendChild(svg);
      }
    }
  });
}

/**
 * Apply active filters and search query, then re-render table
 */
function paginateDomains(domains: Domain[], page: number, pageSize: number): Domain[] {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return domains.slice(startIndex, endIndex);
}

function applyFiltersAndRender(): void {
  const filtered = applyFiltersAndSearch(currentDomains, activeFilters, searchQuery);
  const paginated = paginateDomains(filtered, currentPage, PAGE_SIZE);
  renderDomainsTable(paginated);
  updatePaginationUI(filtered.length);

  // Note: Dropdowns use event delegation, no need to reinitialize
}

function toggleSelectAll(checked: boolean): void {
  selectedDomains.clear();
  if (checked) {
    currentDomains.forEach((d) => selectedDomains.add(d.id));
  }

  const checkboxes = document.querySelectorAll<HTMLInputElement>('[data-domains-tbody] input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = checked;
  });
}

function updateSelectAllCheckbox(): void {
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');
  if (!selectAllCheckbox) return;

  const totalVisible = document.querySelectorAll('[data-domains-tbody] tr').length;
  const selectedCount = selectedDomains.size;

  selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalVisible;
  selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalVisible;
}

function updatePaginationUI(totalCount: number): void {
  const footer = document.querySelector('[data-table-footer]');
  const totalCountEl = document.querySelector('[data-total-count]');
  const paginationInfo = document.querySelector('.pagination__info');
  const prevBtn = document.querySelector<HTMLButtonElement>('[data-pagination-prev]');
  const nextBtn = document.querySelector<HTMLButtonElement>('[data-pagination-next]');

  if (!footer || !totalCountEl || !paginationInfo || !prevBtn || !nextBtn) return;

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  // Update UI
  if (totalCount > 0) {
    footer.removeAttribute('hidden');
    totalCountEl.textContent = totalCount.toString();

    // Update "Showing X-Y of Z"
    const showingText = paginationInfo.querySelector('strong:first-child');
    if (showingText) {
      showingText.textContent = `${startIndex}-${endIndex}`;
    }

    // Enable/disable buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
  } else {
    footer.setAttribute('hidden', '');
  }
}

/**
 * Render expected NS hint panel with copy button
 */
function renderNsHint(
  container: HTMLElement,
  expectedNs: string[],
  type: 'warning' | 'info',
  label: string
): void {
  const panelClass = type === 'warning' ? 'panel--warning' : 'panel--info';
  const nsText = expectedNs.join('\n');

  container.innerHTML = `
    <div class="panel ${panelClass} stack stack--sm" style="margin-top: var(--space-3);">
      <span class="text-sm text-strong">${label}</span>
      <div class="stack-list--xs">
        ${expectedNs.map(ns => `<code class="text-sm">${ns}</code>`).join('')}
      </div>
      <button class="btn btn--sm btn--ghost" type="button" data-copy-ns title="Copy nameservers">
        <span class="icon" data-icon="mono/copy"></span>
        <span>Copy</span>
      </button>
    </div>
  `;
  container.hidden = false;

  const copyBtn = container.querySelector('[data-copy-ns]');
  copyBtn?.addEventListener('click', () => {
    void navigator.clipboard.writeText(nsText).then(() => {
      const icon = copyBtn.querySelector('.icon');
      if (icon) {
        icon.classList.add('text-ok');
        setTimeout(() => icon.classList.remove('text-ok'), 2000);
      }
    });
  });
}

function openAddDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domains"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');
}

function openInspector(domainId: number): void {
  const domain = currentDomains.find((d) => d.id === domainId);
  if (!domain) return;

  const drawer = document.querySelector('[data-drawer="domain-inspector"]');
  if (!drawer) return;

  // Populate drawer
  const domainEl = drawer.querySelector('[data-inspector-domain]');
  const statusEl = drawer.querySelector('[data-inspector-status]');
  const projectEl = drawer.querySelector('[data-inspector-project]');
  const roleIconEl = drawer.querySelector('[data-inspector-role-icon]');
  const providerEl = drawer.querySelector('[data-inspector-provider]');
  const sslEl = drawer.querySelector('[data-inspector-ssl]');
  const abuseEl = drawer.querySelector('[data-inspector-abuse]');
  const nsEl = drawer.querySelector('[data-inspector-ns]');
  const nsStatusEl = drawer.querySelector('[data-inspector-ns-status]');

  if (domainEl) domainEl.textContent = domain.domain_name;
  if (statusEl) {
    const statusText = domain.status.charAt(0).toUpperCase() + domain.status.slice(1);
    const statusColor = getStatusColor(domain.status);
    statusEl.innerHTML = `<span class="${statusColor}">${statusText}</span>`;
  }
  if (projectEl) projectEl.textContent = domain.project_name;

  // Update role icon in header
  if (roleIconEl) {
    const roleIcons = {
      acceptor: 'mono/arrow-bottom-right',
      donor: 'mono/arrow-top-right',
      reserve: 'mono/cog-pause',
    };
    const roleLabels = {
      acceptor: 'Acceptor: receives traffic',
      donor: 'Donor: redirects traffic',
      reserve: 'Reserve: inactive',
    };
    roleIconEl.setAttribute('data-role', domain.role);
    roleIconEl.setAttribute('title', roleLabels[domain.role]);

    // Replace icon HTML and manually process it
    const iconName = roleIcons[domain.role];
    const symbolId = `i-${iconName.replace('/', '-')}`;
    roleIconEl.innerHTML = `
      <span class="icon">
        <svg aria-hidden="true">
          <use href="/icons-sprite.svg#${symbolId}"></use>
        </svg>
      </span>
    `.trim();
  }

  if (providerEl) providerEl.textContent = domain.registrar.charAt(0).toUpperCase() + domain.registrar.slice(1);
  if (sslEl) sslEl.textContent = `${domain.ssl_status.charAt(0).toUpperCase() + domain.ssl_status.slice(1)}${domain.ssl_valid_to ? ` (until ${domain.ssl_valid_to})` : ''}`;
  if (abuseEl) abuseEl.textContent = domain.abuse_status.charAt(0).toUpperCase() + domain.abuse_status.slice(1);

  // Load NS records asynchronously and compare against expected CF nameservers
  const nsHintEl = drawer.querySelector<HTMLElement>('[data-inspector-ns-hint]');
  if (nsHintEl) {
    nsHintEl.hidden = true;
    nsHintEl.innerHTML = '';
  }

  if (nsEl && nsStatusEl) {
    nsEl.innerHTML = '<span class="text-muted">Loading...</span>';
    nsStatusEl.innerHTML = '';

    // Parse expected NS from domain (CF-assigned nameservers, comma-separated)
    const expectedNs = domain.ns_expected
      ? domain.ns_expected.split(',').map(ns => ns.trim().toLowerCase()).filter(Boolean).sort()
      : null;

    queryNSRecords(domain.domain_name)
      .then((records) => {
        if (records.length === 0) {
          nsEl.innerHTML = '<span class="text-muted">No NS records found</span>';
          nsStatusEl.innerHTML = '';
          // Show expected NS if available
          if (expectedNs && expectedNs.length > 0 && nsHintEl) {
            renderNsHint(nsHintEl, expectedNs, 'info', 'Set nameservers to:');
          }
          return;
        }

        const allCloudflare = records.every((r) => r.isCloudflare);
        const someCloudflare = records.some((r) => r.isCloudflare);

        // Compare live NS against expected
        const liveNs = records.map(r => r.nameserver.toLowerCase()).sort();
        const isExactMatch = expectedNs
          && expectedNs.length === liveNs.length
          && expectedNs.every((ns, i) => ns === liveNs[i]);

        // NS list with CF icons — color wrong-pair NS with warning
        const recordsHtml = records
          .map((record) => {
            const isExpected = expectedNs?.includes(record.nameserver.toLowerCase());
            const cfIcon = record.isCloudflare
              ? `<span class="icon ${isExpected !== false ? 'text-ok' : 'text-warning'}" data-icon="brand/cloudflare" title="Cloudflare" style="margin-right: var(--space-2);"></span>`
              : '<span class="icon" style="opacity: 0; pointer-events: none; margin-right: var(--space-2);"></span>';
            return `<div class="cluster">${cfIcon}${record.nameserver}</div>`;
          })
          .join('');

        // Status badge with NS match awareness
        let statusBadge: string;
        if (allCloudflare && isExactMatch) {
          statusBadge = '<span class="badge badge--success">On Cloudflare</span>';
        } else if (allCloudflare && expectedNs && !isExactMatch) {
          statusBadge = '<span class="badge badge--warning">NS mismatch</span>';
        } else if (allCloudflare) {
          statusBadge = '<span class="badge badge--success">On Cloudflare</span>';
        } else if (someCloudflare) {
          statusBadge = '<span class="badge badge--warning">Mixed NS</span>';
        } else {
          statusBadge = '<span class="badge badge--neutral">Not on Cloudflare</span>';
        }

        nsEl.innerHTML = `<div class="stack-list--xs">${recordsHtml}</div>`;
        nsStatusEl.innerHTML = statusBadge;

        // Show hint panel for mismatches (only when expected NS is known)
        if (nsHintEl && expectedNs && expectedNs.length > 0 && !isExactMatch) {
          if (allCloudflare) {
            renderNsHint(nsHintEl, expectedNs, 'warning', 'Expected nameservers:');
          } else {
            renderNsHint(nsHintEl, expectedNs, 'info', 'Update nameservers to:');
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load NS records:', error);
        nsEl.innerHTML = '<span class="text-muted">Failed to load NS records</span>';
        nsStatusEl.innerHTML = '';
      });
  }

  // Load Routing & Redirects data asynchronously
  const routingEl = drawer.querySelector<HTMLElement>('[data-inspector-routing]');
  if (routingEl) {
    if (!domain.site_id) {
      routingEl.innerHTML = '<p class="text-muted text-sm">Not attached to a site</p>';
    } else {
      routingEl.innerHTML = '<p class="text-muted">Loading...</p>';
      const siteId = domain.site_id;
      const zoneId = domain.zone_id;

      void (async () => {
        try {
          const [siteRedirects, zoneLimits] = await Promise.all([
            safeCall(() => getSiteRedirects(siteId), { lockKey: `inspector-redirects:${siteId}`, retryOn401: true }),
            zoneId
              ? safeCall(() => getZoneLimits(zoneId), { lockKey: `inspector-limits:${zoneId}`, retryOn401: true })
              : Promise.resolve(null),
          ]);

          // Find this domain's redirect
          const domainRedirect = siteRedirects.domains.find(d => d.domain_id === domain.id);
          const redirect = domainRedirect?.redirect;

          let html = '<dl class="detail-list">';

          // Redirect row
          if (redirect) {
            const templateNames: Record<string, string> = {
              T1: 'Domain redirect', T3: 'apex \u2192 www', T4: 'www \u2192 apex',
              T5: 'Path redirect', T6: 'Exact path \u2192 URL', T7: 'Maintenance mode',
            };
            const templateLabel = templateNames[redirect.template_id] || redirect.template_id || 'Custom';
            const targetUrl = redirect.params?.target_url || '—';
            html += `
              <div class="detail-row">
                <dt class="detail-label">Redirect</dt>
                <dd class="detail-value">
                  <span class="badge badge--sm badge--neutral">${templateLabel}</span>
                </dd>
              </div>
              <div class="detail-row">
                <dt class="detail-label">Target</dt>
                <dd class="detail-value text-sm">${targetUrl}</dd>
              </div>`;

            // Sync status
            const syncStatus = redirect.sync_status || 'pending';
            const syncText = syncStatus === 'synced' ? 'Synced' :
                             syncStatus === 'pending' ? 'Pending' :
                             syncStatus === 'error' ? 'Failed' : 'Not synced';
            const syncColor = syncStatus === 'synced' ? 'text-success' :
                              syncStatus === 'pending' ? 'text-warning' :
                              syncStatus === 'error' ? 'text-danger' : 'text-muted';
            html += `
              <div class="detail-row">
                <dt class="detail-label">Sync</dt>
                <dd class="detail-value">
                  <span class="${syncColor}">${syncText}</span>
                </dd>
              </div>`;
          } else {
            html += `
              <div class="detail-row">
                <dt class="detail-label">Redirect</dt>
                <dd class="detail-value text-muted text-sm">No redirect configured</dd>
              </div>`;
          }

          // Zone limits
          if (zoneLimits) {
            html += `
              <div class="detail-row">
                <dt class="detail-label">Zone quota</dt>
                <dd class="detail-value text-sm">${zoneLimits.used} / ${zoneLimits.max} rules</dd>
              </div>`;
          }

          html += '</dl>';

          // Manage link
          html += `
            <div class="card__actions">
              <a class="btn-chip btn-chip--sm btn-chip--primary" href="redirects.html">
                <span>Manage redirects</span>
              </a>
            </div>`;

          routingEl.innerHTML = html;
        } catch {
          routingEl.innerHTML = '<p class="text-muted text-sm">Failed to load redirect data</p>';
        }
      })();
    }
  }

  // Add copy button handler
  const copyBtn = drawer.querySelector('[data-action="copy-domain-inspector"]');
  if (copyBtn) {
    // Remove old listeners
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode?.replaceChild(newCopyBtn, copyBtn);

    // Add new listener
    newCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(domain.domain_name).then(() => {
        // Show success feedback with color change on icon
        const icon = newCopyBtn.querySelector('.icon');
        if (icon) {
          icon.classList.add('text-ok');
          setTimeout(() => {
            icon.classList.remove('text-ok');
          }, 2000);
        }
      }).catch(err => {
        console.error('Failed to copy domain:', err);
      });
    });
  }

  // Add open domain button handler
  const openBtn = drawer.querySelector('[data-action="open-domain-inspector"]');
  if (openBtn) {
    // Remove old listeners
    const newOpenBtn = openBtn.cloneNode(true);
    openBtn.parentNode?.replaceChild(newOpenBtn, openBtn);

    // Add new listener
    newOpenBtn.addEventListener('click', () => {
      window.open(`https://${domain.domain_name}`, '_blank', 'noopener,noreferrer');
    });
  }

  drawer.removeAttribute('hidden');
}

function closeDrawer(): void {
  const drawer = document.querySelector('[data-drawer="domain-inspector"]');
  if (drawer) drawer.setAttribute('hidden', '');
}

/**
 * Generate role change menu items based on current role
 */
function getRoleMenuItems(domain: Domain): string {
  const roles: { value: Domain['role']; label: string; icon: string }[] = [
    { value: 'acceptor', label: 'Set as Acceptor', icon: 'mono/arrow-bottom-right' },
    { value: 'donor', label: 'Set as Donor', icon: 'mono/arrow-top-right' },
    { value: 'reserve', label: 'Set as Reserve', icon: 'mono/cog-pause' },
  ];

  return roles
    .filter((r) => r.value !== domain.role)
    .map(
      (r) => `
      <button class="dropdown__item" type="button" data-action="change-role" data-domain-id="${domain.id}" data-role="${r.value}">
        <span class="icon" data-icon="${r.icon}"></span>
        <span>${r.label}</span>
      </button>
    `
    )
    .join('');
}

/**
 * Handle delete domain action
 * DELETE /domains/:id
 */
async function handleDeleteDomain(domain: Domain): Promise<void> {
  const confirmed = await showConfirmDialog('delete-domain', {
    'delete-domain-name': domain.domain_name,
  });
  if (!confirmed) return;

  try {
    await safeCall(
      () => deleteDomain(domain.id),
      { lockKey: `delete-domain-${domain.id}`, retryOn401: true }
    );

    invalidateCache('domains');
    showGlobalMessage('success', `Deleted ${domain.domain_name}`);

    // Reload domains to reflect changes
    showLoadingState();
    await loadDomainsFromAPI();
  } catch (error: unknown) {
    console.error('Failed to delete domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete domain';
    showGlobalMessage('error', errorMessage);
  }
}

/**
 * Handle block domain action
 * PATCH /domains/:id { blocked: true, blocked_reason: ... }
 */
async function handleBlockDomain(domain: Domain): Promise<void> {
  const confirmed = await showConfirmDialog('block-domain', {
    'block-domain-name': domain.domain_name,
  });
  if (!confirmed) return;

  try {
    await safeCall(
      () => blockDomain(domain.id, 'manual'),
      { lockKey: `block-domain-${domain.id}`, retryOn401: true }
    );

    invalidateCache('domains');
    showGlobalMessage('success', `Blocked ${domain.domain_name}`);

    // Reload domains to reflect changes
    showLoadingState();
    await loadDomainsFromAPI();
  } catch (error: unknown) {
    console.error('Failed to block domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to block domain';
    showGlobalMessage('error', errorMessage);
  }
}

/**
 * Handle unblock domain action
 * PATCH /domains/:id { blocked: false, blocked_reason: null }
 */
async function handleUnblockDomain(domain: Domain): Promise<void> {
  const confirmed = await showConfirmDialog('unblock-domain', {
    'unblock-domain-name': domain.domain_name,
  });
  if (!confirmed) return;

  try {
    await safeCall(
      () => unblockDomain(domain.id),
      { lockKey: `unblock-domain-${domain.id}`, retryOn401: true }
    );

    invalidateCache('domains');
    showGlobalMessage('success', `Unblocked ${domain.domain_name}`);

    // Reload domains to reflect changes
    showLoadingState();
    await loadDomainsFromAPI();
  } catch (error: unknown) {
    console.error('Failed to unblock domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to unblock domain';
    showGlobalMessage('error', errorMessage);
  }
}

/**
 * Handle change role action
 * PATCH /domains/:id { role: newRole }
 */
async function handleChangeRole(domain: Domain, newRole: Domain['role']): Promise<void> {
  if (!newRole) return;

  try {
    await safeCall(
      () => updateDomainRole(domain.id, newRole),
      { lockKey: `change-role-${domain.id}`, retryOn401: true }
    );

    invalidateCache('domains');

    const roleLabels = {
      acceptor: 'Acceptor',
      donor: 'Donor',
      reserve: 'Reserve',
    };
    showGlobalMessage('success', `Changed ${domain.domain_name} to ${roleLabels[newRole]}`);

    // Reload domains to reflect changes
    showLoadingState();
    await loadDomainsFromAPI();
  } catch (error: unknown) {
    console.error('Failed to change role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to change role';
    showGlobalMessage('error', errorMessage);
  }
}
