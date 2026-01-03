import { t } from '@i18n';
import { getProjects, getProject } from '@api/projects';
import { getSites } from '@api/sites';
import { getDomains } from '@api/domains';
import type { Project, Site, ProjectIntegration, APIDomain } from '@api/types';
import { getAccountId } from '@state/auth-state';
import { showGlobalMessage } from './notifications';
import { adjustDropdownPosition } from '@ui/dropdown';
import { setProjectData, incrementRequestToken, getRequestToken, getCurrentProjectId, setIntegrations } from '@state/project-detail-state';
import { safeCall } from '@api/ui-client';
import { invalidateCache } from '@api/cache';

// State
let allProjects: Project[] = [];
let searchQuery = '';

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
 * Filter projects by search query (name and brand tag)
 */
function filterProjects(projects: Project[], query: string): Project[] {
  if (!query) return projects;

  const trimmed = query.trim().toLowerCase();
  return projects.filter((project) => {
    const searchable = [
      project.project_name,
      project.brand_tag || '',
      project.description || '',
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(trimmed);
  });
}

/**
 * Render a single project row
 */
function renderProjectRow(project: Project): string {
  const brandTag = project.brand_tag
    ? `<code ${project.commercial_terms ? `title="${project.commercial_terms}"` : ''}>${project.brand_tag}</code>`
    : '—';

  return `
    <tr data-project-id="${project.id}">
      <td data-priority="critical">
        <a
          href="/projects.html?id=${project.id}"
          class="link link--bold"
          ${project.description ? `title="${project.description}"` : ''}
        >
          ${project.project_name}
        </a>
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
                <span class="icon" data-icon="mono/web-scan"></span>
                <span>View domains</span>
              </button>
              <button class="dropdown__item" type="button" data-action="view-sites" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/cube-scan"></span>
                <span>View sites</span>
              </button>
              <hr class="dropdown__divider" />
              <button class="dropdown__item" type="button" data-action="duplicate-project" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/copy"></span>
                <span>Duplicate project</span>
              </button>
              <button class="dropdown__item" type="button" data-action="archive-project" data-project-id="${project.id}">
                <span class="icon" data-icon="mono/package-closed"></span>
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
export function renderSiteRow(site: Site): string {
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
          data-key-id="${integration.account_key_id}"
          aria-label="Detach ${integration.key_alias}"
        >
          <span class="icon" data-icon="mono/delete"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Render integrations table from state
 * Exported for use in project-attach-integration.ts
 */
export function renderIntegrationsTable(integrations: ProjectIntegration[]): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-project-integrations-table] tbody');
  if (!tbody) return;

  if (integrations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No integrations attached. Attach a Cloudflare or registrar key to this project.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = integrations.map(renderIntegrationRow).join('');
  }

  // Re-inject icons
  if (typeof (window as any).injectIcons === 'function') {
    (window as any).injectIcons();
  }
}

/**
 * Render a single project domain row
 */
function renderProjectDomainRow(domain: APIDomain): string {
  const roleIcon = domain.role === 'acceptor' ? 'mono/arrow-bottom-right' : 'mono/arrow-top-right';
  const roleLabel = domain.role === 'acceptor' ? 'Acceptor' : 'Donor';

  // Health badges
  const sslBadge = domain.ssl_valid
    ? '<span class="badge badge--success" title="SSL valid">SSL</span>'
    : '<span class="badge badge--danger" title="SSL invalid">SSL</span>';
  const nsBadge = domain.ns_valid
    ? '<span class="badge badge--success" title="NS valid">NS</span>'
    : '<span class="badge badge--neutral" title="NS not configured">NS</span>';
  const abuseBadge = domain.abuse_detected
    ? '<span class="badge badge--danger" title="Abuse detected">Abuse</span>'
    : '';

  // Status badge
  const statusClass = domain.blocked ? 'badge--danger' :
                      domain.expired_at ? 'badge--warning' : 'badge--success';
  const statusLabel = domain.blocked ? 'Blocked' :
                      domain.expired_at ? 'Expired' : 'Active';

  const providerIcon = domain.provider === 'cloudflare' ? 'brand/cloudflare' :
                       domain.provider === 'namecheap' ? 'brand/namecheap' : 'mono/dns';

  return `
    <tr data-domain-id="${domain.id}">
      <td data-priority="critical">
        <div class="domain-cell">
          <span class="role-icon" data-role="${domain.role}" title="${roleLabel}">
            <span class="icon" data-icon="${roleIcon}"></span>
          </span>
          <strong>${domain.domain_name}</strong>
        </div>
      </td>
      <td data-priority="high">${roleLabel}</td>
      <td data-priority="medium">
        <div class="stack-inline stack-inline--xs">
          ${sslBadge}
          ${nsBadge}
          ${abuseBadge}
        </div>
      </td>
      <td data-priority="high">
        <span class="badge ${statusClass}">${statusLabel}</span>
      </td>
      <td data-priority="medium">
        <div class="provider-cell">
          <span class="icon" data-icon="${providerIcon}"></span>
          <span>${domain.provider || '—'}</span>
        </div>
      </td>
      <td data-priority="low" class="text-muted">${formatDate(domain.updated_at)}</td>
      <td data-priority="critical" class="table-actions">
        <button
          class="btn-icon"
          type="button"
          data-action="remove-domain-from-project"
          data-domain-id="${domain.id}"
          data-site-id="${domain.site_id || ''}"
          aria-label="Remove ${domain.domain_name} from project"
        >
          <span class="icon" data-icon="mono/close"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Render project domains table
 * Exported for use in add-domain-to-project drawer
 */
export function renderProjectDomainsTable(domains: APIDomain[]): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-project-domains-table] tbody');
  if (!tbody) return;

  if (domains.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          No domains in this project. Add domains to start managing traffic.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = domains.map(renderProjectDomainRow).join('');
  }

  // Re-inject icons
  if (typeof (window as any).injectIcons === 'function') {
    (window as any).injectIcons();
  }
}

