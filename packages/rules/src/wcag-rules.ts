import type { PageArtifact, RuleResult, EvidenceItem } from '@raawi-x/core';
import type { Rule } from './rule-engine.js';
import { JSDOM } from 'jsdom';
import { getFocusableElements, hasFocusIndicator } from './utils/focus.js';
import { parseColor, getContrastRatio } from './utils/contrast.js';

/**
 * WCAG 1.1.1 (Level A): Non-text Content - Alt Text
 * All images must have alt text unless decorative
 */
export const wcag111Rule: Rule = {
  id: 'wcag-1.1.1',
  wcagId: '1.1.1',
  level: 'A',
  title: 'Non-text Content - Alt Text',
  description: 'All images must have alt text. Decorative images (role="presentation" or aria-hidden="true") are exempt.',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-1.1.1',
        wcagId: '1.1.1',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const images = document.querySelectorAll('img');
    const violations: EvidenceItem[] = [];
    let decorativeCount = 0;

    images.forEach((img: HTMLImageElement) => {
      const role = img.getAttribute('role');
      const ariaHidden = img.getAttribute('aria-hidden');
      const alt = img.getAttribute('alt');

      // Check if decorative
      const isDecorative = role === 'presentation' || role === 'none' || ariaHidden === 'true';

      if (isDecorative) {
        decorativeCount++;
        // Decorative images should have alt="" or no alt
        if (alt !== null && alt !== '') {
          violations.push({
            type: 'element',
            value: img.outerHTML.substring(0, 300),
            selector: getSelector(img),
            description: 'Decorative image should have alt="" but has alt text',
          });
        }
      } else {
        // Non-decorative images must have alt text
        if (alt === null || alt === '') {
          violations.push({
            type: 'element',
            value: img.outerHTML.substring(0, 300),
            selector: getSelector(img),
            description: 'Non-decorative image missing alt text',
          });
        }
      }
    });

    if (violations.length === 0) {
      return {
        ruleId: 'wcag-1.1.1',
        wcagId: '1.1.1',
        status: 'pass',
        confidence: 'high',
        evidence: [],
        howToVerify: 'Verify all <img> elements have appropriate alt attributes. Decorative images should have alt="".',
        message: images.length > 0
          ? `All ${images.length} image(s) have appropriate alt text (${decorativeCount} decorative)`
          : 'No images found on page',
      };
    }

    return {
      ruleId: 'wcag-1.1.1',
      wcagId: '1.1.1',
      status: 'fail',
      confidence: 'high',
      evidence: violations,
      howToVerify: 'Add alt attributes to all non-decorative images. Use alt="" for decorative images.',
      message: `Found ${violations.length} image(s) with alt text issues`,
    };
  },
};

/**
 * WCAG 2.4.2 (Level A): Page Titled
 * Pages must have descriptive titles
 */
export const wcag242Rule: Rule = {
  id: 'wcag-2.4.2',
  wcagId: '2.4.2',
  level: 'A',
  title: 'Page Titled',
  description: 'HTML document must have a title element with non-empty text',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-2.4.2',
        wcagId: '2.4.2',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const title = document.querySelector('title');
    const titleText = title?.textContent?.trim() || '';

    if (!title || titleText === '') {
      return {
        ruleId: 'wcag-2.4.2',
        wcagId: '2.4.2',
        status: 'fail',
        confidence: 'high',
        evidence: [
          {
            type: 'html',
            value: page.html.substring(0, 1000),
            description: 'Page missing title element or title is empty',
          },
        ],
        howToVerify: 'Add a <title> element in the <head> with descriptive text',
        message: 'Page is missing a title element or title is empty',
      };
    }

    return {
      ruleId: 'wcag-2.4.2',
      wcagId: '2.4.2',
      status: 'pass',
      confidence: 'high',
      evidence: [
        {
          type: 'text',
          value: titleText,
          description: 'Page title found',
        },
      ],
      howToVerify: 'Verify the title element contains meaningful, descriptive text',
      message: `Page has title: "${titleText}"`,
    };
  },
};

