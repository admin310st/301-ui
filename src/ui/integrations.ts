import { t } from '@i18n';
import { getIntegrationKeys, getIntegrationKey, deleteIntegrationKey, updateIntegrationKey } from '@api/integrations';
import type { IntegrationKey } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from './notifications';
import { initDropdowns } from './dropdown';
import { initAddDomainsDrawer } from '@domains/add-domains-drawer';
import { initTabs } from './tabs';
import { initCfConnectForms } from '@forms/cf-connect';
import { showDialog, hideDialog } from './dialog';
import { getZones } from '@api/zones';

// Store current editing key
let currentEditingKey: IntegrationKey | null = null;

// Store search query
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
 * Get provider display name and icon
 */
function getProviderInfo(provider: string): { name: string; icon: string } {
  const providers: Record<string, { name: string; icon: string }> = {
    cloudflare: { name: 'Cloudflare', icon: 'brand/cloudflare' },
    namecheap: { name: 'Namecheap', icon: 'brand/namecheap' },
    namesilo: { name: 'NameSilo', icon: 'brand/namesilo' },
    hosttracker: { name: 'HostTracker', icon: 'mono/server' },
    google_analytics: { name: 'Google Analytics', icon: 'brand/google' },
    yandex_metrica: { name: 'Yandex Metrica', icon: 'brand/yandex' },
  };

  return providers[provider] || { name: provider, icon: 'mono/key' };
}

/**
 * Get status badge class
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'active':
      return 'badge--success';
    case 'expired':
      return 'badge--warning';
    case 'revoked':
      return 'badge--danger';
    default:
      return 'badge--neutral';
  }
}

/**
 * Render a single integration row
 */
