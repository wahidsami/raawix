import type { Rule } from './rule-engine.js';
/**
 * WCAG 1.1.1 (Level A): Non-text Content - Alt Text
 * All images must have alt text unless decorative
 */
export declare const wcag111Rule: Rule;
/**
 * WCAG 2.4.2 (Level A): Page Titled
 * Pages must have descriptive titles
 */
export declare const wcag242Rule: Rule;
/**
 * WCAG 3.1.1 (Level A): Language of Page
 * HTML must have lang attribute
 */
export declare const wcag311Rule: Rule;
/**
 * WCAG 4.1.2 (Level A): Name, Role, Value - Accessible Name for Form Controls
 * Form controls must have accessible names
 */
export declare const wcag412Rule: Rule;
/**
 * WCAG 2.4.4 (Level A): Link Purpose (Basic)
 * Links must have discernible purpose
 * Heuristic: Flag generic link text like "click here", "more", etc.
 */
export declare const wcag244Rule: Rule;
/**
 * WCAG 2.4.7 (Level A): Focus Visible
 * Focusable elements must have visible focus indicators
 */
export declare const wcag247Rule: Rule;
/**
 * WCAG 2.1.1 (Level A): Keyboard Reachable (Heuristic)
 * Verify that Tab can move focus across interactive elements
 */
export declare const wcag211Rule: Rule;
/**
 * WCAG 2.1.2 (Level A): No Keyboard Trap
 * Focus should not get trapped in a region
 */
export declare const wcag212Rule: Rule;
/**
 * WCAG 1.4.3 (Level AA): Contrast Minimum
 * Text must have sufficient contrast with background
 */
export declare const wcag143Rule: Rule;
/**
 * WCAG 1.4.10 (Level AA): Reflow
 * Content should reflow at 400% zoom (320px viewport)
 */
export declare const wcag1410Rule: Rule;
export declare const allWcagRules: Rule[];
//# sourceMappingURL=wcag-rules.d.ts.map