/**
 * Load domains for current project
 */
export async function loadProjectDomains(projectId: number): Promise<void> {
  try {
    const response = await safeCall(
      () => getDomains({ project_id: projectId }),
      { retryOn401: true }
    );

    // Flatten groups to get all domains
    const domains = response.groups.flatMap(group => group.domains);

    // Render table
    renderProjectDomainsTable(domains);

    // Update count badge
    document.querySelectorAll<HTMLElement>('[data-project-domains-count]').forEach(el => {
      el.textContent = String(domains.length);
    });
  } catch (error: any) {
    showGlobalMessage('error', error.message || 'Failed to load project domains');

    // Show error in table
    const tbody = document.querySelector<HTMLTableSectionElement>('[data-project-domains-table] tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger">
            Failed to load domains. ${error.message || ''}
          </td>
        </tr>
      `;
    }
  }
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
/**
 * Render filtered projects to table
 */
function renderProjects(): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-projects-table] tbody');
  if (!tbody) return;

  const filtered = filterProjects(allProjects, searchQuery);

  if (filtered.length === 0) {
    if (searchQuery) {
      // Show "no results" message for search
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted" style="padding: var(--space-6);">
            No projects found for "${searchQuery}"
          </td>
        </tr>
      `;
    } else {
      showEmpty();
    }
    return;
  }

  showTable();
  tbody.innerHTML = filtered.map(renderProjectRow).join('');

  // Re-apply icon injection after DOM update
  if (typeof (window as any).injectIcons === 'function') {
    (window as any).injectIcons();
  }
}

