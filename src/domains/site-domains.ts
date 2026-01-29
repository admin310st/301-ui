/**
 * Site Domains Management
 * Handles attach/detach domain operations for sites
 */

import { getAuthState } from '@state/auth-state';
import { getSite, attachDomain } from '@api/sites';
import type { Site, APIDomain } from '@api/types';
import * as domainsAPI from '@api/domains';
import { t } from '@i18n';
import { logError, logDebug } from '@utils/logger';
import { showGlobalMessage } from '@ui/notifications';
import { safeCall } from '@api/ui-client';
import { invalidateCache } from '@api/cache';
import { getCurrentProjectId, getCurrentSites, setSites } from '@state/project-detail-state';
import { showConfirmDialog } from '@ui/dialog';
import { initDropdowns } from '@ui/dropdown';

let currentSiteId: number | null = null;
let currentProjectId: number | null = null;
let attachedDomains: APIDomain[] = [];
let selectedPrimaryId: number | null = null;
let dropdownsInitialized = false;

/**
 * Open manage site domains drawer
 */
export function openManageSiteDomainsDrawer(siteId: number): void {
  currentSiteId = siteId;
  const drawer = document.querySelector<HTMLElement>('[data-drawer="manage-site-domains"]');
  if (!drawer) {
    logDebug('Manage site domains drawer not found');
    return;
  }

  drawer.removeAttribute('hidden');

  // Initialize dropdowns in the drawer (only once)
  if (!dropdownsInitialized) {
    initDropdowns(drawer);
    dropdownsInitialized = true;
  }

  loadSiteAndDomains(siteId);
}

/**
 * Close manage site domains drawer
 */
export function closeManageSiteDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="manage-site-domains"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');
  currentSiteId = null;
  currentProjectId = null;

  // Reset UI
  const nameEl = drawer.querySelector<HTMLElement>('[data-site-domains-name]');
  if (nameEl) nameEl.textContent = '—';

  const countEl = drawer.querySelector<HTMLElement>('[data-site-domains-count]');
  if (countEl) countEl.textContent = '0';

  const tbody = drawer.querySelector<HTMLTableSectionElement>('[data-site-domains-table] tbody');
  if (tbody) tbody.innerHTML = '';
}

/**
 * Load site details and domains
 */
async function loadSiteAndDomains(siteId: number): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId) {
    showGlobalMessage('error', 'Account ID not found');
    return;
  }

  try {
    // Load site details
    const data = await safeCall(
      () => getSite(siteId),
      { retryOn401: true }
    );
    const site = data.site;
    currentProjectId = site.project_id;

    // Update drawer title
    const nameEl = document.querySelector<HTMLElement>('[data-site-domains-name]');
    if (nameEl) nameEl.textContent = site.site_name;

    // Load attached domains
    await loadAttachedDomains(accountId, siteId);

    // Load available domains for dropdown
    await loadAvailableDomains(accountId, site.project_id);
  } catch (error: any) {
    logError('Failed to load site domains:', error);
    showGlobalMessage('error', error.message || 'Failed to load site details');
  }
}

/**
 * Load domains attached to the site
 */
async function loadAttachedDomains(accountId: number, siteId: number): Promise<void> {
  const loadingEl = document.querySelector<HTMLElement>('[data-site-domains-loading]');
  const emptyEl = document.querySelector<HTMLElement>('[data-site-domains-empty]');
  const tableContainer = document.querySelector<HTMLElement>('[data-site-domains-table-container]');
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-site-domains-table] tbody');

  if (!tbody || !tableContainer || !emptyEl) return;

  // Show loading
  if (loadingEl) loadingEl.removeAttribute('hidden');
  tableContainer.setAttribute('hidden', '');
  emptyEl.setAttribute('hidden', '');

  try {
    // Get domains attached to the site using API filter
    const response = await safeCall(
      () => domainsAPI.getDomains({ site_id: siteId }),
      {
        lockKey: `domains:site:${siteId}`,
        retryOn401: true,
      }
    );

    // Flatten groups into a single array of domains
    attachedDomains = response.groups.flatMap(group => group.domains);

    // Update count
    const countEl = document.querySelector<HTMLElement>('[data-site-domains-count]');
    if (countEl) countEl.textContent = String(attachedDomains.length);

    // Hide loading
    if (loadingEl) loadingEl.setAttribute('hidden', '');

    if (attachedDomains.length === 0) {
      emptyEl.removeAttribute('hidden');
      hidePrimaryDomainSection();
      return;
    }

    // Render table rows
    tbody.innerHTML = attachedDomains.map(renderDomainRow).join('');
    tableContainer.removeAttribute('hidden');

    // Re-inject icons for the newly rendered rows
    if (typeof (window as any).injectIcons === 'function') {
      (window as any).injectIcons();
    }

    // Render primary domain selection
    renderPrimaryDomainSection();
  } catch (error: any) {
    logError('Failed to load attached domains:', error);
    if (loadingEl) loadingEl.setAttribute('hidden', '');
    emptyEl.removeAttribute('hidden');
  }
}

