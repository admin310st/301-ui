import { createProject } from '@api/projects';
import type { CreateProjectRequest } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';
import { loadProjects } from '@ui/projects';

/**
 * Open create project drawer
 */
function openCreateProjectDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="create-project"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');

  // Focus first input
  const firstInput = drawer.querySelector<HTMLInputElement>('input[name="project_name"]');
  setTimeout(() => firstInput?.focus(), 100);
}

/**
 * Close create project drawer
 */
function closeCreateProjectDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="create-project"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');

  // Reset form
  const form = drawer.querySelector<HTMLFormElement>('[data-form="create-project"]');
  if (form) {
    form.reset();
    hideFormStatus();
  }
}

/**
 * Show form status message
 */
function showFormStatus(message: string, type: 'error' | 'success'): void {
  const statusEl = document.querySelector<HTMLElement>('[data-project-status]');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `panel panel--${type === 'error' ? 'danger' : 'success'}`;
  statusEl.hidden = false;
}

/**
 * Hide form status message
 */
function hideFormStatus(): void {
  const statusEl = document.querySelector<HTMLElement>('[data-project-status]');
  if (statusEl) statusEl.hidden = true;
}

/**
 * Handle project creation form submission
 */
async function handleCreateProject(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  // Get account ID
  const accountId = getAccountId();
  if (!accountId) {
    showFormStatus(t('common.errors.accountIdMissing') || 'Account ID not found', 'error');
    return;
  }

  // Validate required fields
  const projectName = (formData.get('project_name') as string || '').trim();
  if (!projectName) {
    showFormStatus(t('projects.errors.nameRequired') || 'Project name is required', 'error');
    return;
  }

  // Build request payload
  const request: CreateProjectRequest = {
    account_id: accountId,
    project_name: projectName,
  };

  // Add optional fields if provided
  const description = (formData.get('description') as string || '').trim();
  if (description) request.description = description;

  const brandTag = (formData.get('brand_tag') as string || '').trim();
  if (brandTag) request.brand_tag = brandTag;

  const commercialTerms = (formData.get('commercial_terms') as string || '').trim();
  if (commercialTerms) request.commercial_terms = commercialTerms;

  const startDate = formData.get('start_date') as string;
  if (startDate) request.start_date = startDate;

  const endDate = formData.get('end_date') as string;
  if (endDate) request.end_date = endDate;

  // Optional: create first site
  const siteName = (formData.get('site_name') as string || '').trim();
  if (siteName) request.site_name = siteName;

  try {
    hideFormStatus();

    // Disable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('common.actions.creating') || 'Creating...';
    }

    // Create project
    const newProject = await createProject(request);

    // Show success message
    showGlobalMessage('success', t('projects.messages.created') || 'Project created successfully');

    // Close drawer
    closeCreateProjectDrawer();

    // Update sidebar count badge
    import('@ui/sidebar-nav').then(({ updateProjectsAndSitesCounts }) => {
      updateProjectsAndSitesCounts();
    });

    // Reload projects list if on list view
    const listView = document.querySelector<HTMLElement>('[data-view="projects-list"]');
    if (listView && !listView.hidden) {
      await loadProjects();
    }

    // OR redirect to new project detail view
    // window.location.href = `/projects.html?id=${newProject.id}`;
  } catch (error: any) {
    const errorMessage = error.message || t('projects.errors.createFailed') || 'Failed to create project';
    showFormStatus(errorMessage, 'error');

    // Re-enable submit button
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="icon" data-icon="mono/plus"></span>
        <span data-i18n="projects.actions.create">Create project</span>
      `;
      // Re-inject icons
      if (typeof (window as any).injectIcons === 'function') {
        (window as any).injectIcons();
      }
    }
  }
}

/**
 * Initialize project creation form
 */
export function initProjectCreate(): void {
  // Open drawer on "Create project" button click (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const createBtn = target.closest('[data-action="create-project"]');

    if (createBtn) {
      e.preventDefault();
      openCreateProjectDrawer();
    }
  });

  // Close drawer handlers
  document.querySelectorAll('[data-drawer="create-project"] [data-drawer-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeCreateProjectDrawer();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="create-project"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeCreateProjectDrawer();
      }
    }
  });

  // Handle form submission
  const form = document.querySelector<HTMLFormElement>('[data-form="create-project"]');
  if (form) {
    form.addEventListener('submit', handleCreateProject);
  }
}
