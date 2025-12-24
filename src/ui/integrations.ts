import { t } from '@i18n';
import { getIntegrationKeys, deleteIntegrationKey } from '@api/integrations';
import type { IntegrationKey } from '@api/types';
import { showGlobalMessage } from './notifications';
import { initTooltips } from './tooltip';

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
 * Render a single integration key row
 */
function renderKeyRow(key: IntegrationKey): string {
  const providerInfo = getProviderInfo(key.provider);
  const statusClass = getStatusClass(key.status);
  const statusLabel = t(`integrations.status.${key.status}` as any) || key.status;

  // Account ID with tooltip (email placeholder for future)
  const accountIdShort = key.external_account_id
    ? key.external_account_id.substring(0, 8) + '...'
    : '—';

  const tooltipContent = key.provider === 'cloudflare'
    ? `<div class="tooltip"><div class="tooltip__body">Account: ${key.external_account_id}<br>Email: email@2do.com</div></div>`
    : '';

  // Domain count (placeholder - will be fetched from API later)
  const domainCount = '—'; // TODO: Fetch from GET /domains

  return `
    <tr data-key-id="${key.id}">
      <td class="provider-cell">
        <span class="icon" data-icon="${providerInfo.icon}"></span>
        <span class="provider-label">${providerInfo.name}</span>
      </td>
      <td>${key.key_alias || '—'}</td>
      <td>
        <span
          data-tooltip
          data-tooltip-content="${tooltipContent.replace(/"/g, '&quot;')}"
          style="cursor: help;"
        >
          ${accountIdShort}
        </span>
      </td>
      <td class="text-muted">${domainCount}</td>
      <td>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td class="text-muted">${formatDate(key.created_at)}</td>
      <td class="table-actions">
        <button
          type="button"
          class="btn-icon"
          data-action="delete"
          data-key-id="${key.id}"
          aria-label="Delete integration"
          title="Delete integration"
        >
          <span class="icon" data-icon="mono/delete"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Handle delete action
 */
async function handleDelete(keyId: number): Promise<void> {
  if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
    return;
  }

  try {
    await deleteIntegrationKey(keyId);
    showGlobalMessage('success', 'Integration deleted successfully');

    // Remove row from table
    const row = document.querySelector(`tr[data-key-id="${keyId}"]`);
    if (row) {
      row.remove();
    }

    // Check if table is now empty
    const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
    if (tbody && tbody.children.length === 0) {
      showEmptyState();
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to delete integration';
    showGlobalMessage('error', errorMessage);
  }
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
 * Load and render integration keys
 */
async function loadIntegrations(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>('[data-integrations-tbody]');
  if (!tbody) return;

  showLoadingState();

  try {
    const keys = await getIntegrationKeys();

    if (keys.length === 0) {
      showEmptyState();
      return;
    }

    // Render rows
    tbody.innerHTML = keys.map(renderKeyRow).join('');

    // Attach delete handlers
    tbody.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const keyId = Number(target.dataset.keyId);
        await handleDelete(keyId);
      });
    });

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
