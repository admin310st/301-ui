import { t } from '@i18n';
import { getIntegrationKeys } from '@api/integrations';
import { getZones } from '@api/zones';
import type { IntegrationKey } from '@api/types';
import type { CloudflareZone } from '@api/zones';
import { showGlobalMessage } from './notifications';
import { initTooltips } from './tooltip';

/**
 * Virtual integration derived from keys + zones
 */
interface VirtualIntegration {
  provider: string;
  alias: string;
  accountId: string;
  domainCount: number;
  status: string;
  connectedAt: string;
  keyId: number;
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

  // Account ID with tooltip (email placeholder for future)
  const accountIdShort = integration.accountId
    ? integration.accountId.substring(0, 8) + '...'
    : '—';

  const tooltipContent = integration.provider === 'cloudflare'
    ? `<div class="tooltip"><div class="tooltip__body">Account ID: ${integration.accountId}</div></div>`
    : '';

  return `
    <tr data-key-id="${integration.keyId}">
      <td class="provider-cell">
        <span class="icon" data-icon="${providerInfo.icon}"></span>
        <span class="provider-label">${providerInfo.name}</span>
      </td>
      <td>${integration.alias}</td>
      <td>
        <span
          data-tooltip
          data-tooltip-content="${tooltipContent.replace(/"/g, '&quot;')}"
          style="cursor: help;"
        >
          ${accountIdShort}
        </span>
      </td>
      <td class="text-muted">${integration.domainCount}</td>
      <td>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td class="text-muted">${formatDate(integration.connectedAt)}</td>
      <td class="table-actions">
        <span class="text-muted" style="font-size: var(--fs-xs);">—</span>
      </td>
    </tr>
  `;
}

/**
 * Create virtual integration from key + zones
 */
function createCloudflareIntegration(key: IntegrationKey, zones: CloudflareZone[]): VirtualIntegration {
  return {
    provider: key.provider,
    alias: key.key_alias || 'Cloudflare Account',
    accountId: key.external_account_id || '—',
    domainCount: zones.length,
    status: key.status,
    connectedAt: key.created_at,
    keyId: key.id,
  };
}

/**
 * Show loading state
 */
function showLoadingState(): void {
  const loading = document.querySelector<HTMLElement>('[data-integrations-loading]');
  const empty = document.querySelector<HTMLElement>('[data-integrations-empty]');
  const table = document.querySelector<HTMLElement>('[data-integrations-table]');

  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  if (table) table.hidden = true;
}

/**
 * Show empty state
 */
function showEmptyState(): void {
  const loading = document.querySelector<HTMLElement>('[data-integrations-loading]');
  const empty = document.querySelector<HTMLElement>('[data-integrations-empty]');
  const table = document.querySelector<HTMLElement>('[data-integrations-table]');

  if (loading) loading.hidden = true;
  if (empty) empty.hidden = false;
  if (table) table.hidden = true;
}

/**
 * Show table state
 */
function showTableState(): void {
  const loading = document.querySelector<HTMLElement>('[data-integrations-loading]');
  const empty = document.querySelector<HTMLElement>('[data-integrations-empty]');
  const table = document.querySelector<HTMLElement>('[data-integrations-table]');

  if (loading) loading.hidden = true;
  if (empty) empty.hidden = true;
  if (table) table.hidden = false;
}

/**
 * Load and render integrations from keys + zones
 */
async function loadIntegrations(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  showLoadingState();

  try {
    // Get integration keys (Cloudflare, Namecheap, etc.)
    const keys = await getIntegrationKeys();

    // Filter only Cloudflare keys
    const cfKeys = keys.filter(k => k.provider === 'cloudflare');

    if (cfKeys.length === 0) {
      showEmptyState();
      return;
    }

    // Get zones for domain count (may be empty for new accounts)
    const zones = await getZones();

    // Create virtual integrations from keys + zones
    const integrations = cfKeys.map(key => createCloudflareIntegration(key, zones));

    // Render all integrations
    tbody.innerHTML = integrations.map(renderIntegrationRow).join('');

    // Initialize tooltips for account IDs
    initTooltips();

    showTableState();
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to load integrations';
    showGlobalMessage('error', errorMessage);
    showEmptyState();
  }
}

/**
 * Initialize integrations page
 */
export function initIntegrationsPage(): void {
  // Only run on integrations page
  if (!document.querySelector('[data-integrations-tbody]')) return;

  loadIntegrations();
}