/**
 * Render a domain table row
 */
function renderDomainRow(domain: APIDomain): string {
  // Determine status badge based on domain properties
  const isActive = domain.ns_verified === 1 && domain.blocked === 0;
  const statusBadge = isActive ? 'success' : 'neutral';
  const statusText = isActive ? 'Active' : 'Inactive';

  // Map role to notification-icon color and label
  const iconClass = domain.role === 'acceptor' ? 'notification-icon--success' :
                    domain.role === 'donor' ? 'notification-icon--primary' :
                    'notification-icon--warning';
  const roleLabel = domain.role === 'acceptor' ? 'Primary' :
                    domain.role === 'donor' ? 'Donor' : 'Reserve';

  return `
    <tr>
      <td>
        <div class="domain-cell">
          <span class="domain-cell__name">${domain.domain_name}</span>
        </div>
      </td>
      <td>
        <span class="notification-icon ${iconClass}" title="${roleLabel}">
          <span class="icon" data-icon="mono/circle-alert"></span>
        </span>
      </td>
      <td>
        <span class="badge badge--${statusBadge}">
          ${statusText}
        </span>
      </td>
      <td class="td-actions">
        <button
          class="btn-icon btn-icon--danger-hover"
          type="button"
          data-action="detach-domain"
          data-domain-id="${domain.id}"
          data-domain-name="${domain.domain_name}"
          aria-label="${t('sites.domains.detachButton')}"
          title="${t('sites.domains.detachButton')}"
        >
          <span class="icon" data-icon="mono/web-minus"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Load available domains for the dropdown (same project, not attached)
 */
async function loadAvailableDomains(accountId: number, projectId: number): Promise<void> {
  const menu = document.querySelector<HTMLElement>('[data-attach-domain-menu]');
  const emptyState = document.querySelector<HTMLElement>('[data-attach-domains-empty]');
  const formState = document.querySelector<HTMLElement>('[data-attach-domains-form]');

  if (!menu) return;

  try {
    // Get domains in the project using API filter
    const response = await safeCall(
      () => domainsAPI.getDomains({ project_id: projectId }),
      {
        lockKey: `domains:project:${projectId}`,
        retryOn401: true,
      }
    );

    // Flatten groups into a single array of domains
    const projectDomains = response.groups.flatMap(group => group.domains);

    // Filter out domains already attached to ANY site
    const availableDomains = projectDomains.filter(d => !d.site_id);

    if (availableDomains.length === 0) {
      // Show empty state, hide form
      if (emptyState) emptyState.removeAttribute('hidden');
      if (formState) formState.setAttribute('hidden', '');

      // Re-inject icons for empty state
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
      return;
    }

    // Show form, hide empty state
    if (emptyState) emptyState.setAttribute('hidden', '');
    if (formState) formState.removeAttribute('hidden');

    // Render dropdown options
    menu.innerHTML = availableDomains
      .map(
        domain => {
          // Map role to notification-icon color and label
          const iconClass = domain.role === 'acceptor' ? 'notification-icon--success' :
                            domain.role === 'donor' ? 'notification-icon--primary' :
                            'notification-icon--warning';
          const roleLabel = domain.role === 'acceptor' ? 'Primary' :
                            domain.role === 'donor' ? 'Donor' : 'Reserve';

          return `
            <button
              class="dropdown__item"
              type="button"
              role="menuitem"
              data-value="${domain.id}"
            >
              <div class="stack-inline stack-inline--xs">
                <span class="notification-icon ${iconClass}" title="${roleLabel}">
                  <span class="icon" data-icon="mono/circle-alert"></span>
                </span>
                <span>${domain.domain_name}</span>
              </div>
            </button>
          `;
        },
      )
      .join('');

    // Re-inject icons for the dropdown items
    if (typeof (window as any).injectIcons === 'function') {
      (window as any).injectIcons();
    }
  } catch (error: any) {
    logError('Failed to load available domains:', error);

    // Show form with error in dropdown
    if (emptyState) emptyState.setAttribute('hidden', '');
    if (formState) formState.removeAttribute('hidden');

    menu.innerHTML = `
      <div class="dropdown__item dropdown__item--disabled">
        <span class="text-muted">Error loading domains</span>
      </div>
    `;
  }
}

/**
 * Handle attach domain button click
 */
async function handleAttachDomain(): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId || !currentSiteId) return;

  const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-domain-select]');
  const selectedDomainId = selectBtn?.getAttribute('data-selected-value');

  if (!selectedDomainId) {
    showGlobalMessage('warning', 'Please select a domain');
    return;
  }

  const statusPanel = document.querySelector<HTMLElement>('[data-site-domains-status]');
  const attachBtn = document.querySelector<HTMLButtonElement>('[data-site-attach-domain]');

  try {
    if (attachBtn) attachBtn.disabled = true;
    if (statusPanel) {
      statusPanel.className = 'panel';
      statusPanel.textContent = 'Attaching domain...';
      statusPanel.removeAttribute('hidden');
    }

    await safeCall(
      () => attachDomain(currentSiteId, Number(selectedDomainId)),
      {
        lockKey: `attach-domain-${currentSiteId}-${selectedDomainId}`,
        retryOn401: true,
      }
    );

    // Invalidate related caches
    if (currentProjectId) {
      invalidateCache(`project:${currentProjectId}`);
      invalidateCache(`sites:project:${currentProjectId}`);
      invalidateCache(`domains:project:${currentProjectId}`);
    }
    if (currentSiteId) {
      invalidateCache(`domains:site:${currentSiteId}`);
    }

    if (statusPanel) {
      statusPanel.className = 'panel panel--success';
      statusPanel.textContent = t('sites.messages.domainAttached');
    }

    // Reload both lists
    await loadAttachedDomains(accountId, currentSiteId);
    if (currentProjectId) await loadAvailableDomains(accountId, currentProjectId);

    // Update site domains count in project detail state if available
    const sites = getCurrentSites();
    const siteToUpdate = sites.find(s => s.id === currentSiteId);
    if (siteToUpdate && currentProjectId === getCurrentProjectId()) {
      siteToUpdate.domains_count = (siteToUpdate.domains_count || 0) + 1;
      setSites(sites);
    }

    // Reset dropdown
    if (selectBtn) {
      selectBtn.setAttribute('data-selected-value', '');
      const label = selectBtn.querySelector('[data-selected-label]');
      if (label) label.textContent = t('sites.domains.selectDomainPlaceholder');
    }

    showGlobalMessage('success', t('sites.messages.domainAttached'));

    setTimeout(() => {
      if (statusPanel) statusPanel.setAttribute('hidden', '');
    }, 3000);
  } catch (error: any) {
    logError('Failed to attach domain:', error);
    if (statusPanel) {
      statusPanel.className = 'panel panel--error';
      statusPanel.textContent = error.message || 'Failed to attach domain';
      statusPanel.removeAttribute('hidden');
    }
    showGlobalMessage('error', error.message || 'Failed to attach domain');
  } finally {
    if (attachBtn) attachBtn.disabled = false;
  }
}

/**
 * Handle detach domain button click
 */
async function handleDetachDomain(domainId: number, domainName: string): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId || !currentSiteId) return;

  // Show confirmation dialog
  const confirmed = await showConfirmDialog('detach-domain-from-site', {
    'detach-domain-name': domainName,
  });

  if (!confirmed) return;

  try {
    await safeCall(
      () => domainsAPI.removeDomainFromSite(currentSiteId!, domainId),
      {
        lockKey: `detach-domain-${currentSiteId}-${domainId}`,
        retryOn401: true,
      }
    );

    // Invalidate all related caches
    invalidateCache('domains');
    if (currentProjectId) {
      invalidateCache(`project:${currentProjectId}`);
      invalidateCache(`sites:project:${currentProjectId}`);
      invalidateCache(`domains:project:${currentProjectId}`);
    }
    if (currentSiteId) {
      invalidateCache(`site:${currentSiteId}`);
      invalidateCache(`domains:site:${currentSiteId}`);
    }

    showGlobalMessage('success', t('sites.messages.domainDetached'));

    // Reload both lists
    await loadAttachedDomains(accountId, currentSiteId!);
    if (currentProjectId) await loadAvailableDomains(accountId, currentProjectId);

    // Update site domains count in project detail state if available
    const sites = getCurrentSites();
    const siteToUpdate = sites.find(s => s.id === currentSiteId);
    if (siteToUpdate && currentProjectId === getCurrentProjectId()) {
      siteToUpdate.domains_count = Math.max(0, (siteToUpdate.domains_count || 0) - 1);
      setSites(sites);
    }
  } catch (error: any) {
    logError('Failed to detach domain:', error);
    showGlobalMessage('error', error.message || 'Failed to detach domain');
  }
}

/**
 * Render primary domain selection section
 */
function renderPrimaryDomainSection(): void {
  const section = document.querySelector<HTMLElement>('[data-primary-domain-section]');
  const menu = document.querySelector<HTMLElement>('[data-primary-domain-menu]');
  const selectBtn = document.querySelector<HTMLButtonElement>('[data-primary-domain-select]');
  const label = document.querySelector<HTMLElement>('[data-primary-domain-label]');

  if (!section || !menu || attachedDomains.length === 0) return;

  // Find current acceptor
  const currentAcceptor = attachedDomains.find(d => d.role === 'acceptor');
  selectedPrimaryId = currentAcceptor?.id || null;

  // Render dropdown options
  menu.innerHTML = attachedDomains.map(renderPrimaryDomainOption).join('');

  // Set initial label and value
  if (selectBtn && label && currentAcceptor) {
    selectBtn.setAttribute('data-selected-value', String(currentAcceptor.id));
    label.textContent = currentAcceptor.domain_name;
  }

  // Show section
  section.hidden = false;

  // Re-inject icons
  if (typeof (window as any).injectIcons === 'function') {
    (window as any).injectIcons();
  }
}

/**
 * Hide primary domain section
 */
function hidePrimaryDomainSection(): void {
  const section = document.querySelector<HTMLElement>('[data-primary-domain-section]');
  if (section) section.hidden = true;
}

/**
 * Render a single primary domain dropdown option
 */
function renderPrimaryDomainOption(domain: APIDomain): string {
  // Map role to notification-icon color and label
  const iconClass = domain.role === 'acceptor' ? 'notification-icon--success' :
                    domain.role === 'donor' ? 'notification-icon--primary' :
                    'notification-icon--warning';
  const roleLabel = domain.role === 'acceptor' ? 'Primary' :
                    domain.role === 'donor' ? 'Donor' : 'Reserve';

  return `
    <button
      class="dropdown__item"
      type="button"
      role="menuitem"
      data-value="${domain.id}"
      data-primary-domain-option
    >
      <div class="stack-inline stack-inline--xs">
        <span class="notification-icon ${iconClass}" title="${roleLabel}">
          <span class="icon" data-icon="mono/circle-alert"></span>
        </span>
        <span>${domain.domain_name}</span>
      </div>
    </button>
  `;
}

/**
 * Handle primary domain radio change
 */
async function handlePrimaryDomainChange(newSelectedId: number): Promise<void> {
  // Find current acceptor from original data
  const currentAcceptor = attachedDomains.find(d => d.role === 'acceptor');
  const hasChanges = newSelectedId !== currentAcceptor?.id;

  selectedPrimaryId = newSelectedId;

  // Auto-save if there are changes
  if (hasChanges) {
    await handleSavePrimaryDomain();
  }
}

/**
 * Save primary domain selection
 */
async function handleSavePrimaryDomain(): Promise<void> {
  if (!currentSiteId || !selectedPrimaryId) return;

  const statusEl = document.querySelector<HTMLElement>('[data-primary-domain-status]');

  // Find current acceptor and new acceptor
  const currentAcceptor = attachedDomains.find(d => d.role === 'acceptor');
  const newAcceptor = attachedDomains.find(d => d.id === selectedPrimaryId);

  if (!newAcceptor) return;

  // If no change, just close
  if (currentAcceptor?.id === selectedPrimaryId) {
    return;
  }

  try {
    if (statusEl) {
      statusEl.textContent = 'Updating primary domain...';
      statusEl.className = 'panel';
      statusEl.hidden = false;
    }

    // Atomic operation:
    // 1. Set old acceptor to reserve (if exists)
    // 2. Set new domain to acceptor
    if (currentAcceptor) {
      await safeCall(
        () => domainsAPI.updateDomainRole(currentAcceptor.id, 'reserve'),
        { lockKey: `update-domain-role-${currentAcceptor.id}`, retryOn401: true }
      );
    }

    await safeCall(
      () => domainsAPI.updateDomainRole(selectedPrimaryId, 'acceptor'),
      { lockKey: `update-domain-role-${selectedPrimaryId}`, retryOn401: true }
    );

    if (statusEl) {
      statusEl.textContent = 'Primary domain updated successfully';
      statusEl.className = 'panel panel--success';
    }

    showGlobalMessage('success', 'Primary domain updated');

    // Clear all caches before reload
    invalidateCache(`site:${currentSiteId}`);
    if (currentProjectId) {
      invalidateCache(`project:${currentProjectId}`);
      invalidateCache(`sites:project:${currentProjectId}`);
    }
    invalidateCache(`domains`);

    // Update acceptor_domain in site state
    const sites = getCurrentSites();
    const currentSite = sites.find(s => s.id === currentSiteId);
    if (currentSite) {
      currentSite.acceptor_domain = newAcceptor.domain_name;
      setSites([...sites]); // Trigger state update
    }

    // Re-render sites table with updated data
    const sitesTableBody = document.querySelector<HTMLTableSectionElement>('[data-project-sites-table] tbody');
    if (sitesTableBody && sites.length > 0) {
      const { renderSiteRow } = await import('@ui/projects');
      sitesTableBody.innerHTML = sites.map(renderSiteRow).join('');

      // Re-inject icons
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
    }

    // Reload domains in drawer to reflect role changes
    const { accountId } = getAuthState();
    if (accountId) {
      await loadAttachedDomains(accountId, currentSiteId);
    }
    setTimeout(() => {
      if (statusEl) statusEl.hidden = true;
    }, 3000);

  } catch (error: any) {
    logError('Failed to update primary domain:', error);
    if (statusEl) {
      statusEl.textContent = error.message || 'Failed to update primary domain';
      statusEl.className = 'panel panel--danger';
      statusEl.hidden = false;
    }
    showGlobalMessage('error', error.message || 'Failed to update primary domain');
  }
}

/**
 * Initialize site domains management
 */
export function initSiteDomains(): void {
  // Drawer close buttons
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const closeBtn = target.closest('[data-drawer="manage-site-domains"] [data-drawer-close]');
    if (closeBtn) {
      closeManageSiteDomainsDrawer();
    }

    // Manage domains action
    const manageBtn = target.closest('[data-action="manage-domains"]');
    if (manageBtn) {
      e.preventDefault();
      const siteId = manageBtn.getAttribute('data-site-id');
      if (siteId) openManageSiteDomainsDrawer(Number(siteId));
    }

    // Attach domain button
    const attachBtn = target.closest('[data-site-attach-domain]');
    if (attachBtn) {
      e.preventDefault();
      handleAttachDomain();
    }

    // Detach domain button
    const detachBtn = target.closest('[data-action="detach-domain"]');
    if (detachBtn) {
      e.preventDefault();
      const domainId = detachBtn.getAttribute('data-domain-id');
      const domainName = detachBtn.getAttribute('data-domain-name') || 'this domain';
      if (domainId) handleDetachDomain(Number(domainId), domainName);
    }

    // Dropdown option selection
    const dropdownItem = target.closest('[data-attach-domain-menu] [data-value]');
    if (dropdownItem) {
      const value = dropdownItem.getAttribute('data-value');
      const label = dropdownItem.textContent?.trim() || '';
      const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-domain-select]');
      const attachBtn = document.querySelector<HTMLButtonElement>('[data-site-attach-domain]');

      if (selectBtn && value) {
        selectBtn.setAttribute('data-selected-value', value);
        const labelEl = selectBtn.querySelector('[data-selected-label]');
        if (labelEl) labelEl.textContent = label;

        // Enable attach button
        if (attachBtn) attachBtn.disabled = false;
      }
    }

    // Open add-domain-to-project drawer from empty state CTA
    const openAddDomainsBtn = target.closest('[data-action="open-add-domains"]');
    if (openAddDomainsBtn) {
      e.preventDefault();
      if (!currentProjectId) return;
      // Save projectId before closing (closeManageSiteDomainsDrawer resets it)
      const projectId = currentProjectId;
      // Close manage-site-domains drawer
      closeManageSiteDomainsDrawer();
      // Open add-domain-to-project drawer
      const { openAddDomainDrawer } = await import('@domains/project-add-domain');
      await openAddDomainDrawer(projectId);
    }

    // Primary domain dropdown option selection
    const primaryDomainOption = target.closest('[data-primary-domain-option]');
    if (primaryDomainOption) {
      const value = primaryDomainOption.getAttribute('data-value');
      const domainName = primaryDomainOption.textContent?.trim() || '';
      const selectBtn = document.querySelector<HTMLButtonElement>('[data-primary-domain-select]');
      const label = document.querySelector<HTMLElement>('[data-primary-domain-label]');

      if (selectBtn && label && value) {
        selectBtn.setAttribute('data-selected-value', value);

        // Extract just the domain name without the badge text
        const domainText = domainName.split('\n')[0].trim();
        label.textContent = domainText;

        const newSelectedId = parseInt(value, 10);
        if (!isNaN(newSelectedId)) {
          handlePrimaryDomainChange(newSelectedId);
        }
      }
    }
  });
}