export async function loadProjects(): Promise<void> {
  const accountId = getAccountId();
  if (!accountId) {
    console.error('No account ID found');
    return;
  }

  showLoading();

  try {
    allProjects = await getProjects(accountId);

    hideLoading();

    // Hide brand tag in utility bar (list view)
    const brandTag = document.querySelector('[data-project-brand-tag]');
    if (brandTag) brandTag.setAttribute('hidden', '');

    if (allProjects.length === 0) {
      showEmpty();
      return;
    }

    renderProjects();
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
 * Update metric pill with project date range progress
 */
function updateProjectDateMetric(project: Project): void {
  const container = document.querySelector<HTMLElement>('[data-project-date-range]');
  const fillElement = document.querySelector<HTMLElement>('[data-project-date-fill]');
  const textElement = document.querySelector<HTMLElement>('[data-project-date-text]');

  if (!container || !fillElement || !textElement) return;

  // If no dates set, show placeholder
  if (!project.start_date || !project.end_date) {
    textElement.textContent = '—';
    fillElement.style.setProperty('--metric-fill', '0');
    container.className = 'metric-pill metric-pill--date';
    return;
  }

  const now = new Date();
  const start = new Date(project.start_date);
  const end = new Date(project.end_date);

  // Calculate progress (0 to 1)
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = totalDuration > 0 ? elapsed / totalDuration : 0;

  // Clamp to 0-1 range
  const fillValue = Math.max(0, Math.min(1, progress));

  // Set fill value
  fillElement.style.setProperty('--metric-fill', String(fillValue));

  // Set variant based on status
  let variant = 'metric-pill metric-pill--date';
  if (now > end) {
    // Project ended
    variant = 'metric-pill metric-pill--date metric-pill--success';
    fillElement.style.setProperty('--metric-fill', '1');
  } else if (now < start) {
    // Project not started yet
    fillElement.style.setProperty('--metric-fill', '0');
  }

  container.className = variant;

  // Format date text
  const startFormatted = formatDate(project.start_date);
  const endFormatted = formatDate(project.end_date);
  textElement.textContent = `${startFormatted} — ${endFormatted}`;
}

/**
 * Load and render project detail view
 */
export async function loadProjectDetail(projectId: number): Promise<void> {
  // Increment token BEFORE starting request (single source of truth)
  const token = incrementRequestToken();

  try {
    // Load project data with safeCall
    // abortKey фиксированный - любой новый load отменяет предыдущий
    const data = await safeCall(
      (signal) => getProject(projectId, { signal }),
      {
        abortKey: 'project-detail-load', // фиксированный, без projectId
        retryOn401: true,
      }
    );

    // Check if request is stale (another load started)
    if (token !== getRequestToken()) {
      console.debug('Discarding stale project load', { projectId, token });
      return;
    }

    const { project, sites, integrations } = data;

    // Store in state for point updates
    setProjectData(projectId, { project, sites, integrations });

    // Show brand tag in utility bar
    const brandTag = document.querySelector('[data-project-brand-tag]');
    if (brandTag) brandTag.removeAttribute('hidden');

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

    // Update metric pill with date range progress
    updateProjectDateMetric(project);

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
    renderIntegrationsTable(integrations);

    // Handle hash-based tab activation (e.g., #domains, #sites, #streams)
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash && ['integrations', 'domains', 'sites', 'streams'].includes(hash)) {
      // Find and click the corresponding tab
      const targetTab = document.querySelector<HTMLButtonElement>(`[data-tabs="project-detail"] [data-tab="${hash}"]`);
      if (targetTab) {
        targetTab.click();
      }
    }
  } catch (error: any) {
    // Check if aborted (not an error in this case)
    if (error.code === 'ABORTED') {
      console.debug('Project load aborted', { projectId });
      return;
    }

    console.error('Failed to load project details:', error);
    showGlobalMessage('error', error.message || 'Failed to load project details');

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
    tab.addEventListener('click', async () => {
      const targetTab = tab.dataset.tab;
      const projectId = getCurrentProjectId();

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

      // Load data for specific tabs
      if (projectId) {
        if (targetTab === 'domains') {
          await loadProjectDomains(projectId);
        }
        // Sites tab already loads on detail view load
      }
    });
  });
}

/**
 * Initialize projects page
 */
/**
 * Initialize search functionality for projects table
 */