/**
 * WCAG 3.1.1 (Level A): Language of Page
 * HTML must have lang attribute
 */
export const wcag311Rule: Rule = {
  id: 'wcag-3.1.1',
  wcagId: '3.1.1',
  level: 'A',
  title: 'Language of Page',
  description: 'HTML document must have a lang attribute on the html element',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-3.1.1',
        wcagId: '3.1.1',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const htmlElement = document.documentElement;
    const lang = htmlElement.getAttribute('lang');

    // Extract html tag snippet
    const htmlTagMatch = page.html.match(/<html[^>]*>/i);
    const htmlTagSnippet = htmlTagMatch ? htmlTagMatch[0] : '<html>';

    if (!lang || lang.trim() === '') {
      return {
        ruleId: 'wcag-3.1.1',
        wcagId: '3.1.1',
        status: 'fail',
        confidence: 'high',
        evidence: [
          {
            type: 'html',
            value: htmlTagSnippet,
            description: 'HTML element missing lang attribute',
          },
        ],
        howToVerify: 'Add lang attribute to <html> element (e.g., <html lang="en">)',
        message: 'HTML element is missing lang attribute',
      };
    }

    return {
      ruleId: 'wcag-3.1.1',
      wcagId: '3.1.1',
      status: 'pass',
      confidence: 'high',
      evidence: [
        {
          type: 'html',
          value: htmlTagSnippet,
          description: `HTML element has lang="${lang}"`,
        },
      ],
      howToVerify: 'Verify the lang attribute value matches the primary language of the page content',
      message: `HTML element has lang="${lang}"`,
    };
  },
};

/**
 * WCAG 4.1.2 (Level A): Name, Role, Value - Accessible Name for Form Controls
 * Form controls must have accessible names
 */
export const wcag412Rule: Rule = {
  id: 'wcag-4.1.2',
  wcagId: '4.1.2',
  level: 'A',
  title: 'Name, Role, Value - Accessible Name for Form Controls',
  description: 'All form controls (input, select, textarea) must have accessible names via label, aria-label, or aria-labelledby',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-4.1.2',
        wcagId: '4.1.2',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const formControls = document.querySelectorAll('input, select, textarea');
    const violations: EvidenceItem[] = [];

    formControls.forEach((control: Element) => {
      const id = control.getAttribute('id');
      const ariaLabel = control.getAttribute('aria-label');
      const ariaLabelledBy = control.getAttribute('aria-labelledby');

      // Check for associated label via for attribute
      const hasLabelFor = id
        ? document.querySelector(`label[for="${id}"]`) !== null
        : false;

      // Check for wrapped label
      const hasWrappedLabel = control.closest('label') !== null;

      // Check aria-labelledby points to element with text
      let ariaLabelledByValid = false;
      if (ariaLabelledBy) {
        const labelledByElement = document.getElementById(ariaLabelledBy);
        if (labelledByElement && labelledByElement.textContent?.trim()) {
          ariaLabelledByValid = true;
        }
      }

      // Check if control has accessible name
      const hasAccessibleName =
        hasLabelFor ||
        hasWrappedLabel ||
        (ariaLabel && ariaLabel.trim() !== '') ||
        ariaLabelledByValid;

      if (!hasAccessibleName) {
        let reason = 'No accessible name found';
        if (id) {
          reason += ` (no label[for="${id}"], no aria-label, no aria-labelledby)`;
        } else {
          reason += ' (no wrapped label, no aria-label, no aria-labelledby)';
        }

        violations.push({
          type: 'element',
          value: control.outerHTML.substring(0, 300),
          selector: getSelector(control),
          description: reason,
        });
      }
    });

    if (violations.length === 0) {
      return {
        ruleId: 'wcag-4.1.2',
        wcagId: '4.1.2',
        status: 'pass',
        confidence: 'high',
        evidence: [],
        howToVerify: 'Verify all form controls have associated labels or aria-labels',
        message: formControls.length > 0
          ? `All ${formControls.length} form control(s) have accessible names`
          : 'No form controls found on page',
      };
    }

    return {
      ruleId: 'wcag-4.1.2',
      wcagId: '4.1.2',
      status: 'fail',
      confidence: 'high',
      evidence: violations,
      howToVerify: 'Add <label> elements, aria-label attributes, or aria-labelledby attributes to all form controls',
      message: `Found ${violations.length} form control(s) without accessible names`,
    };
  },
};

