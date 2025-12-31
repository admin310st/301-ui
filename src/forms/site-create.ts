import { createSite } from '@api/sites';
import { getProjects } from '@api/projects';
import type { CreateSiteRequest } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';

/**
 * Track current context (which project to create site for, if any)
 */
let contextProjectId: number | null = null;

/**
 * Populate project dropdown with user's projects
 */
async function populateProjectDropdown(): Promise<void> {
  const select = document.querySelector<HTMLSelectElement>('[data-site-project-select]');
  if (!select) return;

  const accountId = getAccountId();
  if (!accountId) return;

  try {
    const projects = await getProjects(accountId);

    // Clear existing options (except placeholder)
    select.innerHTML = `
      <option value="" disabled selected data-i18n="sites.fields.selectProjectPlaceholder">
        Choose a project...
      </option>
    `;

    // Add project options
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = String(project.id);
      option.textContent = project.project_name;
      select.appendChild(option);
    });

    // If context project ID is set, pre-select it
    if (contextProjectId) {
      select.value = String(contextProjectId);
    }
  } catch (error) {
    console.error('Failed to load projects for dropdown:', error);
  }
}

/**
 * Open create site drawer
 * @param projectId - Optional project ID to pre-fill (from project detail page)
 */
export function openCreateSiteDrawer(projectId?: number): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="create-site"]');
  if (!drawer) return;

  // Set context
  contextProjectId = projectId || null;

  // Show/hide project selection field based on context
  const projectField = drawer.querySelector<HTMLElement>('[data-site-project-field]');
  if (projectField) {
    if (contextProjectId) {
      // Hide project selection when opened from project detail view
      projectField.hidden = true;
    } else {
      // Show project selection when opened from global sites page
      projectField.hidden = false;
      populateProjectDropdown();
    }
  }

  drawer.removeAttribute('hidden');

  // Focus first visible input
  const firstInput = drawer.querySelector<HTMLInputElement>(
    contextProjectId ? 'input[name="site_name"]' : 'select[name="project_id"]'
  );
  setTimeout(() => firstInput?.focus(), 100);
}

/**
 * Close create site drawer
 */
function closeCreateSiteDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="create-site"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');
  contextProjectId = null;

  // Reset form
  const form = drawer.querySelector<HTMLFormElement>('[data-form="create-site"]');
  if (form) {
    form.reset();
    hideFormStatus();
  }
}

/**
 * Show form status message
 */
function showFormStatus(message: string, type: 'error' | 'success'): void {
  const statusEl = document.querySelector<HTMLElement>('[data-site-status]');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `panel panel--${type === 'error' ? 'danger' : 'success'}`;
  statusEl.hidden = false;
}

/**
 * Hide form status message
 */
function hideFormStatus(): void {
  const statusEl = document.querySelector<HTMLElement>('[data-site-status]');
  if (statusEl) statusEl.hidden = true;
}

/**
 * Reload sites list or project detail view
 */
async function reloadSitesView(projectId: number): Promise<void> {
  // If on projects page with detail view, reload project sites
  const projectDetailView = document.querySelector<HTMLElement>('[data-view="project-detail"]');
  if (projectDetailView && !projectDetailView.hidden) {
    const { loadProjectDetail } = await import('@ui/projects');
    const urlParams = new URLSearchParams(window.location.search);
    const currentProjectId = urlParams.get('id');
    if (currentProjectId) {
      await loadProjectDetail(parseInt(currentProjectId, 10));
    }
    return;
  }

  // If on global sites page, reload sites list
  const sitesTable = document.querySelector('[data-sites-table]');
  if (sitesTable) {
    const { loadSites } = await import('@ui/sites');
    await loadSites();
  }
}

/**
 * Handle site creation form submission
 */
async function handleCreateSite(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  // Determine project ID (from context or form)
  let projectId = contextProjectId;
  if (!projectId) {
    const selectedProjectId = formData.get('project_id') as string;
    if (!selectedProjectId) {
      showFormStatus(t('sites.errors.projectRequired') || 'Project is required', 'error');
      return;
    }
    projectId = parseInt(selectedProjectId, 10);
  }

  // Validate required fields
  const siteName = (formData.get('site_name') as string || '').trim();
  if (!siteName) {
    showFormStatus(t('sites.errors.nameRequired') || 'Site name is required', 'error');
    return;
  }

  // Build request payload
  const request: CreateSiteRequest = {
    site_name: siteName,
  };

  // Add optional fields if provided
  const siteTag = (formData.get('site_tag') as string || '').trim();
  if (siteTag) request.site_tag = siteTag;

  try {
    hideFormStatus();

    // Disable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('common.actions.creating') || 'Creating...';
    }

    // Get account ID
    const accountId = getAccountId();
    if (!accountId) {
      throw new Error('Account ID not found');
    }

    // Create site
    await createSite(accountId, projectId, request);

    // Show success message
    showGlobalMessage('success', t('sites.messages.created') || 'Site created successfully');

    // Close drawer
    closeCreateSiteDrawer();

    // Update sidebar count badge
    import('@ui/sidebar-nav').then(({ updateProjectsAndSitesCounts }) => {
      updateProjectsAndSitesCounts();
    });

    // Reload appropriate view
    await reloadSitesView(projectId);
  } catch (error: any) {
    const errorMessage = error.message || t('sites.errors.createFailed') || 'Failed to create site';
    showFormStatus(errorMessage, 'error');

    // Re-enable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="icon" data-icon="mono/plus"></span>
        <span data-i18n="sites.actions.create">Create site</span>
      `;
      // Re-inject icons
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
    }
  }
}

/**
 * Initialize site creation form
 */
export function initSiteCreate(): void {
  // Open drawer on "Create site" button click (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const createBtn = target.closest('[data-action="create-site"]');

    if (createBtn) {
      e.preventDefault();

      // Check if we're in a project context
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('id');

      openCreateSiteDrawer(projectId ? parseInt(projectId, 10) : undefined);
    }
  });

  // Close drawer handlers
  document.querySelectorAll('[data-drawer="create-site"] [data-drawer-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeCreateSiteDrawer();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="create-site"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeCreateSiteDrawer();
      }
    }
  });

  // Handle form submission
  const form = document.querySelector<HTMLFormElement>('[data-form="create-site"]');
  if (form) {
    form.addEventListener('submit', handleCreateSite);
  }
}
