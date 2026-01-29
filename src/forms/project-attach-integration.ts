/**
 * Project Attach Integration Handler
 * Handles attaching integration keys to projects
 */

import { getIntegrationKeys, type IntegrationKey } from '@api/integrations';
import { attachIntegration, getProjectIntegrations } from '@api/projects';
import { getAuthState } from '@state/auth-state';
import { getCurrentProjectId, setIntegrations } from '@state/project-detail-state';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';
import { safeCall } from '@api/ui-client';
import { invalidateCache } from '@api/cache';

let currentProjectId: number | null = null;

/**
 * Open attach integration drawer
 */
export async function openAttachIntegrationDrawer(projectId: number): Promise<void> {
  currentProjectId = projectId;
  const drawer = document.querySelector<HTMLElement>('[data-drawer="attach-integration"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');
  await loadAvailableIntegrations(projectId);
}

/**
 * Close attach integration drawer
 */
export function closeAttachIntegrationDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="attach-integration"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');
  // Note: Don't reset currentProjectId - it's the global project filter for navigation

  // Reset selection
  const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-select]');
  if (selectBtn) {
    selectBtn.setAttribute('data-selected-value', '');
    const label = selectBtn.querySelector('[data-selected-label]');
    if (label) label.textContent = 'Choose an integration...';
  }

  // Disable submit button
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-submit]');
  if (submitBtn) submitBtn.disabled = true;

  // Hide status panel
  const statusPanel = document.querySelector<HTMLElement>('[data-attach-integration-status]');
  if (statusPanel) statusPanel.setAttribute('hidden', '');

  // Reset states for next open (loading shows by default)
  const loadingEl = drawer.querySelector<HTMLElement>('[data-attach-integration-loading]');
  const emptyEl = drawer.querySelector<HTMLElement>('[data-attach-integration-empty]');
  const formEl = drawer.querySelector<HTMLElement>('[data-attach-integration-form]');

  if (loadingEl) loadingEl.removeAttribute('hidden');
  if (emptyEl) emptyEl.setAttribute('hidden', '');
  if (formEl) formEl.setAttribute('hidden', '');
}

/**
 * Load available integrations (not yet attached to project)
 */
async function loadAvailableIntegrations(projectId: number): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId) {
    showGlobalMessage('error', 'Account ID not found');
    return;
  }

  const loadingEl = document.querySelector<HTMLElement>('[data-attach-integration-loading]');
  const emptyEl = document.querySelector<HTMLElement>('[data-attach-integration-empty]');
  const formEl = document.querySelector<HTMLElement>('[data-attach-integration-form]');
  const menu = document.querySelector<HTMLElement>('[data-attach-integration-menu]');

  if (!menu || !formEl || !emptyEl) return;

  // Show loading
  if (loadingEl) loadingEl.removeAttribute('hidden');
  formEl.setAttribute('hidden', '');
  emptyEl.setAttribute('hidden', '');

  try {
    // Get all integrations and already attached integrations in parallel
    const [allIntegrations, attachedIntegrations] = await Promise.all([
      safeCall(() => getIntegrationKeys(accountId), { retryOn401: true }),
      safeCall(() => getProjectIntegrations(projectId), { retryOn401: true }),
    ]);

    // Filter out already attached integrations
    const attachedKeyIds = new Set(attachedIntegrations.map(i => i.account_key_id));
    const availableIntegrations = allIntegrations.filter(
      integration => !attachedKeyIds.has(integration.id)
    );

    // Hide loading
    if (loadingEl) loadingEl.setAttribute('hidden', '');

    if (availableIntegrations.length === 0) {
      emptyEl.removeAttribute('hidden');
      return;
    }

    // Render dropdown options
    menu.innerHTML = availableIntegrations
      .map(
        integration => `
      <button
        class="dropdown__item"
        type="button"
        role="menuitem"
        data-value="${integration.id}"
      >
        <div class="provider-cell">
          <span class="icon" data-icon="${getProviderIcon(integration.provider)}"></span>
          <span>${integration.key_alias || integration.provider}</span>
        </div>
      </button>
    `
      )
      .join('');

    // Re-inject icons
    if (typeof (window as any).injectIcons === 'function') {
      (window as any).injectIcons();
    }

    formEl.removeAttribute('hidden');
  } catch (error: any) {
    if (loadingEl) loadingEl.setAttribute('hidden', '');
    emptyEl.removeAttribute('hidden');
    showGlobalMessage('error', error.message || 'Failed to load integrations');
  }
}

