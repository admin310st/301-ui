/**
 * Drawer Manager
 *
 * Handles stacked drawers with proper z-index, backdrop, and keyboard management.
 * Allows multiple drawers to be open simultaneously in a stack.
 *
 * Usage:
 *   import { drawerManager } from '@ui/drawer-manager';
 *
 *   // Open drawer (adds to stack)
 *   drawerManager.open('my-drawer');
 *
 *   // Close specific drawer
 *   drawerManager.close('my-drawer');
 *
 *   // Close top drawer (Escape key does this automatically)
 *   drawerManager.closeTop();
 *
 *   // Close all drawers
 *   drawerManager.closeAll();
 */

// Base z-index for drawers (from --z-modal)
const BASE_Z_INDEX = 1000;
const Z_INDEX_STEP = 10;

// Stack of open drawer IDs (bottom to top)
const drawerStack: string[] = [];

// Track if we've set up the global escape listener
let escapeListenerActive = false;

/**
 * Open a drawer by ID
 * Adds it to the stack and sets appropriate z-index
 */
function open(drawerId: string): void {
  const drawer = document.querySelector<HTMLElement>(`[data-drawer="${drawerId}"]`);
  if (!drawer) {
    console.warn(`[DrawerManager] Drawer not found: ${drawerId}`);
    return;
  }

  // If already open, bring to top
  const existingIndex = drawerStack.indexOf(drawerId);
  if (existingIndex !== -1) {
    drawerStack.splice(existingIndex, 1);
  }

  // Add to stack
  drawerStack.push(drawerId);

  // Calculate z-index based on stack position
  const level = drawerStack.length;
  const zIndex = BASE_Z_INDEX + (level * Z_INDEX_STEP);

  // Apply z-index and show
  drawer.style.zIndex = String(zIndex);
  drawer.setAttribute('data-drawer-level', String(level));
  drawer.removeAttribute('hidden');

  // Ensure escape listener is active
  setupEscapeListener();

  // Focus trap - focus first focusable element in drawer
  requestAnimationFrame(() => {
    const focusable = drawer.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  });
}

/**
 * Close a specific drawer by ID
 */
function close(drawerId: string): void {
  const drawer = document.querySelector<HTMLElement>(`[data-drawer="${drawerId}"]`);
  if (!drawer) return;

  // Remove from stack
  const index = drawerStack.indexOf(drawerId);
  if (index !== -1) {
    drawerStack.splice(index, 1);
  }

  // Hide drawer
  drawer.setAttribute('hidden', '');
  drawer.style.zIndex = '';
  drawer.removeAttribute('data-drawer-level');

  // If stack is empty, remove escape listener
  if (drawerStack.length === 0) {
    removeEscapeListener();
  }
}

/**
 * Close the topmost drawer in the stack
 */
function closeTop(): void {
  if (drawerStack.length === 0) return;

  const topDrawerId = drawerStack[drawerStack.length - 1];
  close(topDrawerId);
}

/**
 * Close all open drawers
 */
function closeAll(): void {
  // Close from top to bottom
  while (drawerStack.length > 0) {
    closeTop();
  }
}

/**
 * Check if a drawer is currently open
 */
function isOpen(drawerId: string): boolean {
  return drawerStack.includes(drawerId);
}

/**
 * Get the current stack depth
 */
function getStackDepth(): number {
  return drawerStack.length;
}

/**
 * Get the ID of the topmost drawer
 */
function getTopDrawerId(): string | null {
  return drawerStack.length > 0 ? drawerStack[drawerStack.length - 1] : null;
}

/**
 * Setup global Escape key listener
 */
function setupEscapeListener(): void {
  if (escapeListenerActive) return;

  document.addEventListener('keydown', handleEscapeKey);
  escapeListenerActive = true;
}

/**
 * Remove global Escape key listener
 */
function removeEscapeListener(): void {
  if (!escapeListenerActive) return;

  document.removeEventListener('keydown', handleEscapeKey);
  escapeListenerActive = false;
}

/**
 * Handle Escape key - close top drawer
 */
function handleEscapeKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && drawerStack.length > 0) {
    e.preventDefault();
    e.stopPropagation();
    closeTop();
  }
}

/**
 * Setup overlay click handlers for a drawer
 * Call this once when initializing each drawer
 */
function setupOverlayClick(drawerId: string): void {
  const drawer = document.querySelector<HTMLElement>(`[data-drawer="${drawerId}"]`);
  if (!drawer) return;

  const overlay = drawer.querySelector<HTMLElement>('.drawer__overlay, [data-drawer-close]');
  if (!overlay) return;

  // Use event delegation to handle overlay clicks
  drawer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Close only if clicking overlay or close button, and this drawer is on top
    if (
      (target.classList.contains('drawer__overlay') || target.hasAttribute('data-drawer-close')) &&
      getTopDrawerId() === drawerId
    ) {
      close(drawerId);
    }
  });
}

/**
 * Initialize drawer manager for existing drawers
 * Sets up overlay click handlers for all drawers with data-drawer attribute
 */
function init(): void {
  document.querySelectorAll<HTMLElement>('[data-drawer]').forEach(drawer => {
    const drawerId = drawer.getAttribute('data-drawer');
    if (drawerId) {
      setupOverlayClick(drawerId);
    }
  });
}

// Export drawer manager API
export const drawerManager = {
  open,
  close,
  closeTop,
  closeAll,
  isOpen,
  getStackDepth,
  getTopDrawerId,
  setupOverlayClick,
  init,
};

// Also export individual functions for convenience
export { open as openDrawer, close as closeDrawer, closeTop as closeTopDrawer, closeAll as closeAllDrawers };