function initProjectsSearch(): void {
  const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
  const searchClear = document.querySelector<HTMLButtonElement>('[data-search-clear]');
  const tableSearch = document.querySelector<HTMLElement>('[data-table-search]');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderProjects();

    // Toggle search active state
    if (tableSearch) {
      if (searchQuery.length > 0) {
        tableSearch.classList.add('table-search--active');
      } else {
        tableSearch.classList.remove('table-search--active');
      }
    }
  });

  // Clear button
  if (searchClear && tableSearch) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      renderProjects();
      tableSearch.classList.remove('table-search--active');
      searchInput.focus();
    });
  }

  // Clear search on Escape key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchQuery = '';
      renderProjects();
      if (tableSearch) {
        tableSearch.classList.remove('table-search--active');
      }
    }
  });
}

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

    // Initialize search
    initProjectsSearch();
  }

  // Initialize action handlers
  handleProjectActions();
  handleIntegrationActions();
  handleDomainActions();

  // Dropdown toggles (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('.dropdown__trigger');

    if (trigger) {
      e.stopPropagation();
      const dropdown = trigger.closest('.dropdown');
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('dropdown--open');

      // Close all other dropdowns
      document.querySelectorAll('.dropdown--open').forEach((other) => {
        if (other !== dropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isOpen) {
        dropdown.classList.remove('dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
        const menu = dropdown.querySelector('.dropdown__menu');
        if (menu) menu.classList.remove('dropdown__menu--up');
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => {
          adjustDropdownPosition(dropdown);
        });
      }
    } else {
      // Close all dropdowns when clicking outside
      document.querySelectorAll('.dropdown--open').forEach((dropdown) => {
        dropdown.classList.remove('dropdown--open');
        const trigger = dropdown.querySelector('.dropdown__trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
  });

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

/**
 * Handle integration actions (detach)
 */
function handleIntegrationActions(): void {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const detachBtn = target.closest<HTMLElement>('[data-action="detach-integration"]');

    if (!detachBtn) return;

    const keyId = parseInt(detachBtn.getAttribute('data-key-id') || '0', 10);
    const projectId = getCurrentProjectId();

    if (!keyId || !projectId) return;

    e.preventDefault();

    const confirmed = confirm(
      'Are you sure you want to detach this integration from the project?'
    );

    if (!confirmed) return;

    try {
      const { detachIntegration } = await import('@api/projects');

      await safeCall(
        () => detachIntegration(projectId, keyId),
        {
          lockKey: `detach-integration-${projectId}-${keyId}`,
          retryOn401: true,
        }
      );

      // Invalidate cache
      invalidateCache(`project:${projectId}`);
      invalidateCache(`project:${projectId}:integrations`);

      // Reload integrations
      const { getProjectIntegrations } = await import('@api/projects');
      const integrations = await safeCall(
        () => getProjectIntegrations(projectId),
        { retryOn401: true }
      );

      // Update state
      setIntegrations(integrations);

      // Re-render table
      renderIntegrationsTable(integrations);

      showGlobalMessage('success', 'Integration detached from project');
    } catch (error: any) {
      showGlobalMessage('error', error.message || 'Failed to detach integration');
    }
  });
}

/**
 * Handle domain actions (remove from project)
 */
function handleDomainActions(): void {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const removeBtn = target.closest<HTMLElement>('[data-action="remove-domain-from-project"]');

    if (!removeBtn) return;

    const domainId = parseInt(removeBtn.getAttribute('data-domain-id') || '0', 10);
    const siteId = parseInt(removeBtn.getAttribute('data-site-id') || '0', 10);
    const projectId = getCurrentProjectId();

    if (!domainId || !siteId || !projectId) return;

    e.preventDefault();

    const confirmed = confirm(
      'Remove this domain from the project? The domain will remain in your account.'
    );

    if (!confirmed) return;

    try {
      const { removeDomainFromSite } = await import('@api/domains');

      // Remove domain from site (sets site_id = null, role = 'reserve')
      await safeCall(
        () => removeDomainFromSite(siteId, domainId),
        {
          lockKey: `remove-domain-${siteId}-${domainId}`,
          retryOn401: true,
        }
      );

      // Invalidate cache
      invalidateCache(`project:${projectId}`);
      invalidateCache(`site:${siteId}`);
      invalidateCache(`domains`);

      // Reload domains table
      await loadProjectDomains(projectId);

      showGlobalMessage('success', 'Domain removed from project');
    } catch (error: any) {
      showGlobalMessage('error', error.message || 'Failed to remove domain from project');
    }
  });
}
