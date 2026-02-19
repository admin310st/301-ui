/**
 * Site Edit Form Handler
 * Handles editing site details (name, tag, status) in Project Detail view
 */

import { getSite, updateSite } from '@api/sites';
import type { UpdateSiteRequest } from '@api/types';
import { getCurrentProjectId, updateSite as updateSiteState, getCurrentSites } from '@state/project-detail-state';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';
import { safeCall } from '@api/ui-client';
import { invalidateCache, invalidateCacheByPrefix } from '@api/cache';

/**
 * Render sites table from state
 */
function renderSitesTable(sites: any[]): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-project-sites-table] tbody');
  if (!tbody) return;

  if (sites.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          No sites yet. Create your first site for this project.
        </td>
      </tr>
    `;
    return;
  }

  // Import renderSiteRow from projects.ts
  void import('@ui/projects').then(({ renderSiteRow }) => {
    if (tbody) {
      tbody.innerHTML = sites.map((site: any) => renderSiteRow(site)).join('');

      // Re-inject icons
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
    }
  });
}

/**
 * Open edit site drawer and populate with site data
 */
async function openEditSiteDrawer(siteId: number, projectId: number): Promise<void> {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-site"]');
  if (!drawer) return;

  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-site"]');
  if (!form) return;

  try {
    // Fetch site details
    const data = await safeCall(
      () => getSite(siteId),
      { lockKey: `site:${siteId}`, retryOn401: true }
    );

    const { site } = data;

    // Populate form
    form.querySelector<HTMLInputElement>('[name="site_id"]')!.value = String(site.id);
    form.querySelector<HTMLInputElement>('[name="project_id"]')!.value = String(projectId);
    form.querySelector<HTMLInputElement>('[name="site_name"]')!.value = site.site_name;
    form.querySelector<HTMLInputElement>('[name="site_tag"]')!.value = site.site_tag || '';

    // Set status dropdown value
    setStatusDropdownValue(site.status);

    // Clear status panel
    hideFormStatus();

    // Show drawer
    drawer.removeAttribute('hidden');

    // Focus first input
    setTimeout(() => form.querySelector<HTMLInputElement>('[name="site_name"]')?.focus(), 100);
  } catch (error: any) {
    showGlobalMessage('error', error.message || 'Failed to load site details');
  }
}

/**
 * Close edit site drawer
 */
function closeEditSiteDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-site"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');

  // Reset form
  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-site"]');
  if (form) {
    form.reset();
    hideFormStatus();
  }
}

/**
 * Show form status message
 */
function showFormStatus(message: string, type: 'error' | 'success'): void {
  const statusEl = document.querySelector<HTMLElement>('[data-edit-site-status]');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `panel panel--${type === 'error' ? 'danger' : 'success'}`;
  statusEl.hidden = false;
}

/**
 * Hide form status message
 */
function hideFormStatus(): void {
  const statusEl = document.querySelector<HTMLElement>('[data-edit-site-status]');
  if (statusEl) statusEl.hidden = true;
}

/**
 * Set status dropdown value and label
 */
function setStatusDropdownValue(status: string): void {
  const label = document.querySelector<HTMLElement>('[data-site-status-label]');
  const hiddenInput = document.querySelector<HTMLInputElement>('[data-site-status-value]');
  const trigger = document.querySelector<HTMLButtonElement>('[data-site-status-select]');

  if (!label || !hiddenInput || !trigger) return;

  // Map status values to display labels
  const statusLabels: Record<string, string> = {
    active: 'Active',
    paused: 'Paused',
    archived: 'Archived',
  };

  const displayLabel = statusLabels[status] || status;

  label.textContent = displayLabel;
  hiddenInput.value = status;
  trigger.setAttribute('data-selected-value', status);
}

/**
 * Handle edit site form submission
 */
async function handleEditSiteSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  const siteId = parseInt(formData.get('site_id') as string, 10);
  const projectId = parseInt(formData.get('project_id') as string, 10);

  // Validate required fields
  const siteName = (formData.get('site_name') as string || '').trim();
  if (!siteName) {
    showFormStatus(t('sites.errors.nameRequired') || 'Site name is required', 'error');
    return;
  }

  const status = formData.get('status') as string;
  if (!status) {
    showFormStatus('Status is required', 'error');
    return;
  }

  // Build request payload
  const request: UpdateSiteRequest = {
    site_name: siteName,
    status: status as any,
  };

  // Add optional site_tag if provided
  const siteTag = (formData.get('site_tag') as string || '').trim();
  if (siteTag) {
    request.site_tag = siteTag;
  }

  try {
    hideFormStatus();

    // Disable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('common.messages.saving') || 'Saving...';
    }

    // Update site via API (optimistic - uses lockKey for in-flight guard)
    await safeCall(
      () => updateSite(siteId, request),
      {
        lockKey: `edit-site-${siteId}`,
        retryOn401: true,
      }
    );

    // 1. Optimistic point update in state
    updateSiteState(siteId, request);

    // 2. Invalidate caches
    invalidateCache(`project:${projectId}`);
    invalidateCache('sites');
    invalidateCacheByPrefix('sites:project');

    // 3. Re-render sites table from state
    renderSitesTable(getCurrentSites());

    // Show success message
    showGlobalMessage('success', t('sites.messages.updated') || 'Site updated successfully');

    // Close drawer
    closeEditSiteDrawer();
  } catch (error: any) {
    const errorMessage = error.message || t('sites.errors.updateFailed') || 'Failed to update site';
    showFormStatus(errorMessage, 'error');

    // Re-enable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="icon" data-icon="mono/check"></span>
        <span>Save changes</span>
      `;
      // Re-inject icons
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
    }
  }
}

/**
 * Initialize site edit functionality
 */
export function initSiteEdit(): void {
  // Event delegation for edit buttons
  document.addEventListener('click', async (e) => {
    const editBtn = (e.target as HTMLElement).closest('[data-action="edit-site"]');
    if (editBtn) {
      e.preventDefault();
      const siteId = parseInt(editBtn.getAttribute('data-site-id') || '0', 10);
      const projectId = getCurrentProjectId();

      if (siteId && projectId) {
        await openEditSiteDrawer(siteId, projectId);
      }
    }
  });

  // Close handlers
  document.querySelectorAll('[data-drawer="edit-site"] [data-drawer-close]').forEach(btn => {
    btn.addEventListener('click', closeEditSiteDrawer);
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-site"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeEditSiteDrawer();
      }
    }
  });

  // Form submit
  const form = document.querySelector<HTMLFormElement>('[data-form="edit-site"]');
  if (form) {
    form.addEventListener('submit', handleEditSiteSubmit);
  }

  // Status dropdown item click handlers
  document.querySelectorAll<HTMLButtonElement>('[data-site-status-menu] .dropdown__item').forEach(item => {
    item.addEventListener('click', () => {
      const value = item.getAttribute('data-value');
      if (value) {
        setStatusDropdownValue(value);
      }
    });
  });
}
