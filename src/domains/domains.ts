import { mockDomains, type Domain } from './mock-data';
import { initAddDomainsDrawer } from './add-domains-drawer';
import { formatDomainDisplay } from '@utils/idn';
import { showDialog } from '@ui/dialog';
import { getDefaultFilters, hasActiveFilters, type ActiveFilters } from './filters-config';
import { filterDomains as applyFiltersAndSearch } from './filters';
import { renderFilterBar, initFilterUI } from './filters-ui';
import { updateDomainsBadge, updateDomainsHealthIndicator } from '@ui/sidebar-nav';
import { initBulkActions } from './bulk-actions';

let currentDomains: Domain[] = [];
let selectedDomains = new Set<number>();
let activeFilters: ActiveFilters = getDefaultFilters();
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 25;

export function initDomainsPage(): void {
  const card = document.querySelector('[data-domains-card]');
  if (!card) return;

  // Initialize Add Domains Drawer
  initAddDomainsDrawer();

  // Initialize Bulk Actions Bar
  initBulkActions();

  // Load mock data after short delay (simulate API)
  setTimeout(() => {
    loadDomains(mockDomains);
  }, 500);

  // Add domains button
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsDrawer());
  });

  // Retry button
  const retryBtn = document.querySelector('[data-action="retry"]');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      showLoadingState();
      setTimeout(() => loadDomains(mockDomains), 500);
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
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    } else {
      // Close all dropdowns when clicking outside
      document.querySelectorAll('.dropdown--open').forEach((dropdown) => {
        dropdown.classList.remove('dropdown--open');
        const trigger = dropdown.querySelector('.dropdown__trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
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
      case 'recheck-health':
        alert(`Re-checking health for ${domain.domain_name}...\n(API integration coming soon)`);
        break;
      case 'recheck-abuse':
        alert(`Re-checking abuse status for ${domain.domain_name}...\n(API integration coming soon)`);
        break;
      case 'sync-registrar':
        alert(`Syncing expiration data with registrar for ${domain.domain_name}...\n(API integration coming soon)`);
        break;
      case 'toggle-monitoring':
        alert(`${domain.monitoring_enabled ? 'Disabling' : 'Enabling'} monitoring for ${domain.domain_name}\n(API integration coming soon)`);
        break;
      case 'apply-security-preset':
        alert(`Apply security preset for ${domain.domain_name}\n(Will open drawer→Security tab or apply default preset)`);
        break;
      case 'view-analytics':
        alert(`Redirecting to /analytics?domain=${domain.domain_name}\n(Analytics page coming soon)`);
        // Future: window.location.href = `/analytics?domain=${encodeURIComponent(domain.domain_name)}`;
        break;
      case 'delete-domain':
        // Update dialog with domain name
        const deleteDomainNameEl = document.querySelector('[data-delete-domain-name]');
        if (deleteDomainNameEl) {
          deleteDomainNameEl.textContent = domain.domain_name;
        }

        // Store domain ID for confirmation handler
        const deleteDialog = document.querySelector('[data-dialog="delete-domain"]');
        if (deleteDialog) {
          deleteDialog.setAttribute('data-domain-id', domain.id.toString());
        }

        // Show confirmation dialog
        showDialog('delete-domain');
        break;
    }
  });

  // Delete domain confirmation handler
  const confirmDeleteBtn = document.querySelector('[data-confirm-delete]');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      const deleteDialog = document.querySelector('[data-dialog="delete-domain"]');
      const domainId = deleteDialog?.getAttribute('data-domain-id');

      if (domainId) {
        const domain = currentDomains.find((d) => d.id === parseInt(domainId));
        if (domain) {
          alert(`Delete ${domain.domain_name}\n(API integration coming soon)`);

          // Hide dialog
          if (deleteDialog) {
            deleteDialog.setAttribute('hidden', '');
          }
        }
      }
    });
  }

  // Count active filters
  const countActiveFilters = (): number => {
    let count = 0;
    if (activeFilters.status && activeFilters.status !== 'all') count++;
    if (activeFilters.health && activeFilters.health.length > 0) count++;
    if (activeFilters.provider && activeFilters.provider !== 'all') count++;
    if (activeFilters.project && activeFilters.project !== 'all') count++;
    if (activeFilters.role && activeFilters.role !== 'all') count++;
    if (activeFilters.expiry && activeFilters.expiry !== 'any') count++;
    return count;
  };

  // Update filters badge count
  const updateFiltersBadge = () => {
    const badge = document.querySelector('[data-filters-count]');
    if (badge) {
      const count = countActiveFilters();
      badge.textContent = count.toString();
      if (count > 0) {
        badge.removeAttribute('hidden');
      } else {
        badge.setAttribute('hidden', '');
      }
    }
  };

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
    renderFilters();
    applyFiltersAndRender();
    updateResetButton();
    updateFiltersBadge();
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

      onFilterChange();
    });

    // Initial state
    updateResetButton();
  }

  // Toggle filters button handler (mobile)
  const toggleFiltersBtn = document.querySelector('[data-toggle-filters]');
  if (toggleFiltersBtn && filterBarContainer) {
    toggleFiltersBtn.addEventListener('click', () => {
      const isExpanded = filterBarContainer.classList.contains('is-expanded');

      if (isExpanded) {
        filterBarContainer.classList.remove('is-expanded');
        toggleFiltersBtn.classList.remove('is-active');
        toggleFiltersBtn.setAttribute('aria-expanded', 'false');
      } else {
        filterBarContainer.classList.add('is-expanded');
        toggleFiltersBtn.classList.add('is-active');
        toggleFiltersBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Initial state
    updateFiltersBadge();
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
 * Calculate health status from domains
 * Returns: 'danger' | 'warning' | 'success' | null
 */
function calculateDomainsHealth(domains: Domain[]): 'danger' | 'warning' | 'success' | null {
  if (domains.length === 0) return null;

  let hasDanger = false;
  let hasWarning = false;

  for (const domain of domains) {
    // Danger: blocked, expired, SSL invalid, abuse
    if (
      domain.blocked ||
      (domain.expired_at && new Date(domain.expired_at) < new Date()) ||
      domain.ssl_status === 'invalid' ||
      domain.abuse_status !== 'clean'
    ) {
      hasDanger = true;
      break; // Highest priority, stop checking
    }

    // Warning: expiring soon, NS not verified, no SSL
    if (
      (domain.expired_at && isExpiringSoon(domain.expired_at, 30)) ||
      !domain.ns_verified ||
      !domain.ssl_status
    ) {
      hasWarning = true;
    }
  }

  if (hasDanger) return 'danger';
  if (hasWarning) return 'warning';
  return 'success';
}

/**
 * Check if domain expires within N days
 */
function isExpiringSoon(expiresAt: string, days: number): boolean {
  const expiryDate = new Date(expiresAt);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
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
          <td>
            <div>
              <div class="domain-cell">
                <strong>${formatDomainDisplay(domain.domain_name, 'compact')}</strong>
              </div>
              <div class="text-muted text-sm">
                ${domain.project_name}${domain.project_lang ? ` (${domain.project_lang})` : ''}
              </div>
            </div>
          </td>
          <td>${statusChip}</td>
          <td>${healthIcons}</td>
          <td>${expiresText}</td>
          <td>
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
                  <button class="dropdown__item" type="button" data-action="recheck-health" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/refresh"></span>
                    <span>Re-check health</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="recheck-abuse" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/alert-triangle"></span>
                    <span>Re-check abuse status</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="sync-registrar" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/sync"></span>
                    <span>Sync with registrar</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="toggle-monitoring" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/bell"></span>
                    <span>${domain.monitoring_enabled ? 'Disable' : 'Enable'} monitoring</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="apply-security-preset" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/security"></span>
                    <span>Apply security preset</span>
                  </button>
                  <hr class="dropdown__divider" />
                  <button class="dropdown__item" type="button" data-action="view-analytics" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/analytics"></span>
                    <span>View analytics</span>
                  </button>
                  <hr class="dropdown__divider" />
                  <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-domain" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/delete"></span>
                    <span>Delete domain</span>
                  </button>
                </div>
              </div>
            </div>
          </td>
          <td>
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

  // SSL icon
  if (domain.ssl_status === 'valid') {
    icons.push('<span class="icon text-ok" data-icon="mono/lock" title="SSL valid"></span>');
  } else if (domain.ssl_status === 'expiring') {
    icons.push('<span class="icon text-warning" data-icon="mono/lock" title="SSL expiring soon"></span>');
  } else if (domain.ssl_status === 'invalid') {
    icons.push('<span class="icon text-danger" data-icon="mono/lock" title="SSL invalid"></span>');
  } else {
    icons.push('<span class="icon text-muted" data-icon="mono/lock" title="SSL off"></span>');
  }

  // Abuse icon
  if (domain.abuse_status === 'clean') {
    icons.push('<span class="icon text-ok" data-icon="mono/security" title="Clean"></span>');
  } else if (domain.abuse_status === 'warning') {
    icons.push('<span class="icon text-warning" data-icon="mono/security" title="Warning"></span>');
  } else {
    icons.push('<span class="icon text-danger" data-icon="mono/security" title="Blocked"></span>');
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
  const monitoringEl = drawer.querySelector('[data-inspector-monitoring]');

  if (domainEl) domainEl.textContent = domain.domain_name;
  if (statusEl) {
    const statusText = domain.status.charAt(0).toUpperCase() + domain.status.slice(1);
    const statusColor = getStatusColor(domain.status);
    statusEl.innerHTML = `<span class="${statusColor}">${statusText}</span>`;
  }
  if (projectEl) projectEl.textContent = `${domain.project_name}${domain.project_lang ? ` (${domain.project_lang})` : ''}`;

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
  if (monitoringEl) monitoringEl.textContent = domain.monitoring_enabled ? 'Enabled' : 'Disabled';

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