/**
 * Get provider icon name
 */
function getProviderIcon(provider: string): string {
  switch (provider) {
    case 'cloudflare':
      return 'brand/cloudflare';
    case 'namecheap':
      return 'brand/namecheap';
    default:
      return 'mono/key';
  }
}

/**
 * Handle attach integration
 */
async function handleAttachIntegration(): Promise<void> {
  if (!currentProjectId) return;

  const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-select]');
  const selectedKeyId = selectBtn?.getAttribute('data-selected-value');

  if (!selectedKeyId) {
    showGlobalMessage('warning', 'Please select an integration');
    return;
  }

  const statusPanel = document.querySelector<HTMLElement>('[data-attach-integration-status]');
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-submit]');

  try {
    if (submitBtn) submitBtn.disabled = true;
    if (statusPanel) {
      statusPanel.className = 'panel';
      statusPanel.textContent = 'Attaching integration...';
      statusPanel.removeAttribute('hidden');
    }

    // Attach integration
    const response = await safeCall(
      () => attachIntegration(currentProjectId!, { account_key_id: Number(selectedKeyId) }),
      {
        lockKey: `attach-integration-${currentProjectId}-${selectedKeyId}`,
        retryOn401: true,
      }
    );

    // Invalidate cache
    invalidateCache(`project:${currentProjectId}`);
    invalidateCache(`project:${currentProjectId}:integrations`);

    // Update state
    const integrations = await safeCall(
      () => getProjectIntegrations(currentProjectId!),
      { retryOn401: true }
    );
    setIntegrations(integrations);

    // Re-render integrations table
    const projectId = getCurrentProjectId();
    if (projectId === currentProjectId) {
      await import('@ui/projects').then(({ renderIntegrationsTable }) => {
        renderIntegrationsTable(integrations);
      });
    }

    showGlobalMessage('success', 'Integration attached to project');
    closeAttachIntegrationDrawer();
  } catch (error: any) {
    if (statusPanel) {
      statusPanel.className = 'panel panel--danger';
      statusPanel.textContent = error.message || 'Failed to attach integration';
      statusPanel.removeAttribute('hidden');
    }
    showGlobalMessage('error', error.message || 'Failed to attach integration');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * Initialize attach integration functionality
 */
export function initProjectAttachIntegration(): void {
  // Event delegation for attach button
  document.addEventListener('click', async (e) => {
    const attachBtn = (e.target as HTMLElement).closest('[data-action="attach-integration"]');
    if (attachBtn) {
      e.preventDefault();
      const projectId = getCurrentProjectId();
      if (projectId) {
        await openAttachIntegrationDrawer(projectId);
      }
    }
  });

  // Close handlers
  document.querySelectorAll('[data-drawer="attach-integration"] [data-drawer-close]').forEach(btn => {
    btn.addEventListener('click', closeAttachIntegrationDrawer);
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="attach-integration"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeAttachIntegrationDrawer();
      }
    }
  });

  // Dropdown option selection
  document.addEventListener('click', (e) => {
    const dropdownItem = (e.target as HTMLElement).closest('[data-attach-integration-menu] [data-value]');
    if (dropdownItem) {
      const value = dropdownItem.getAttribute('data-value');
      const label = dropdownItem.textContent?.trim() || '';
      const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-select]');
      const submitBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-submit]');

      if (selectBtn && value) {
        selectBtn.setAttribute('data-selected-value', value);
        const labelEl = selectBtn.querySelector('[data-selected-label]');
        if (labelEl) labelEl.textContent = label;

        // Enable submit button
        if (submitBtn) submitBtn.disabled = false;
      }
    }
  });

  // Submit handler
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-attach-integration-submit]');
  submitBtn?.addEventListener('click', handleAttachIntegration);
}
