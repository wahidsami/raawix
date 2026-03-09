/**
 * Accessibility Barriers Detection
 * 
 * Detects when websites disable or interfere with accessibility tools,
 * assistive technologies, or user accessibility preferences.
 * 
 * WCAG 2.1 Level A/AA violations:
 * - 2.1.1 Keyboard (Level A) - Must be fully keyboard accessible
 * - 1.4.4 Resize text (Level AA) - Text must be resizable up to 200%
 * - 2.5.1 Pointer Gestures (Level A) - No gesture-only functionality
 */

import type { Page } from 'playwright';

export interface AccessibilityBarrier {
  type: 'user-select-disabled' | 'pointer-events-disabled' | 'zoom-disabled' | 
        'context-menu-disabled' | 'keyboard-nav-blocked' | 'text-resize-blocked' |
        'copy-paste-blocked' | 'selection-blocked';
  severity: 'critical' | 'serious' | 'moderate';
  wcagId: string;
  level: 'A' | 'AA' | 'AAA';
  selector?: string;
  description: string;
  impact: string;
  recommendation: string;
  affectedElements?: number;
}

/**
 * Check for zoom/pinch gesture blocking in viewport meta tag
 */
async function checkZoomDisabled(page: Page): Promise<AccessibilityBarrier[]> {
  const barriers: AccessibilityBarrier[] = [];
  
  try {
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (!meta) return null;
      
      const content = meta.getAttribute('content') || '';
      return {
        content,
        hasUserScalableNo: /user-scalable\s*=\s*no/i.test(content),
        hasMaximumScale1: /maximum-scale\s*=\s*1(?:\.0)?/i.test(content),
        hasMinimumScale1: /minimum-scale\s*=\s*1(?:\.0)?/i.test(content),
      };
    });
    
    if (viewportMeta?.hasUserScalableNo || viewportMeta?.hasMaximumScale1) {
      barriers.push({
        type: 'zoom-disabled',
        severity: 'critical',
        wcagId: '1.4.4',
        level: 'AA',
        selector: 'meta[name="viewport"]',
        description: 'Viewport meta tag disables pinch-to-zoom',
        impact: 'Users with low vision cannot zoom in to read content. This violates WCAG 1.4.4 Resize text (Level AA).',
        recommendation: 'Remove user-scalable=no and maximum-scale=1 from viewport meta tag. Allow users to zoom up to 200%.',
        affectedElements: 1,
      });
    }
  } catch (error) {
    console.warn('Error checking viewport meta tag:', error);
  }
  
  return barriers;
}

/**
 * Check for user-select: none (prevents text selection)
 */
async function checkTextSelectionDisabled(page: Page): Promise<AccessibilityBarrier[]> {
  const barriers: AccessibilityBarrier[] = [];
  
  try {
    const result = await page.evaluate(() => {
      const elementsWithUserSelectNone: string[] = [];
      
      // Check all elements for user-select: none
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const userSelect = style.getPropertyValue('user-select') || 
                          style.getPropertyValue('-webkit-user-select') ||
                          style.getPropertyValue('-moz-user-select');
        
        if (userSelect === 'none' && el.textContent && el.textContent.trim().length > 20) {
          elementsWithUserSelectNone.push(el.tagName.toLowerCase());
        }
      });
      
      // Check body/html specifically
      const bodyStyle = window.getComputedStyle(document.body);
      const bodyUserSelect = bodyStyle.getPropertyValue('user-select');
      const htmlUserSelect = window.getComputedStyle(document.documentElement).getPropertyValue('user-select');
      
      return {
        count: elementsWithUserSelectNone.length,
        elements: elementsWithUserSelectNone.slice(0, 10), // Sample
        bodyDisabled: bodyUserSelect === 'none',
        htmlDisabled: htmlUserSelect === 'none',
      };
    });
    
    if (result.bodyDisabled || result.htmlDisabled || result.count > 0) {
      barriers.push({
        type: 'user-select-disabled',
        severity: result.bodyDisabled || result.htmlDisabled ? 'critical' : 'serious',
        wcagId: '2.1.1',
        level: 'A',
        selector: result.bodyDisabled ? 'body' : result.htmlDisabled ? 'html' : 'multiple',
        description: 'Text selection disabled with user-select: none',
        impact: 'Screen reader users and users who need to copy/paste content are blocked. Affects keyboard navigation and assistive technologies.',
        recommendation: 'Remove user-select: none. Users must be able to select and copy text for accessibility.',
        affectedElements: result.count,
      });
    }
  } catch (error) {
    console.warn('Error checking text selection:', error);
  }
  
  return barriers;
}

