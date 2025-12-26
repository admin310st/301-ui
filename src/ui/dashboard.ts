import { getIntegrationKeys } from '@api/integrations';
import { getAccountId } from '@state/auth-state';
import { updateDashboardOnboardingIndicator } from './sidebar-nav';

/**
 * Check onboarding status and update sidebar indicator (global)
 */
export function updateOnboardingStatus(): void {
  const accountId = getAccountId();

  if (accountId) {
    // Account ID already available - check onboarding status immediately
    checkAndUpdateOnboarding(accountId);
  } else {
    // Wait for account ID to be loaded
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          checkAndUpdateOnboarding(state.accountId);
          unsubscribe(); // Only check once
        }
      });
    });
  }
}

/**
 * Internal function to check onboarding and update indicator
 */
async function checkAndUpdateOnboarding(accountId: number): Promise<void> {
  try {
    // Fetch integrations to check if Step 1 is complete
    const integrations = await getIntegrationKeys(accountId);
    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasIntegrations = cfIntegrations.length > 0;

    // Update sidebar onboarding indicator
    updateDashboardOnboardingIndicator(!hasIntegrations);
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    // Show warning icon on error (assume onboarding incomplete)
    updateDashboardOnboardingIndicator(true);
  }
}

/**
 * Update Step 1 state based on integrations count (dashboard page only)
 */
async function updateStep1State(): Promise<void> {
  try {
    const accountId = getAccountId();
    if (!accountId) return;

    // Fetch integrations (Cloudflare only or all providers)
    const integrations = await getIntegrationKeys(accountId);

    // Count Cloudflare integrations only
    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasIntegrations = cfIntegrations.length > 0;

    // Get state containers
    const pendingState = document.querySelector<HTMLElement>('[data-step1-state="pending"]');
    const completedState = document.querySelector<HTMLElement>('[data-step1-state="completed"]');
    const countElement = document.querySelector<HTMLElement>('[data-dashboard-integrations-count]');

    if (!pendingState || !completedState) return;

    // Toggle states
    if (hasIntegrations) {
      pendingState.hidden = true;
      completedState.hidden = false;

      // Update count
      if (countElement) {
        countElement.textContent = cfIntegrations.length.toString();
      }
    } else {
      pendingState.hidden = false;
      completedState.hidden = true;
    }

    // Update sidebar onboarding indicator (will also run globally, but ok to call twice)
    updateDashboardOnboardingIndicator(!hasIntegrations);
  } catch (error) {
    // Silently fail - keep default pending state
    console.error('Failed to load integrations for dashboard:', error);
  }
}

/**
 * Initialize dashboard page
 */
export function initDashboardPage(): void {
  // Only run on dashboard page
  if (!document.querySelector('[data-step1-state]')) return;

  // Update Step 1 state when account ID becomes available
  const accountId = getAccountId();
  if (accountId) {
    // Account ID already available (page reload case)
    updateStep1State();
  } else {
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          updateStep1State();
          unsubscribe(); // Only load once
        }
      });
    });
  }
}