/**
 * WCAG 2.4.4 (Level A): Link Purpose (Basic)
 * Links must have discernible purpose
 * Heuristic: Flag generic link text like "click here", "more", etc.
 */
export const wcag244Rule: Rule = {
  id: 'wcag-2.4.4',
  wcagId: '2.4.4',
  level: 'A',
  title: 'Link Purpose (Basic)',
  description: 'Links must have discernible purpose. Generic text like "click here" or "more" may need review.',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-2.4.4',
        wcagId: '2.4.4',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const links = document.querySelectorAll('a[href]');
    const needsReview: EvidenceItem[] = [];

    // Patterns for generic/non-descriptive link text (case-insensitive)
    const genericPatterns = [
      /^click\s+here$/i,
      /^here$/i,
      /^more$/i,
      /^read\s+more$/i,
      /^المزيد$/i, // Arabic "more"
      /^اقرأ\s+المزيد$/i, // Arabic "read more"
      /^link$/i,
      /^this$/i,
      /^that$/i,
      /^see\s+more$/i,
      /^continue$/i,
      /^next$/i,
      /^previous$/i,
      /^prev$/i,
    ];

    links.forEach((link: Element) => {
      const linkText = link.textContent?.trim() || '';
      const ariaLabel = link.getAttribute('aria-label');

      // Skip if link has aria-label (that's the accessible name)
      if (ariaLabel && ariaLabel.trim() !== '') {
        return;
      }

      // Check if link text matches generic patterns
      const isGeneric = genericPatterns.some((pattern) => pattern.test(linkText));

      if (isGeneric && linkText !== '') {
        // Get nearby context (parent element text or sibling text)
        const parent = link.parentElement;
        const parentText = parent?.textContent?.trim() || '';
        const nearbyText = parentText.substring(0, 200);

        needsReview.push({
          type: 'element',
          value: link.outerHTML.substring(0, 300),
          selector: getSelector(link),
          description: `Generic link text "${linkText}" may lack context. Nearby text: "${nearbyText.substring(0, 100)}"`,
        });
      }
    });

    if (needsReview.length === 0) {
      return {
        ruleId: 'wcag-2.4.4',
        wcagId: '2.4.4',
        status: 'pass',
        confidence: 'medium',
        evidence: [],
        howToVerify: 'Verify all links have descriptive text that indicates their purpose',
        message: links.length > 0
          ? `All ${links.length} link(s) appear to have descriptive text`
          : 'No links found on page',
      };
    }

    return {
      ruleId: 'wcag-2.4.4',
      wcagId: '2.4.4',
      status: 'needs_review',
      confidence: 'medium',
      evidence: needsReview,
      howToVerify: 'Review links with generic text. Ensure they have sufficient context or use more descriptive link text.',
      message: `Found ${needsReview.length} link(s) with potentially generic text that may need review`,
    };
  },
};

function getSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }
  if (element.className) {
    const classes = Array.from(element.classList)
      .map((c) => `.${c}`)
      .join('');
    return `${element.tagName.toLowerCase()}${classes}`;
  }
  return element.tagName.toLowerCase();
}

/**
 * WCAG 2.4.7 (Level A): Focus Visible
 * Focusable elements must have visible focus indicators
 */
