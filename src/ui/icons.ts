/**
 * Icon sprite injection and [data-icon] processing.
 * Shared between main.ts (dashboard/auth) and main-public.ts (content pages).
 */

/**
 * Inject SVG sprite with icons once per page.
 */
export async function injectIconSprite(): Promise<void> {
  const res = await fetch('/icons-sprite.svg', { cache: 'force-cache' });
  if (!res.ok) return;

  let svgText = await res.text();

  // Removing the parasitic Cloudflare script
  svgText = svgText.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

  if (!svgText.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgText = svgText.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.width = '0';
  wrap.style.height = '0';
  wrap.style.overflow = 'hidden';
  wrap.innerHTML = svgText;

  const svg = wrap.querySelector('svg');
  if (svg) document.body.prepend(svg);
}

/**
 * Process a single [data-icon] element and inject SVG <use> element.
 * Example: data-icon="mono/home" → <svg><use href="/icons-sprite.svg#i-mono-home"></use></svg>
 */
function processIconElement(el: Element): void {
  const iconName = el.getAttribute('data-icon');
  if (!iconName) return;

  // Skip if already processed (has SVG child)
  if (el.querySelector('svg')) return;

  // Convert "mono/home" to "i-mono-home"
  const symbolId = `i-${iconName.replace('/', '-')}`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);

  svg.appendChild(use);
  el.appendChild(svg);
}

/**
 * Process all [data-icon] attributes on the page
 */
export function processDataIconAttributes(): void {
  document.querySelectorAll('[data-icon]').forEach(processIconElement);
}

/**
 * Set up MutationObserver to automatically process icons in dynamically added content.
 * This handles icons added via JS (sidebar nav, dynamic components, etc.)
 */
export function initIconObserver(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Process added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const element = node as Element;

        // Process the element itself if it has data-icon
        if (element.hasAttribute('data-icon')) {
          processIconElement(element);
        }

        // Process any child elements with data-icon
        element.querySelectorAll('[data-icon]').forEach(processIconElement);
      });
    });
  });

  // Observe the entire document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
