/**
 * Add Domains Drawer
 *
 * Smart domain parser that extracts domains from raw text,
 * normalizes them, and provides preview before submission.
 */

import { showGlobalMessage } from '@ui/notifications';

// Domain matching regex (updated for IDN TLD support)
// Matches: example.com, xn--domain.net, sub.domain.co.uk, домен.рф (xn--c1ad6a.xn--p1ai)
const DOMAIN_REGEX = /\b((?=[a-z0-9-]{1,63}\.)(?:xn--)?[a-z0-9]+(?:-[a-z0-9]+)*\.)+(?:xn--)?[a-z0-9-]{2,63}\b/gi;

interface ParsedDomainsState {
  raw: string;
  domains: string[];
  count: number;
}

let currentState: ParsedDomainsState = {
  raw: '',
  domains: [],
  count: 0,
};

/**
 * Initialize Add Domains Drawer
 */
export function initAddDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domains"]');
  const rawInput = document.querySelector<HTMLTextAreaElement>('[data-add-raw-input]');
  const domainList = document.querySelector<HTMLElement>('[data-add-domain-list]');
  const emptyState = document.querySelector<HTMLElement>('[data-add-empty-state]');
  const foundCount = document.querySelector<HTMLElement>('[data-add-found-count]');
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-submit]');
  const skipExisting = document.querySelector<HTMLInputElement>('[data-add-skip-existing]');

  if (!drawer || !rawInput) return;

  // Close drawer on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) {
      closeDrawer();
    }
  });

  // Close drawer on overlay click
  drawer.querySelectorAll('[data-drawer-close]').forEach((el) => {
    el.addEventListener('click', () => closeDrawer());
  });

  // Auto-parse on input with debounce
  let parseTimeout: ReturnType<typeof setTimeout>;
  rawInput.addEventListener('input', () => {
    clearTimeout(parseTimeout);
    parseTimeout = setTimeout(() => {
      parseDomains(rawInput.value);
      updatePreview();
    }, 300);
  });

  // Submit handler
  submitBtn?.addEventListener('click', async () => {
    if (currentState.count === 0) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      // TODO: Replace with actual API call
      await mockAddDomains({
        domains: currentState.domains,
        skipExisting: skipExisting?.checked || false,
      });

      // Success
      showGlobalMessage('success', `Successfully added ${currentState.count} domains`);
      closeDrawer();
      resetState();

      // Reload domains table
      window.location.reload(); // Temporary; replace with proper table update
    } catch (error) {
      showGlobalMessage('danger', error instanceof Error ? error.message : 'Failed to add domains');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="icon" data-icon="mono/plus"></span><span>Add domains</span>';
    }
  });

  /**
   * Parse domains from raw text
   */
  function parseDomains(text: string): void {
    currentState.raw = text;

    if (!text.trim()) {
      currentState.domains = [];
      currentState.count = 0;
      return;
    }

    // Extract all domain matches
    const matches = text.match(DOMAIN_REGEX) || [];

    // Normalize: lowercase, dedupe, sort
    const normalized = [...new Set(
      matches.map(d => d.toLowerCase().trim())
    )].sort();

    currentState.domains = normalized;
    currentState.count = normalized.length;
  }

  /**
   * Update preview UI
   */
  function updatePreview(): void {
    if (!domainList || !emptyState || !foundCount || !submitBtn) return;

    // Update count
    foundCount.textContent = String(currentState.count);

    if (currentState.count === 0) {
      // Show empty state
      emptyState.hidden = false;
      domainList.hidden = true;
      submitBtn.disabled = true;
    } else {
      // Show domain list
      emptyState.hidden = true;
      domainList.hidden = false;
      submitBtn.disabled = false;

      // Render domains
      domainList.innerHTML = currentState.domains
        .map(domain => `<div class="domain-preview-item">${domain}</div>`)
        .join('');
    }
  }

  /**
   * Reset state
   */
  function resetState(): void {
    currentState = { raw: '', domains: [], count: 0 };
    if (rawInput) rawInput.value = '';
    updatePreview();
  }

  /**
   * Close drawer and reset state
   */
  function closeDrawer(): void {
    drawer?.setAttribute('hidden', '');
    resetState();
  }

  /**
   * Mock API call (replace with real implementation)
   */
  async function mockAddDomains(payload: { domains: string[]; skipExisting: boolean }): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Mock add domains:', payload);
        resolve();
      }, 1000);
    });
  }
}