export const wcag247Rule: Rule = {
  id: 'wcag-2.4.7',
  wcagId: '2.4.7',
  level: 'A',
  title: 'Focus Visible',
  description: 'All focusable elements must have visible focus indicators',
  evaluate: async (page: PageArtifact): Promise<RuleResult> => {
    if (!page.html) {
      return {
        ruleId: 'wcag-2.4.7',
        wcagId: '2.4.7',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html, {
      url: page.url,
      resources: 'usable',
    });
    const document = dom.window.document;
    const focusableElements = getFocusableElements(document);

    if (focusableElements.length === 0) {
      return {
        ruleId: 'wcag-2.4.7',
        wcagId: '2.4.7',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'No focusable elements found on page',
        message: 'No focusable elements found',
      };
    }

    // Sample up to 30 elements
    const sampleSize = Math.min(30, focusableElements.length);
    const sample = focusableElements.slice(0, sampleSize);
    const violations: EvidenceItem[] = [];
    let elementsWithIndicator = 0;

    for (const element of sample) {
      const indicator = hasFocusIndicator(element);
      if (!indicator.hasIndicator) {
        violations.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector: getSelector(element),
          description: `No visible focus indicator detected. Checked for: outline, border, box-shadow`,
        });
      } else {
        elementsWithIndicator++;
      }
    }

    const passRate = elementsWithIndicator / sampleSize;
    const threshold = 0.7; // 70% of elements should have indicators

    if (passRate >= threshold) {
      return {
        ruleId: 'wcag-2.4.7',
        wcagId: '2.4.7',
        status: 'pass',
        confidence: 'medium',
        evidence: [],
        howToVerify: 'Verify all focusable elements have visible focus indicators (outline, border, or box-shadow)',
        message: `${elementsWithIndicator}/${sampleSize} sampled elements have focus indicators`,
      };
    }

    if (violations.length === sampleSize) {
      return {
        ruleId: 'wcag-2.4.7',
        wcagId: '2.4.7',
        status: 'fail',
        confidence: 'medium',
        evidence: violations,
        howToVerify: 'Add CSS :focus styles with outline, border, or box-shadow to all focusable elements',
        message: `None of ${sampleSize} sampled elements have visible focus indicators`,
      };
    }

    return {
      ruleId: 'wcag-2.4.7',
      wcagId: '2.4.7',
      status: 'needs_review',
      confidence: 'medium',
      evidence: violations,
      howToVerify: 'Review focusable elements and ensure they have visible focus indicators',
      message: `Only ${elementsWithIndicator}/${sampleSize} sampled elements have focus indicators`,
    };
  },
};

/**
 * WCAG 2.1.1 (Level A): Keyboard Reachable (Heuristic)
 * Verify that Tab can move focus across interactive elements
 */
export const wcag211Rule: Rule = {
  id: 'wcag-2.1.1',
  wcagId: '2.1.1',
  level: 'A',
  title: 'Keyboard Reachable (Heuristic)',
  description: 'All interactive elements should be keyboard accessible via Tab navigation',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-2.1.1',
        wcagId: '2.1.1',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const focusableElements = getFocusableElements(document);

    if (focusableElements.length === 0) {
      return {
        ruleId: 'wcag-2.1.1',
        wcagId: '2.1.1',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'No focusable elements found on page',
        message: 'No focusable elements found',
      };
    }

    // Check for elements with tabindex="-1" or disabled
    const unreachableElements: EvidenceItem[] = [];
    const focusSequence: string[] = [];

    focusableElements.forEach((element) => {
      const tabindex = element.getAttribute('tabindex');
      const isDisabled = element.hasAttribute('disabled');
      const tagName = element.tagName.toLowerCase();
      const selector = getSelector(element);

      focusSequence.push(selector || tagName);

      if (tabindex === '-1' && !isDisabled) {
        unreachableElements.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector,
          description: 'Element has tabindex="-1" making it unreachable via Tab',
        });
      }
    });

    // Heuristic: If very few focusable elements, might indicate issue
    const minExpected = 3;
    if (focusableElements.length < minExpected) {
      return {
        ruleId: 'wcag-2.1.1',
        wcagId: '2.1.1',
        status: 'needs_review',
        confidence: 'low',
        evidence: [
          {
            type: 'text',
            value: `Focus sequence: ${focusSequence.join(' → ')}`,
            description: `Only ${focusableElements.length} focusable element(s) found`,
          },
        ],
        howToVerify: 'Verify all interactive elements are keyboard accessible. Test Tab navigation manually.',
        message: `Only ${focusableElements.length} focusable element(s) found - may need review`,
      };
    }

    if (unreachableElements.length > 0) {
      return {
        ruleId: 'wcag-2.1.1',
        wcagId: '2.1.1',
        status: 'needs_review',
        confidence: 'medium',
        evidence: unreachableElements,
        howToVerify: 'Review elements with tabindex="-1" and ensure they are not required for keyboard navigation',
        message: `Found ${unreachableElements.length} element(s) with tabindex="-1"`,
      };
    }

    return {
      ruleId: 'wcag-2.1.1',
      wcagId: '2.1.1',
      status: 'pass',
      confidence: 'medium',
      evidence: [
        {
          type: 'text',
          value: `Focus sequence: ${focusSequence.slice(0, 10).join(' → ')}${focusSequence.length > 10 ? '...' : ''}`,
          description: `${focusableElements.length} focusable elements found`,
        },
      ],
      howToVerify: 'Test Tab navigation manually to verify all interactive elements are reachable',
      message: `Found ${focusableElements.length} focusable element(s)`,
    };
  },
};

