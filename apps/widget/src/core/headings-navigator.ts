/**
 * Standalone Host Page Headings Navigator for Raawi X Widget
 * 
 * Discovers meaningful, non-empty h1-h6 headings from the host page DOM,
 * presents an accessible hierarchy, and navigates non-destructively
 * without permanent DOM alterations or external API/scanner dependencies.
 */

export interface HeadingItem {
  id: string;
  level: number; // 1 to 6
  text: string;
  element: HTMLElement;
}

export interface NavigationOptions {
  reduceMotion?: boolean;
}

export class HeadingsNavigator {
  /**
   * Discovers all visible, non-empty headings (H1-H6) in the host document,
   * strictly excluding widget internal elements and hidden nodes.
   */
  public static discoverHeadings(rootDoc: Document = document): HeadingItem[] {
    if (!rootDoc || !rootDoc.querySelectorAll) {
      return [];
    }

    const headingNodes = Array.from(rootDoc.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
    const items: HeadingItem[] = [];

    headingNodes.forEach((node, index) => {
      // 1. Exclude widget internal elements
      if (
        node.closest('raawi-accessibility-widget') ||
        node.closest('.raawi-theme') ||
        node.closest('#raawi-accessibility-panel')
      ) {
        return;
      }

      // 2. Exclude hidden or non-rendered elements
      if (HeadingsNavigator.isElementHidden(node)) {
        return;
      }

      // 3. Extract and normalize heading text
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) {
        return;
      }

      // 4. Determine level from tag name
      const level = parseInt(node.tagName.substring(1), 10) || 1;

      // Ensure stable id for navigation
      const id = node.id || `raawi-heading-ref-${index + 1}`;

      items.push({
        id,
        level,
        text,
        element: node,
      });
    });

    return items;
  }

  /**
   * Checks whether an element or any of its ancestors is hidden from assistive tech.
   */
  public static isElementHidden(el: HTMLElement): boolean {
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;

    // Check style attributes or computed style where available
    if (el.style.display === 'none' || el.style.visibility === 'hidden') return true;

    // Check ancestors up to document root
    let parent = el.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      if (parent.hasAttribute('hidden')) return true;
      if (parent.getAttribute('aria-hidden') === 'true') return true;
      if (parent.style.display === 'none' || parent.style.visibility === 'hidden') return true;
      parent = parent.parentElement;
    }

    return false;
  }

  /**
   * Smoothly navigates to a target heading, places accessible focus,
   * and preserves host page DOM integrity upon blur.
   */
  public static navigateToHeading(
    heading: HeadingItem,
    options: NavigationOptions = {}
  ): { success: boolean; message?: string } {
    if (!heading || !heading.element || !heading.element.isConnected) {
      return { success: false, message: 'Heading element is not connected to the document' };
    }

    const el = heading.element;

    // 1. Scroll into view respecting prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shouldReduceMotion = Boolean(options.reduceMotion || prefersReducedMotion);

    try {
      el.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    } catch {
      el.scrollIntoView();
    }

    // 2. Manage accessible focus without permanent DOM mutations
    const hadTabindex = el.hasAttribute('tabindex');
    if (!hadTabindex) {
      el.setAttribute('tabindex', '-1');
      el.setAttribute('data-raawi-temp-focus', 'true');
      el.addEventListener(
        'blur',
        () => {
          el.removeAttribute('data-raawi-temp-focus');
          el.removeAttribute('tabindex');
        },
        { once: true }
      );
    }

    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }

    return { success: true };
  }
}
