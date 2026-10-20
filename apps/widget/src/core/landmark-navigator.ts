/**
 * LandmarkNavigator for Raawi X Widget (Phase 5.5)
 * 
 * Provides safe, accessible keyboard navigation and focus management
 * for validated landmarks provided by the scanner package.
 */

import type { LandmarkItem } from './types';

export interface NavigationResult {
  success: boolean;
  message?: string;
  target?: HTMLElement;
}

export interface LandmarkNavigatorOptions {
  reduceMotion?: boolean;
}

export class LandmarkNavigator {
  /**
   * Safely navigates and transfers keyboard focus to a landmark target
   */
  public static navigateToLandmark(
    landmark: LandmarkItem,
    options?: LandmarkNavigatorOptions
  ): NavigationResult {
    if (typeof document === 'undefined') {
      return { success: false, message: 'Document environment not available' };
    }

    if (!landmark.selector || typeof landmark.selector !== 'string') {
      return { success: false, message: 'Landmark missing selector' };
    }

    // 1. Validate CSS selector syntax safely
    let matches: NodeListOf<Element>;
    try {
      matches = document.querySelectorAll(landmark.selector);
    } catch {
      return { success: false, message: `Invalid CSS selector syntax: "${landmark.selector}"` };
    }

    // 2. Validate uniqueness and presence
    if (matches.length === 0) {
      return { success: false, message: `Landmark target not found on page: "${landmark.selector}"` };
    }

    if (matches.length > 1) {
      return {
        success: false,
        message: `Ambiguous selector: matches ${matches.length} elements for "${landmark.selector}"`,
      };
    }

    const target = matches[0] as HTMLElement;

    // 3. Verify connection to active DOM
    if (!target.isConnected) {
      return { success: false, message: 'Target element is detached from document' };
    }

    // 4. Accessible focus transfer
    const naturallyFocusable =
      target.hasAttribute('tabindex') ||
      ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName.toUpperCase());

    if (!naturallyFocusable && !target.hasAttribute('data-raawi-temp-focus')) {
      target.setAttribute('tabindex', '-1');
      target.setAttribute('data-raawi-temp-focus', 'true');

      const onBlur = () => {
        if (target.getAttribute('data-raawi-temp-focus') === 'true') {
          target.removeAttribute('data-raawi-temp-focus');
          target.removeAttribute('tabindex');
        }
        target.removeEventListener('blur', onBlur);
      };
      target.addEventListener('blur', onBlur, { once: true });
    }

    // Transfer keyboard focus
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }

    // 5. Predictable scrolling respecting reduced motion
    const scrollBehavior = options?.reduceMotion ? 'auto' : 'smooth';
    if (typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ behavior: scrollBehavior, block: 'start', inline: 'nearest' });
      } catch {
        target.scrollIntoView();
      }
    }

    return {
      success: true,
      message: `Navigated to landmark: ${landmark.label || landmark.role || landmark.type || 'Landmark'}`,
      target,
    };
  }
}