/**
 * WCAG 2.1.2 (Level A): No Keyboard Trap
 * Focus should not get trapped in a region
 */
export const wcag212Rule: Rule = {
  id: 'wcag-2.1.2',
  wcagId: '2.1.2',
  level: 'A',
  title: 'No Keyboard Trap',
  description: 'Focus should not get trapped in a region without escape route',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-2.1.2',
        wcagId: '2.1.2',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const focusableElements = getFocusableElements(document);

    if (focusableElements.length === 0) {
      return {
        ruleId: 'wcag-2.1.2',
        wcagId: '2.1.2',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'No focusable elements found on page',
        message: 'No focusable elements found',
      };
    }

    // Heuristic: Check for modal/dialog patterns that might trap focus
    const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, .dialog');
    const potentialTraps: EvidenceItem[] = [];

    modals.forEach((modal) => {
      const modalFocusable = Array.from(modal.querySelectorAll('a, button, input, select, textarea, [tabindex]'));
      const hasEscape = modal.querySelector('[aria-label*="close" i], [aria-label*="dismiss" i], .close, [data-dismiss]');
      const hasEscapeKey = modal.getAttribute('data-escape-key') !== 'false';

      if (modalFocusable.length > 0 && !hasEscape && !hasEscapeKey) {
        potentialTraps.push({
          type: 'element',
          value: modal.outerHTML.substring(0, 300),
          selector: getSelector(modal),
          description: `Modal/dialog with ${modalFocusable.length} focusable element(s) but no clear escape mechanism detected`,
        });
      }
    });

    // Check for regions with many focusable elements but no exit
    const regions = document.querySelectorAll('[role="region"], section, article');
    regions.forEach((region) => {
      const regionFocusable = Array.from(region.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      if (regionFocusable.length > 10) {
        // Heuristic: Many focusable elements in one region might indicate trap
        const hasExit = region.querySelector('a[href], button[type="button"]');
        if (!hasExit) {
          potentialTraps.push({
            type: 'element',
            value: region.outerHTML.substring(0, 300),
            selector: getSelector(region),
            description: `Region with ${regionFocusable.length} focusable elements but no clear exit mechanism`,
          });
        }
      }
    });

    if (potentialTraps.length === 0) {
      return {
        ruleId: 'wcag-2.1.2',
        wcagId: '2.1.2',
        status: 'pass',
        confidence: 'low',
        evidence: [],
        howToVerify: 'Test keyboard navigation manually, especially in modals and complex regions',
        message: 'No obvious keyboard traps detected (heuristic check)',
      };
    }

    return {
      ruleId: 'wcag-2.1.2',
      wcagId: '2.1.2',
      status: 'needs_review',
      confidence: 'low',
      evidence: potentialTraps,
      howToVerify: 'Manually test keyboard navigation in modals and regions. Ensure Escape key or close button works.',
      message: `Found ${potentialTraps.length} potential keyboard trap(s) that need review`,
    };
  },
};