/**
 * Check for pointer-events: none on interactive elements
 */
async function checkPointerEventsDisabled(page: Page): Promise<AccessibilityBarrier[]> {
  const barriers: AccessibilityBarrier[] = [];
  
  try {
    const result = await page.evaluate(() => {
      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [tabindex]';
      const interactiveElements = document.querySelectorAll(interactiveSelectors);
      let count = 0;
      
      interactiveElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none') {
          count++;
        }
      });
      
      return { count };
    });
    
    if (result.count > 0) {
      barriers.push({
        type: 'pointer-events-disabled',
        severity: 'serious',
        wcagId: '2.1.1',
        level: 'A',
        selector: 'interactive elements',
        description: 'Interactive elements have pointer-events: none',
        impact: 'Users cannot interact with buttons, links, or form controls. Blocks mouse, touch, and assistive technology interactions.',
        recommendation: 'Remove pointer-events: none from interactive elements. Ensure all controls are accessible.',
        affectedElements: result.count,
      });
    }
  } catch (error) {
    console.warn('Error checking pointer events:', error);
  }
  
  return barriers;
}

/**
 * Check for disabled context menu (right-click blocking)
 */
async function checkContextMenuDisabled(page: Page): Promise<AccessibilityBarrier[]> {
  const barriers: AccessibilityBarrier[] = [];
  
  try {
    const result = await page.evaluate(() => {
      // Check if contextmenu event is prevented
      let contextMenuPrevented = false;
      
      // Check for oncontextmenu="return false" attributes
      const elementsWithContextMenuBlock = document.querySelectorAll('[oncontextmenu]');
      
      // Check for JavaScript event listeners that prevent context menu
      // This is a heuristic check
      const bodyOnContextMenu = document.body.getAttribute('oncontextmenu');
      
      return {
        hasContextMenuBlock: elementsWithContextMenuBlock.length > 0 || bodyOnContextMenu === 'return false',
        count: elementsWithContextMenuBlock.length,
      };
    });
    
    if (result.hasContextMenuBlock) {
      barriers.push({
        type: 'context-menu-disabled',
        severity: 'moderate',
        wcagId: '2.1.1',
        level: 'A',
        selector: 'body or multiple elements',
        description: 'Right-click context menu is disabled',
        impact: 'Users who rely on context menu for browser accessibility features (e.g., "Read Aloud", "Translate") are blocked.',
        recommendation: 'Remove JavaScript that blocks contextmenu events. Allow browser accessibility features to function.',
        affectedElements: result.count,
      });
    }
  } catch (error) {
    console.warn('Error checking context menu:', error);
  }
  
  return barriers;
}

/**
 * Check for keyboard navigation blocking (tabindex=-1 on focusable elements)
 */
