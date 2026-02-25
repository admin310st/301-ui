/**
 * TDS domain binding UI
 * Renders domain binding list and domain picker for bind/unbind actions
 */

import type { TdsDomainBinding } from '@api/types';
import { getDomains } from '@api/domains';
import { bindDomains, unbindDomain } from '@api/tds';
import { safeCall } from '@api/ui-client';
import { showGlobalNotice } from '@ui/globalNotice';
import { refreshRules } from './state';

/**
 * Render domain bindings list
 */
export function renderDomainBindings(bindings: TdsDomainBinding[]): string {
  if (bindings.length === 0) {
    return '<p class="text-sm text-muted">No domains bound to this rule yet.</p>';
  }

  return `
    <div class="stack stack--xs">
      ${bindings.map(binding => renderBindingRow(binding)).join('')}
    </div>
  `;
}

function renderBindingRow(binding: TdsDomainBinding): string {
  const statusBadge = getBindingStatusBadge(binding.binding_status);
  const enabledIcon = binding.enabled
    ? '<span class="text-ok text-sm">On</span>'
    : '<span class="text-muted text-sm">Off</span>';

  return `
    <div class="cluster cluster--space-between" data-binding-id="${binding.binding_id}" data-domain-id="${binding.domain_id}">
      <div class="cluster cluster--sm">
        <span class="text-sm">${escapeHtml(binding.domain_name)}</span>
        ${statusBadge}
        ${enabledIcon}
      </div>
      <button
        class="btn-icon btn-icon--sm btn-icon--ghost"
        type="button"
        data-action="unbind-domain"
        data-binding-domain-id="${binding.domain_id}"
        title="Unbind domain"
        aria-label="Unbind ${escapeHtml(binding.domain_name)}"
      >
        <span class="icon" data-icon="mono/close"></span>
      </button>
    </div>
  `;
}

function getBindingStatusBadge(status: string): string {
  const config: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'badge--warning' },
    applied: { label: 'Applied', cls: 'badge--success' },
    removed: { label: 'Removed', cls: 'badge--neutral' },
  };
  const { label, cls } = config[status] || config.pending;
  return `<span class="badge badge--sm ${cls}">${label}</span>`;
}

/**
 * Initialize domain binding event handlers within the drawer
 */
export function initDomainBindingHandlers(
  drawerElement: HTMLElement,
  ruleId: number,
  currentBindings: TdsDomainBinding[]
): void {
  // Unbind domain
  drawerElement.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action="unbind-domain"]') as HTMLElement;
    if (!btn) return;

    const domainId = Number(btn.dataset.bindingDomainId);
    if (!domainId) return;

    btn.setAttribute('disabled', '');

    try {
      await safeCall(
        () => unbindDomain(ruleId, domainId),
        { lockKey: `tds-unbind:${ruleId}:${domainId}`, retryOn401: true }
      );

      // Remove from UI
      const row = btn.closest('[data-binding-id]');
      if (row) row.remove();

      // Update currentBindings reference
      const idx = currentBindings.findIndex(b => b.domain_id === domainId);
      if (idx >= 0) currentBindings.splice(idx, 1);

      // Check if list is now empty
      const list = drawerElement.querySelector('[data-bindings-list]');
      if (list && currentBindings.length === 0) {
        list.innerHTML = '<p class="text-sm text-muted">No domains bound to this rule yet.</p>';
      }

      showGlobalNotice('success', 'Domain unbound');
      void refreshRules();
    } catch (error: any) {
      btn.removeAttribute('disabled');
      showGlobalNotice('error', error.message || 'Failed to unbind domain');
    }
  });

  // Show domain picker
  const showPickerBtn = drawerElement.querySelector('[data-action="show-domain-picker"]');
  if (showPickerBtn) {
    showPickerBtn.addEventListener('click', () => {
      void showDomainPicker(drawerElement, ruleId, currentBindings);
    });
  }
}

/**
 * Show domain picker inline in the drawer
 */
async function showDomainPicker(
  drawerElement: HTMLElement,
  ruleId: number,
  currentBindings: TdsDomainBinding[]
): Promise<void> {
  const picker = drawerElement.querySelector('[data-domain-picker]') as HTMLElement;
  if (!picker) return;

  picker.hidden = false;
  picker.innerHTML = '<div class="loading-state loading-state--sm"><div class="spinner spinner--sm"></div><span class="text-sm text-muted">Loading domains...</span></div>';

  try {
    const response = await safeCall(
      () => getDomains(),
      { lockKey: 'domains-for-binding', retryOn401: true }
    );

    const boundIds = new Set(currentBindings.map(b => b.domain_id));

    // Flatten all domains from groups
    const allDomains = response.groups.flatMap(g => g.domains);
    const availableDomains = allDomains.filter(d => !boundIds.has(d.id));

    if (availableDomains.length === 0) {
      picker.innerHTML = '<p class="text-sm text-muted">All domains are already bound.</p>';
      return;
    }

    picker.innerHTML = `
      <div class="stack stack--sm">
        <p class="text-sm text-muted">Select domains to bind:</p>
        <div class="stack stack--xs" style="max-height: 200px; overflow-y: auto;">
          ${availableDomains.map(d => `
            <label class="field__label text-sm">
              <input type="checkbox" class="checkbox" data-bind-domain-id="${d.id}" />
              <span>${escapeHtml(d.domain_name)}</span>
            </label>
          `).join('')}
        </div>
        <div class="cluster">
          <button class="btn btn--sm btn--primary" type="button" data-action="confirm-bind">Bind Selected</button>
          <button class="btn btn--sm btn--ghost" type="button" data-action="cancel-bind">Cancel</button>
        </div>
      </div>
    `;

    // Confirm bind
    const confirmBtn = picker.querySelector('[data-action="confirm-bind"]');
    confirmBtn?.addEventListener('click', async () => {
      const checked = picker.querySelectorAll<HTMLInputElement>('[data-bind-domain-id]:checked');
      const domainIds = Array.from(checked).map(cb => Number(cb.dataset.bindDomainId));

      if (domainIds.length === 0) {
        showGlobalNotice('error', 'Select at least one domain');
        return;
      }

      (confirmBtn as HTMLButtonElement).disabled = true;

      try {
        const bindResponse = await safeCall(
          () => bindDomains(ruleId, domainIds),
          { lockKey: `tds-bind:${ruleId}:${Date.now()}`, retryOn401: true }
        );

        // Update binding list
        currentBindings.push(...bindResponse.bound);
        const bindingsList = drawerElement.querySelector('[data-bindings-list]');
        if (bindingsList) {
          bindingsList.innerHTML = renderDomainBindings(currentBindings);
        }

        picker.hidden = true;
        picker.innerHTML = '';

        const errorCount = bindResponse.errors?.length || 0;
        if (errorCount > 0) {
          showGlobalNotice('warning', `Bound ${bindResponse.bound.length} domain(s), ${errorCount} failed`);
        } else {
          showGlobalNotice('success', `Bound ${bindResponse.bound.length} domain(s)`);
        }

        void refreshRules();
      } catch (error: any) {
        (confirmBtn as HTMLButtonElement).disabled = false;
        showGlobalNotice('error', error.message || 'Failed to bind domains');
      }
    });

    // Cancel
    const cancelBtn = picker.querySelector('[data-action="cancel-bind"]');
    cancelBtn?.addEventListener('click', () => {
      picker.hidden = true;
      picker.innerHTML = '';
    });
  } catch (error: any) {
    picker.innerHTML = `<p class="text-sm text-danger">${error.message || 'Failed to load domains'}</p>`;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