/**
 * WCAG 1.4.3 (Level AA): Contrast Minimum
 * Text must have sufficient contrast with background
 */
export const wcag143Rule: Rule = {
  id: 'wcag-1.4.3',
  wcagId: '1.4.3',
  level: 'AA',
  title: 'Contrast Minimum',
  description: 'Text must have contrast ratio of at least 4.5:1 for normal text',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-1.4.3',
        wcagId: '1.4.3',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html);
    const document = dom.window.document;
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, li, td, th, label');
    const violations: EvidenceItem[] = [];
    const needsReview: EvidenceItem[] = [];
    const minContrast = 4.5;

    // Sample up to 50 text elements
    const sampleSize = Math.min(50, textElements.length);
    const sample = Array.from(textElements).slice(0, sampleSize);

    for (const element of sample) {
      const text = element.textContent?.trim();
      if (!text || text.length < 3) continue; // Skip very short text

      const htmlElement = element as HTMLElement;
      const style = htmlElement.style;

      // Try to get colors from inline styles (best effort)
      const textColor = style.color || '';
      const bgColor = style.backgroundColor || '';

      if (!textColor || !bgColor) {
        // Can't determine colors from inline styles - needs review
        needsReview.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector: getSelector(element),
          description: 'Cannot determine text/background colors from inline styles - check computed styles',
        });
        continue;
      }

      const textRgb = parseColor(textColor);
      const bgRgb = parseColor(bgColor);

      if (!textRgb || !bgRgb) {
        needsReview.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector: getSelector(element),
          description: `Could not parse colors: text="${textColor}", bg="${bgColor}"`,
        });
        continue;
      }

      const contrast = getContrastRatio(textRgb, bgRgb);

      // Check font size (heuristic for large text)
      const fontSize = style.fontSize || '';
      const isLargeText = fontSize.includes('18') || fontSize.includes('14') && style.fontWeight && parseInt(style.fontWeight) >= 700;

      if (contrast < minContrast) {
        if (isLargeText) {
          // Large text threshold is 3:1, but we're using 4.5:1 for MVP
          needsReview.push({
            type: 'element',
            value: element.outerHTML.substring(0, 300),
            selector: getSelector(element),
            description: `Contrast ratio ${contrast.toFixed(2)}:1 (below 4.5:1). Font size suggests large text - needs review. Text: ${textColor}, BG: ${bgColor}`,
          });
        } else {
          violations.push({
            type: 'element',
            value: element.outerHTML.substring(0, 300),
            selector: getSelector(element),
            description: `Contrast ratio ${contrast.toFixed(2)}:1 (below 4.5:1). Text: ${textColor}, BG: ${bgColor}`,
          });
        }
      }
    }

    if (violations.length === 0 && needsReview.length === 0) {
      return {
        ruleId: 'wcag-1.4.3',
        wcagId: '1.4.3',
        status: 'pass',
        confidence: 'medium',
        evidence: [],
        howToVerify: 'Verify text contrast using browser DevTools or contrast checker tools',
        message: `Checked ${sample.length} text element(s) - all meet contrast requirements`,
      };
    }

    if (violations.length > 0) {
      return {
        ruleId: 'wcag-1.4.3',
        wcagId: '1.4.3',
        status: 'fail',
        confidence: 'medium',
        evidence: violations,
        howToVerify: 'Increase contrast by adjusting text or background colors to meet 4.5:1 ratio',
        message: `Found ${violations.length} text element(s) with insufficient contrast`,
      };
    }

    return {
      ruleId: 'wcag-1.4.3',
      wcagId: '1.4.3',
      status: 'needs_review',
      confidence: 'low',
      evidence: needsReview,
      howToVerify: 'Review text contrast using computed styles. Some elements may need manual verification.',
      message: `${needsReview.length} element(s) need manual contrast review`,
    };
  },
};

