import { t } from '@i18n';
import { getZones } from '@api/zones';
import type { CloudflareZone } from '@api/zones';
import { showGlobalMessage } from './notifications';
import { initTooltips } from './tooltip';

/**
 * Virtual integration derived from zones
 */
interface VirtualIntegration {
  provider: string;
  alias: string;
  accountId: string;
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

  // Account ID with tooltip (email placeholder for future)
  const accountIdShort = integration.accountId
    ? integration.accountId.substring(0, 8) + '...'
    : '—';

  const tooltipContent = integration.provider === 'cloudflare'
    ? `<div class="tooltip"><div class="tooltip__body">Account: ${integration.accountId}<br>Email: email@2do.com</div></div>`
    : '';

  return `
    <tr>
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
 * Create virtual integration from zones
 */
function createCloudflareIntegration(zones: CloudflareZone[]): VirtualIntegration | null {
  if (zones.length === 0) return null;

  // Use first zone for account info
  const firstZone = zones[0];
  const activeZones = zones.filter(z => z.status === 'active');

  return {
    provider: 'cloudflare',
    alias: 'Cloudflare Account',
    accountId: firstZone.cf_zone_id, // Using zone ID as account identifier
    domainCount: zones.length,
    status: activeZones.length > 0 ? 'active' : 'pending',
    connectedAt: firstZone.created_at
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
 * Load and render integrations from zones
 */
async function loadIntegrations(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  showLoadingState();

  try {
    const zones = await getZones();

    // Create virtual integration from zones
    const cfIntegration = createCloudflareIntegration(zones);

    if (!cfIntegration) {
      showEmptyState();
      return;
    }

    // Render single Cloudflare integration
    tbody.innerHTML = renderIntegrationRow(cfIntegration);

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
