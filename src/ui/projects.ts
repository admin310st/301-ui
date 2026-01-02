import { t } from '@i18n';
import { getProjects, getProject } from '@api/projects';
import { getSites } from '@api/sites';
import type { Project, Site, ProjectIntegration } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from './notifications';
import { initDropdowns } from '@ui/dropdown';

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
 * Render a single project row
 */
function renderProjectRow(project: Project): string {
  const brandTag = project.brand_tag ? `<code>${project.brand_tag}</code>` : '—';

  return `
    <tr data-project-id="${project.id}">
      <td data-priority="critical">
        <a href="/projects.html?id=${project.id}" class="link link--bold">
          ${project.project_name}
        </a>
        ${project.description ? `<br><span class="text-muted text-sm">${project.description}</span>` : ''}
      </td>
      <td data-priority="medium">${brandTag}</td>
      <td data-priority="high" class="text-right">${project.domains_count}</td>
      <td data-priority="high" class="text-right">${project.sites_count}</td>
      <td data-priority="low" class="text-muted">${formatDate(project.created_at)}</td>
      <td data-priority="critical">
        <div class="btn-group">
          <button
            class="btn-icon"
            type="button"
            data-action="edit-project"
            data-project-id="${project.id}"
            aria-label="Edit ${project.project_name}"
          >
            <span class="icon" data-icon="mono/pencil-circle"></span>
          </button>
          <div class="dropdown" data-dropdown>
            <button
              class="btn-icon btn-icon--ghost dropdown__trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-label="More actions for ${project.project_name}"
            >
              <span class="icon" data-icon="mono/dots-vertical"></span>
            </button>
            <div class="dropdown__menu dropdown__menu--align-right" role="menu">
              <button class="dropdown__item" type="button" data-action="view-domains" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/web"></span>
                <span>View domains</span>
              </button>
              <button class="dropdown__item" type="button" data-action="view-sites" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/package"></span>
                <span>View sites</span>
              </button>
              <hr class="dropdown__divider" />
              <button class="dropdown__item" type="button" data-action="duplicate-project" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/copy"></span>
                <span>Duplicate project</span>
              </button>
              <button class="dropdown__item" type="button" data-action="archive-project" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/briefcase"></span>
                <span>Archive project</span>
              </button>
              <hr class="dropdown__divider" />
              <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-project" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/delete"></span>
                <span>Delete project</span>
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render site row (for detail view Sites tab)
 */
function renderSiteRow(site: Site): string {
  const statusClass = site.status === 'active' ? 'badge--success' :
                      site.status === 'paused' ? 'badge--warning' : 'badge--neutral';
  const statusLabel = t(`sites.status.${site.status}` as any) || site.status;

  return `
    <tr data-site-id="${site.id}">
      <td data-priority="critical">
        <strong>${site.site_name}</strong>
        ${site.site_tag ? `<br><code class="text-sm">${site.site_tag}</code>` : ''}
      </td>
      <td data-priority="medium">${site.site_tag || '—'}</td>
      <td data-priority="high" class="text-right">${site.domains_count}</td>
      <td data-priority="medium" class="text-muted">${site.acceptor_domain || '—'}</td>
      <td data-priority="high">
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td data-priority="low" class="text-muted">${formatDate(site.updated_at)}</td>
      <td data-priority="critical" class="table-actions">
        <button
          class="btn-icon"
          type="button"
          data-action="manage-domains"
          data-site-id="${site.id}"
          aria-label="${t('sites.actions.manageDomains')}"
          title="${t('sites.actions.manageDomains')}"
        >
          <span class="icon" data-icon="mono/web"></span>
        </button>
        <button
          class="btn-icon"
          type="button"
          data-action="edit-site"
          data-site-id="${site.id}"
          aria-label="Edit ${site.site_name}"
        >
          <span class="icon" data-icon="mono/pencil-circle"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Render integration row (for detail view Integrations tab)
 */
function renderIntegrationRow(integration: ProjectIntegration): string {
  const statusClass = integration.status === 'active' ? 'badge--success' : 'badge--neutral';
  const providerIcon = integration.provider === 'cloudflare' ? 'brand/cloudflare' :
                       integration.provider === 'namecheap' ? 'brand/namecheap' : 'mono/key';

  return `
    <tr data-integration-id="${integration.id}">
      <td data-priority="critical">
        <div class="provider-cell">
          <span class="icon" data-icon="${providerIcon}"></span>
          <span class="provider-label">${integration.provider}</span>
        </div>
      </td>
      <td data-priority="high">${integration.key_alias}</td>
      <td data-priority="medium" class="text-muted">${integration.external_account_id}</td>
      <td data-priority="high">
        <span class="badge ${statusClass}">${integration.status}</span>
      </td>
      <td data-priority="low" class="text-muted">${formatDate(integration.created_at)}</td>
      <td data-priority="critical" class="table-actions">
        <button
          class="btn-icon"
          type="button"
          data-action="detach-integration"
          data-integration-id="${integration.id}"
          aria-label="Detach ${integration.key_alias}"
        >
          <span class="icon" data-icon="mono/delete"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Show loading state for list view
 */
function showLoading() {
  const loading = document.querySelector<HTMLElement>('[data-projects-loading]');
  const empty = document.querySelector<HTMLElement>('[data-projects-empty]');
  const container = document.querySelector<HTMLElement>('[data-projects-table-container]');
  const header = document.querySelector<HTMLElement>('[data-projects-header]');

  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  if (container) container.hidden = true;
  if (header) header.hidden = true;
}

/**
 * Hide loading state
 */
function hideLoading() {
  const loading = document.querySelector<HTMLElement>('[data-projects-loading]');
  if (loading) loading.hidden = true;
}

/**
 * Show empty state
 */
function showEmpty() {
  const empty = document.querySelector<HTMLElement>('[data-projects-empty]');
  const container = document.querySelector<HTMLElement>('[data-projects-table-container]');
  const header = document.querySelector<HTMLElement>('[data-projects-header]');

  if (empty) empty.hidden = false;
  if (container) container.hidden = true;
  if (header) header.hidden = true;
}

/**
 * Hide empty state and show table
 */
function showTable() {
  const empty = document.querySelector<HTMLElement>('[data-projects-empty]');
  const container = document.querySelector<HTMLElement>('[data-projects-table-container]');
  const header = document.querySelector<HTMLElement>('[data-projects-header]');

  if (empty) empty.hidden = true;
  if (container) container.hidden = false;
  if (header) header.hidden = false;
}

/**
 * Load and render projects list
 */
export async function loadProjects(): Promise<void> {
  const accountId = getAccountId();
  if (!accountId) {
    console.error('No account ID found');
    return;
  }

  const tbody = document.querySelector<HTMLTableSectionElement>('[data-projects-table] tbody');
  if (!tbody) return;

  showLoading();

  try {
    const projects = await getProjects(accountId);

    hideLoading();

    if (projects.length === 0) {
      showEmpty();
      return;
    }

    showTable();
    tbody.innerHTML = projects.map(renderProjectRow).join('');

    // Initialize dropdowns for the table
    const tableContainer = document.querySelector('[data-projects-table-container]');
    if (tableContainer) {
      initDropdowns(tableContainer as HTMLElement);
    }

    // Re-apply icon injection after DOM update
    if (typeof (window as any).injectIcons === 'function') {
      (window as any).injectIcons();
    }
  } catch (error) {
    hideLoading();
    console.error('Failed to load projects:', error);
    showGlobalMessage('error', t('common.messages.error') || 'Failed to load projects');
  }
}

/**
 * Initialize projects list with auth state handling
 */
function initProjectsList(): void {
  const accountId = getAccountId();
  if (accountId) {
    // Account ID already available (page reload case)
    loadProjects();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          loadProjects();
          unsubscribe(); // Only load once
        }
      });
    });
  }
}

/**
 * Load and render project detail view
 */
export async function loadProjectDetail(projectId: number): Promise<void> {
  try {
    const data = await getProject(projectId);
    const { project, sites, integrations } = data;

    // Update all project data attributes
    document.querySelectorAll<HTMLElement>('[data-project-name]').forEach(el => {
      el.textContent = project.project_name;
    });

    document.querySelectorAll<HTMLElement>('[data-project-description]').forEach(el => {
      el.textContent = project.description || '—';
    });

    document.querySelectorAll<HTMLElement>('[data-project-brand-tag]').forEach(el => {
      el.textContent = project.brand_tag || '—';
    });

    document.querySelectorAll<HTMLElement>('[data-project-commercial-terms]').forEach(el => {
      el.textContent = project.commercial_terms || '—';
    });

    document.querySelectorAll<HTMLElement>('[data-project-start-date]').forEach(el => {
      el.textContent = formatDate(project.start_date);
    });

    document.querySelectorAll<HTMLElement>('[data-project-end-date]').forEach(el => {
      el.textContent = formatDate(project.end_date);
    });

    document.querySelectorAll<HTMLElement>('[data-project-created-at]').forEach(el => {
      el.textContent = formatDate(project.created_at);
    });

    document.querySelectorAll<HTMLElement>('[data-project-updated-at]').forEach(el => {
      el.textContent = formatDate(project.updated_at);
    });

    // Update stats
    document.querySelectorAll<HTMLElement>('[data-project-sites-count]').forEach(el => {
      el.textContent = String(project.sites_count);
    });

    document.querySelectorAll<HTMLElement>('[data-project-domains-count]').forEach(el => {
      el.textContent = String(project.domains_count);
    });

    document.querySelectorAll<HTMLElement>('[data-project-integrations-count]').forEach(el => {
      el.textContent = String(integrations.length);
    });

    // Render sites table
    const sitesTableBody = document.querySelector<HTMLTableSectionElement>('[data-project-sites-table] tbody');
    if (sitesTableBody) {
      if (sites.length === 0) {
        sitesTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-muted">
              No sites yet. Create your first site for this project.
            </td>
          </tr>
        `;
      } else {
        sitesTableBody.innerHTML = sites.map(renderSiteRow).join('');
      }
    }

    // Render integrations table
    const integrationsTableBody = document.querySelector<HTMLTableSectionElement>('[data-project-integrations-table] tbody');
    if (integrationsTableBody) {
      if (integrations.length === 0) {
        integrationsTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted">
              No integrations attached. Attach a Cloudflare or registrar key to this project.
            </td>
          </tr>
        `;
      } else {
        integrationsTableBody.innerHTML = integrations.map(renderIntegrationRow).join('');
      }
    }

    // Re-apply icon injection
    if (typeof (window as any).injectIcons === 'function') {
      (window as any).injectIcons();
    }
  } catch (error) {
    console.error('Failed to load project details:', error);
    showGlobalMessage('error', 'Failed to load project details');
    // Redirect back to list view on error
    window.location.href = '/projects.html';
  }
}

/**
 * Initialize tabs switching for detail view
 */
function initTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-tabs="project-detail"] [data-tab]');
  const panels = document.querySelectorAll<HTMLElement>('[data-tab-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      // Show corresponding panel
      panels.forEach(panel => {
        if (panel.dataset.tabPanel === targetTab) {
          panel.hidden = false;
        } else {
          panel.hidden = true;
        }
      });
    });
  });
}

/**
 * Initialize projects page
 */
export function initProjectsPage(): void {
  // Check URL parameter to determine view mode
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const listView = document.querySelector<HTMLElement>('[data-view="projects-list"]');
  const detailView = document.querySelector<HTMLElement>('[data-view="project-detail"]');

  if (projectId) {
    // Show detail view
    if (listView) listView.hidden = true;
    if (detailView) detailView.hidden = false;

    // Initialize tabs
    initTabs();

    // Load project details
    loadProjectDetail(parseInt(projectId, 10));
  } else {
    // Show list view
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = true;

    // Load projects list with auth state handling
    initProjectsList();
  }

  // Initialize action handlers
  handleProjectActions();

  // Event delegation for view-project buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const viewBtn = target.closest<HTMLButtonElement>('[data-action="view-project"]');

    if (viewBtn) {
      const projectId = viewBtn.dataset.projectId;
      if (projectId) {
        window.location.href = `/projects.html?id=${projectId}`;
      }
    }
  });
}

/**
 * Handle dropdown action clicks for projects table
 */
function handleProjectActions(): void {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest<HTMLElement>('[data-action]');

    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const projectId = parseInt(actionBtn.getAttribute('data-project-id') || '0', 10);

    if (!projectId) return;

    switch (action) {
      case 'view-domains':
        // Navigate to project detail view, domains tab
        window.location.href = `/projects.html?id=${projectId}#domains`;
        break;

      case 'view-sites':
        // Navigate to project detail view, sites tab
        window.location.href = `/projects.html?id=${projectId}#sites`;
        break;

      case 'duplicate-project':
        showGlobalMessage('info', 'Duplicate project feature coming soon');
        break;

      case 'archive-project':
        showGlobalMessage('info', 'Archive project feature coming soon');
        break;

      case 'delete-project':
        const confirmed = confirm(
          t('projects.messages.confirmDelete') ||
          'Are you sure you want to delete this project? This will also delete all sites and streams.'
        );

        if (!confirmed) return;

        try {
          showGlobalMessage('info', t('common.messages.deleting') || 'Deleting...');

          await import('@api/projects').then(({ deleteProject }) =>
            deleteProject(projectId)
          );

          showGlobalMessage('success', t('projects.messages.deleted') || 'Project deleted successfully');

          // Update sidebar count
          import('@ui/sidebar-nav').then(({ updateProjectsAndSitesCounts }) => {
            updateProjectsAndSitesCounts();
          });

          // Reload projects list
          await loadProjects();
        } catch (error: any) {
          console.error('Failed to delete project:', error);
          showGlobalMessage('error', error.message || t('projects.errors.deleteFailed') || 'Failed to delete project');
        }
        break;
    }
  });
}