/**
 * WCAG 1.4.10 (Level AA): Reflow
 * Content should reflow at 400% zoom (320px viewport)
 */
export const wcag1410Rule: Rule = {
  id: 'wcag-1.4.10',
  wcagId: '1.4.10',
  level: 'AA',
  title: 'Reflow',
  description: 'Content should reflow without horizontal scrolling at 320px viewport width',
  evaluate: (page: PageArtifact): RuleResult => {
    if (!page.html) {
      return {
        ruleId: 'wcag-1.4.10',
        wcagId: '1.4.10',
        status: 'na',
        confidence: 'high',
        evidence: [],
        howToVerify: 'HTML content not available for this page',
      };
    }

    const dom = new JSDOM(page.html, {
      url: page.url,
      resources: 'usable',
    });
    const window = dom.window;
    const document = window.document;

    // Simulate 320px viewport (400% zoom of 1280px = 320px)
    const testWidth = 320;

    // Set viewport width (JSDOM limitation - this is best effort)
    try {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: testWidth,
      });
    } catch {
      // Cannot modify viewport in JSDOM
    }

    // Check for elements with fixed widths that might cause overflow
    const fixedWidthElements = document.querySelectorAll('[style*="width"], [style*="min-width"]');
    const potentialOverflows: EvidenceItem[] = [];

    fixedWidthElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const style = htmlElement.style;
      const width = style.width || '';
      const minWidth = style.minWidth || '';

      // Check for fixed pixel widths > 320px
      const widthMatch = width.match(/(\d+)px/);
      const minWidthMatch = minWidth.match(/(\d+)px/);

      if (widthMatch && parseInt(widthMatch[1]) > testWidth) {
        potentialOverflows.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector: getSelector(element),
          description: `Fixed width ${widthMatch[1]}px exceeds 320px viewport`,
        });
      }

      if (minWidthMatch && parseInt(minWidthMatch[1]) > testWidth) {
        potentialOverflows.push({
          type: 'element',
          value: element.outerHTML.substring(0, 300),
          selector: getSelector(element),
          description: `Min-width ${minWidthMatch[1]}px exceeds 320px viewport`,
        });
      }
    });

    // Check for horizontal scroll indicators in CSS
    const body = document.body;
    const html = document.documentElement;

    // Heuristic: Check for overflow-x: hidden (which might hide scroll)
    const bodyOverflow = (body as HTMLElement).style.overflowX;
    const htmlOverflow = (html as HTMLElement).style.overflowX;

    if (bodyOverflow === 'hidden' || htmlOverflow === 'hidden') {
      potentialOverflows.push({
        type: 'html',
        value: `<body style="overflow-x: ${bodyOverflow}">...</body>`,
        description: 'overflow-x: hidden may hide horizontal scroll issues',
      });
    }

    // Note: Actual scrollWidth vs clientWidth check requires live browser
    // This is a best-effort heuristic

    if (potentialOverflows.length === 0) {
      return {
        ruleId: 'wcag-1.4.10',
        wcagId: '1.4.10',
        status: 'pass',
        confidence: 'low',
        evidence: [],
        howToVerify: 'Test page at 320px viewport width manually or use browser DevTools',
        message: 'No obvious reflow issues detected (heuristic check)',
      };
    }

    return {
      ruleId: 'wcag-1.4.10',
      wcagId: '1.4.10',
      status: 'needs_review',
      confidence: 'low',
      evidence: potentialOverflows,
      howToVerify: 'Test page at 320px viewport width. Check for horizontal scrolling. Use responsive design mode in browser.',
      message: `Found ${potentialOverflows.length} potential reflow issue(s) - manual testing required`,
    };
  },
};

// Export all WCAG rules
export const allWcagRules: Rule[] = [
  wcag111Rule,
  wcag242Rule,
  wcag311Rule,
  wcag412Rule,
  wcag244Rule,
  wcag247Rule,
  wcag211Rule,
  wcag212Rule,
  wcag143Rule,
  wcag1410Rule,
];
