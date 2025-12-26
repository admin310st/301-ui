import { getIntegrationKeys } from '@api/integrations';
import { getAccountId } from '@state/auth-state';
import { updateDashboardOnboardingIndicator } from './sidebar-nav';
import { getZones } from '@api/zones';

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
 * Update sidebar onboarding indicator (runs on all pages)
 */
async function updateSidebarOnboardingIndicator(): Promise<void> {
  try {
    const accountId = getAccountId();
    if (!accountId) return;

    // Fetch integrations and zones in parallel
    const [integrations, zones] = await Promise.all([
      getIntegrationKeys(accountId),
      getZones().catch(() => [])
    ]);

    // Count Cloudflare integrations
    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasCfIntegration = cfIntegrations.length > 0;
    const hasZones = zones.length > 0;

    console.log('[Dashboard] CF integrations:', cfIntegrations.length, 'hasZones:', hasZones, 'zones:', zones.length);

    // Update sidebar indicator with current step
    const currentStep = calculateOnboardingStep(hasCfIntegration, hasZones);
    console.log('[Dashboard] Current step:', currentStep);
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
    const integrations = await getIntegrationKeys(accountId);
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
 * Initialize dashboard page (dashboard.html only)
 */
export function initDashboardPage(): void {
  // Only run on dashboard page
  if (!document.querySelector('[data-step1-state]')) return;

  // Update Step 1 card state when account ID becomes available
  const accountId = getAccountId();
  if (accountId) {
    updateStep1CardState();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          updateStep1CardState();
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
    updateSidebarOnboardingIndicator();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          updateSidebarOnboardingIndicator();
          unsubscribe();
        }
      });
    });
  }
}
