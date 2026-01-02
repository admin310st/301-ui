import { updateProject, getProject } from '@api/projects';
import type { UpdateProjectRequest } from '@api/types';
import { showGlobalMessage } from '@ui/notifications';
import { t, tWithVars } from '@i18n';
import { loadProjects, loadProjectDetail } from '@ui/projects';

/**
 * Open edit project drawer and populate with project data
 */
async function openEditProjectDrawer(projectId: number): Promise<void> {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-project"]');
  if (!drawer) return;

  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-project"]');
  if (!form) return;

  // Hide any previous status messages
  const statusEl = document.querySelector<HTMLElement>('[data-edit-project-status]');
  if (statusEl) statusEl.hidden = true;

  try {
    // Fetch project data
    const data = await getProject(projectId);
    const { project } = data;

    // Populate form fields
    form.querySelector<HTMLInputElement>('input[name="project_id"]')!.value = String(project.id);
    form.querySelector<HTMLInputElement>('input[name="project_name"]')!.value = project.project_name;
    form.querySelector<HTMLTextAreaElement>('textarea[name="description"]')!.value = project.description || '';
    form.querySelector<HTMLInputElement>('input[name="brand_tag"]')!.value = project.brand_tag || '';
    form.querySelector<HTMLInputElement>('input[name="commercial_terms"]')!.value = project.commercial_terms || '';
    form.querySelector<HTMLInputElement>('input[name="start_date"]')!.value = project.start_date || '';
    form.querySelector<HTMLInputElement>('input[name="end_date"]')!.value = project.end_date || '';

    // Show drawer
    drawer.removeAttribute('hidden');

    // Focus first input after animation
    setTimeout(() => {
      form.querySelector<HTMLInputElement>('input[name="project_name"]')?.focus();
    }, 100);
  } catch (error: any) {
    console.error('Failed to load project data:', error);
    showGlobalMessage('error', error.message || 'Failed to load project data');
  }
}

/**
 * Close edit project drawer and reset form
 */
function closeEditProjectDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-project"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');

  const form = drawer.querySelector<HTMLFormElement>('[data-form="edit-project"]');
  if (form) form.reset();

  const statusEl = document.querySelector<HTMLElement>('[data-edit-project-status]');
  if (statusEl) statusEl.hidden = true;
}

/**
 * Handle edit project form submission
 */
async function handleEditProject(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  const projectId = parseInt(formData.get('project_id') as string, 10);
  const projectName = (formData.get('project_name') as string).trim();

  if (!projectName) {
    showFormStatus(
      t('projects.errors.nameRequired') || 'Project name is required',
      'error'
    );
    return;
  }

  const request: UpdateProjectRequest = {
    project_name: projectName,
  };

  // Add optional fields if provided
  const description = (formData.get('description') as string).trim();
  if (description) request.description = description;

  const brandTag = (formData.get('brand_tag') as string).trim();
  if (brandTag) request.brand_tag = brandTag;

  const commercialTerms = (formData.get('commercial_terms') as string).trim();
  if (commercialTerms) request.commercial_terms = commercialTerms;

  const startDate = formData.get('start_date') as string;
  if (startDate) request.start_date = startDate;

  const endDate = formData.get('end_date') as string;
  if (endDate) request.end_date = endDate;

  try {
    showFormStatus(
      t('common.messages.saving') || 'Saving...',
      'info'
    );

    await updateProject(projectId, request);

    // Show success in drawer
    showFormStatus(
      t('projects.messages.updated') || 'Project updated successfully',
      'success'
    );

    // Show global success message
    showGlobalMessage(
      'success',
      t('projects.messages.updated') || 'Project updated successfully'
    );

    // Close drawer after brief delay to show success message
    setTimeout(() => {
      closeEditProjectDrawer();
    }, 800);

    // Reload appropriate view
    const listView = document.querySelector('[data-view="projects-list"]');
    if (listView && !listView.hasAttribute('hidden')) {
      await loadProjects();
    }

    const detailView = document.querySelector('[data-view="project-detail"]');
    if (detailView && !detailView.hasAttribute('hidden')) {
      await loadProjectDetail(projectId);
    }
  } catch (error: any) {
    console.error('Failed to update project:', error);

    // Map API error codes to user-friendly messages
    let errorMessage: string;

    if (error.body?.error) {
      const errorCode = error.body.error;

      // Special handling for errors with additional fields
      if (errorCode === 'missing_field' && error.body.field) {
        errorMessage = tWithVars('projects.errors.missingField', { field: error.body.field });
      } else {
        // Try to find translation for the error code
        const errorKey = `projects.errors.${errorCode}`;
        const translatedError = t(errorKey);

        // Check if translation exists (t() returns the key if not found)
        if (translatedError && !translatedError.startsWith('projects.errors.')) {
          errorMessage = translatedError;
        } else {
          // Fallback to generic error message
          errorMessage = t('projects.errors.updateFailed') || 'Failed to update project';
        }
      }
    } else if (error.message && error.message !== 'Request failed') {
      // Use error message if it's not the generic fallback
      errorMessage = error.message;
    } else {
      // Final fallback
      errorMessage = t('projects.errors.updateFailed') || 'Failed to update project';
    }

    showFormStatus(errorMessage, 'error');
  }
}

/**
 * Show form status message
 */
function showFormStatus(message: string, type: 'error' | 'success' | 'info'): void {
  const statusEl = document.querySelector<HTMLElement>('[data-edit-project-status]');
  if (!statusEl) return;

  statusEl.textContent = message;

  const panelClass = type === 'error' ? 'panel--danger' :
                     type === 'success' ? 'panel--success' :
                     'panel--info';

  statusEl.className = `panel ${panelClass}`;
  statusEl.hidden = false;
}

/**
 * Initialize edit project drawer
 */
export function initProjectEdit(): void {
  // Event delegation for edit buttons
  document.addEventListener('click', async (e) => {
    const editBtn = (e.target as HTMLElement).closest('[data-action="edit-project"]');
    if (editBtn) {
      e.preventDefault();
      const projectId = parseInt(editBtn.getAttribute('data-project-id') || '0', 10);
      if (projectId) {
        await openEditProjectDrawer(projectId);
      }
    }
  });

  // Close handlers
  const drawer = document.querySelector('[data-drawer="edit-project"]');
  if (drawer) {
    drawer.querySelectorAll('[data-drawer-close]').forEach(btn => {
      btn.addEventListener('click', closeEditProjectDrawer);
    });
  }

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.querySelector<HTMLElement>('[data-drawer="edit-project"]');
      if (drawer && !drawer.hasAttribute('hidden')) {
        closeEditProjectDrawer();
      }
    }
  });

  // Form submit handler
  const form = document.querySelector<HTMLFormElement>('[data-form="edit-project"]');
  if (form) {
    form.addEventListener('submit', handleEditProject);
  }
}
