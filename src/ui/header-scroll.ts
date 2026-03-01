/**
 * Smart header visibility with cascading hide/show
 * Two-level header system:
 * - Level 1: .site-header (main header with logo, nav)
 * - Level 2: .utility-bar (breadcrumbs, user menu)
 *
 * Behavior:
 * - Scrolling down: First hide utility-bar, then header (300ms delay)
 * - Scrolling up: First show header, then utility-bar (300ms delay)
 * - At top: Both visible immediately
 *
 * Also tracks --header-offset (visual header bottom) and --shell-left
 * for fixed sidebar and sticky card positioning.
 */

let lastScrollTop = 0;
const scrollDelta = 5; // Minimum scroll distance to trigger state change
const cascadeDelay = 300; // Delay between hiding/showing levels (ms)
let isAtTop = true;
let scrollThreshold = 0;

export function initHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const utilityBar = document.querySelector<HTMLElement>('.utility-bar');
  const dashboardShell = document.querySelector<HTMLElement>('.dashboard-shell');

  if (!header) return;

  // Calculate combined height of header + utility-bar as scroll threshold
  function updateScrollThreshold(): void {
    scrollThreshold = (header?.offsetHeight || 0) + (utilityBar?.offsetHeight || 0);
  }

  updateScrollThreshold();
  window.addEventListener('resize', updateScrollThreshold);

  // Update --header-offset CSS variable based on visible header bottom
  // Used by fixed sidebar (top) and sticky card (top)
  function updateHeaderOffset(): void {
    if (!header) return;
    const rect = header.getBoundingClientRect();
    // rect.bottom accounts for transforms (translateY(-100%) when hidden)
    const offset = Math.max(0, rect.bottom);
    document.documentElement.style.setProperty('--header-offset', `${offset}px`);
  }

  // Update --shell-left for fixed sidebar horizontal positioning
  function updateShellLeft(): void {
    if (!dashboardShell) return;
    const rect = dashboardShell.getBoundingClientRect();
    document.documentElement.style.setProperty('--shell-left', `${rect.left}px`);
  }

  // Combined layout update
  function updateLayoutVars(): void {
    updateHeaderOffset();
    updateShellLeft();
  }

  // Update global notice position to match header height
  function updateGlobalNoticePosition(): void {
    const globalNotice = document.querySelector<HTMLElement>('#GlobalNotice');
    if (!header || !globalNotice) return;

    // Get the visual height of header (includes transformed utility-bar)
    // getBoundingClientRect() automatically accounts for all transforms
    const headerRect = header.getBoundingClientRect();

    // Set top to match the visual height of the header
    globalNotice.style.top = `${headerRect.height}px`;
  }

  // Check if user is at top of page
  function checkTopPosition(): boolean {
    const st = window.scrollY || document.documentElement.scrollTop;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
    isAtTop = st <= scrollThreshold || st === 0 || documentHeight <= window.innerHeight;
    return isAtTop;
  }

  // Hide utility-bar (first level)
  function hideUtilityBar(): void {
    if (!utilityBar || isAtTop) return;
    utilityBar.classList.add('utility-bar-hidden');
    updateGlobalNoticePosition();
  }

  // Show utility-bar (second level)
  function showUtilityBar(): void {
    if (!utilityBar) return;
    utilityBar.classList.remove('utility-bar-hidden');
    updateGlobalNoticePosition();
  }

  // Hide header (second level)
  function hideHeader(): void {
    if (!header || isAtTop) return;
    header.classList.add('header-hidden');
    updateGlobalNoticePosition();
  }

  // Show header (first level)
  function showHeader(): void {
    if (!header) return;
    header.classList.remove('header-hidden');
    updateGlobalNoticePosition();
  }

  // Listen for transition end to update offset after animation completes
  header.addEventListener('transitionend', updateHeaderOffset);
  if (utilityBar) {
    utilityBar.addEventListener('transitionend', updateHeaderOffset);
  }

  // Handle scroll events
  window.addEventListener('scroll', () => {
    const st = window.scrollY || document.documentElement.scrollTop;

    // Ignore small scroll movements
    if (Math.abs(lastScrollTop - st) <= scrollDelta) return;

    updateScrollThreshold();

    if (checkTopPosition()) {
      // At top - show both immediately
      showHeader();
      showUtilityBar();
    } else if (st > lastScrollTop) {
      // Scrolling down - cascading hide: utility-bar first, then header
      hideUtilityBar();
      setTimeout(hideHeader, cascadeDelay);
    } else {
      // Scrolling up - cascading show: header first, then utility-bar
      showHeader();
      setTimeout(showUtilityBar, cascadeDelay);
    }

    lastScrollTop = st;
    updateHeaderOffset();
  });

  // Ensure both are visible on page load if at top
  window.addEventListener('load', () => {
    checkTopPosition();
    if (isAtTop) {
      showHeader();
      showUtilityBar();
    }
    updateGlobalNoticePosition();
    updateLayoutVars();
  });

  // Update positions on resize
  window.addEventListener('resize', () => {
    updateGlobalNoticePosition();
    updateLayoutVars();
  });

  // Initial values
  updateLayoutVars();
}