async function checkKeyboardNavigationBlocked(page: Page): Promise<AccessibilityBarrier[]> {
  const barriers: AccessibilityBarrier[] = [];
  
  try {
    const result = await page.evaluate(() => {
      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [role="link"]';
      const interactiveElements = document.querySelectorAll(interactiveSelectors);
      let count = 0;
      
      interactiveElements.forEach((el) => {
        const tabindex = el.getAttribute('tabindex');
        if (tabindex === '-1') {
          count++;
        }
      });
      
      return { count };
    });
    
    if (result.count > 0) {
      barriers.push({
        type: 'keyboard-nav-blocked',
        severity: 'critical',
        wcagId: '2.1.1',
        level: 'A',
        selector: 'interactive elements with tabindex="-1"',
        description: 'Interactive elements removed from keyboard navigation',
        impact: 'Keyboard-only users cannot access these controls. Violates WCAG 2.1.1 Keyboard (Level A).',
        recommendation: 'Remove tabindex="-1" from interactive elements unless they are intentionally hidden or part of a skip link pattern.',
        affectedElements: result.count,
      });
    }
  } catch (error) {
    console.warn('Error checking keyboard navigation:', error);
  }
  
  return barriers;
}

/**
 * Check for copy/paste blocking via JavaScript
 */
async function checkCopyPasteBlocked(page: Page): Promise<AccessibilityBarrier[]> {
  const barriers: AccessibilityBarrier[] = [];
  
  try {
    const result = await page.evaluate(() => {
      // Check for oncopy/oncut/onpaste event prevention
      const elementsWithCopyBlock = document.querySelectorAll('[oncopy], [oncut], [onpaste]');
      
      return {
        count: elementsWithCopyBlock.length,
        hasCopyBlock: elementsWithCopyBlock.length > 0,
      };
    });
    
    if (result.hasCopyBlock) {
      barriers.push({
        type: 'copy-paste-blocked',
        severity: 'serious',
        wcagId: '2.1.1',
        level: 'A',
        selector: 'elements with oncopy/oncut/onpaste',
        description: 'Copy/paste functionality is disabled',
        impact: 'Users who need to copy content for translation tools, note-taking, or assistive software are blocked.',
        recommendation: 'Remove JavaScript that prevents copy/cut/paste. Users should have full control over content interaction.',
        affectedElements: result.count,
      });
    }
  } catch (error) {
    console.warn('Error checking copy/paste blocking:', error);
  }
  
  return barriers;
}

/**
 * Main function to detect all accessibility barriers
 */
export async function detectAccessibilityBarriers(page: Page): Promise<AccessibilityBarrier[]> {
  const allBarriers: AccessibilityBarrier[] = [];
  
  try {
    // Run all checks in parallel for performance
    const [
      zoomBarriers,
      textSelectionBarriers,
      pointerEventsBarriers,
      contextMenuBarriers,
      keyboardNavBarriers,
      copyPasteBarriers,
    ] = await Promise.all([
      checkZoomDisabled(page),
      checkTextSelectionDisabled(page),
      checkPointerEventsDisabled(page),
      checkContextMenuDisabled(page),
      checkKeyboardNavigationBlocked(page),
      checkCopyPasteBlocked(page),
    ]);
    
    allBarriers.push(
      ...zoomBarriers,
      ...textSelectionBarriers,
      ...pointerEventsBarriers,
      ...contextMenuBarriers,
      ...keyboardNavBarriers,
      ...copyPasteBarriers
    );
    
    console.log(`[ACCESSIBILITY-BARRIERS] Found ${allBarriers.length} barriers on page`);
    
  } catch (error) {
    console.error('[ACCESSIBILITY-BARRIERS] Error detecting barriers:', error);
  }
  
  return allBarriers;
}

/**
 * Convert barriers to findings format for database storage
 */
export function barriersToFindings(barriers: AccessibilityBarrier[], pageUrl: string, pageNumber: number) {
  return barriers.map((barrier) => ({
    wcagId: barrier.wcagId,
    title: `Accessibility Tool Disabled: ${barrier.type}`,
    description: barrier.description,
    level: barrier.level,
    status: 'fail' as const,
    selector: barrier.selector || '',
    pageUrl,
    pageNumber,
    message: barrier.impact,
    evidence: {
      type: barrier.type,
      severity: barrier.severity,
      affectedElements: barrier.affectedElements,
      recommendation: barrier.recommendation,
    },
    confidence: 'high' as const,
  }));
}
