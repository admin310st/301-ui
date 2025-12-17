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
    // Load saved state from localStorage
    const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (isCollapsed) {
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
        const iconName = !isOpen ? 'close' : 'menu';
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

        // Reset mobile burger icon to menu
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/menu');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-menu');
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

        // Reset mobile burger icon to menu
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/menu');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-menu');
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

        // Reset mobile burger icon to menu
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/menu');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-menu');
          }
        }
      }
    }
  });

  // Track window resize to reset mobile drawer state when crossing breakpoints
  let lastWidth = window.innerWidth;

  window.addEventListener('resize', () => {
    const currentWidth = window.innerWidth;
    const wasMobile = lastWidth < 1024;
    const isDesktop = currentWidth >= 1024;

    // Crossing from mobile to desktop: close drawer
    if (wasMobile && isDesktop) {
      document.body.classList.remove('sidebar-open');
      if (mobileToggle) {
        mobileToggle.setAttribute('aria-expanded', 'false');

        // Reset mobile burger icon to menu
        const icon = mobileToggle.querySelector('.icon');
        if (icon) {
          icon.setAttribute('data-icon', 'mono/menu');
          const svg = icon.querySelector('svg');
          const use = svg?.querySelector('use');
          if (use) {
            use.setAttribute('href', '/icons-sprite.svg#i-mono-menu');
          }
        }
      }
    }

    lastWidth = currentWidth;
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
