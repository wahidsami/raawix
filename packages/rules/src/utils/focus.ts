/**
 * Focus-related utilities
 */

/**
 * Get all focusable elements (heuristic)
 */
export function getFocusableElements(document: Document): Element[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  const elements: Element[] = [];
  focusableSelectors.forEach((selector) => {
    const found = document.querySelectorAll(selector);
    found.forEach((el) => {
      // Check if element is visible (basic heuristic)
      const style = (el as HTMLElement).style;
      const computedDisplay = style.display;
      const computedVisibility = style.visibility;
      if (computedDisplay !== 'none' && computedVisibility !== 'hidden') {
        elements.push(el);
      }
    });
  });

  return elements;
}

/**
 * Check if element has visible focus indicator (heuristic from CSS)
 */
export function hasFocusIndicator(element: Element): {
  hasIndicator: boolean;
  methods: string[];
} {
  const methods: string[] = [];
  let hasIndicator = false;

  // Check inline styles
  const style = (element as HTMLElement).style;
  if (style.outline && style.outline !== 'none') {
    methods.push('outline');
    hasIndicator = true;
  }
  if (style.border && style.border !== 'none') {
    methods.push('border');
    hasIndicator = true;
  }
  if (style.boxShadow && style.boxShadow !== 'none') {
    methods.push('box-shadow');
    hasIndicator = true;
  }

  // Check for :focus styles in stylesheets (basic heuristic)
  // This is limited in JSDOM, but we can check for common patterns
  // Note: Full CSS parsing would require more sophisticated approach
  // For MVP, we rely on inline styles and assume :focus rules exist if element has focus-related classes

  return { hasIndicator, methods };
}

