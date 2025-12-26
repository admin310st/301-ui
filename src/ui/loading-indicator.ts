/**
 * Loading indicator (1px animated bar in utility-bar with shimmer effect)
 *
 * Usage:
 * - Brand (blue): Page loads and general operations
 * - CF (orange): Cloudflare API operations (account connection, domain sync, etc.)
 * - Primary (blue): Same as brand, for consistency
 *
 * Examples:
 *
 * // Manual control
 * showLoading('cf');
 * await someCloudflareOperation();
 * hideLoading();
 *
 * // Automatic with promise wrapper
 * const result = await withLoading(
 *   fetchCloudflareAccounts(),
 *   'cf'
 * );
 *
 * // Available globally for use in other modules
 * window.showLoading('cf');
 * window.hideLoading();
 * window.withLoading(promise, 'cf');
 */

export type NoticeFlashType = 'success' | 'error' | 'info';

let loadingBar: HTMLElement | null = null;
let pendingNoticeFlash: NoticeFlashType | null = null;

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
 * If pendingNoticeFlash is set, transitions shimmer to notice color
 */
export function hideLoading(): void {
  if (!loadingBar) return;

  // If there's a pending notice, transition shimmer to notice color
  if (pendingNoticeFlash) {
    const flashType = pendingNoticeFlash;
    pendingNoticeFlash = null; // Clear pending

    // Change shimmer color to notice color
    loadingBar.dataset.type = flashType;
    loadingBar.dataset.loading = 'flushing'; // Special state: shimmer continues with new color

    // After one shimmer cycle (1.5s), fix color in utility-bar border
    setTimeout(() => {
      if (!loadingBar) return;
      delete loadingBar.dataset.loading;

      // Fix color in utility-bar border for 600ms
      const utilityBar = document.querySelector<HTMLElement>('.utility-bar');
      if (utilityBar) {
        utilityBar.dataset.borderFlash = flashType;

        // Clear border flash after 600ms
        setTimeout(() => {
          if (utilityBar.dataset.borderFlash === flashType) {
            delete utilityBar.dataset.borderFlash;
          }
        }, 600);
      }

      // Reset loading-bar type to default
      setTimeout(() => {
        if (loadingBar && !loadingBar.dataset.loading) {
          loadingBar.dataset.type = 'brand';
        }
      }, 200);
    }, 1500); // One full shimmer cycle

    return;
  }

  // Normal hide without notice flash
  delete loadingBar.dataset.loading;

  // Keep the element in DOM for reuse
  setTimeout(() => {
    if (loadingBar && !loadingBar.dataset.loading) {
      loadingBar.dataset.type = 'brand'; // Reset to default
    }
  }, 200); // Match CSS transition duration
}

/**
 * Set pending notice flash that will show after loading completes
 * Call this BEFORE hideLoading() to trigger the flash transition
 */
export function setPendingNoticeFlash(type: NoticeFlashType): void {
  pendingNoticeFlash = type;
}

/**
 * Check if loading is currently active
 */
export function isLoading(): boolean {
  return loadingBar?.dataset.loading === 'true';
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
