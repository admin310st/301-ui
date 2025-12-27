/**
 * Dashboard page initialization
 *
 * Initializes dashboard components including:
 * - Add domains drawer
 * - Step completion tracking (future)
 * - Integration status display
 */

import { initAddDomainsDrawer } from '@domains/add-domains-drawer';

/**
 * Open add domains drawer
 */
function openAddDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domains"]');
  if (!drawer) return;

  drawer.removeAttribute('hidden');
}

/**
 * Initialize dashboard page
 */
function initDashboard(): void {
  // Check if we're on the dashboard page
  if (!document.querySelector('[data-dashboard-integrations-count]')) return;

  // Initialize Add Domains Drawer
  initAddDomainsDrawer();

  // Attach "Add domains" button handler
  document.querySelectorAll('[data-action="add-domains"]').forEach((btn) => {
    btn.addEventListener('click', () => openAddDomainsDrawer());
  });

  // TODO: Initialize step completion tracking
  // TODO: Load and display integration count
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
