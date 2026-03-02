import { getIntegrationKeys } from '@api/integrations';
import { getAccountId } from '@state/auth-state';
import { updateDashboardOnboardingIndicator } from './sidebar-nav';
import { getZones } from '@api/zones';
import { safeCall } from '@api/ui-client';

/**
 * Calculate current onboarding step
 * Step 1: Connect Cloudflare
 * Step 2: Add domains
 * Step 3: Control traffic (not implemented yet)
 */
function calculateOnboardingStep(hasCfIntegration: boolean, hasZones: boolean): number | null {
  if (!hasCfIntegration) {
    return 1; // Need to connect Cloudflare
  }
  if (!hasZones) {
    return 2; // Need to add domains
  }
  // All basic steps complete
  return null;
}

/**
 * Toggle dashboard mode visibility
 */
function setDashboardMode(mode: 'onboarding' | 'overview'): void {
  document.querySelectorAll<HTMLElement>('[data-dashboard-mode]').forEach(el => {
    el.hidden = el.dataset.dashboardMode !== mode;
  });
}

/**
 * Populate overview stat cards with live counts
 */
async function populateOverviewStats(): Promise<void> {
  try {
    const accountId = getAccountId();
    if (!accountId) return;

    // Dynamic imports — same modules the sidebar uses
    const [integrationsModule, projectsModule, sitesModule, domainsModule, tdsModule] =
      await Promise.all([
        import('@api/integrations'),
        import('@api/projects'),
        import('@api/sites'),
        import('@api/domains'),
        import('@api/tds'),
      ]);

    // Fetch all counts in parallel — lockKeys match sidebar so safeCall deduplicates in-flight
    const [keys, projects, sites, domainsResponse, tdsResponse] = await Promise.all([
      safeCall(() => integrationsModule.getIntegrationKeys(accountId), { lockKey: 'integrations', retryOn401: true }),
      safeCall(() => projectsModule.getProjects(accountId), { lockKey: 'projects', retryOn401: true }),
      safeCall(() => sitesModule.getSites(accountId), { lockKey: 'sites', retryOn401: true }),
      safeCall(() => domainsModule.getDomains(), { lockKey: 'domains', retryOn401: true }),
      safeCall(() => tdsModule.getRules(), { lockKey: 'tds-rules', retryOn401: true }),
    ]);

    const allDomains = domainsResponse.groups.flatMap((g: any) => g.domains);

    // Count redirects from site data (aggregate total_redirects)
    let totalRedirects = 0;
    if (sites.length > 0) {
      const { getSiteRedirects } = await import('@api/redirects');
      const sitesToFetch = sites.slice(0, 10);
      const results = await Promise.allSettled(
        sitesToFetch.map(site =>
          safeCall(
            () => getSiteRedirects(site.id),
            { lockKey: `redirects:site:${site.id}`, retryOn401: true },
          ),
        ),
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          totalRedirects += result.value.total_redirects;
        }
      }
    }

    // Write counts into stat cards
    const stats: Record<string, number> = {
      integrations: keys.length,
      projects: projects.length,
      domains: allDomains.length,
      sites: sites.length,
      redirects: totalRedirects,
      streams: tdsResponse.total,
    };

    for (const [key, value] of Object.entries(stats)) {
      const el = document.querySelector<HTMLElement>(`[data-stat="${key}"]`);
      if (el) el.textContent = value.toString();
    }
  } catch (error) {
    console.error('Failed to populate overview stats:', error);
  }
}

/**
 * Update sidebar onboarding indicator (runs on all pages)
 */
async function updateSidebarOnboardingIndicator(): Promise<void> {
  try {
    const accountId = getAccountId();
    if (!accountId) return;

    // Fetch integrations and zones in parallel
    const [integrations, zones] = await Promise.all([
      safeCall(() => getIntegrationKeys(accountId), { lockKey: 'integrations', retryOn401: true }),
      safeCall(() => getZones(), { lockKey: 'zones', retryOn401: true }).catch(() => [])
    ]);

    // Count Cloudflare integrations
    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasCfIntegration = cfIntegrations.length > 0;
    const hasZones = zones.length > 0;

    // Update sidebar indicator with current step
    const currentStep = calculateOnboardingStep(hasCfIntegration, hasZones);
    updateDashboardOnboardingIndicator(currentStep);
  } catch (error) {
    console.error('Failed to update onboarding indicator:', error);
  }
}

/**
 * Update Step 1 card state (dashboard page only)
 */
async function updateStep1CardState(): Promise<void> {
  try {
    const accountId = getAccountId();
    if (!accountId) return;

    // Fetch integrations
    const integrations = await safeCall(() => getIntegrationKeys(accountId), { lockKey: 'integrations', retryOn401: true });
    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasCfIntegration = cfIntegrations.length > 0;

    // Get state containers
    const pendingState = document.querySelector<HTMLElement>('[data-step1-state="pending"]');
    const completedState = document.querySelector<HTMLElement>('[data-step1-state="completed"]');
    const countElement = document.querySelector<HTMLElement>('[data-dashboard-integrations-count]');

    if (!pendingState || !completedState) return;

    // Toggle Step 1 card states
    if (hasCfIntegration) {
      pendingState.hidden = true;
      completedState.hidden = false;

      if (countElement) {
        countElement.textContent = cfIntegrations.length.toString();
      }
    } else {
      pendingState.hidden = false;
      completedState.hidden = true;
    }
  } catch (error) {
    console.error('Failed to update dashboard card:', error);
  }
}

/**
 * Determine dashboard mode and initialize accordingly
 */
async function initDashboardMode(): Promise<void> {
  try {
    const accountId = getAccountId();
    if (!accountId) return;

    // Fetch integrations and zones to determine onboarding step
    const [integrations, zones] = await Promise.all([
      safeCall(() => getIntegrationKeys(accountId), { lockKey: 'integrations', retryOn401: true }),
      safeCall(() => getZones(), { lockKey: 'zones', retryOn401: true }).catch(() => []),
    ]);

    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasCfIntegration = cfIntegrations.length > 0;
    const hasZones = zones.length > 0;

    const currentStep = calculateOnboardingStep(hasCfIntegration, hasZones);

    if (currentStep !== null) {
      // Still onboarding
      setDashboardMode('onboarding');
      void updateStep1CardState();
    } else {
      // Onboarding complete — show overview
      setDashboardMode('overview');
      void populateOverviewStats();
    }
  } catch (error) {
    console.error('Failed to init dashboard mode:', error);
    // Fallback to onboarding on error
    setDashboardMode('onboarding');
  }
}

/**
 * Initialize dashboard page (dashboard.html only)
 */
export function initDashboardPage(): void {
  // Only run on dashboard page — check for dashboard-mode containers
  if (!document.querySelector('[data-dashboard-mode]')) return;

  const accountId = getAccountId();
  if (accountId) {
    void initDashboardMode();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    void import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          void initDashboardMode();
          unsubscribe();
        }
      });
    });
  }
}

/**
 * Initialize sidebar onboarding indicator (all authenticated pages)
 */
export function initSidebarOnboarding(): void {
  const accountId = getAccountId();
  if (accountId) {
    void updateSidebarOnboardingIndicator();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    void import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          void updateSidebarOnboardingIndicator();
          unsubscribe();
        }
      });
    });
  }
}
