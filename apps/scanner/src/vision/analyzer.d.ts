import type { Page } from 'playwright';
import type { VisionFinding } from '@raawi-x/core';
/**
 * Vision analyzer: Detects potentially inaccessible UI elements using visual analysis
 */
export declare class VisionAnalyzer {
    private logger;
    private scanId?;
    private geminiProvider?;
    constructor(scanId?: string);
    /**
     * Analyze page for vision findings
     */
    analyzePage(page: Page, pageNumber: number, pageUrl: string, outputDir: string): Promise<VisionFinding[]>;
    /**
     * Collect candidate interactive elements
     */
    private collectInteractiveElements;
    /**
     * Analyze a single candidate element
     */
    private analyzeCandidate;
    /**
     * Compute accessible name (best effort)
     */
    private computeAccessibleName;
    /**
     * Check if element is icon-only
     */
    private isIconOnly;
    /**
     * Check if element is clickable
     */
    private isClickable;
    /**
     * Check if element has role or tabindex
     */
    private hasRoleOrTabIndex;
    /**
     * Check if element looks like a button (CSS heuristics)
     */
    private looksLikeButton;
    /**
     * Generate stable selector for element
     */
    private generateStableSelector;
    /**
     * Run OCR on image (optional, requires tesseract.js)
     */
    private runOCR;
    /**
     * Save vision findings to JSON file
     */
    saveFindings(findings: VisionFinding[], pageNumber: number, outputDir: string): Promise<string>;
    /**
     * Process images for assistive map generation
     * Crops images that need alt text descriptions and stores them for Gemini processing
     */
    private processImagesForAssistiveMap;
}
//# sourceMappingURL=analyzer.d.ts.map