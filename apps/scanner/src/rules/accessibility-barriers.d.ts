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
    type: 'user-select-disabled' | 'pointer-events-disabled' | 'zoom-disabled' | 'context-menu-disabled' | 'keyboard-nav-blocked' | 'text-resize-blocked' | 'copy-paste-blocked' | 'selection-blocked';
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
 * Main function to detect all accessibility barriers
 */
export declare function detectAccessibilityBarriers(page: Page): Promise<AccessibilityBarrier[]>;
/**
 * Convert barriers to findings format for database storage
 */
export declare function barriersToFindings(barriers: AccessibilityBarrier[], pageUrl: string, pageNumber: number): {
    wcagId: string;
    title: string;
    description: string;
    level: "A" | "AA" | "AAA";
    status: "fail";
    selector: string;
    pageUrl: string;
    pageNumber: number;
    message: string;
    evidence: {
        type: "user-select-disabled" | "pointer-events-disabled" | "zoom-disabled" | "context-menu-disabled" | "keyboard-nav-blocked" | "text-resize-blocked" | "copy-paste-blocked" | "selection-blocked";
        severity: "critical" | "serious" | "moderate";
        affectedElements: number | undefined;
        recommendation: string;
    };
    confidence: "high";
}[];
//# sourceMappingURL=accessibility-barriers.d.ts.map