import { type PageGuidance, type PageIssues } from './widget-guidance.js';
export declare class WidgetService {
    private reportGenerator;
    constructor();
    /**
     * Get page guidance by URL (with resolution and match metadata)
     * @param requestUrl The URL from widget (may have query params, hash, etc.)
     * @param scanId Optional scan ID to search in specific scan. Use "latest" to find most recent scan for domain.
     */
    getPageGuidance(requestUrl: string, scanId?: string): Promise<PageGuidance | null>;
    /**
     * Get known issues for a page by URL (with resolution and match metadata)
     * @param requestUrl The URL from widget (may have query params, hash, etc.)
     * @param scanId Optional scan ID to search in specific scan. Use "latest" to find most recent scan for domain.
     */
    getPageIssues(requestUrl: string, scanId?: string): Promise<PageIssues | null>;
    /**
     * Get guidance from specific scan with URL resolution
     */
    private getGuidanceFromScan;
    /**
     * Get issues from specific scan with URL resolution
     */
    private getIssuesFromScan;
    /**
     * Get semantic model from a scan by URL
     */
    getPageSemanticModel(requestUrl: string, scanId?: string): Promise<Record<string, unknown> | null>;
    private getSemanticModelFromScan;
    private findSemanticModelInRecentScans;
    /**
     * Find guidance in most recent scans (simplified - searches output directory)
     */
    private findGuidanceInRecentScans;
    /**
     * Find issues in most recent scans
     */
    private findIssuesInRecentScans;
    /**
     * Find the most recent completed scan for a given domain
     * Used when scanId="latest" is specified
     */
    private findLatestScanForDomain;
}
export declare const widgetService: WidgetService;
//# sourceMappingURL=widget-service.d.ts.map