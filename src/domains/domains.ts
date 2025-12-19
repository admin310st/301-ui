import { mockDomains, type Domain } from './mock-data';

let currentDomains: Domain[] = [];
let selectedDomains = new Set<number>();

export function initDomainsPage(): void {
  const card = document.querySelector('[data-domains-card]');
  if (!card) return;

  // Load mock data after short delay (simulate API)
  setTimeout(() => {
    loadDomains(mockDomains);
  }, 500);

  // Add domains button
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsModal());
  });

  // Retry button
  const retryBtn = document.querySelector('[data-action="retry"]');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      showLoadingState();
      setTimeout(() => loadDomains(mockDomains), 500);
    });
  }

  // Search input
  const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      filterDomains(query);
    });
  }

  // Select all checkbox
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      toggleSelectAll(checked);
    });
  }

  // Inspector actions
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const inspectBtn = target.closest('[data-action="inspect"]');
    if (inspectBtn) {
      const domainId = parseInt(inspectBtn.getAttribute('data-domain-id') || '0');
      openInspector(domainId);
    }
  });

  // Drawer close
  document.querySelectorAll('[data-drawer-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeDrawer());
  });

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
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
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

  // Dropdown actions (delegated, placeholder handlers)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const domainId = actionBtn.getAttribute('data-domain-id');

    if (action === 'inspect') return; // Already handled above

    const domain = currentDomains.find((d) => d.id === parseInt(domainId || '0'));
    if (!domain) return;

    switch (action) {
      case 'manage-redirects':
        alert(`Manage redirects for ${domain.domain}\n(Coming soon)`);
        break;
      case 'dns-settings':
        alert(`DNS / Zone settings for ${domain.domain}\n(Coming soon)`);
        break;
      case 'recheck-health':
        alert(`Re-checking health for ${domain.domain}...`);
        break;
      case 'toggle-monitoring':
        alert(`Toggle monitoring ${domain.monitoring_enabled ? 'OFF' : 'ON'} for ${domain.domain}\n(Coming soon)`);
        break;
      case 'delete-domain':
        if (confirm(`Delete ${domain.domain}?\nThis action cannot be undone.`)) {
          alert(`Delete ${domain.domain}\n(Coming soon)`);
        }
        break;
    }
  });
}

