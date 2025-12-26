import { getIntegrationKeys } from '@api/integrations';
import { getAccountId } from '@state/auth-state';
import { updateDashboardOnboardingIndicator } from './sidebar-nav';

/**
 * Update Step 1 state and sidebar indicator (dashboard page only)
 */
async function updateStep1State(): Promise<void> {
  console.log('[Dashboard] updateStep1State called');
  try {
    const accountId = getAccountId();
    if (!accountId) {
      console.log('[Dashboard] No accountId, exiting');
      return;
    }

    console.log('[Dashboard] Fetching integrations for accountId:', accountId);

    // Fetch integrations (Cloudflare only or all providers)
    const integrations = await getIntegrationKeys(accountId);

    // Count Cloudflare integrations only
    const cfIntegrations = integrations.filter(key => key.provider === 'cloudflare');
    const hasIntegrations = cfIntegrations.length > 0;

    console.log('[Dashboard] CF integrations:', cfIntegrations.length, 'hasIntegrations:', hasIntegrations);

    // Get state containers
    const pendingState = document.querySelector<HTMLElement>('[data-step1-state="pending"]');
    const completedState = document.querySelector<HTMLElement>('[data-step1-state="completed"]');
    const countElement = document.querySelector<HTMLElement>('[data-dashboard-integrations-count]');

    if (!pendingState || !completedState) {
      console.log('[Dashboard] State containers not found');
      return;
    }

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

    // Update sidebar onboarding indicator
    console.log('[Dashboard] Calling updateDashboardOnboardingIndicator with incomplete =', !hasIntegrations);
    updateDashboardOnboardingIndicator(!hasIntegrations);
  } catch (error) {
    // Silently fail - keep default pending state
    console.error('[Dashboard] Failed to load integrations:', error);
  }
}

/**
 * Initialize dashboard page
 */
export function initDashboardPage(): void {
  console.log('[Dashboard] initDashboardPage called');

  // Only run on dashboard page
  const stepElement = document.querySelector('[data-step1-state]');
  if (!stepElement) {
    console.log('[Dashboard] Not on dashboard page, exiting');
    return;
  }

  console.log('[Dashboard] On dashboard page, checking accountId');

  // Update Step 1 state when account ID becomes available
  const accountId = getAccountId();
  if (accountId) {
    console.log('[Dashboard] AccountId available immediately:', accountId);
    // Account ID already available (page reload case)
    updateStep1State();
  } else {
    console.log('[Dashboard] Waiting for accountId via onAuthChange');
    // Wait for account ID to be loaded (fresh login case)
    import('@state/auth-state').then(({ onAuthChange }) => {
      const unsubscribe = onAuthChange((state) => {
        if (state.accountId) {
          console.log('[Dashboard] AccountId received via onAuthChange:', state.accountId);
          updateStep1State();
          unsubscribe(); // Only load once
        }
      });
    });
  }
}
