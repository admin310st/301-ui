import { t } from '@i18n';
import { getIntegrationKeys, deleteIntegrationKey } from '@api/integrations';
import type { IntegrationKey } from '@api/types';
import { showGlobalMessage } from './notifications';
import { initDropdowns } from './dropdown';
import { initAddDomainsDrawer } from '@domains/add-domains-drawer';
import { initTabs } from './tabs';
import { initCfConnectForms } from '@forms/cf-connect';

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
function renderIntegrationRow(key: IntegrationKey): string {
  const providerInfo = getProviderInfo(key.provider);
  const statusClass = getStatusClass(key.status);
  const statusLabel = t(`integrations.status.${key.status}` as any) || key.status;

  return `
    <tr data-key-id="${key.id}">
      <td class="provider-cell">
        <span class="icon" data-icon="${providerInfo.icon}"></span>
        <span class="provider-label">${providerInfo.name}</span>
      </td>
      <td>${key.key_alias}</td>
      <td class="text-muted"><code class="code-inline">${key.external_account_id}</code></td>
      <td>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td class="text-muted">${formatDate(key.last_used)}</td>
      <td class="table-actions">
        <div class="dropdown dropdown--menu">
          <button class="btn-icon btn-icon--neutral dropdown__trigger" type="button" aria-label="Actions">
            <span class="icon" data-icon="mono/dots-vertical"></span>
          </button>
          <div class="dropdown__menu dropdown__menu--right" role="menu">
            <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-integration" data-key-id="${key.id}">
              <span class="icon" data-icon="mono/delete"></span>
              <span>Delete</span>
            </button>
          </div>
        </div>
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

/**
 * Load and render integration keys
 */
export async function loadIntegrations(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  showLoadingState();

  try {
    // Fetch all integration keys (all providers)
    const integrationKeys = await getIntegrationKeys();

    if (integrationKeys.length === 0) {
      showEmptyState();
      return;
    }

    // Render all integration keys
    tbody.innerHTML = integrationKeys.map(key => renderIntegrationRow(key)).join('');

    // Initialize dropdowns
    const tableContainer = document.querySelector('[data-integrations-table]');
    if (tableContainer) {
      initDropdowns(tableContainer as HTMLElement);
    }

    showTableState();
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to load integrations';
    showGlobalMessage('error', errorMessage);
    showEmptyState();
  }
}


/**
 * Handle delete integration action from dropdown
 */
async function handleDeleteIntegration(event: Event): Promise<void> {
  const button = event.currentTarget as HTMLButtonElement;
  const keyId = button.dataset.keyId;

  if (!keyId) return;

  const confirmed = confirm('Delete this integration? The API key will be removed from 301.st.');

  if (!confirmed) return;

  try {
    await deleteIntegrationKey(parseInt(keyId, 10));
    showGlobalMessage('success', 'Integration deleted successfully');

    // Reload integrations
    await loadIntegrations();
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to delete integration';
    showGlobalMessage('error', errorMessage);
  }
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
 * Initialize integrations page
 */
export function initIntegrationsPage(): void {
  // Only run on integrations page
  if (!document.querySelector('[data-integrations-tbody]')) return;

  // Initialize add domains drawer
  initAddDomainsDrawer();

  // Initialize CF connect forms
  initCfConnectForms();

  // Load integrations
  loadIntegrations();

  // Attach "Add domains" button handler
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsDrawer());
  });

  // Note: "Connect Cloudflare" handler is global (in main.ts)

  // Attach dropdown action handlers (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Delete integration
    if (target.closest('[data-action="delete-integration"]')) {
      handleDeleteIntegration(e);
    }
  });
}