function renderIntegrationRow(key: IntegrationKey, zonesCount: number = 0): string {
  const providerInfo = getProviderInfo(key.provider);
  const statusClass = getStatusClass(key.status);
  const statusLabel = t(`integrations.status.${key.status}` as any) || key.status;

  return `
    <tr data-key-id="${key.id}">
      <td data-priority="critical" class="provider-cell">
        <span class="icon" data-icon="${providerInfo.icon}"></span>
        <span class="provider-label">${providerInfo.name}</span>
      </td>
      <td data-priority="high" title="Account ID: ${key.external_account_id}">${key.key_alias}</td>
      <td data-priority="medium" class="text-muted">${zonesCount > 0 ? zonesCount : '—'}</td>
      <td data-priority="high">
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td data-priority="low" class="text-muted">${formatDate(key.last_used)}</td>
      <td data-priority="critical" class="table-actions">
        <button
          class="btn-icon"
          type="button"
          data-action="edit-key"
          data-key-id="${key.id}"
          aria-label="Edit ${key.key_alias}"
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
function showLoadingState(): void {
  const header = document.querySelector<HTMLElement>('[data-integrations-header]');
  const loading = document.querySelector<HTMLElement>('[data-integrations-loading]');
  const empty = document.querySelector<HTMLElement>('[data-integrations-empty]');
  const table = document.querySelector<HTMLElement>('[data-integrations-table]');

  if (header) header.hidden = true;
  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  if (table) table.hidden = true;
}

/**
 * Show empty state
 */
function showEmptyState(): void {
  const header = document.querySelector<HTMLElement>('[data-integrations-header]');
  const loading = document.querySelector<HTMLElement>('[data-integrations-loading]');
  const empty = document.querySelector<HTMLElement>('[data-integrations-empty]');
  const table = document.querySelector<HTMLElement>('[data-integrations-table]');

  if (header) header.hidden = true;
  if (loading) loading.hidden = true;
  if (empty) empty.hidden = false;
  if (table) table.hidden = true;
}

/**
 * Show table state
 */
function showTableState(): void {
  const header = document.querySelector<HTMLElement>('[data-integrations-header]');
  const loading = document.querySelector<HTMLElement>('[data-integrations-loading]');
  const empty = document.querySelector<HTMLElement>('[data-integrations-empty]');
  const table = document.querySelector<HTMLElement>('[data-integrations-table]');

  if (header) header.hidden = false;
  if (loading) loading.hidden = true;
  if (empty) empty.hidden = true;
  if (table) table.hidden = false;
}

// Store all loaded integrations and zones for filtering
let allIntegrations: IntegrationKey[] = [];
let zonesCountMap: Record<number, number> = {};

/**
 * Load and render integration keys
 */
export async function loadIntegrations(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  showLoadingState();

  try {
    // Get account ID from auth state
    const accountId = getAccountId();
    if (!accountId) {
      throw new Error('Account ID not found. Please log in again.');
    }

    // Fetch all integration keys (all providers) and zones in parallel
    const [integrationKeys, zones] = await Promise.all([
      getIntegrationKeys(accountId),
      getZones().catch(() => []) // Graceful fallback if zones fail
    ]);

    // Store for filtering
    allIntegrations = integrationKeys;

    if (integrationKeys.length === 0) {
      showEmptyState();
      return;
    }

    // Count zones per integration key (requires key_id in API response)
    zonesCountMap = zones.reduce((acc, zone) => {
      if (zone.key_id) {
        acc[zone.key_id] = (acc[zone.key_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    // Apply current search filter
    renderFilteredIntegrations();

    showTableState();
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to load integrations';
    showGlobalMessage('error', errorMessage);
    showEmptyState();
  }
}

/**
 * Filter and render integrations based on search query
 */
function renderFilteredIntegrations(): void {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  // Filter integrations by provider name or alias
  const filtered = allIntegrations.filter(key => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const providerInfo = getProviderInfo(key.provider);
    const providerName = providerInfo.name.toLowerCase();
    const alias = key.key_alias.toLowerCase();

    return providerName.includes(query) || alias.includes(query);
  });

  // Render filtered results
  tbody.innerHTML = filtered
    .map(key => renderIntegrationRow(key, zonesCountMap[key.id] || 0))
    .join('');

  // Re-initialize dropdowns after render
  const tableContainer = document.querySelector('[data-integrations-table]');
  if (tableContainer) {
    initDropdowns(tableContainer as HTMLElement);
  }
}


/**
 * Handle edit key action - open drawer
 */
async function handleEditKey(event: Event): Promise<void> {
  const target = event.target as HTMLElement;
  const button = target.closest('[data-action="edit-key"]') as HTMLButtonElement;

  if (!button) return;

  const keyId = button.dataset.keyId;
  if (!keyId) return;

  try {
    // Fetch full key details
    const key = await getIntegrationKey(parseInt(keyId, 10));
    currentEditingKey = key;

    // Open drawer
    openEditIntegrationDrawer(key);
  } catch (error: any) {
    showGlobalMessage('error', error.message || 'Failed to load integration details');
  }
}

/**
 * Open edit integration drawer and populate with key data
 */
function openEditIntegrationDrawer(key: IntegrationKey): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-integration"]');
  if (!drawer) return;

  // Populate provider info
  const providerIcon = drawer.querySelector('[data-integration-provider-icon]');
  const providerName = drawer.querySelector('[data-integration-provider-name]');
  const accountIdEl = drawer.querySelector('[data-integration-account-id]');

  if (providerIcon) {
    const { icon, name } = getProviderInfo(key.provider);
    providerIcon.setAttribute('data-icon', icon);
    if (providerName) providerName.textContent = name;
  }

  if (accountIdEl) {
    accountIdEl.textContent = key.external_account_id;
  }

  // Populate form fields
  const aliasInput = drawer.querySelector<HTMLInputElement>('[name="key_alias"]');
  if (aliasInput) aliasInput.value = key.key_alias;

  // Set status toggle button state
  const statusToggle = drawer.querySelector('[data-integration-toggle="status"]');
  if (statusToggle) {
    const isActive = key.status === 'active';
    statusToggle.setAttribute('data-status', key.status);
    (statusToggle as HTMLElement).style.borderColor = isActive ? 'var(--ok)' : 'var(--danger)';

    const icon = statusToggle.querySelector('.icon');
    const label = statusToggle.querySelector('span:last-child');

    if (icon) {
      icon.setAttribute('data-icon', isActive ? 'mono/check-circle' : 'mono/close-circle');
      (icon as HTMLElement).style.color = isActive ? 'var(--ok)' : 'var(--danger)';
    }

    if (label) {
      label.textContent = isActive ? 'Active' : 'Revoked';
    }
  }

  // Show/hide rotate token section (Cloudflare only)
  const rotateSection = drawer.querySelector('[data-rotate-token-section]');
  if (rotateSection) {
    if (key.provider === 'cloudflare' && key.status === 'active') {
      rotateSection.removeAttribute('hidden');
    } else {
      rotateSection.setAttribute('hidden', '');
    }
  }

  // Show drawer
  drawer.removeAttribute('hidden');
}


/**
 * Open add domains drawer
 */
function openAddDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domains"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');
}

/**
 * Open connect Cloudflare drawer
 */
export function openConnectCloudflareDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="connect-cloudflare"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');

  // Initialize tabs if not already done
  const tabsContainer = drawer.querySelector('.tabs');
  if (tabsContainer) {
    initTabs(drawer);
  }

  // Initialize CF connect forms (includes curl parsing)
  initCfConnectForms();

  // Set initial footer button visibility based on active tab
  const activePanel = drawer.querySelector('.tabs__panel.is-active');
  const activePanelId = activePanel?.getAttribute('data-tab-panel');
  if (activePanelId) {
    const footerActions = drawer.querySelectorAll<HTMLButtonElement>('[data-footer-action]');
    footerActions.forEach((btn) => {
      if (btn.dataset.footerAction === activePanelId) {
        btn.removeAttribute('hidden');
      } else {
        btn.setAttribute('hidden', '');
      }
    });
  }

  // Close drawer function
  const closeDrawer = () => {
    drawer.setAttribute('hidden', '');
  };

  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) {
      closeDrawer();
    }
  };

  // Remove old listener if exists, add new one
  document.removeEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handleEscape);

  // Close on overlay or close button click
  drawer.querySelectorAll('[data-drawer-close]').forEach((el) => {
    el.addEventListener('click', closeDrawer);
  });
}

/**
 * Open connect NameCheap drawer
 */
export function openConnectNamecheapDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="connect-namecheap"]');
  if (!drawer) {
    console.warn('NameCheap drawer not found');
    return;
  }

  drawer.removeAttribute('hidden');

  // Initialize NameCheap connect form
  import('@forms/nc-connect').then(({ initNcConnectForm }) => {
    initNcConnectForm();
  });

  // Close drawer function
  const closeDrawer = () => {
    drawer.setAttribute('hidden', '');
  };

  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) {
      closeDrawer();
    }
  };

  // Remove old listener if exists, add new one
  document.removeEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handleEscape);

  // Close on overlay or close button click
  drawer.querySelectorAll('[data-drawer-close]').forEach((el) => {
    el.addEventListener('click', closeDrawer);
  });
}

/**
 * Initialize edit integration drawer
 */
function initEditIntegrationDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-integration"]');
  if (!drawer) return;

  // Close drawer handlers
  drawer.querySelectorAll('[data-drawer-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      drawer.setAttribute('hidden', '');
      currentEditingKey = null;
    });
  });

  // Status toggle handler
  const statusToggle = drawer.querySelector('[data-integration-toggle="status"]');
  statusToggle?.addEventListener('click', () => {
    const currentStatus = statusToggle.getAttribute('data-status');
    const newStatus = currentStatus === 'active' ? 'revoked' : 'active';
    const isActive = newStatus === 'active';

    // Update data attribute
    statusToggle.setAttribute('data-status', newStatus);

    // Update border color
    (statusToggle as HTMLElement).style.borderColor = isActive ? 'var(--ok)' : 'var(--danger)';

    // Update icon
    const icon = statusToggle.querySelector('.icon');
    if (icon) {
      icon.setAttribute('data-icon', isActive ? 'mono/check-circle' : 'mono/close-circle');
      (icon as HTMLElement).style.color = isActive ? 'var(--ok)' : 'var(--danger)';
    }

    // Update label
    const label = statusToggle.querySelector('span:last-child');
    if (label) {
      label.textContent = isActive ? 'Active' : 'Revoked';
    }
  });

  // Form submit - save alias and status
  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-integration"]');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditingKey) return;

    const formData = new FormData(form);
    const alias = formData.get('key_alias') as string;

    // Get status from toggle button
    const statusToggleBtn = drawer.querySelector('[data-integration-toggle="status"]');
    const status = (statusToggleBtn?.getAttribute('data-status') || 'active') as 'active' | 'revoked';

    try {
      await updateIntegrationKey(currentEditingKey.id, {
        key_alias: alias,
        status,
      });

      showGlobalMessage('success', 'Integration updated successfully');
      drawer.setAttribute('hidden', '');
      currentEditingKey = null;

      // Reload integrations
      await loadIntegrations();
    } catch (error: any) {
      showGlobalMessage('error', error.message || 'Failed to update integration');
    }
  });

  // Delete integration - open confirmation dialog
  const deleteBtn = drawer.querySelector('[data-action="delete-integration"]');
  deleteBtn?.addEventListener('click', () => {
    if (!currentEditingKey) return;

    // Populate dialog with integration info
    const dialog = document.querySelector('[data-dialog="delete-integration"]');
    if (!dialog) return;

    const aliasEl = dialog.querySelector('[data-integration-alias]');
    const providerEl = dialog.querySelector('[data-integration-provider]');

    if (aliasEl) aliasEl.textContent = currentEditingKey.key_alias;
    if (providerEl) {
      const providerInfo = getProviderInfo(currentEditingKey.provider);
      providerEl.textContent = providerInfo.name;
    }

    // Show confirmation dialog
    showDialog('delete-integration');
  });

  // Rotate token (Cloudflare)
  const rotateBtn = drawer.querySelector('[data-action="rotate-token-submit"]');
  rotateBtn?.addEventListener('click', () => {
    showGlobalMessage('info', 'Token rotation functionality coming soon');
  });
}

/**
 * Initialize integrations page
 */
export function initIntegrationsPage(): void {
  // Only run on integrations page
  if (!document.querySelector('[data-integrations-tbody]')) return;

  // Initialize drawers
  initAddDomainsDrawer();
  initCfConnectForms();
  initEditIntegrationDrawer();

  // Initialize page header dropdown for "Add integration"
  const pageHeader = document.querySelector('.page-header');
  if (pageHeader) {
    initDropdowns(pageHeader as HTMLElement);
  }

  // Load integrations when account ID becomes available
  const accountId = getAccountId();
  if (accountId) {
    // Account ID already available (page reload case)
    loadIntegrations();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          loadIntegrations();
          unsubscribe(); // Only load once
        }
      });
    });
  }

  // Attach "Add domains" button handler
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsDrawer());
  });

  // Note: "Connect Cloudflare" and "Connect NameCheap" handlers are global (in main.ts)

  // Search input handler
  const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
  const searchClear = document.querySelector<HTMLButtonElement>('[data-search-clear]');
  const searchContainer = document.querySelector<HTMLElement>('[data-table-search]');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      renderFilteredIntegrations();

      // Toggle active state
      if (searchContainer) {
        if (searchQuery) {
          searchContainer.classList.add('table-search--active');
        } else {
          searchContainer.classList.remove('table-search--active');
        }
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      if (searchContainer) searchContainer.classList.remove('table-search--active');
      renderFilteredIntegrations();
    });
  }

  // Attach edit key handler (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Edit key - opens drawer
    if (target.closest('[data-action="edit-key"]')) {
      handleEditKey(e);
    }

    // Confirm delete integration from dialog
    if (target.closest('[data-confirm-delete-integration]')) {
      handleConfirmDeleteIntegration();
    }
  });
}

/**
 * Handle confirmed delete integration from dialog
 */
async function handleConfirmDeleteIntegration(): Promise<void> {
  if (!currentEditingKey) return;

  try {
    await deleteIntegrationKey(currentEditingKey.id);
    showGlobalMessage('success', 'Integration deleted successfully');

    // Hide dialog and drawer
    hideDialog('delete-integration');
    const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-integration"]');
    if (drawer) drawer.setAttribute('hidden', '');

    currentEditingKey = null;

    // Reload integrations
    await loadIntegrations();
  } catch (error: any) {
    showGlobalMessage('error', error.message || 'Failed to delete integration');
    hideDialog('delete-integration');
  }
}
