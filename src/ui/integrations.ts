import { t } from '@i18n';
import { getZones, syncZones } from '@api/zones';
import type { CloudflareZone } from '@api/zones';
import { getIntegrationKeys } from '@api/integrations';
import type { IntegrationKey } from '@api/types';
import { showGlobalMessage } from './notifications';
import { initTooltips } from './tooltip';
import { initDropdowns } from './dropdown';
import { initAddDomainsDrawer } from '@domains/add-domains-drawer';
import { initTabs } from './tabs';
import { initCfConnectForms } from '@forms/cf-connect';

/**
 * Virtual integration derived from zones and integration keys
 */
interface VirtualIntegration {
  provider: string;
  alias: string;
  keyId: number;           // Real account_key_id from /integrations/keys
  accountId: string;       // CF account ID for display
  rootDomain: string;
  domainCount: number;
  status: string;
  connectedAt: string;
}

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
function renderIntegrationRow(integration: VirtualIntegration): string {
  const providerInfo = getProviderInfo(integration.provider);
  const statusClass = getStatusClass(integration.status);
  const statusLabel = t(`integrations.status.${integration.status}` as any) || integration.status;

  // Tooltip: "example.com + 3 more" or just "example.com"
  const tooltipText = integration.domainCount > 1
    ? `${integration.rootDomain} + ${integration.domainCount - 1} more`
    : integration.rootDomain;

  const tooltipContent = `<div class="tooltip"><div class="tooltip__body">${tooltipText}</div></div>`;

  // Integration type based on provider
  const integrationType = integration.provider === 'cloudflare' ? 'CDN' : integration.provider;

  return `
    <tr data-integration-id="${integration.keyId}">
      <td class="provider-cell">
        <span class="icon" data-icon="${providerInfo.icon}"></span>
        <span class="provider-label">${providerInfo.name}</span>
      </td>
      <td class="text-muted">${integrationType}</td>
      <td class="text-muted">N/A</td>
      <td>
        <span
          data-tooltip
          data-tooltip-content="${tooltipContent.replace(/"/g, '&quot;')}"
          style="cursor: help;"
        >
          ${integration.domainCount}
        </span>
      </td>
      <td>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td class="text-muted">${formatDate(integration.connectedAt)}</td>
      <td class="table-actions">
        <div class="dropdown dropdown--menu">
          <button class="btn-icon btn-icon--neutral dropdown__trigger" type="button" aria-label="Actions">
            <span class="icon" data-icon="mono/dots-vertical"></span>
          </button>
          <div class="dropdown__menu dropdown__menu--right" role="menu">
            <button class="dropdown__item" type="button" data-action="sync-integration" data-key-id="${integration.keyId}">
              <span class="icon" data-icon="mono/refresh"></span>
              <span>Sync zones</span>
            </button>
            <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-integration" data-key-id="${integration.keyId}">
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
 * Create virtual integration from zones and integration key
 */
function createCloudflareIntegration(
  zones: CloudflareZone[],
  integrationKey: IntegrationKey
): VirtualIntegration | null {
  if (zones.length === 0) return null;

  const firstZone = zones[0];
  const activeZones = zones.filter(z => z.status === 'active');

  return {
    provider: 'cloudflare',
    alias: integrationKey.key_alias || 'Cloudflare Account',
    keyId: integrationKey.id,
    accountId: integrationKey.external_account_id || firstZone.cf_zone_id,
    rootDomain: firstZone.root_domain,
    domainCount: zones.length,
    status: integrationKey.status,
    connectedAt: integrationKey.created_at,
  };
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
 * Load and render integrations from zones and integration keys
 */
export async function loadIntegrations(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  showLoadingState();

  try {
    // Fetch both zones and integration keys
    const [zones, integrationKeys] = await Promise.all([
      getZones(),
      getIntegrationKeys('cloudflare'),
    ]);

    if (zones.length === 0 || integrationKeys.length === 0) {
      showEmptyState();
      return;
    }

    // Use first Cloudflare integration key
    const cfKey = integrationKeys[0];

    // Create virtual integration from zones and key
    const cfIntegration = createCloudflareIntegration(zones, cfKey);

    if (!cfIntegration) {
      showEmptyState();
      return;
    }

    // Render Cloudflare integration
    tbody.innerHTML = renderIntegrationRow(cfIntegration);

    // Initialize tooltips
    initTooltips();

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
 * Handle sync zones button click
 */
async function handleSyncZones(): Promise<void> {
  const syncBtn = document.querySelector<HTMLButtonElement>('[data-sync-zones]');
  if (!syncBtn) return;

  const originalText = syncBtn.textContent;
  syncBtn.disabled = true;
  syncBtn.textContent = 'Syncing...';

  try {
    // Try to sync without account_key_id (backend should determine from JWT)
    const result = await syncZones();

    showGlobalMessage('success', `Synced ${result.zones_synced} zones and ${result.domains_synced} domains`);

    // Reload integrations
    setTimeout(() => {
      loadIntegrations();
    }, 1000);
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to sync zones';
    showGlobalMessage('error', errorMessage);
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = originalText;
  }
}

/**
 * Handle sync integration action from dropdown
 */
async function handleSyncIntegration(event: Event): Promise<void> {
  const button = event.currentTarget as HTMLButtonElement;
  const keyId = button.dataset.keyId;

  if (!keyId) return;

  try {
    const result = await syncZones(parseInt(keyId, 10));
    showGlobalMessage('success', `Synced ${result.zones_synced} zones and ${result.domains_synced} domains`);

    // Reload integrations to update domain count
    setTimeout(() => {
      loadIntegrations();
    }, 1000);
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to sync zones';
    showGlobalMessage('error', errorMessage);
  }
}

/**
 * Handle delete integration action from dropdown
 */
async function handleDeleteIntegration(event: Event): Promise<void> {
  const button = event.currentTarget as HTMLButtonElement;
  const integrationId = button.dataset.integrationId;

  if (!integrationId) return;

  // TODO: Implement delete integration via API
  showGlobalMessage('info', 'Delete integration functionality will be implemented soon');
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

  // Attach sync zones handler for empty state button
  const syncBtn = document.querySelector('[data-sync-zones]');
  if (syncBtn) {
    syncBtn.addEventListener('click', handleSyncZones);
  }

  // Attach "Add domains" button handler
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsDrawer());
  });

  // Note: "Connect Cloudflare" handler is global (in main.ts)

  // Attach dropdown action handlers (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Sync integration
    if (target.closest('[data-action="sync-integration"]')) {
      handleSyncIntegration(e);
    }

    // Delete integration
    if (target.closest('[data-action="delete-integration"]')) {
      handleDeleteIntegration(e);
    }
  });
}
