import type { ScanRun, PageArtifact } from '@raawi-x/core';
export declare class ReportGenerator {
    private outputDir;
    constructor(outputDir: string);
    /**
     * Load all page artifacts from output/{scanId}/pages/
     */
    loadPageArtifacts(scanId: string): Promise<PageArtifact[]>;
    /**
     * Load a single page artifact from a page directory
     */
    private loadPageArtifact;
    /**
     * Generate report by running all rules on all pages
     */
    generateReport(scanId: string, seedUrl: string, startedAt: string, completedAt?: string, options?: {
        generateAssistiveMap?: boolean;
    }): Promise<ScanRun>;
    /**
     * Generate summary counts by WCAG level (A/AA) and status
     */
    private generateSummary;
    /**
     * Load vision findings and convert to rule results
     */
    private loadVisionFindings;
    /**
     * Convert vision finding to rule result
     */
    private convertVisionFindingToRuleResult;
    /**
     * Build howToVerify message for vision finding
     */
    private buildHowToVerify;
    /**
     * Build finding message
     */
    private buildFindingMessage;
    /**
     * Infer WCAG level from WCAG ID (heuristic)
     * In production, maintain a proper mapping
     */
    private inferLevel;
    /**
     * Generate assistive map for a page and persist it
     */
    private generateAssistiveMapForPage;
    /**
     * Save report to output/{scanId}/report.json
     */
    saveReport(scanId: string, report: ScanRun): Promise<string>;
}
//# sourceMappingURL=report-generator.d.ts.map