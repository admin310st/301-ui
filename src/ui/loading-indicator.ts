/**
 * Loading indicator (1px animated bar in utility-bar)
 * Colors: brand (default), cf (orange), primary (blue)
 */

let loadingBar: HTMLElement | null = null;

function ensureLoadingBar(): HTMLElement {
  if (loadingBar) return loadingBar;

  // Find utility-bar and inject loading-bar
  const utilityBar = document.querySelector('.utility-bar');
  if (!utilityBar) {
    // Create a fallback at the top of the page if no utility-bar exists
    loadingBar = document.createElement('div');
    loadingBar.className = 'loading-bar';
    loadingBar.style.position = 'fixed';
    loadingBar.style.top = '0';
    document.body.insertBefore(loadingBar, document.body.firstChild);
  } else {
    loadingBar = document.createElement('div');
    loadingBar.className = 'loading-bar';
    utilityBar.appendChild(loadingBar);
  }

  return loadingBar;
}

/**
 * Show loading indicator
 * @param type - 'brand' (default blue), 'cf' (orange), or 'primary' (blue)
 */
export function showLoading(type: 'brand' | 'cf' | 'primary' = 'brand'): void {
  const bar = ensureLoadingBar();
  bar.dataset.type = type;
  bar.dataset.loading = 'true';
}

/**
 * Hide loading indicator
 */
export function hideLoading(): void {
  if (!loadingBar) return;
  delete loadingBar.dataset.loading;

  // Keep the element in DOM for reuse
  setTimeout(() => {
    if (loadingBar && !loadingBar.dataset.loading) {
      loadingBar.dataset.type = 'brand'; // Reset to default
    }
  }, 200); // Match CSS transition duration
}

/**
 * Show loading for a promise/async operation
 * @param promise - The async operation
 * @param type - Loading indicator color type
 * @returns The promise result
 */
export async function withLoading<T>(
  promise: Promise<T>,
  type: 'brand' | 'cf' | 'primary' = 'brand'
): Promise<T> {
  showLoading(type);
  try {
    return await promise;
  } finally {
    hideLoading();
  }
}

/**
 * Initialize loading indicator on page load
 * Shows brand-colored loader, hides after page is fully loaded
 */
export function initPageLoadIndicator(): void {
  // Show loading if page is still loading or interactive (not yet fully loaded)
  if (document.readyState === 'loading' || document.readyState === 'interactive') {
    const startTime = Date.now();
    showLoading('brand');

    const hideOnLoad = (): void => {
      // Ensure loading bar is visible for at least 600ms to show animation
      const elapsed = Date.now() - startTime;
      const minDisplayTime = 600;
      const delay = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        hideLoading();
      }, delay);

      window.removeEventListener('load', hideOnLoad);
    };

    // Hide when page is fully loaded (all resources including images/CSS)
    window.addEventListener('load', hideOnLoad);
  }
}