function showLoadingState(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const errorState = document.querySelector('[data-error-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const tableFooter = document.querySelector('[data-table-footer]');

  if (loadingState) loadingState.removeAttribute('hidden');
  if (emptyState) emptyState.setAttribute('hidden', '');
  if (errorState) errorState.setAttribute('hidden', '');
  if (tableShell) tableShell.setAttribute('hidden', '');
  if (tableFooter) tableFooter.setAttribute('hidden', '');
}

function loadDomains(domains: Domain[]): void {
  currentDomains = domains;
  selectedDomains.clear();

  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const tableFooter = document.querySelector('[data-table-footer]');
  const totalCount = document.querySelector('[data-total-count]');

  if (loadingState) loadingState.setAttribute('hidden', '');

  if (domains.length === 0) {
    if (emptyState) emptyState.removeAttribute('hidden');
    if (tableShell) tableShell.setAttribute('hidden', '');
    if (tableFooter) tableFooter.setAttribute('hidden', '');
    return;
  }

  if (emptyState) emptyState.setAttribute('hidden', '');
  if (tableShell) tableShell.removeAttribute('hidden');
  if (tableFooter) tableFooter.removeAttribute('hidden');
  if (totalCount) totalCount.textContent = String(domains.length);

  renderDomainsTable(domains);
}

function renderDomainsTable(domains: Domain[]): void {
  const tbody = document.querySelector('[data-domains-tbody]');
  if (!tbody) return;

  tbody.innerHTML = domains
    .map((domain) => {
      const statusChip = getStatusChip(domain.status);
      const healthIcons = getHealthIcons(domain);
      const expiresText = getExpiresText(domain);

      return `
        <tr>
          <td>
            <input type="checkbox" data-domain-id="${domain.id}" aria-label="Select ${domain.domain}" />
          </td>
          <td>
            <div>
              <div class="domain-cell">
                <strong>${domain.domain}</strong>
              </div>
              <div class="text-muted text-sm">
                ${domain.project_name}${domain.project_lang ? ` (${domain.project_lang})` : ''}
              </div>
            </div>
          </td>
          <td>${statusChip}</td>
          <td>${healthIcons}</td>
          <td>${expiresText}</td>
          <td>
            <div class="btn-group">
              <button
                class="btn-icon"
                type="button"
                data-action="inspect"
                data-domain-id="${domain.id}"
                aria-label="Inspect ${domain.domain}"
              >
                <span class="icon" data-icon="mono/pencil-circle"></span>
              </button>
              <div class="dropdown" data-dropdown>
                <button
                  class="btn-icon btn-icon--ghost dropdown__trigger"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="false"
                  aria-label="More actions for ${domain.domain}"
                >
                  <span class="icon" data-icon="mono/dots-vertical"></span>
                </button>
                <div class="dropdown__menu dropdown__menu--align-right" role="menu">
                  <button class="dropdown__item" type="button" data-action="manage-redirects" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/directions"></span>
                    <span>Manage redirects</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="dns-settings" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/dns"></span>
                    <span>DNS / Zone settings</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="recheck-health" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/refresh"></span>
                    <span>Re-check health</span>
                  </button>
                  <button class="dropdown__item" type="button" data-action="toggle-monitoring" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="${domain.monitoring_enabled ? 'mono/pause' : 'mono/zap'}"></span>
                    <span>Monitoring ${domain.monitoring_enabled ? 'OFF' : 'ON'}</span>
                  </button>
                  <hr class="dropdown__divider" />
                  <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-domain" data-domain-id="${domain.id}">
                    <span class="icon" data-icon="mono/delete"></span>
                    <span>Delete domain</span>
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // Attach checkbox listeners
  tbody.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const domainId = parseInt(target.getAttribute('data-domain-id') || '0');
      if (target.checked) {
        selectedDomains.add(domainId);
      } else {
        selectedDomains.delete(domainId);
      }
      updateSelectAllCheckbox();
    });
  });
}

function getStatusChip(status: Domain['status']): string {
  const variants: Record<string, string> = {
    active: 'badge--ok',
    expired: 'badge--danger',
    expiring: 'badge--warning',
    blocked: 'badge--danger',
    pending: 'badge--neutral',
  };
  const labels: Record<string, string> = {
    active: 'Active',
    expired: 'Expired',
    expiring: 'Expiring',
    blocked: 'Blocked',
    pending: 'Pending',
  };
  return `<span class="badge ${variants[status]}">${labels[status]}</span>`;
}

function getHealthIcons(domain: Domain): string {
  const icons: string[] = [];

  // SSL icon
  if (domain.ssl_status === 'valid') {
    icons.push('<span class="icon text-ok" data-icon="mono/lock" title="SSL valid"></span>');
  } else if (domain.ssl_status === 'expiring') {
    icons.push('<span class="icon text-warning" data-icon="mono/lock" title="SSL expiring soon"></span>');
  } else if (domain.ssl_status === 'invalid') {
    icons.push('<span class="icon text-danger" data-icon="mono/lock" title="SSL invalid"></span>');
  } else {
    icons.push('<span class="icon text-muted" data-icon="mono/lock" title="SSL off"></span>');
  }

  // Abuse icon
  if (domain.abuse_status === 'clean') {
    icons.push('<span class="icon text-ok" data-icon="mono/shield-account" title="Clean"></span>');
  } else if (domain.abuse_status === 'warning') {
    icons.push('<span class="icon text-warning" data-icon="mono/shield-account" title="Warning"></span>');
  } else {
    icons.push('<span class="icon text-danger" data-icon="mono/shield-account" title="Blocked"></span>');
  }

  return `<div class="health-icons">${icons.join(' ')}</div>`;
}

function getExpiresText(domain: Domain): string {
  const expiresDate = new Date(domain.expires_at);
  const today = new Date();
  const daysUntil = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return `<span class="badge badge--danger">${domain.expires_at}</span>`;
  } else if (daysUntil <= 30) {
    return `<span class="badge badge--warning">${domain.expires_at}</span>`;
  }

  return domain.expires_at;
}

function filterDomains(query: string): void {
  if (!query) {
    renderDomainsTable(currentDomains);
    return;
  }

  const filtered = currentDomains.filter(
    (d) =>
      d.domain.toLowerCase().includes(query) ||
      d.project_name.toLowerCase().includes(query) ||
      (d.project_lang && d.project_lang.toLowerCase().includes(query))
  );

  renderDomainsTable(filtered);
}

function toggleSelectAll(checked: boolean): void {
  selectedDomains.clear();
  if (checked) {
    currentDomains.forEach((d) => selectedDomains.add(d.id));
  }

  const checkboxes = document.querySelectorAll<HTMLInputElement>('[data-domains-tbody] input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = checked;
  });
}

function updateSelectAllCheckbox(): void {
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');
  if (!selectAllCheckbox) return;

  const totalVisible = document.querySelectorAll('[data-domains-tbody] tr').length;
  const selectedCount = selectedDomains.size;

  selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalVisible;
  selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalVisible;
}

function openAddDomainsModal(): void {
  const modal = document.querySelector<HTMLDialogElement>('[data-modal="add-domains"]');
  if (!modal) return;

  modal.showModal();

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.close();
    }
  });

  // Close buttons
  modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => modal.close());
  });

  // Confirm button
  const confirmBtn = modal.querySelector('[data-action="confirm-add-domains"]');
  const input = modal.querySelector<HTMLTextAreaElement>('[data-domains-input]');

  if (confirmBtn && input) {
    confirmBtn.addEventListener('click', () => {
      const domains = input.value
        .split('\n')
        .map((d) => d.trim())
        .filter((d) => d);
      if (domains.length > 0) {
        alert(`Would add ${domains.length} domain(s):\n${domains.join('\n')}`);
        modal.close();
        input.value = '';
      }
    });
  }
}

function openInspector(domainId: number): void {
  const domain = currentDomains.find((d) => d.id === domainId);
  if (!domain) return;

  const drawer = document.querySelector('[data-drawer="domain-inspector"]');
  if (!drawer) return;

  // Populate drawer
  const domainEl = drawer.querySelector('[data-inspector-domain]');
  const statusEl = drawer.querySelector('[data-inspector-status]');
  const projectEl = drawer.querySelector('[data-inspector-project]');
  const providerEl = drawer.querySelector('[data-inspector-provider]');
  const sslEl = drawer.querySelector('[data-inspector-ssl]');
  const abuseEl = drawer.querySelector('[data-inspector-abuse]');
  const monitoringEl = drawer.querySelector('[data-inspector-monitoring]');

  if (domainEl) domainEl.textContent = domain.domain;
  if (statusEl) {
    statusEl.textContent = domain.status.charAt(0).toUpperCase() + domain.status.slice(1);
    statusEl.className = `badge ${getStatusChip(domain.status).match(/badge--\w+/)?.[0]}`;
  }
  if (projectEl) projectEl.textContent = `${domain.project_name}${domain.project_lang ? ` (${domain.project_lang})` : ''}`;
  if (providerEl) providerEl.textContent = domain.provider.charAt(0).toUpperCase() + domain.provider.slice(1);
  if (sslEl) sslEl.textContent = `${domain.ssl_status.charAt(0).toUpperCase() + domain.ssl_status.slice(1)}${domain.ssl_valid_to ? ` (until ${domain.ssl_valid_to})` : ''}`;
  if (abuseEl) abuseEl.textContent = domain.abuse_status.charAt(0).toUpperCase() + domain.abuse_status.slice(1);
  if (monitoringEl) monitoringEl.textContent = domain.monitoring_enabled ? 'Enabled' : 'Disabled';

  drawer.removeAttribute('hidden');
}

function closeDrawer(): void {
  const drawer = document.querySelector('[data-drawer="domain-inspector"]');
  if (drawer) drawer.setAttribute('hidden', '');
}
