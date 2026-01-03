/**
 * Add Domain to Project Handler
 * Handles adding existing domains to a project
 */

import { getDomains } from '@api/domains';
import { moveDomainToProject } from '@api/domains';
import type { APIDomain } from '@api/types';
import { getAuthState } from '@state/auth-state';
import { getCurrentProjectId } from '@state/project-detail-state';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';
import { safeCall } from '@api/ui-client';
import { invalidateCache } from '@api/cache';

let currentProjectId: number | null = null;
let availableDomains: APIDomain[] = [];
let selectedDomainIds = new Set<number>();

/**
 * Open add domain drawer
 */
export async function openAddDomainDrawer(projectId: number): Promise<void> {
  currentProjectId = projectId;
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domain-to-project"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');
  await loadAvailableDomains();
}

/**
 * Close add domain drawer
 */
export function closeAddDomainDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domain-to-project"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');
  currentProjectId = null;
  selectedDomainIds.clear();
  updateSubmitButton();

  // Hide status panel
  const statusPanel = document.querySelector<HTMLElement>('[data-add-domain-status]');
  if (statusPanel) statusPanel.setAttribute('hidden', '');
}

/**
 * Load domains that don't have a project assigned
 */
async function loadAvailableDomains(): Promise<void> {
  const loadingEl = document.querySelector<HTMLElement>('[data-add-domain-loading]');
  const emptyEl = document.querySelector<HTMLElement>('[data-add-domain-empty]');
  const listEl = document.querySelector<HTMLElement>('[data-add-domain-list]');

  if (!listEl || !emptyEl) return;

  // Show loading
  if (loadingEl) loadingEl.removeAttribute('hidden');
  listEl.setAttribute('hidden', '');
  emptyEl.setAttribute('hidden', '');

  try {
    // Get all domains (API doesn't support project_id=null filter, so we get all and filter client-side)
    const response = await safeCall(
      () => getDomains(),
      { retryOn401: true }
    );

    // Flatten groups and filter domains without project
    availableDomains = response.groups
      .flatMap(group => group.domains)
      .filter(domain => !domain.project_id);

    // Hide loading
    if (loadingEl) loadingEl.setAttribute('hidden', '');

    if (availableDomains.length === 0) {
      emptyEl.removeAttribute('hidden');
      return;
    }

    // Render checkboxes
    renderDomainCheckboxes();
    listEl.removeAttribute('hidden');
  } catch (error: any) {
    if (loadingEl) loadingEl.setAttribute('hidden', '');
    emptyEl.removeAttribute('hidden');
    showGlobalMessage('error', error.message || 'Failed to load available domains');
  }
}

/**
 * Render domain checkboxes
 */
function renderDomainCheckboxes(): void {
  const container = document.querySelector<HTMLElement>('[data-add-domain-checkboxes]');
  if (!container) return;

  container.innerHTML = availableDomains
    .map(domain => {
      const roleIcon = domain.role === 'acceptor' ? 'mono/arrow-bottom-right' : 'mono/arrow-top-right';
      const roleLabel = domain.role === 'acceptor' ? 'Acceptor' : 'Donor';

      return `
        <label class="checkbox-field">
          <input
            type="checkbox"
            data-domain-id="${domain.id}"
            value="${domain.id}"
          />
          <div class="domain-cell">
            <span class="role-icon" data-role="${domain.role}" title="${roleLabel}">
              <span class="icon" data-icon="${roleIcon}"></span>
            </span>
            <span><strong>${domain.domain_name}</strong></span>
            ${domain.provider ? `<span class="text-muted text-sm">${domain.provider}</span>` : ''}
          </div>
        </label>
      `;
    })
    .join('');

  // Re-inject icons
  if (typeof (window as any).injectIcons === 'function') {
    (window as any).injectIcons();
  }

  // Attach checkbox listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });
}

/**
 * Handle checkbox change
 */
function handleCheckboxChange(event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const domainId = parseInt(checkbox.getAttribute('data-domain-id') || '0', 10);

  if (checkbox.checked) {
    selectedDomainIds.add(domainId);
  } else {
    selectedDomainIds.delete(domainId);
  }

  updateSubmitButton();
}

/**
 * Update submit button state
 */
function updateSubmitButton(): void {
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-domain-submit]');
  const countEl = document.querySelector<HTMLElement>('[data-selected-count]');

  if (submitBtn) {
    submitBtn.disabled = selectedDomainIds.size === 0;
  }

  if (countEl) {
    countEl.textContent = String(selectedDomainIds.size);
  }
}

/**
 * Handle adding domains to project
 */
async function handleAddDomains(): Promise<void> {
  if (!currentProjectId || selectedDomainIds.size === 0) return;

  const statusPanel = document.querySelector<HTMLElement>('[data-add-domain-status]');
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-domain-submit]');

  try {
    if (submitBtn) submitBtn.disabled = true;
    if (statusPanel) {
      statusPanel.className = 'panel';
      statusPanel.textContent = `Adding ${selectedDomainIds.size} domain(s) to project...`;
      statusPanel.removeAttribute('hidden');
    }

    const { accountId } = getAuthState();
    if (!accountId) {
      throw new Error('Account ID not found');
    }

    // Add each domain to the project
    await Promise.all(
      Array.from(selectedDomainIds).map(domainId =>
        safeCall(
          () => moveDomainToProject(accountId, domainId, currentProjectId!),
          {
            lockKey: `add-domain-${currentProjectId}-${domainId}`,
            retryOn401: true,
          }
        )
      )
    );

    // Invalidate cache
    invalidateCache(`project:${currentProjectId}`);
    invalidateCache(`domains`);

    // Reload domains table
    const projectId = getCurrentProjectId();
    if (projectId === currentProjectId) {
      await import('@ui/projects').then(({ loadProjectDomains }) => {
        loadProjectDomains(projectId);
      });
    }

    showGlobalMessage('success', `Added ${selectedDomainIds.size} domain(s) to project`);
    closeAddDomainDrawer();
  } catch (error: any) {
    if (statusPanel) {
      statusPanel.className = 'panel panel--danger';
      statusPanel.textContent = error.message || 'Failed to add domains to project';
      statusPanel.removeAttribute('hidden');
    }
    showGlobalMessage('error', error.message || 'Failed to add domains to project');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * Initialize add domain to project functionality
 */
export function initProjectAddDomain(): void {
  // Event delegation for add domain button
  document.addEventListener('click', async (e) => {
    const addBtn = (e.target as HTMLElement).closest('[data-action="add-domain"]');
    if (addBtn) {
      e.preventDefault();
      const projectId = getCurrentProjectId();
      if (projectId) {
        await openAddDomainDrawer(projectId);
      }
    }
  });

  // Close handlers
  document.querySelectorAll('[data-drawer="add-domain-to-project"] [data-drawer-close]').forEach(btn => {
    btn.addEventListener('click', closeAddDomainDrawer);
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domain-to-project"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeAddDomainDrawer();
      }
    }
  });

  // Submit handler
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-domain-submit]');
  submitBtn?.addEventListener('click', handleAddDomains);
}
