/**
 * TDS (Traffic Distribution System) Main Entry Point
 *
 * Iteration 2: Welcome Card + Empty State (Onboarding)
 */

import { injectIconSprite } from '../ui/icons';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 TDS module initialized');

  // Inject icon sprite
  injectIconSprite();

  // Initialize components
  initWelcomeCard();
  initContextBar();
  initPipeline();
});

/**
 * Welcome Card initialization
 */
function initWelcomeCard(): void {
  const welcomeCard = document.querySelector('[data-welcome-card]');
  const createRuleButton = document.querySelector('[data-action="create-rule"]');

  if (!welcomeCard) return;

  // CTA button handler (placeholder)
  createRuleButton?.addEventListener('click', () => {
    console.log('Create first rule clicked');
    // TODO: Open drawer in Iteration 4
    alert('Drawer will open here in next iteration!');
  });
}

/**
 * Context Bar initialization (placeholder)
 */
function initContextBar(): void {
  const publishButton = document.querySelector('[data-action="publish"]');

  // Publish button (disabled for now)
  publishButton?.addEventListener('click', () => {
    console.log('Publish clicked');
    alert('Publish functionality coming in Iteration 11!');
  });
}

/**
 * Pipeline initialization (placeholder)
 */
function initPipeline(): void {
  const pipeline = document.querySelector('[data-pipeline]');

  if (!pipeline) return;

  console.log('Pipeline initialized');
  // TODO: Update badge counts dynamically
}

/**
 * Show/hide welcome card based on rules count
 *
 * @param rulesCount - Number of rules
 */
export function updateWelcomeVisibility(rulesCount: number): void {
  const welcomeCard = document.querySelector('[data-welcome-card]');
  const rulesContainer = document.querySelector('[data-rules-container]');

  if (rulesCount === 0) {
    welcomeCard?.removeAttribute('hidden');
    rulesContainer?.setAttribute('hidden', '');
  } else {
    welcomeCard?.setAttribute('hidden', '');
    rulesContainer?.removeAttribute('hidden');
  }
}

// Mock: Start with 0 rules to show welcome card
updateWelcomeVisibility(0);
