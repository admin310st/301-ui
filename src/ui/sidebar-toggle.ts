/**
 * Sidebar Toggle
 *
 * Handles collapsible sidebar with localStorage persistence
 * and icon switching between menu-close/menu-open states.
 */

const STORAGE_KEY = 'ui.sidebar.collapsed';

export function initSidebarToggle(): void {
  const sidebar = document.querySelector('[data-sidebar]');
  const desktopToggle = document.querySelector('[data-sidebar-toggle]');
  const mobileToggle = document.querySelector('[data-mobile-menu-toggle]');
  const mobileClose = document.querySelector('[data-sidebar-close]');

  if (!sidebar) {
    return;
  }

  // Desktop sidebar collapse
  if (desktopToggle) {
    // Load saved state from localStorage (only on desktop)
    const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    const isDesktop = window.innerWidth >= 1024;

    if (isCollapsed && isDesktop) {
      document.body.classList.add('sidebar-collapsed');
      updateToggleState(desktopToggle, false);
    }

    // Desktop toggle handler
    desktopToggle.addEventListener('click', () => {
      const willCollapse = !document.body.classList.contains('sidebar-collapsed');

      document.body.classList.toggle('sidebar-collapsed');
      updateToggleState(desktopToggle, !willCollapse);
      localStorage.setItem(STORAGE_KEY, String(willCollapse));
    });
  }

  // Mobile menu drawer
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = document.body.classList.contains('sidebar-open');
      document.body.classList.toggle('sidebar-open');
      mobileToggle.setAttribute('aria-expanded', String(!isOpen));

      // Update mobile burger icon
      const icon = mobileToggle.querySelector('.icon');
      if (icon) {
        const iconName = !isOpen ? 'close' : 'backburger';
        icon.setAttribute('data-icon', `mono/${iconName}`);

        const symbolId = `i-mono-${iconName}`;
        let svg = icon.querySelector('svg');
        let use = svg?.querySelector('use');

        if (!svg) {
          svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('aria-hidden', 'true');
          icon.appendChild(svg);
        }

        if (!use) {
          use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          svg.appendChild(use);
        }

        use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);
      }
    });
  }

  // Mobile close button
  if (mobileClose) {
    mobileClose.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');

        // Reset mobile burger icon to backburger
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/backburger');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-backburger');
          }
        }
      }
    });
  }

  // Close sidebar when clicking on overlay (mobile)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Only on mobile
    if (window.innerWidth >= 1024) return;

    // Close if clicking on overlay (outside sidebar)
    if (
      document.body.classList.contains('sidebar-open') &&
      !sidebar.contains(target) &&
      !target.closest('[data-mobile-menu-toggle]')
    ) {
      document.body.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');

        // Reset mobile burger icon to backburger
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/backburger');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-backburger');
          }
        }
      }
    }
  });

  // Close on Escape key (mobile)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.focus();

        // Reset mobile burger icon to backburger
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/backburger');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-backburger');
          }
        }
      }
    }
  });

  // Track window resize to sync sidebar state
  let resizeTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    // Debounce resize handler to prevent glitches during device rotation
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const currentWidth = window.innerWidth;
      const isDesktop = currentWidth >= 1024;

    if (isDesktop) {
      // Desktop mode: close mobile drawer, restore saved collapse state
      document.body.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');

        // Reset mobile burger icon to backburger
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/backburger');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-backburger');
          }
        }
      }

      // Restore saved collapse state from localStorage
      const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
      if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
        if (desktopToggle) {
          updateToggleState(desktopToggle, false);
        }
      } else {
        document.body.classList.remove('sidebar-collapsed');
        if (desktopToggle) {
          updateToggleState(desktopToggle, true);
        }
      }
    } else {
      // Mobile mode: remove collapsed state, ensure drawer is closed
      document.body.classList.remove('sidebar-collapsed');
      document.body.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    }
    }, 150); // 150ms debounce - enough to skip intermediate states during rotation
  });
}

/**
 * Update toggle button aria-expanded state and icon
 */
function updateToggleState(button: Element, isExpanded: boolean): void {
  button.setAttribute('aria-expanded', String(isExpanded));

  const icon = button.querySelector('.icon');
  if (icon) {
    const iconName = isExpanded ? 'menu-close' : 'menu-open';
    icon.setAttribute('data-icon', `mono/${iconName}`);

    // Update or create SVG <use> element
    const symbolId = `i-mono-${iconName}`;
    let svg = icon.querySelector('svg');
    let use = svg?.querySelector('use');

    if (!svg) {
      // Create SVG if it doesn't exist
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-hidden', 'true');
      icon.appendChild(svg);
    }

    if (!use) {
      // Create use element if it doesn't exist
      use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      svg.appendChild(use);
    }

    use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);
  }
}
