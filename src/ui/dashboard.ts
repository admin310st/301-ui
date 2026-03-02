import { getIntegrationKeys } from '@api/integrations';
import { getAccountId } from '@state/auth-state';
import { updateDashboardOnboardingIndicator } from './sidebar-nav';
import { getZones } from '@api/zones';
import { safeCall } from '@api/ui-client';
import { t } from '@i18n';

const STEPS = [
  { key: 'integrations', icon: 'mono/puzzle', action: 'connect-cloudflare' },
  { key: 'domains',      icon: 'mono/dns',    action: 'add-domains' },
  { key: 'projects',     icon: 'mono/layers',  href: '/projects.html' },
  { key: 'sites',        icon: 'mono/landing', href: '/sites.html' },
  { key: 'redirects',    icon: 'mono/arrow-right', href: '/redirects.html' },
  { key: 'streams',      icon: 'mono/directions-fork', href: '/streams.html' },
] as const;

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
 * Update step-flow pills with live counts and done/pending states
 */
function renderStepFlow(stats: Record<string, number>): void {
  let stepIndex = 1;
  for (const step of STEPS) {
    const pill = document.querySelector<HTMLElement>(`[data-step="${step.key}"]`);
    if (!pill) { stepIndex++; continue; }

    const countEl = pill.querySelector<HTMLElement>('.step-number__count');
    const numberEl = pill.querySelector<HTMLElement>('.step-number');
    const count = stats[step.key] ?? 0;

    if (countEl) {
      countEl.textContent = count > 0 ? count.toString() : stepIndex.toString();
    }
    if (numberEl) {
      numberEl.classList.toggle('step-number--done', count > 0);
    }
    stepIndex++;
  }
}

/**
 * Render compact usage stats list inside the Usage card
 */
function renderUsageList(stats: Record<string, number>): void {
  const list = document.querySelector<HTMLElement>('[data-usage-list]');
  if (!list) return;

  list.innerHTML = STEPS.map(step =>
    `<div class="cluster" style="justify-content: space-between;">
      <span class="text-sm">${t(`dashboard.overview.steps.${step.key}`)}</span>
      <strong class="text-sm">${stats[step.key] ?? 0}</strong>
    </div>`,
  ).join('');
}

/**
 * Show contextual hint card for the first zero-count section
 */
function renderNextStepHint(stats: Record<string, number>): void {
  const container = document.querySelector<HTMLElement>('[data-next-step]');
  if (!container) return;

  const overviewCards = document.querySelector<HTMLElement>('[data-overview-cards]');
  const firstEmpty = STEPS.find(s => (stats[s.key] ?? 0) === 0);
  if (!firstEmpty) {
    container.hidden = true;
    if (overviewCards) {
      renderUsageList(stats);
      overviewCards.hidden = false;
    }
    return;
  }
  if (overviewCards) overviewCards.hidden = true;

  const iconEl = container.querySelector<HTMLElement>('[data-next-step-icon]');
  const textEl = container.querySelector<HTMLElement>('[data-next-step-text]');
  const linkEl = container.querySelector<HTMLAnchorElement>('[data-next-step-link]');

  if (iconEl) {
    iconEl.setAttribute('data-icon', firstEmpty.icon);
  }
  if (textEl) {
    textEl.textContent = t(`dashboard.overview.nextStep.${firstEmpty.key}.hint`);
  }
  if (linkEl) {
    linkEl.textContent = t(`dashboard.overview.nextStep.${firstEmpty.key}.link`);
    // Integrations/domains open drawers; others navigate
    if (firstEmpty.action) {
      linkEl.removeAttribute('href');
      linkEl.setAttribute('data-action', firstEmpty.action);
      linkEl.style.cursor = 'pointer';
    } else if (firstEmpty.href) {
      linkEl.removeAttribute('data-action');
      linkEl.setAttribute('href', firstEmpty.href);
      linkEl.style.cursor = '';
    }
  }

  container.hidden = false;
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

    // Fetch all counts in parallel — each call is independent so one failure doesn't block others
    const [keysResult, projectsResult, sitesResult, domainsResult, tdsResult] = await Promise.allSettled([
      safeCall(() => integrationsModule.getIntegrationKeys(accountId), { lockKey: 'integrations', retryOn401: true }),
      safeCall(() => projectsModule.getProjects(accountId), { lockKey: 'projects', retryOn401: true }),
      safeCall(() => sitesModule.getSites(accountId), { lockKey: 'sites', retryOn401: true }),
      safeCall(() => domainsModule.getDomains(), { lockKey: 'domains', retryOn401: true }),
      safeCall(() => tdsModule.getRules(), { lockKey: 'tds-rules', retryOn401: true }),
    ]);

    const keys = keysResult.status === 'fulfilled' ? keysResult.value : [];
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
    const sites = sitesResult.status === 'fulfilled' ? sitesResult.value : [];
    const allDomains = domainsResult.status === 'fulfilled'
      ? domainsResult.value.groups.flatMap((g: any) => g.domains)
      : [];
    const tdsTotal = tdsResult.status === 'fulfilled' ? tdsResult.value.total : 0;

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

    const stats: Record<string, number> = {
      integrations: keys.length,
      projects: projects.length,
      domains: allDomains.length,
      sites: sites.length,
      redirects: totalRedirects,
      streams: tdsTotal,
    };

    renderStepFlow(stats);
    renderNextStepHint(stats);
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
