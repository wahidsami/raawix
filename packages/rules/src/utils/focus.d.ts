/**
 * Focus-related utilities
 */
/**
 * Get all focusable elements (heuristic)
 */
export declare function getFocusableElements(document: Document): Element[];
/**
 * Check if element has visible focus indicator (heuristic from CSS)
 */
export declare function hasFocusIndicator(element: Element): {
    hasIndicator: boolean;
    methods: string[];
};
//# sourceMappingURL=focus.d.ts.map