/**
 * Sidebar Search (Menu Filter)
 *
 * Filters sidebar navigation items based on user input
 */

export function initSidebarSearch(): void {
  const searchInput = document.querySelector<HTMLInputElement>('[data-sidebar-search]');
  const navItems = document.querySelectorAll<HTMLAnchorElement>('.sidebar .navitem');

  if (!searchInput || navItems.length === 0) {
    return;
  }

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();

    navItems.forEach((item) => {
      const label = item.querySelector('.label');
      if (!label) return;

      // Get all searchable text: current translation + English fallback
      const currentText = label.textContent?.toLowerCase() || '';
      const englishLabel = item.dataset.labelEn?.toLowerCase() || '';

      // Match if query is found in either current translation or English label
      const matches = currentText.includes(query) || englishLabel.includes(query);

      // Show/hide based on match
      if (query === '' || matches) {
        item.style.display = '';
        item.removeAttribute('aria-hidden');
      } else {
        item.style.display = 'none';
        item.setAttribute('aria-hidden', 'true');
      }
    });

    // Handle spacer visibility
    const spacer = document.querySelector('.sidebar__spacer');
    if (spacer) {
      const visibleItems = Array.from(navItems).filter(
        (item) => item.style.display !== 'none'
      );
      // Hide spacer if search is active and items are filtered
      spacer.setAttribute('style', query && visibleItems.length < navItems.length ? 'display: none' : '');
    }
  });

  // Clear search on Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.blur();
    }
  });
}
